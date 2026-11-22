import csv
import io
from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required
from app.extensions import db
from app.models.student import Student
from app.models.department import Department
from app.utils.auth import admin_required, log_activity

student_bp = Blueprint("students", __name__, url_prefix="/api/students")

@student_bp.route("", methods=["GET"])
@jwt_required()
def get_students():
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    search = request.args.get("search", "").strip()
    department_id = request.args.get("department_id", type=int)
    semester = request.args.get("semester", type=int)
    status = request.args.get("status", "").strip().upper()

    query = Student.query

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Student.usn.ilike(search_filter)) | 
            (Student.full_name.ilike(search_filter)) |
            (Student.email.ilike(search_filter))
        )
    if department_id:
        query = query.filter(Student.department_id == department_id)
    if semester:
        query = query.filter(Student.semester == semester)
    if status in ("ACTIVE", "INACTIVE"):
        query = query.filter(Student.status == status)

    pagination = query.order_by(Student.usn.asc()).paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "success": True,
        "students": [s.to_dict() for s in pagination.items],
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages,
        "per_page": pagination.per_page,
    }), 200

@student_bp.route("/<int:id>", methods=["GET"])
@jwt_required()
def get_student(id):
    student = Student.query.get_or_404(id)
    return jsonify({"success": True, "student": student.to_dict()}), 200

@student_bp.route("", methods=["POST"])
@jwt_required()
@admin_required()
def create_student():
    data = request.get_json() or {}
    usn = data.get("usn", "").strip().upper()
    full_name = data.get("full_name", "").strip()
    department_id = data.get("department_id")
    semester = data.get("semester")
    section = data.get("section", "A").strip().upper()
    email = data.get("email", "").strip().lower()
    phone = data.get("phone", "").strip() or None

    if not usn or not full_name or not department_id or not semester or not email:
        return jsonify({"success": False, "error": "USN, full name, department, semester, and email are required."}), 400

    if Student.query.filter_by(usn=usn).first():
        return jsonify({"success": False, "error": f"Student with USN '{usn}' already exists."}), 409

    if Student.query.filter_by(email=email).first():
        return jsonify({"success": False, "error": f"Student with email '{email}' already exists."}), 409

    dept = Department.query.get(department_id)
    if not dept:
        return jsonify({"success": False, "error": f"Department with ID {department_id} not found."}), 404

    student = Student(
        usn=usn,
        full_name=full_name,
        department_id=department_id,
        semester=int(semester),
        section=section,
        email=email,
        phone=phone,
        status="ACTIVE"
    )
    db.session.add(student)
    db.session.commit()
    log_activity("CREATE_STUDENT", "Student", student.id, f"Added student {usn} - {full_name}")

    return jsonify({"success": True, "student": student.to_dict()}), 201

@student_bp.route("/<int:id>", methods=["PATCH"])
@jwt_required()
@admin_required()
def update_student(id):
    student = Student.query.get_or_404(id)
    data = request.get_json() or {}

    if "full_name" in data:
        student.full_name = data["full_name"].strip()
    if "department_id" in data:
        dept = Department.query.get(data["department_id"])
        if not dept:
            return jsonify({"success": False, "error": "Invalid department ID."}), 400
        student.department_id = dept.id
    if "semester" in data:
        student.semester = int(data["semester"])
    if "section" in data:
        student.section = data["section"].strip().upper()
    if "email" in data:
        new_email = data["email"].strip().lower()
        if new_email != student.email and Student.query.filter_by(email=new_email).first():
            return jsonify({"success": False, "error": "Email already in use."}), 409
        student.email = new_email
    if "phone" in data:
        student.phone = data["phone"].strip() or None
    if "status" in data:
        if data["status"] in ("ACTIVE", "INACTIVE"):
            student.status = data["status"]

    db.session.commit()
    log_activity("UPDATE_STUDENT", "Student", student.id, f"Updated student {student.usn}")

    return jsonify({"success": True, "student": student.to_dict()}), 200

@student_bp.route("/<int:id>", methods=["DELETE"])
@jwt_required()
@admin_required()
def delete_student(id):
    student = Student.query.get_or_404(id)
    active_allocs = student.allocations.count()
    if active_allocs > 0:
        student.status = "INACTIVE"
        db.session.commit()
        log_activity("DEACTIVATE_STUDENT", "Student", student.id, f"Deactivated student {student.usn} due to existing seating history")
        return jsonify({
            "success": True,
            "message": f"Student has {active_allocs} exam seating allocation(s). Record was deactivated to preserve DBMS integrity.",
            "status": "INACTIVE"
        }), 200

    db.session.delete(student)
    db.session.commit()
    log_activity("DELETE_STUDENT", "Student", id, f"Deleted student ID {id}")
    return jsonify({"success": True, "message": "Student deleted successfully"}), 200
