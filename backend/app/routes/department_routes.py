from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.extensions import db
from app.models.department import Department
from app.utils.auth import admin_required

dept_bp = Blueprint("departments", __name__, url_prefix="/api/departments")

@dept_bp.route("", methods=["GET"])
def get_departments():
    depts = Department.query.order_by(Department.code.asc()).all()
    return jsonify({"success": True, "departments": [d.to_dict() for d in depts]}), 200

@dept_bp.route("", methods=["POST"])
@jwt_required()
@admin_required()
def create_department():
    data = request.get_json() or {}
    code = data.get("code", "").strip().upper()
    name = data.get("name", "").strip()

    if not code or not name:
        return jsonify({"success": False, "error": "Department code and name are required."}), 400

    if Department.query.filter_by(code=code).first():
        return jsonify({"success": False, "error": f"Department with code '{code}' already exists."}), 409

    dept = Department(code=code, name=name)
    db.session.add(dept)
    db.session.commit()

    return jsonify({"success": True, "department": dept.to_dict()}), 201
