from collections import Counter
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.seating import SeatingPlan, SeatingAllocation
from app.models.exam import Examination, ExamRegistration
from app.models.hall import Hall, Seat
from app.services.allocation_engine import AllocationEngine, AllocationError
from app.utils.auth import admin_required, log_activity

seating_bp = Blueprint("seating", __name__, url_prefix="/api/seating-plans")

@seating_bp.route("", methods=["GET"])
@seating_bp.route("/", methods=["GET"])
@seating_bp.route("/plans", methods=["GET"])
@jwt_required()
def list_seating_plans():
    plans = SeatingPlan.query.order_by(SeatingPlan.id.desc()).all()
    return jsonify({
        "success": True,
        "plans": [p.to_dict() for p in plans],
        "total": len(plans)
    }), 200

def _generation_options(data):
    seat_ids = data.get("seat_ids") or []
    if not isinstance(seat_ids, list) or not all(isinstance(i, int) for i in seat_ids):
        raise AllocationError("seat_ids must be a list of integer seat IDs.")
    hall_ids = data.get("hall_ids") or []
    if not isinstance(hall_ids, list) or not all(isinstance(i, int) for i in hall_ids):
        raise AllocationError("hall_ids must be a list of integer hall IDs.")
    return {
        "hall_ids": hall_ids,
        "policy": str(data.get("policy", "INTERLEAVE")).upper(),
        "side_mode": str(data.get("side_mode", "BOTH")).upper(),
        "seat_ids": seat_ids,
        "branch_separation": bool(data.get("branch_separation", True)),
    }


@seating_bp.route("/layout", methods=["GET"])
@seating_bp.route("/plans/layout", methods=["GET"])
@jwt_required()
@admin_required()
def get_bench_layout():
    """Classroom bench layout of active halls, with seats already used by overlapping exams."""
    exam_id = request.args.get("exam_id", type=int)
    exam = Examination.query.get(exam_id) if exam_id else None
    taken = AllocationEngine.get_taken_allocations(exam) if exam else {}
    halls = Hall.query.filter_by(status="ACTIVE").order_by(Hall.id).all()
    seats_by_hall = {}
    for seat in (AllocationEngine.hall_seats(halls) if halls else []):
        other = taken.get(seat.id)
        seats_by_hall.setdefault(seat.hall_id, []).append({
            "seat_id": seat.id,
            "row_num": seat.row_num,
            "seat_num": seat.seat_num,
            "seat_label": seat.seat_label,
            "is_active": seat.is_active,
            **seat.bench_fields(),
            "taken_by": {
                "exam_name": other.examination.name,
                "department_code": other.student.department.code if other.student.department else None,
            } if other else None,
        })

    eligible = []
    if exam:
        eligible = [r.student for r in ExamRegistration.query.filter_by(exam_id=exam.id, status="ELIGIBLE").all()
                    if r.student.status == "ACTIVE"]
    by_branch = Counter(s.department.code if s.department else str(s.department_id) for s in eligible)
    return jsonify({
        "success": True,
        "halls": [{**h.to_dict(), "seats": seats_by_hall.get(h.id, [])} for h in halls],
        "total_eligible": len(eligible),
        "eligible_by_branch": dict(sorted(by_branch.items())),
    }), 200


