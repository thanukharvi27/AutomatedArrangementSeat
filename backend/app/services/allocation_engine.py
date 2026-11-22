from datetime import datetime
from typing import List, Dict, Any, Optional
from app.extensions import db
from app.models.exam import Examination, ExamRegistration
from app.models.student import Student
from app.models.hall import Hall, Seat
from app.models.seating import SeatingPlan, SeatingAllocation

class AllocationError(Exception):
    def __init__(self, message: str, payload: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.payload = payload or {}

class AllocationEngine:
    @staticmethod
    def validate_exam_and_halls(exam_id: int, hall_ids: List[int]):
        exam = Examination.query.get(exam_id)
        if not exam:
            raise AllocationError(f"Examination with ID {exam_id} not found.")
        
        if exam.status in ("COMPLETED", "CANCELLED"):
            raise AllocationError(f"Cannot generate seating for an exam with status '{exam.status}'.")

        if not hall_ids:
            halls = Hall.query.filter_by(status="ACTIVE").all()
        else:
            halls = Hall.query.filter(Hall.id.in_(hall_ids), Hall.status == "ACTIVE").all()
        if not halls:
            raise AllocationError("No active examination halls available.")
        
        return exam, halls

    @staticmethod
    def get_eligible_students(exam: Examination) -> List[Student]:
        registrations = (
            ExamRegistration.query
            .filter_by(exam_id=exam.id, status="ELIGIBLE")
            .join(Student)
            .filter(Student.status == "ACTIVE")
            .all()
        )
        students = [reg.student for reg in registrations]
        
        conflicting_allocs = (
            SeatingAllocation.query
            .join(Examination, SeatingAllocation.exam_id == Examination.id)
            .filter(
                SeatingAllocation.student_id.in_([s.id for s in students]) if students else False,
                Examination.id != exam.id,
                Examination.exam_date == exam.exam_date,
                Examination.start_time < exam.end_time,
                Examination.end_time > exam.start_time,
                SeatingAllocation.status == "ALLOCATED"
            )
            .all()
        )
        if conflicting_allocs:
            conflict_names = [f"{a.student.usn} ({a.examination.name})" for a in conflicting_allocs[:5]]
            raise AllocationError(
                f"Schedule conflict detected: {len(conflicting_allocs)} student(s) already allocated to overlapping exams: {', '.join(conflict_names)}"
            )

        return students

    @staticmethod
    def get_available_seats(halls: List[Hall]) -> List[Seat]:
        all_seats = []
        for hall in halls:
            hall_seats = (
                Seat.query
                .filter_by(hall_id=hall.id, is_active=True)
                .order_by(Seat.row_num.asc(), Seat.seat_num.asc())
                .all()
            )
            all_seats.extend(hall_seats)
        return all_seats

    @classmethod
    def interleave_students(cls, students: List[Student], policy: str = "INTERLEAVE") -> List[Student]:
        if policy != "INTERLEAVE" or not students:
            return sorted(students, key=lambda s: (s.department_id, s.semester, s.section, s.usn))

        groups: Dict[str, List[Student]] = {}
        for s in students:
            key = f"{s.department_id}_{s.section}"
            groups.setdefault(key, []).append(s)

        for key in groups:
            groups[key].sort(key=lambda s: s.usn)

        interleaved: List[Student] = []
        keys = sorted(groups.keys())
        while any(groups.values()):
            for k in keys:
                if groups[k]:
                    interleaved.append(groups[k].pop(0))

        return interleaved

    @classmethod
    def generate_plan(
        cls,
        exam_id: int,
        hall_ids: Optional[List[int]] = None,
        user_id: Optional[int] = None,
        policy: str = "INTERLEAVE",
        notes: Optional[str] = None,
        force: bool = True
    ) -> SeatingPlan:
        exam, halls = cls.validate_exam_and_halls(exam_id, hall_ids)
        eligible_students = cls.get_eligible_students(exam)
        total_students = len(eligible_students)

        if total_students == 0:
            raise AllocationError(
                "No eligible active students are registered for this examination. "
                "Please register students before generating seating."
            )

        available_seats = cls.get_available_seats(halls)
        total_seats = len(available_seats)

        if total_seats < total_students:
            raise AllocationError(
                f"Insufficient capacity across selected halls. "
                f"Required seats: {total_students}, Available active seats: {total_seats}.",
                payload={
                    "total_eligible_students": total_students,
                    "total_available_seats": total_seats,
                    "allocatable_count": total_seats,
                    "unallocated_students": total_students - total_seats,
                    "additional_seats_required": total_students - total_seats,
                }
            )

        existing_plan = SeatingPlan.query.filter_by(exam_id=exam.id).order_by(SeatingPlan.version.desc()).first()
        if existing_plan and existing_plan.status == "PUBLISHED" and not force:
            raise AllocationError(
                "A seating plan for this examination is already PUBLISHED. "
                "To regenerate, set force=true."
            )

        ordered_students = cls.interleave_students(eligible_students, policy=policy)

        try:
            # Delete previous allocations for this exam to prevent unique constraint conflicts
            SeatingAllocation.query.filter_by(exam_id=exam.id).delete()
            if existing_plan:
                plan = existing_plan
                plan.status = "DRAFT"
                plan.published_at = None
                plan.notes = notes or f"Regenerated with policy: {policy}"
                plan.created_at = datetime.utcnow()
            else:
                plan = SeatingPlan(
                    exam_id=exam.id,
                    version=1,
                    status="DRAFT",
                    created_by_user_id=user_id,
                    notes=notes or f"Generated with policy: {policy}",
                )
                db.session.add(plan)
                db.session.flush()

            for i, student in enumerate(ordered_students):
                seat = available_seats[i]
                allocation = SeatingAllocation(
                    seating_plan_id=plan.id,
                    exam_id=exam.id,
                    student_id=student.id,
                    seat_id=seat.id,
                    hall_id=seat.hall_id,
                    status="ALLOCATED",
                    notes=f"Auto-allocated (Row {seat.row_num}, Seat {seat.seat_num})"
                )
                db.session.add(allocation)

            exam.status = "SEATING_DRAFT"
            db.session.commit()
            return plan

        except Exception as e:
            db.session.rollback()
            raise AllocationError(f"Database transaction error during seating allocation: {str(e)}")

    @classmethod
    def reassign_seat(
        cls,
        allocation_id: int,
        target_seat_id: int,
        user_id: Optional[int] = None,
        reason: Optional[str] = None
    ) -> SeatingAllocation:
        alloc = SeatingAllocation.query.get(allocation_id)
        if not alloc:
            raise AllocationError("Allocation record not found.")

        target_seat = Seat.query.get(target_seat_id)
        if not target_seat or not target_seat.is_active:
            raise AllocationError("Target seat is invalid or inactive.")

        existing_occ = SeatingAllocation.query.filter(
            SeatingAllocation.exam_id == alloc.exam_id,
            SeatingAllocation.seat_id == target_seat_id,
            SeatingAllocation.id != alloc.id,
            SeatingAllocation.status == "ALLOCATED"
        ).first()

        if existing_occ:
            raise AllocationError(
                f"Target seat {target_seat.seat_label} in {target_seat.hall.name} is already occupied by {existing_occ.student.usn}."
            )

        try:
            alloc.seat_id = target_seat.id
            alloc.hall_id = target_seat.hall_id
            alloc.status = "REASSIGNED"
            alloc.notes = f"Manually reassigned: {reason}" if reason else "Manually reassigned"
            alloc.updated_at = datetime.utcnow()
            db.session.commit()
            return alloc
        except Exception as e:
            db.session.rollback()
            raise AllocationError(f"Failed to reassign seat: {str(e)}")
