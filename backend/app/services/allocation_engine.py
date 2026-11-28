import json
from collections import Counter
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from app.extensions import db
from app.models.exam import Examination, ExamRegistration
from app.models.student import Student
from app.models.hall import Hall, Seat
from app.models.seating import SeatingPlan, SeatingAllocation

POLICIES = ("INTERLEAVE", "CONSECUTIVE")
SIDE_MODES = ("BOTH", "LEFT", "RIGHT", "CUSTOM")
SIDE_LABELS = {"BOTH": "both sides", "LEFT": "left side only", "RIGHT": "right side only", "CUSTOM": "custom selection"}


class AllocationError(Exception):
    def __init__(self, message: str, payload: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.payload = payload or {}


def bench_key(seat: Seat) -> tuple:
    return (seat.hall_id, seat.row_num, seat.bench_in_row)


def bench_name(seat: Seat) -> str:
    return f"Bench {seat.bench_num:02d} ({seat.position.title()} {seat.seat_label}, {seat.hall.name})"


def dept_code(student: Student) -> str:
    return student.department.code if student.department else str(student.department_id)


class AllocationEngine:
    @staticmethod
    def validate_exam_and_halls(exam_id: int, hall_ids: List[int]):
        exam = Examination.query.get(exam_id)
        if not exam:
            raise AllocationError(f"Examination with ID {exam_id} not found.")

        if exam.status in ("COMPLETED", "CANCELLED"):
            raise AllocationError(f"Cannot generate seating for an exam with status '{exam.status}'.")

        if not hall_ids:
            halls = Hall.query.filter_by(status="ACTIVE").order_by(Hall.id).all()
        else:
            halls = Hall.query.filter(Hall.id.in_(hall_ids), Hall.status == "ACTIVE").order_by(Hall.id).all()
            missing = set(hall_ids) - {h.id for h in halls}
            if missing:
                raise AllocationError(f"Hall(s) {sorted(missing)} do not exist or are not ACTIVE.")
        if not halls:
            raise AllocationError("No active examination halls available.")

        return exam, halls

    @staticmethod
    def _overlapping_exam_ids(exam: Examination) -> List[int]:
        rows = Examination.query.filter(
            Examination.id != exam.id,
            Examination.exam_date == exam.exam_date,
            Examination.start_time < exam.end_time,
            Examination.end_time > exam.start_time,
        ).with_entities(Examination.id).all()
        return [r[0] for r in rows]

    @classmethod
    def get_eligible_students(cls, exam: Examination) -> List[Student]:
        registrations = (
            ExamRegistration.query
            .filter_by(exam_id=exam.id, status="ELIGIBLE")
            .join(Student)
            .filter(Student.status == "ACTIVE")
            .all()
        )
        students = [reg.student for reg in registrations]

        other_ids = cls._overlapping_exam_ids(exam)
        conflicting_allocs = []
        if students and other_ids:
            conflicting_allocs = SeatingAllocation.query.filter(
                SeatingAllocation.student_id.in_([s.id for s in students]),
                SeatingAllocation.exam_id.in_(other_ids),
                SeatingAllocation.status != "CANCELLED",
            ).all()
        if conflicting_allocs:
            conflict_names = [f"{a.student.usn} ({a.examination.name})" for a in conflicting_allocs[:5]]
            raise AllocationError(
                f"Schedule conflict detected: {len(conflicting_allocs)} student(s) already allocated to overlapping exams: {', '.join(conflict_names)}"
            )

        return students

    @classmethod
    def get_taken_allocations(cls, exam: Examination) -> Dict[int, SeatingAllocation]:
        """seat_id -> allocation of another exam in the same time slot."""
        other_ids = cls._overlapping_exam_ids(exam)
        if not other_ids:
            return {}
        allocs = SeatingAllocation.query.filter(
            SeatingAllocation.exam_id.in_(other_ids),
            SeatingAllocation.status != "CANCELLED",
        ).all()
        return {a.seat_id: a for a in allocs}

    @classmethod
    def get_taken_seats(cls, exam: Examination) -> Dict[int, int]:
        """seat_id -> exam_id for seats held by other exams in the same time slot."""
        return {sid: a.exam_id for sid, a in cls.get_taken_allocations(exam).items()}

    @staticmethod
    def hall_seats(halls: List[Hall]) -> List[Seat]:
        return (
            Seat.query.filter(Seat.hall_id.in_([h.id for h in halls]))
            .order_by(Seat.hall_id, Seat.row_num, Seat.seat_num).all()
        )

    @staticmethod
    def seat_enabled(seat: Seat, side_mode: str, custom_ids=None) -> bool:
        if side_mode == "LEFT":
            return seat.position == "LEFT"
        if side_mode == "RIGHT":
            return seat.position == "RIGHT"
        if side_mode == "CUSTOM":
            return seat.id in (custom_ids or set())
        return True

    @classmethod
    def select_seats(cls, halls, taken: Dict[int, Any], side_mode: str, seat_ids=None) -> List[Seat]:
        all_seats = cls.hall_seats(halls)
        custom = set(seat_ids or [])
        if side_mode == "CUSTOM":
            if not custom:
                raise AllocationError("Custom selection needs at least one enabled seat position.")
            by_id = {s.id: s for s in all_seats}
            outside = sorted(custom - set(by_id))
            if outside:
                raise AllocationError(f"Seat id(s) {outside[:10]} are not in the selected halls.")
            inactive = [by_id[i].seat_label for i in sorted(custom) if not by_id[i].is_active]
            if inactive:
                raise AllocationError(f"Seat(s) {', '.join(inactive[:10])} are inactive and cannot be selected.")
            used = [by_id[i].seat_label for i in sorted(custom) if i in taken]
            if used:
                raise AllocationError(f"Seat(s) {', '.join(used[:10])} are used by another exam in the same time slot.")
        return [
            s for s in all_seats
            if s.is_active and s.id not in taken and cls.seat_enabled(s, side_mode, custom)
        ]

    @staticmethod
    def place_students(
        students: List[Student],
        seats: List[Seat],
        policy: str = "INTERLEAVE",
        branch_separation: bool = True,
        bench_preoccupied: Optional[Dict[tuple, set]] = None,
    ) -> Tuple[List[Tuple[Student, Seat]], List[Student]]:
        """Deterministic bench filling. Returns (pairs, unplaced students).

        With branch_separation, a bench never holds two students of one department.
        INTERLEAVE always takes the largest remaining department that the bench allows.
        CONSECUTIVE takes departments in order (then USN) for the first student on a
        bench and the largest other department for the second, which keeps roll order
        while still filling both positions (e.g. CSE-001 | ECE-001).
        Seats are visited hall -> row -> seat, so LEFT is filled before RIGHT.
        """
        if policy == "CONSECUTIVE":
            order = lambda s: (s.semester, s.section, s.usn)
        else:
            order = lambda s: (s.section, s.usn)
        buckets: Dict[int, List[Student]] = {}
        for s in sorted(students, key=lambda s: (s.department_id, order(s))):
            buckets.setdefault(s.department_id, []).append(s)

        on_bench: Dict[tuple, set] = {k: set(v) for k, v in (bench_preoccupied or {}).items()}
        pairs = []
        for seat in seats:
            depts = [d for d, b in buckets.items() if b]
            if not depts:
                break
            present = on_bench.setdefault(bench_key(seat), set())
            allowed = [d for d in depts if not (branch_separation and d in present)]
            if not allowed:
                continue  # position stays vacant rather than seating two of one branch together
            if policy == "CONSECUTIVE" and not present:
                dept = min(allowed)
            else:
                dept = max(allowed, key=lambda d: (len(buckets[d]), -d))  # largest first keeps the mix balanced
            student = buckets[dept].pop(0)
            present.add(dept)
            pairs.append((student, seat))

        unplaced = [s for d in sorted(buckets) for s in buckets[d]]
        return pairs, unplaced

    @staticmethod
    def build_summary(students, seats, pairs, unplaced, side_mode, policy, branch_separation) -> Dict[str, Any]:
        used_ids = {seat.id for _, seat in pairs}
        return {
            "total_eligible": len(students),
            "total_allocated": len(pairs),
            "total_unallocated": len(unplaced),
            "benches_selected": len({bench_key(s) for s in seats}),
            "positions_selected": len(seats),
            "left_positions_selected": sum(1 for s in seats if s.position == "LEFT"),
            "right_positions_selected": sum(1 for s in seats if s.position == "RIGHT"),
            "left_used": sum(1 for _, s in pairs if s.position == "LEFT"),
            "right_used": sum(1 for _, s in pairs if s.position == "RIGHT"),
            "vacant_positions": sum(1 for s in seats if s.id not in used_ids),
            "allocated_by_branch": dict(sorted(Counter(dept_code(st) for st, _ in pairs).items())),
            "unallocated_by_branch": dict(sorted(Counter(dept_code(st) for st in unplaced).items())),
            "unallocated_students": [
                {"student_id": st.id, "usn": st.usn, "student_name": st.full_name, "department_code": dept_code(st)}
                for st in unplaced
            ],
            "side_mode": side_mode,
            "policy": policy,
            "branch_separation": branch_separation,
        }

    @classmethod
    def plan_allocation(
        cls,
        exam_id: int,
        hall_ids: Optional[List[int]] = None,
        policy: str = "INTERLEAVE",
        side_mode: str = "BOTH",
        seat_ids: Optional[List[int]] = None,
        branch_separation: bool = True,
    ):
        """Validate and compute an allocation without writing anything."""
        if policy not in POLICIES:
            raise AllocationError(f"Unknown policy '{policy}'. Use one of: {', '.join(POLICIES)}.")
        if side_mode not in SIDE_MODES:
            raise AllocationError(f"Unknown side mode '{side_mode}'. Use one of: {', '.join(SIDE_MODES)}.")

        exam, halls = cls.validate_exam_and_halls(exam_id, hall_ids)
        students = cls.get_eligible_students(exam)
        if not students:
            raise AllocationError(
                "No eligible active students are registered for this examination. "
                "Please register students before generating seating."
            )

        taken = cls.get_taken_allocations(exam)
        seats = cls.select_seats(halls, taken, side_mode, seat_ids)
        if not seats:
            raise AllocationError("No free seat positions in the selected halls for this selection.")

        preoccupied: Dict[tuple, set] = {}
        for alloc in taken.values():
            preoccupied.setdefault(bench_key(alloc.seat), set()).add(alloc.student.department_id)

        pairs, unplaced = cls.place_students(students, seats, policy, branch_separation, preoccupied)
        summary = cls.build_summary(students, seats, pairs, unplaced, side_mode, policy, branch_separation)
        config = {
            "side_mode": side_mode,
            "hall_ids": [h.id for h in halls],
            "seat_ids": sorted(set(seat_ids)) if side_mode == "CUSTOM" else None,
            "policy": policy,
            "branch_separation": branch_separation,
        }
        return exam, pairs, summary, config

    @classmethod
    def generate_plan(
        cls,
        exam_id: int,
        hall_ids: Optional[List[int]] = None,
        user_id: Optional[int] = None,
        policy: str = "INTERLEAVE",
        notes: Optional[str] = None,
        force: bool = False,
        side_mode: str = "BOTH",
        seat_ids: Optional[List[int]] = None,
        branch_separation: bool = True,
        allow_partial: bool = False,
    ) -> SeatingPlan:
        exam, pairs, summary, config = cls.plan_allocation(
            exam_id, hall_ids, policy, side_mode, seat_ids, branch_separation
        )

        if summary["total_unallocated"] and not allow_partial:
            rule = " without seating two students of the same branch on one bench" if branch_separation else ""
            raise AllocationError(
                f"Insufficient capacity: only {summary['total_allocated']} of {summary['total_eligible']} students "
                f"can be seated in the selected positions ({SIDE_LABELS[side_mode]}){rule}. "
                f"{summary['total_unallocated']} would be unallocated. Add halls or positions, or confirm a partial allocation.",
                payload={
                    **summary,
                    "total_eligible_students": summary["total_eligible"],
                    "total_available_seats": summary["positions_selected"],
                    "allocatable_count": summary["total_allocated"],
                    "unallocated_students_count": summary["total_unallocated"],
                    "additional_seats_required": summary["total_unallocated"],
                },
            )

        existing_plan = (
            SeatingPlan.query.filter(SeatingPlan.exam_id == exam.id, SeatingPlan.status != "ARCHIVED")
            .order_by(SeatingPlan.version.desc()).first()
        )
        if existing_plan and existing_plan.status == "PUBLISHED" and not force:
            raise AllocationError(
                "A seating plan for this examination is already PUBLISHED. "
                "To regenerate, set force=true."
            )

        plan_note = notes or f"Generated with policy: {policy}, {SIDE_LABELS[side_mode]}"
        if summary["total_unallocated"]:
            plan_note += f". Partial allocation: {summary['total_unallocated']} student(s) unallocated"
        stored_config = json.dumps({**config, "summary": summary})

        try:
            # Allocations are unique per exam, so the previous plan's seats are cleared
            SeatingAllocation.query.filter_by(exam_id=exam.id).delete()
            if existing_plan and existing_plan.status == "DRAFT":
                plan = existing_plan
                plan.notes = plan_note
                plan.config = stored_config
                plan.created_at = datetime.utcnow()
            else:
                # A published plan is kept as an ARCHIVED version; the new plan is the next version
                if existing_plan:
                    existing_plan.status = "ARCHIVED"
                max_version = db.session.query(db.func.max(SeatingPlan.version)).filter_by(exam_id=exam.id).scalar() or 0
                plan = SeatingPlan(
                    exam_id=exam.id,
                    version=max_version + 1,
                    status="DRAFT",
                    created_by_user_id=user_id,
                    notes=plan_note,
                    config=stored_config,
                )
                db.session.add(plan)
                db.session.flush()

            for student, seat in pairs:
                db.session.add(SeatingAllocation(
                    seating_plan_id=plan.id,
                    exam_id=exam.id,
                    student_id=student.id,
                    seat_id=seat.id,
                    hall_id=seat.hall_id,
                    status="ALLOCATED",
                    notes=f"Auto-allocated (Bench {seat.bench_num}, {seat.position})"
                ))

            exam.status = "SEATING_DRAFT"
            db.session.commit()
            return plan

        except Exception as e:
            db.session.rollback()
            raise AllocationError(f"Database transaction error during seating allocation: {str(e)}")

    @staticmethod
    def _bench_conflict(exam: Examination, seat: Seat, department_id: int, ignore_ids, other_exam_ids) -> Optional[SeatingAllocation]:
        """Occupant of the bench partner position with the same department, if any."""
        partner = Seat.query.filter_by(hall_id=seat.hall_id, row_num=seat.row_num, seat_num=seat.partner_seat_num).first()
        if not partner:
            return None
        occupants = SeatingAllocation.query.filter(
            SeatingAllocation.seat_id == partner.id,
            SeatingAllocation.exam_id.in_([exam.id] + list(other_exam_ids)),
            SeatingAllocation.status != "CANCELLED",
            ~SeatingAllocation.id.in_(list(ignore_ids)),
        ).all()
        return next((o for o in occupants if o.student.department_id == department_id), None)

    @classmethod
    def _check_target_enabled(cls, plan: SeatingPlan, seat: Seat):
        cfg = plan.config_dict
        if not cfg:
            # Plans made before bench configuration: any hall the plan already uses
            plan_hall_ids = {h for (h,) in db.session.query(SeatingAllocation.hall_id)
                             .filter_by(seating_plan_id=plan.id).distinct()}
            if seat.hall_id not in plan_hall_ids:
                raise AllocationError("Target seat must be in a hall used by this seating plan.")
            return
        if seat.hall_id not in set(cfg.get("hall_ids") or []):
            raise AllocationError("Target seat must be in a hall selected for this seating plan.")
        mode = cfg.get("side_mode", "BOTH")
        if not cls.seat_enabled(seat, mode, set(cfg.get("seat_ids") or [])):
            raise AllocationError(
                f"Seat {seat.seat_label} ({seat.position.lower()} position) is disabled for this plan ({SIDE_LABELS.get(mode, mode)})."
            )

    @classmethod
    def reassign_seat(
        cls,
        allocation_id: int,
        target_seat_id: int,
        user_id: Optional[int] = None,
        reason: Optional[str] = None,
        plan_id: Optional[int] = None,
    ) -> SeatingAllocation:
        alloc = SeatingAllocation.query.get(allocation_id)
        if not alloc or (plan_id is not None and alloc.seating_plan_id != plan_id):
            raise AllocationError("Allocation record not found in this seating plan.")
        plan = alloc.seating_plan
        if plan.status == "ARCHIVED":
            raise AllocationError("Cannot change an archived seating plan.")

        target_seat = Seat.query.get(target_seat_id)
        if not target_seat or not target_seat.is_active:
            raise AllocationError("Target seat is invalid or inactive.")
        if target_seat.id == alloc.seat_id:
            raise AllocationError("Student is already in that seat.")
        cls._check_target_enabled(plan, target_seat)

        exam = alloc.examination
        taken = cls.get_taken_allocations(exam)
        if target_seat.id in taken:
            raise AllocationError(
                f"Target seat {target_seat.seat_label} is used by '{taken[target_seat.id].examination.name}' in the same time slot."
            )

        occupant = SeatingAllocation.query.filter(
            SeatingAllocation.exam_id == alloc.exam_id,
            SeatingAllocation.seat_id == target_seat_id,
            SeatingAllocation.id != alloc.id,
            SeatingAllocation.status != "CANCELLED",
        ).first()
        old_seat = alloc.seat

        cfg = plan.config_dict or {}
        if cfg.get("branch_separation", True):
            ignore = {alloc.id} | ({occupant.id} if occupant else set())
            other_ids = {a.exam_id for a in taken.values()}
            moves = [(alloc, target_seat)] + ([(occupant, old_seat)] if occupant else [])
            for mover, dest in moves:
                clash = cls._bench_conflict(exam, dest, mover.student.department_id, ignore, other_ids)
                if clash:
                    raise AllocationError(
                        f"Branch separation: {bench_name(dest)} already has {clash.student.usn} "
                        f"({dept_code(clash.student)}) on the {clash.seat.position.lower()} position. "
                        f"{mover.student.usn} is also {dept_code(mover.student)}, and two students of the same "
                        f"branch cannot share a bench."
                    )

        note = f"Manually reassigned: {reason}" if reason else "Manually reassigned"
        try:
            if occupant:
                # Swap: free the target seat first so the (exam_id, seat_id) unique constraint holds
                occ_data = {c: getattr(occupant, c) for c in ("seating_plan_id", "exam_id", "student_id", "allocated_at")}
                db.session.delete(occupant)
                db.session.flush()
            alloc.seat_id = target_seat.id
            alloc.hall_id = target_seat.hall_id
            alloc.status = "REASSIGNED"
            alloc.notes = note
            alloc.updated_at = datetime.utcnow()
            db.session.flush()
            if occupant:
                db.session.add(SeatingAllocation(
                    **occ_data, seat_id=old_seat.id, hall_id=old_seat.hall_id,
                    status="REASSIGNED", notes=f"Swapped with {alloc.student.usn}",
                ))
            db.session.commit()
            return alloc
        except Exception as e:
            db.session.rollback()
            raise AllocationError(f"Failed to reassign seat: {str(e)}")
