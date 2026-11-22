from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from app.extensions import db
from app.models.user import User
from app.models.student import Student
from app.utils.auth import get_current_user, log_activity

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    identifier = data.get("username", "").strip()
    password = data.get("password", "")

    if not identifier or not password:
        return jsonify({"success": False, "error": "Username/email and password are required."}), 400

    user = User.query.filter(
        (User.username == identifier) | (User.email == identifier.lower())
    ).first()

    if not user or not user.check_password(password):
        return jsonify({"success": False, "error": "Invalid username or password."}), 401

    if not user.is_active:
        return jsonify({"success": False, "error": "This account is inactive. Please contact an administrator."}), 403

    claims = {"role": user.role, "username": user.username}
    access_token = create_access_token(identity=str(user.id), additional_claims=claims)
    refresh_token = create_refresh_token(identity=str(user.id), additional_claims=claims)

    log_activity("LOGIN", "User", user.id, f"User {user.username} logged in as {user.role}", user_id=user.id)

    return jsonify({
        "success": True,
        "message": "Login successful",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user.to_dict()
    }), 200

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    usn = data.get("usn", "").strip().upper()

    if not username or not email or not password:
        return jsonify({"success": False, "error": "Username, email, and password are required."}), 400

    if len(password) < 8:
        return jsonify({"success": False, "error": "Password must be at least 8 characters long."}), 400

    if User.query.filter((User.username == username) | (User.email == email)).first():
        return jsonify({"success": False, "error": "A user with this username or email already exists."}), 409

    student = None
    if usn:
        student = Student.query.filter_by(usn=usn).first()
        if not student:
            return jsonify({"success": False, "error": f"No student record found with USN '{usn}'. Please contact administrator."}), 404
        if student.user_id:
            return jsonify({"success": False, "error": f"An account has already been registered for USN '{usn}'."}), 409

    new_user = User(
        username=username,
        email=email,
        role="STUDENT",
        is_active=True
    )
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.flush()

    if student:
        student.user_id = new_user.id
        if not student.email:
            student.email = email

    db.session.commit()
    log_activity("REGISTER", "User", new_user.id, f"Student self-registered: {username} (USN: {usn})", user_id=new_user.id)

    claims = {"role": new_user.role, "username": new_user.username}
    access_token = create_access_token(identity=str(new_user.id), additional_claims=claims)

    return jsonify({
        "success": True,
        "message": "Registration successful",
        "access_token": access_token,
        "user": new_user.to_dict()
    }), 201

@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    user = User.query.get(int(identity))
    if not user or not user.is_active:
        return jsonify({"success": False, "error": "User session expired or inactive."}), 401

    claims = {"role": user.role, "username": user.username}
    new_access_token = create_access_token(identity=str(user.id), additional_claims=claims)
    return jsonify({"success": True, "access_token": new_access_token}), 200

@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user = get_current_user()
    if not user:
        return jsonify({"success": False, "error": "User not found"}), 404
    return jsonify({"success": True, "user": user.to_dict()}), 200

@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    user = get_current_user()
    if user:
        log_activity("LOGOUT", "User", user.id, f"User {user.username} logged out", user_id=user.id)
    return jsonify({"success": True, "message": "Logged out successfully"}), 200
