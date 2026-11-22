from flask import Flask, jsonify
from config import Config
from app.extensions import db, jwt, migrate, cors

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config.get("CORS_ORIGINS", "*")}})

    from app.routes.auth_routes import auth_bp
    from app.routes.department_routes import dept_bp
    from app.routes.student_routes import student_bp
    from app.routes.exam_routes import exam_bp
    from app.routes.hall_routes import hall_bp
    from app.routes.seating_routes import seating_bp
    from app.routes.student_portal_routes import student_portal_bp, public_portal_bp
    from app.routes.faculty_routes import faculty_bp
    from app.routes.report_routes import report_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(dept_bp)
    app.register_blueprint(student_bp)
    app.register_blueprint(exam_bp)
    app.register_blueprint(hall_bp)
    app.register_blueprint(seating_bp)
    app.register_blueprint(seating_bp, url_prefix="/api/seating", name="seating_alt")
    app.register_blueprint(student_portal_bp)
    app.register_blueprint(public_portal_bp)
    app.register_blueprint(faculty_bp)
    app.register_blueprint(report_bp)

    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify({
            "status": "healthy",
            "service": "ExamEase REST API",
            "version": "1.0.0",
            "database": "connected"
        }), 200

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"success": False, "error": "Requested resource not found"}), 404

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"success": False, "error": "Internal server error"}), 500

    return app
