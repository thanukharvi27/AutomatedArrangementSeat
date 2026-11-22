from datetime import datetime, date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.extensions import db
from app.models.exam import Examination, ExamRegistration
from app.models.department import Department
from app.models.student import Student
from app.utils.auth import admin_required, log_activity

exam_bp = Blueprint("exams", __name__, url_prefix="/api/exams")

@exam_bp.route("", methods=["GET"])
@jwt_required()
def get_exams():
    status = request.args.get("status")
    department_id = request.args.get("department_id", type=int)
    semester = request.args.get("semester", type=int)
    upcoming_only = request.args.get("upcoming", "false").lower() in ("true", "1")

    query = Examination.query

    if status:
        query = query.filter(Examination.status == status)
    if department_id:
        query = query.filter(Examination.department_id == department_id)
    if semester:
        query = query.filter(Examination.semester == semester)
    if upcoming_only:
        query = query.filter(Examination.exam_date >= date.today())

    exams = query.order_by(Examination.exam_date.asc(), Examination.start_time.asc()).all()
    return jsonify({"success": True, "exams": [e.to_dict() for e in exams]}), 200

@exam_bp.route("/<int:id>", methods=["GET"])
@jwt_required()
def get_exam(id):
    exam = Examination.query.get_or_404(id)
    return jsonify({"success": True, "exam": exam.to_dict()}), 200

@exam_bp.route("", methods=["POST"])
@jwt_required()
@admin_required()
def create_exam():
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    subject_code = data.get("subject_code", "").strip().upper()
    department_id = data.get("department_id")
    semester = data.get("semester")
    exam_date_str = data.get("exam_date")
    start_time_str = data.get("start_time")
    end_time_str = data.get("end_time")
    exam_type = data.get("exam_type", "REGULAR")

    if not all([name, subject_code, department_id, semester, exam_date_str, start_time_str, end_time_str]):
        return jsonify({"success": False, "error": "All exam parameters are required."}), 400

    try:
        e_date = datetime.strptime(exam_date_str, "%Y-%m-%d").date()
        s_time = datetime.strptime(start_time_str, "%H:%M").time()
        e_time = datetime.strptime(end_time_str, "%H:%M").time()
    except ValueError as ve:
        return jsonify({"success": False, "error": f"Invalid date/time format: {ve}"}), 400

    if s_time >= e_time:
        return jsonify({"success": False, "error": "End time must be later than start time."}), 400

    dept = Department.query.get(department_id)
    if not dept:
        return jsonify({"success": False, "error": f"Department ID {department_id} not found."}), 404

    exam = Examination(
        name=name,
        subject_code=subject_code,
        department_id=department_id,
        semester=int(semester),
        exam_date=e_date,
        start_time=s_time,
        end_time=e_time,
        exam_type=exam_type,
        status="SCHEDULED"
    )
    db.session.add(exam)
    db.session.commit()

    if data.get("auto_register_students", True):
        students = Student.query.filter_by(
            department_id=department_id,
            semester=int(semester),
            status="ACTIVE"
        ).all()
        for s in students:
            reg = ExamRegistration(exam_id=exam.id, student_id=s.id, status="ELIGIBLE")
            db.session.add(reg)
        db.session.commit()

    log_activity("CREATE_EXAM", "Examination", exam.id, f"Created exam {name} ({subject_code})")
    return jsonify({"success": True, "exam": exam.to_dict()}), 201

@exam_bp.route("/<int:id>", methods=["PATCH"])
@jwt_required()
@admin_required()
def update_exam(id):
    exam = Examination.query.get_or_404(id)
    data = request.get_json() or {}

    if "name" in data:
        exam.name = data["name"].strip()
    if "subject_code" in data:
        exam.subject_code = data["subject_code"].strip().upper()
    if "status" in data:
        exam.status = data["status"]

    db.session.commit()
    log_activity("UPDATE_EXAM", "Examination", exam.id, f"Updated exam {exam.name}")
    return jsonify({"success": True, "exam": exam.to_dict()}), 200

@exam_bp.route("/<int:id>/registrations", methods=["GET"])
@jwt_required()
def get_exam_registrations(id):
    exam = Examination.query.get_or_404(id)
    registrations = ExamRegistration.query.filter_by(exam_id=exam.id).all()
    return jsonify({
        "success": True,
        "exam_id": exam.id,
        "registrations": [r.to_dict() for r in registrations]
    }), 200

@exam_bp.route("/<int:id>/register-students", methods=["POST"])
@jwt_required()
@admin_required()
def register_students_for_exam(id):
    exam = Examination.query.get_or_404(id)
    data = request.get_json() or {}
    
    dept_id = data.get("department_id", exam.department_id)
    semester = data.get("semester", exam.semester)

    students = Student.query.filter_by(
        department_id=dept_id,
        semester=semester,
        status="ACTIVE"
    ).all()

    registered_count = 0
    for s in students:
        existing = ExamRegistration.query.filter_by(exam_id=exam.id, student_id=s.id).first()
        if not existing:
            reg = ExamRegistration(exam_id=exam.id, student_id=s.id, status="ELIGIBLE")
            db.session.add(reg)
            registered_count += 1

    db.session.commit()
    return jsonify({
        "success": True,
        "message": f"Successfully registered {registered_count} students.",
        "registered_count": registered_count
    }), 200