@seating_bp.route("/generate", methods=["POST"])
@seating_bp.route("/plans/generate", methods=["POST"])
@jwt_required()
@admin_required()
def generate_seating():
    data = request.get_json() or {}
    exam_id = data.get("exam_id")
    exam_ids = data.get("exam_ids", [])
    force = bool(data.get("force", False))
    allow_partial = bool(data.get("allow_partial", False))
    try:
        options = _generation_options(data)
    except AllocationError as ae:
        return jsonify({"success": False, "error": ae.message}), 400

    if not exam_id and exam_ids and len(exam_ids) == 1:
        exam_id = exam_ids[0]

    if data.get("dry_run"):
        if not exam_id:
            return jsonify({"success": False, "error": "exam_id is required for a preview."}), 400
        try:
            _, _, summary, _ = AllocationEngine.plan_allocation(exam_id, **options)
            return jsonify({"success": True, "dry_run": True, "summary": summary}), 200
        except AllocationError as ae:
            return jsonify({"success": False, "error": ae.message}), 400

    user_id = int(get_jwt_identity())

    # If generating for multiple exams:
    if not exam_id and exam_ids and len(exam_ids) > 1:
        generated = []
        errors = []
        for eid in exam_ids:
            try:
                p = AllocationEngine.generate_plan(
                    exam_id=eid, user_id=user_id, force=force, allow_partial=allow_partial, **options
                )
                generated.append(p)
                log_activity("GENERATE_SEATING", "SeatingPlan", p.id, f"Generated draft plan for exam ID {eid}")
            except AllocationError as ae:
                errors.append(f"Exam {eid}: {ae.message}")

        if not generated and errors:
            return jsonify({"success": False, "error": "; ".join(errors)}), 400

        return jsonify({
            "success": True,
            "message": f"Generated seating plan(s) for {len(generated)} exam(s)!",
            "plans": [p.to_dict(include_allocations=True) for p in generated],
            "plan": generated[0].to_dict(include_allocations=True) if generated else None,
            "summaries": [(p.config_dict or {}).get("summary") for p in generated],
            "errors": errors if errors else None
        }), 201

    # Single exam or fallback
    if not exam_id:
        if exam_ids:
            exam_id = exam_ids[0]
        else:
            first_exam = Examination.query.filter_by(status="SCHEDULED").first() or Examination.query.first()
            if first_exam:
                exam_id = first_exam.id

    if not exam_id:
        return jsonify({"success": False, "error": "Exam ID and at least one Hall ID are required."}), 400

    try:
        plan = AllocationEngine.generate_plan(
            exam_id=exam_id, user_id=user_id, force=force, allow_partial=allow_partial, **options
        )
        summary = (plan.config_dict or {}).get("summary")
        log_activity("GENERATE_SEATING", "SeatingPlan", plan.id, f"Generated draft plan for exam ID {exam_id}")
        return jsonify({
            "success": True,
            "message": "Seating plan generated successfully as DRAFT.",
            "plan": plan.to_dict(include_allocations=True),
            "plans": [plan.to_dict()],
            "summary": summary,
        }), 201
    except AllocationError as ae:
        return jsonify({"success": False, "error": ae.message, "capacity_report": ae.payload}), 400

@seating_bp.route("/<int:id>", methods=["GET"])
@seating_bp.route("/plans/<int:id>", methods=["GET"])
@jwt_required()
def get_seating_plan(id):
    plan = SeatingPlan.query.get_or_404(id)
    allocations = SeatingAllocation.query.filter_by(seating_plan_id=plan.id).all()

    halls_map = {}
    for a in allocations:
        h_id = a.hall_id
        if h_id not in halls_map:
            halls_map[h_id] = {
                "id": h_id,
                "hall_id": h_id,
                "name": a.hall.name,
                "hall_name": a.hall.name,
                "hall_code": a.hall.name,
                "building": a.hall.building,
                "floor": a.hall.floor,
                "num_rows": a.hall.num_rows,
                "seats_per_row": a.hall.seats_per_row,
                "capacity": a.hall.capacity,
                "allocated_count": 0,
                "allocations": [],
                "seats_grid": [],
                "seats": []
            }
        halls_map[h_id]["allocated_count"] += 1
        halls_map[h_id]["allocations"].append(a.to_dict())

    cfg_hall_ids = (plan.config_dict or {}).get("hall_ids") or []
    extra_halls = Hall.query.filter(Hall.id.in_(cfg_hall_ids)).all() if cfg_hall_ids else Hall.query.filter_by(status="ACTIVE").all()
    if not halls_map or cfg_hall_ids:
        for hall in extra_halls:
            if hall.id in halls_map:
                continue
            halls_map[hall.id] = {
                "id": hall.id,
                "hall_id": hall.id,
                "name": hall.name,
                "hall_name": hall.name,
                "hall_code": hall.name,
                "building": hall.building,
                "floor": hall.floor,
                "num_rows": hall.num_rows,
                "seats_per_row": hall.seats_per_row,
                "capacity": hall.capacity,
                "allocated_count": 0,
                "allocations": [],
                "seats_grid": [],
                "seats": []
            }

    cfg = plan.config_dict or {}
    side_mode = cfg.get("side_mode", "BOTH")
    custom_ids = set(cfg.get("seat_ids") or [])
    for h_id, h_data in halls_map.items():
        active_seats = Seat.query.filter_by(hall_id=h_id, is_active=True).order_by(Seat.row_num.asc(), Seat.seat_num.asc()).all()
        lookup = {a["seat_id"]: a for a in h_data["allocations"]}
        grid = []
        for seat in active_seats:
            alloc = lookup.get(seat.id)
            grid.append({
                "seat_id": seat.id,
                "row_num": seat.row_num,
                "seat_num": seat.seat_num,
                "seat_label": seat.seat_label,
                **seat.bench_fields(),
                # position switched off by the plan's side mode / custom selection
                "enabled": AllocationEngine.seat_enabled(seat, side_mode, custom_ids),
                "is_occupied": alloc is not None,
                "allocation": alloc
            })
        h_data["seats_grid"] = grid
        h_data["seats"] = grid

    halls_list = list(halls_map.values())
    plan_dict = plan.to_dict()
    plan_dict["halls"] = halls_list
    plan_dict["allocated_seats"] = len(allocations)
    plan_dict["total_allocated"] = len(allocations)
    plan_dict["summary"] = (plan.config_dict or {}).get("summary")

    return jsonify({
        "success": True,
        "plan": plan_dict,
        "halls": halls_list
    }), 200

