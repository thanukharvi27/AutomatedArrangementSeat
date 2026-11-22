from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.extensions import db
from app.models.hall import Hall, Seat
from app.utils.auth import admin_required, log_activity

hall_bp = Blueprint("halls", __name__, url_prefix="/api/halls")

@hall_bp.route("", methods=["GET"])
@jwt_required()
def get_halls():
    status = request.args.get("status")
    include_seats = request.args.get("include_seats", "false").lower() in ("true", "1")
    
    query = Hall.query
    if status:
        query = query.filter_by(status=status)
    
    halls = query.order_by(Hall.building.asc(), Hall.name.asc()).all()
    return jsonify({"success": True, "halls": [h.to_dict(include_seats=include_seats) for h in halls]}), 200

@hall_bp.route("/<int:id>", methods=["GET"])
@jwt_required()
def get_hall(id):
    hall = Hall.query.get_or_404(id)
    include_seats = request.args.get("include_seats", "true").lower() in ("true", "1")
    return jsonify({"success": True, "hall": hall.to_dict(include_seats=include_seats)}), 200

@hall_bp.route("", methods=["POST"])
@jwt_required()
@admin_required()
def create_hall():
    data = request.get_json() or {}
    name = data.get("name", "").strip().upper()
    building = data.get("building", "").strip()
    floor = int(data.get("floor", 1))
    room_type = data.get("room_type", "CLASSROOM")
    num_rows = int(data.get("num_rows", 5))
    seats_per_row = int(data.get("seats_per_row", 6))
    capacity = int(data.get("capacity", num_rows * seats_per_row))
    notes = data.get("notes", "").strip()

    if not name or not building:
        return jsonify({"success": False, "error": "Hall name and building are required."}), 400

    if Hall.query.filter_by(name=name).first():
        return jsonify({"success": False, "error": f"Hall '{name}' already exists."}), 409

    hall = Hall(
        name=name,
        building=building,
        floor=floor,
        room_type=room_type,
        capacity=capacity,
        num_rows=num_rows,
        seats_per_row=seats_per_row,
        status="ACTIVE",
        notes=notes
    )
    db.session.add(hall)
    db.session.flush()

    for r in range(1, num_rows + 1):
        row_letter = chr(64 + r) if r <= 26 else f"R{r}"
        for s in range(1, seats_per_row + 1):
            seat_label = f"{row_letter}{s}"
            seat = Seat(hall_id=hall.id, row_num=r, seat_num=s, seat_label=seat_label, is_active=True)
            db.session.add(seat)

    db.session.commit()
    log_activity("CREATE_HALL", "Hall", hall.id, f"Created hall {name} with capacity {capacity}")
    return jsonify({"success": True, "hall": hall.to_dict(include_seats=True)}), 201

@hall_bp.route("/<int:id>/generate-seats", methods=["POST"])
@jwt_required()
@admin_required()
def generate_seats(id):
    hall = Hall.query.get_or_404(id)
    if hall.allocations.count() > 0:
        return jsonify({"success": False, "error": "Cannot regenerate seats: hall has active seating history."}), 400

    Seat.query.filter_by(hall_id=hall.id).delete()
    for r in range(1, hall.num_rows + 1):
        row_letter = chr(64 + r) if r <= 26 else f"R{r}"
        for s in range(1, hall.seats_per_row + 1):
            seat = Seat(hall_id=hall.id, row_num=r, seat_num=s, seat_label=f"{row_letter}{s}", is_active=True)
            db.session.add(seat)

    db.session.commit()
    return jsonify({"success": True, "message": f"Generated seats for {hall.name}."}), 201
