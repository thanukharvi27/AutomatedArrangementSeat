from datetime import date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.models.student import Student
from app.models.exam import Examination, ExamRegistration
from app.models.hall import Hall, Seat
from app.models.seating import SeatingAllocation
from app.models.faculty import Faculty
from app.models.activity_log import ActivityLog
from app.utils.auth import admin_required

report_bp = Blueprint("reports", __name__, url_prefix="/api/reports")

@report_bp.route("/dashboard", methods=["GET"])
@jwt_required()
@admin_required()
def get_dashboard_stats():
    total_students = Student.query.count()
    active_students = Student.query.filter_by(status="ACTIVE").count()
    total_exams = Examination.query.count()
    upcoming_exams = Examination.query.filter(Examination.exam_date >= date.today()).count()
    total_halls = Hall.query.filter_by(status="ACTIVE").count()
    total_available_seats = Seat.query.filter_by(is_active=True).count()
    total_allocated_seats = SeatingAllocation.query.filter_by(status="ALLOCATED").count()
    total_faculty = Faculty.query.filter_by(is_active=True).count()

    recent_logs = ActivityLog.query.order_by(ActivityLog.created_at.desc()).limit(10).all()
    recent_exams = Examination.query.order_by(Examination.exam_date.asc()).limit(5).all()

    return jsonify({
        "success": True,
        "statistics": {
            "total_students": total_students,
            "active_students": active_students,
            "total_exams": total_exams,
            "upcoming_exams": upcoming_exams,
            "total_halls": total_halls,
            "total_available_seats": total_available_seats,
            "total_allocated_seats": total_allocated_seats,
            "total_faculty": total_faculty,
            "unallocated_students": max(0, total_students - total_allocated_seats),
        },
        "recent_exams": [e.to_dict() for e in recent_exams],
        "recent_activities": [l.to_dict() for l in recent_logs]
    }), 200

@report_bp.route("/occupancy", methods=["GET"])
@jwt_required()
@admin_required()
def get_occupancy_report():
    halls = Hall.query.filter_by(status="ACTIVE").all()
    results = []
    for h in halls:
        total_seats = Seat.query.filter_by(hall_id=h.id, is_active=True).count()
        occupied = SeatingAllocation.query.filter_by(hall_id=h.id, status="ALLOCATED").count()
        pct = round((occupied / total_seats * 100), 1) if total_seats > 0 else 0
        results.append({
            "hall_id": h.id,
            "hall_name": h.name,
            "building": h.building,
            "floor": h.floor,
            "total_seats": total_seats,
            "occupied_seats": occupied,
            "available_seats": max(0, total_seats - occupied),
            "occupancy_percentage": pct
        })
    return jsonify({"success": True, "occupancy": results}), 200