@seating_bp.route("/<int:id>/halls/<int:hall_id>/grid", methods=["GET"])
@seating_bp.route("/plans/<int:id>/halls/<int:hall_id>/grid", methods=["GET"])
@jwt_required()
def get_hall_grid(id, hall_id):
    plan = SeatingPlan.query.get_or_404(id)
    hall = Hall.query.get_or_404(hall_id)
    allocations = SeatingAllocation.query.filter_by(seating_plan_id=plan.id, hall_id=hall_id).all()
    lookup = {a.seat_id: a.to_dict() for a in allocations}
    active_seats = Seat.query.filter_by(hall_id=hall_id, is_active=True).order_by(Seat.row_num.asc(), Seat.seat_num.asc()).all()
    grid = []
    for seat in active_seats:
        alloc = lookup.get(seat.id)
        grid.append({
            "seat_id": seat.id,
            "row_num": seat.row_num,
            "seat_num": seat.seat_num,
            "seat_label": seat.seat_label,
            **seat.bench_fields(),
            "is_occupied": alloc is not None,
            "allocation": alloc
        })
    hall_data = {
        "id": hall.id,
        "hall_id": hall.id,
        "name": hall.name,
        "hall_name": hall.name,
        "hall_code": hall.name,
        "building": hall.building,
        "floor": hall.floor,
        "capacity": hall.capacity,
        "allocated_count": len(allocations),
        "seats_grid": grid,
        "seats": grid
    }
    return jsonify({"success": True, "hall": hall_data, "seats_grid": grid}), 200

@seating_bp.route("/<int:id>/publish", methods=["POST"])
@seating_bp.route("/plans/<int:id>/publish", methods=["POST"])
@jwt_required()
@admin_required()
def publish_seating_plan(id):
    plan = SeatingPlan.query.get_or_404(id)
    if plan.status == "ARCHIVED":
        return jsonify({"success": False, "error": "Archived plan versions cannot be published. Regenerate instead."}), 400
    if not plan.allocations:
        return jsonify({"success": False, "error": "Plan has no seat allocations to publish."}), 400
    plan.status = "PUBLISHED"
    plan.published_at = datetime.utcnow()
    
    exam = Examination.query.get(plan.exam_id)
    if exam:
        exam.status = "SEATING_PUBLISHED"

    db.session.commit()
    log_activity("PUBLISH_SEATING", "SeatingPlan", plan.id, f"Published seating plan for {exam.name if exam else plan.exam_id}")
    return jsonify({"success": True, "message": "Seating plan published!", "plan": plan.to_dict()}), 200

@seating_bp.route("/<int:id>/unpublish", methods=["POST"])
@seating_bp.route("/plans/<int:id>/unpublish", methods=["POST"])
@jwt_required()
@admin_required()
def unpublish_seating_plan(id):
    plan = SeatingPlan.query.get_or_404(id)
    if plan.status != "PUBLISHED":
        return jsonify({"success": False, "error": "Only a published plan can be unpublished."}), 400
    plan.status = "DRAFT"
    plan.published_at = None
    if plan.examination:
        plan.examination.status = "SEATING_DRAFT"
    db.session.commit()
    log_activity("UNPUBLISH_SEATING", "SeatingPlan", plan.id, f"Unpublished seating plan for exam ID {plan.exam_id}")
    return jsonify({"success": True, "message": "Seating plan moved back to draft.", "plan": plan.to_dict()}), 200

