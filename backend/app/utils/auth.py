from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt
from app.models.user import User
from app.models.activity_log import ActivityLog
from app.extensions import db

def get_current_user():
    verify_jwt_in_request()
    identity = get_jwt_identity()
    user_id = int(identity) if identity is not None else None
    if not user_id:
        return None
    return User.query.get(user_id)

def role_required(*allowed_roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            user_role = claims.get("role")
            if not user_role or user_role not in allowed_roles:
                return jsonify({
                    "success": False,
                    "error": "Forbidden: insufficient permissions for this operation",
                    "required_roles": list(allowed_roles),
                    "current_role": user_role
                }), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def admin_required():
    return role_required("ADMIN")

def faculty_or_admin_required():
    return role_required("ADMIN", "FACULTY")

def student_required():
    return role_required("STUDENT")

def log_activity(action: str, entity_type: str, entity_id: int = None, details: str = None, user_id: int = None):
    try:
        if user_id is None:
            try:
                verify_jwt_in_request(optional=True)
                ident = get_jwt_identity()
                if ident:
                    user_id = int(ident)
            except Exception:
                user_id = None
        
        log = ActivityLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details
        )
        db.session.add(log)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Error logging activity: {e}")
