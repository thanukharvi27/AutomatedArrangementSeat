from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.seating import SeatingPlan, SeatingAllocation
from app.models.exam import Examination
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

@seating_bp.route("/generate", methods=["POST"])
@seating_bp.route("/plans/generate", methods=["POST"])
@jwt_required()
@admin_required()
def generate_seating():
    data = request.get_json() or {}
    exam_id = data.get("exam_id")
    exam_ids = data.get("exam_ids", [])
    hall_ids = data.get("hall_ids", [])
    policy = data.get("policy", "INTERLEAVE")
    force = data.get("force", True)

    if not exam_id and exam_ids and len(exam_ids) == 1:
        exam_id = exam_ids[0]

    user_id = int(get_jwt_identity())

    # If generating for multiple exams:
    if not exam_id and exam_ids and len(exam_ids) > 1:
        generated = []
        errors = []
        for eid in exam_ids:
            try:
                p = AllocationEngine.generate_plan(
                    exam_id=eid,
                    hall_ids=hall_ids,
                    user_id=user_id,
                    policy=policy,
                    force=force
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
            exam_id=exam_id,
            hall_ids=hall_ids,
            user_id=user_id,
            policy=policy,
            force=force
        )
        log_activity("GENERATE_SEATING", "SeatingPlan", plan.id, f"Generated draft plan for exam ID {exam_id}")
        return jsonify({
            "success": True,
            "message": "Seating plan generated successfully as DRAFT.",
            "plan": plan.to_dict(include_allocations=True),
            "plans": [plan.to_dict()]
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

    if not halls_map:
        for hall in Hall.query.filter_by(status="ACTIVE").all():
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
    plan.status = "PUBLISHED"
    plan.published_at = datetime.utcnow()
    
    exam = Examination.query.get(plan.exam_id)
    if exam:
        exam.status = "SEATING_PUBLISHED"

    db.session.commit()
    log_activity("PUBLISH_SEATING", "SeatingPlan", plan.id, f"Published seating plan for {exam.name if exam else plan.exam_id}")
    return jsonify({"success": True, "message": "Seating plan published!", "plan": plan.to_dict()}), 200

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
            reason=data.get("reason")
        )
        return jsonify({
            "success": True,
            "message": f"Moved student {reassigned.student.usn} to {reassigned.seat.seat_label}.",
            "allocation": reassigned.to_dict()
        }), 200
    except AllocationError as ae:
        return jsonify({"success": False, "error": ae.message}), 400
