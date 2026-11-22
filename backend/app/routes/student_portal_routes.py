from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.extensions import db
from app.models.student import Student
from app.models.exam import Examination, ExamRegistration
from app.models.seating import SeatingPlan, SeatingAllocation
from app.utils.auth import get_current_user

student_portal_bp = Blueprint("student_portal", __name__, url_prefix="/api/student")
public_portal_bp = Blueprint("public_portal", __name__, url_prefix="/api/student-portal")

def _get_student():
    user = get_current_user()
    if not user:
        return None
    if user.student:
        return user.student
    # If logged in as student role, fallback query
    if user.role == "STUDENT":
        return Student.query.filter_by(user_id=user.id).first()
    return None

def _build_card(student, exam, allocation, plan=None):
    if not allocation:
        return None
    return {
        "student_name": student.full_name,
        "usn": student.usn,
        "department": student.department.name if student.department else "",
        "semester": student.semester,
        "section": student.section,
        "exam_name": exam.name,
        "subject_code": exam.subject_code,
        "exam_date": exam.exam_date.isoformat(),
        "start_time": exam.start_time.strftime("%H:%M"),
        "end_time": exam.end_time.strftime("%H:%M"),
        "hall_name": allocation.hall.name,
        "building": allocation.hall.building,
        "floor": allocation.hall.floor,
        "seat_label": allocation.seat.seat_label,
        "row_number": allocation.seat.row_num,
        "seat_number": allocation.seat.seat_num,
        "plan_version": plan.version if plan else 1
    }

@student_portal_bp.route("/dashboard", methods=["GET"])
@jwt_required()
def get_dashboard():
    student = _get_student()
    if not student:
        return jsonify({"success": False, "error": "Student profile not found"}), 404

    regs = ExamRegistration.query.filter_by(student_id=student.id, status="ELIGIBLE").all()
    exam_ids = [r.exam_id for r in regs]
    exams = Examination.query.filter(Examination.id.in_(exam_ids)).order_by(Examination.exam_date.asc(), Examination.start_time.asc()).all()

    upcoming_list = []
    next_exam_card = None

    for ex in exams:
        published_plan = SeatingPlan.query.filter_by(exam_id=ex.id, status="PUBLISHED").first()
        allocation = None
        if published_plan:
            allocation = SeatingAllocation.query.filter_by(
                exam_id=ex.id, student_id=student.id, status="ALLOCATED"
            ).first()

        session_name = "Morning" if ex.start_time.hour < 12 else "Afternoon"

        if allocation and not next_exam_card:
            next_exam_card = _build_card(student, ex, allocation, published_plan)

        upcoming_list.append({
            "id": ex.id,
            "course_code": ex.subject_code,
            "course_name": ex.name,
            "subject_code": ex.subject_code,
            "name": ex.name,
            "exam_date": ex.exam_date.isoformat(),
            "start_time": ex.start_time.strftime("%H:%M"),
            "end_time": ex.end_time.strftime("%H:%M"),
            "session": session_name,
            "has_seating": allocation is not None,
            "hall_code": allocation.hall.name if allocation else "TBA",
            "seat_label": allocation.seat.seat_label if allocation else "TBA"
        })

    return jsonify({
        "success": True,
        "student": student.to_dict(),
        "next_exam": next_exam_card,
        "upcoming_exams": upcoming_list
    }), 200

@student_portal_bp.route("/profile", methods=["GET"])
@student_portal_bp.route("/me/profile", methods=["GET"])
@jwt_required()
def get_profile():
    student = _get_student()
    if not student:
        return jsonify({"success": False, "error": "Student profile not found"}), 404
    return jsonify({"success": True, "student": student.to_dict()}), 200

@student_portal_bp.route("/profile", methods=["PATCH"])
@student_portal_bp.route("/me/profile", methods=["PATCH"])
@jwt_required()
def update_profile():
    student = _get_student()
    if not student:
        return jsonify({"success": False, "error": "Student profile not found"}), 404
    data = request.get_json() or {}
    if "phone" in data:
        student.phone = data["phone"].strip() or None
    db.session.commit()
    return jsonify({"success": True, "student": student.to_dict()}), 200

