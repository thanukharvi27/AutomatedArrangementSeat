from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.extensions import db
from app.models.faculty import Faculty
from app.models.invigilation import InvigilationAssignment
from app.models.exam import Examination
from app.models.hall import Hall
from app.utils.auth import admin_required, get_current_user, log_activity

faculty_bp = Blueprint("faculty", __name__, url_prefix="/api/faculty")

@faculty_bp.route("", methods=["GET"])
@jwt_required()
def get_faculty_list():
    faculty = Faculty.query.order_by(Faculty.full_name.asc()).all()
    return jsonify({"success": True, "faculty": [f.to_dict() for f in faculty]}), 200

@faculty_bp.route("", methods=["POST"])
@jwt_required()
@admin_required()
def create_faculty():
    data = request.get_json() or {}
    emp_id = data.get("employee_id", "").strip().upper()
    name = data.get("full_name", "").strip()
    dept_id = data.get("department_id")
    email = data.get("email", "").strip().lower()

    if not emp_id or not name or not dept_id or not email:
        return jsonify({"success": False, "error": "Employee ID, name, department, and email are required."}), 400

    f = Faculty(employee_id=emp_id, full_name=name, department_id=dept_id, email=email, is_active=True)
    db.session.add(f)
    db.session.commit()
    return jsonify({"success": True, "faculty": f.to_dict()}), 201

@faculty_bp.route("/invigilation", methods=["GET"])
@jwt_required()
def get_invigilation_duties():
    assignments = InvigilationAssignment.query.order_by(InvigilationAssignment.duty_date.asc()).all()
    return jsonify({"success": True, "assignments": [a.to_dict() for a in assignments]}), 200

@faculty_bp.route("/invigilation", methods=["POST"])
@jwt_required()
@admin_required()
def assign_invigilation():
    data = request.get_json() or {}
    exam_id = data.get("exam_id")
    hall_id = data.get("hall_id")
    faculty_id = data.get("faculty_id")

    exam = Examination.query.get_or_404(exam_id)
    hall = Hall.query.get_or_404(hall_id)
    faculty = Faculty.query.get_or_404(faculty_id)

    conflict = InvigilationAssignment.query.filter(
        InvigilationAssignment.faculty_id == faculty.id,
        InvigilationAssignment.duty_date == exam.exam_date,
        InvigilationAssignment.status != "CANCELLED",
        InvigilationAssignment.start_time < exam.end_time,
        InvigilationAssignment.end_time > exam.start_time
    ).first()

    if conflict:
        return jsonify({"success": False, "error": f"Conflict: Faculty is already assigned to {conflict.hall.name}."}), 409

    assignment = InvigilationAssignment(
        exam_id=exam.id,
        hall_id=hall.id,
        faculty_id=faculty.id,
        duty_date=exam.exam_date,
        start_time=exam.start_time,
        end_time=exam.end_time,
        status="ASSIGNED",
        notes=data.get("notes")
    )
    db.session.add(assignment)
    db.session.commit()
    return jsonify({"success": True, "assignment": assignment.to_dict()}), 201

@faculty_bp.route("/invigilation/<int:id>", methods=["DELETE"])
@jwt_required()
@admin_required()
def cancel_invigilation(id):
    assignment = InvigilationAssignment.query.get_or_404(id)
    db.session.delete(assignment)
    db.session.commit()
    return jsonify({"success": True, "message": "Duty cancelled."}), 200

@faculty_bp.route("/me/duties", methods=["GET"])
@jwt_required()
def get_my_duties():
    user = get_current_user()
    if not user or user.role != "FACULTY" or not user.faculty:
        return jsonify({"success": False, "error": "Faculty not found"}), 404

    duties = InvigilationAssignment.query.filter_by(faculty_id=user.faculty.id).all()
    return jsonify({"success": True, "faculty": user.faculty.to_summary_dict(), "duties": [d.to_dict() for d in duties]}), 200