@seating_bp.route("/<int:id>/pdf", methods=["GET"])
@seating_bp.route("/plans/<int:id>/pdf", methods=["GET"])
@jwt_required()
def export_seating_pdf(id):
    from io import BytesIO
    from flask import send_file
    from reportlab.lib import colors as rl_colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak

    plan = SeatingPlan.query.get_or_404(id)
    allocations = SeatingAllocation.query.filter_by(seating_plan_id=plan.id).all()
    if not allocations:
        return jsonify({"success": False, "error": "Plan has no seat allocations."}), 400

    by_hall = {}
    for a in allocations:
        by_hall.setdefault(a.hall_id, []).append(a)

    styles = getSampleStyleSheet()
    exam = plan.examination
    header = f"{exam.name} ({exam.subject_code}) - {exam.exam_date} {exam.start_time.strftime('%H:%M')}-{exam.end_time.strftime('%H:%M')} - v{plan.version} {plan.status}"
    grid_style = TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, rl_colors.grey),
        ("FONTSIZE", (0, 0), (-1, -1), 7),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ])
    list_style = TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, rl_colors.grey),
        ("BACKGROUND", (0, 0), (-1, 0), rl_colors.lightgrey),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
    ])

    story = []
    for i, (hall_id, hall_allocs) in enumerate(by_hall.items()):
        hall = Hall.query.get(hall_id)
        if i:
            story.append(PageBreak())
        story += [Paragraph(f"Hall {hall.name} ({hall.building}, floor {hall.floor})", styles["Title"]),
                  Paragraph(header, styles["Normal"]), Spacer(1, 8),
                  Paragraph("Seat chart (front of hall at top)", styles["Heading3"])]

        lookup = {(a.seat.row_num, a.seat.seat_num): a for a in hall_allocs}
        seats = Seat.query.filter_by(hall_id=hall_id).order_by(Seat.row_num, Seat.seat_num).all()
        rows = sorted({s.row_num for s in seats})
        cols = sorted({s.seat_num for s in seats})
        label = {(s.row_num, s.seat_num): s.seat_label for s in seats}
        grid = []
        for r in rows:
            line = []
            for c in cols:
                a = lookup.get((r, c))
                text = f"{label.get((r, c), '')} B{(c + 1) // 2}{'L' if c % 2 else 'R'}"
                if a:
                    text += f"\n{a.student.usn}\n{a.student.department.code if a.student.department else ''}"
                line.append(text)
            grid.append(line)
        story += [Table(grid, style=grid_style), Spacer(1, 12),
                  Paragraph("Door list", styles["Heading3"])]

        door = [["USN", "Name", "Dept", "Seat"]] + [
            [a.student.usn, a.student.full_name, a.student.department.code if a.student.department else "", a.seat.seat_label]
            for a in sorted(hall_allocs, key=lambda a: a.student.usn)
        ]
        story.append(Table(door, style=list_style, repeatRows=1))

    buf = BytesIO()
    SimpleDocTemplate(buf, pagesize=landscape(A4), title=header).build(story)
    buf.seek(0)
    return send_file(buf, mimetype="application/pdf", as_attachment=True,
                     download_name=f"seating_plan_{plan.id}_v{plan.version}.pdf")

@seating_bp.route("/<int:id>/allocations/<int:alloc_id>/reassign", methods=["PATCH"])
@seating_bp.route("/plans/<int:id>/allocations/<int:alloc_id>/reassign", methods=["PATCH"])
@jwt_required()
@admin_required()
def reassign_student_seat(id, alloc_id):
    data = request.get_json() or {}
    target_seat_id = data.get("target_seat_id")
    if not target_seat_id:
        return jsonify({"success": False, "error": "Target seat ID is required."}), 400

    user_id = int(get_jwt_identity())
    try:
        reassigned = AllocationEngine.reassign_seat(
            allocation_id=alloc_id,
            target_seat_id=target_seat_id,
            user_id=user_id,
            reason=data.get("reason"),
            plan_id=id,
        )
        log_activity("REASSIGN_SEAT", "SeatingAllocation", reassigned.id, f"Moved {reassigned.student.usn} to {reassigned.seat.seat_label}")
        return jsonify({
            "success": True,
            "message": f"Moved student {reassigned.student.usn} to {reassigned.seat.seat_label}.",
            "allocation": reassigned.to_dict()
        }), 200
    except AllocationError as ae:
        return jsonify({"success": False, "error": ae.message}), 400