@student_portal_bp.route("/exams", methods=["GET"])
@student_portal_bp.route("/me/exams", methods=["GET"])
@jwt_required()
def get_exams():
    student = _get_student()
    if not student:
        return jsonify({"success": False, "error": "Student profile not found"}), 404

    regs = ExamRegistration.query.filter_by(student_id=student.id, status="ELIGIBLE").all()
    exam_ids = [r.exam_id for r in regs]
    exams = Examination.query.filter(Examination.id.in_(exam_ids)).order_by(Examination.exam_date.asc(), Examination.start_time.asc()).all()

    results = []
    for ex in exams:
        published_plan = SeatingPlan.query.filter_by(exam_id=ex.id, status="PUBLISHED").first()
        allocation = None
        if published_plan:
            allocation = SeatingAllocation.query.filter_by(exam_id=ex.id, student_id=student.id, status="ALLOCATED").first()

        session_name = "Morning" if ex.start_time.hour < 12 else "Afternoon"

        results.append({
            "id": ex.id,
            "exam_id": ex.id,
            "course_code": ex.subject_code,
            "course_name": ex.name,
            "subject_code": ex.subject_code,
            "name": ex.name,
            "exam_date": ex.exam_date.isoformat(),
            "start_time": ex.start_time.strftime("%H:%M"),
            "end_time": ex.end_time.strftime("%H:%M"),
            "session": session_name,
            "status": ex.status,
            "is_published": published_plan is not None,
            "has_seating": allocation is not None,
            "hall_code": allocation.hall.name if allocation else "TBA",
            "seat_label": allocation.seat.seat_label if allocation else "TBA",
            "seat_summary": f"{allocation.hall.name} - Seat {allocation.seat.seat_label}" if allocation else None
        })

    return jsonify({"success": True, "exams": results}), 200

@student_portal_bp.route("/exams/<int:exam_id>/seating", methods=["GET"])
@student_portal_bp.route("/me/exams/<int:exam_id>/seating", methods=["GET"])
@jwt_required()
def find_seat(exam_id):
    student = _get_student()
    if not student:
        return jsonify({"success": False, "error": "Student profile not found"}), 404

    exam = Examination.query.get_or_404(exam_id)
    published_plan = SeatingPlan.query.filter_by(exam_id=exam.id, status="PUBLISHED").first()
    if not published_plan:
        return jsonify({
            "success": True,
            "published": False,
            "message": "Seating arrangement for this exam is not yet published."
        }), 200

    allocation = SeatingAllocation.query.filter_by(
        exam_id=exam.id,
        student_id=student.id,
        status="ALLOCATED"
    ).first()

    if not allocation:
        return jsonify({
            "success": True,
            "published": True,
            "allocated": False,
            "message": "Seating published, but no seat is allocated to your record."
        }), 200

    return jsonify({
        "success": True,
        "published": True,
        "allocated": True,
        "card": _build_card(student, exam, allocation, published_plan)
    }), 200

@public_portal_bp.route("/find-seat", methods=["GET"])
def public_find_seat():
    usn = request.args.get("usn", "").strip().upper()
    if not usn:
        return jsonify({"success": False, "error": "USN parameter is required"}), 400

    student = Student.query.filter(Student.usn.ilike(usn)).first()
    if not student:
        return jsonify({"success": True, "allocations": [], "message": f"No student found with USN {usn}"}), 200

    allocations = (
        SeatingAllocation.query
        .join(Examination, SeatingAllocation.exam_id == Examination.id)
        .join(SeatingPlan, SeatingAllocation.seating_plan_id == SeatingPlan.id)
        .filter(
            SeatingAllocation.student_id == student.id,
            SeatingAllocation.status == "ALLOCATED",
            SeatingPlan.status == "PUBLISHED"
        )
        .order_by(Examination.exam_date.asc(), Examination.start_time.asc())
        .all()
    )

    cards = []
    for alloc in allocations:
        cards.append(_build_card(student, alloc.examination, alloc))

    return jsonify({"success": True, "allocations": cards}), 200
