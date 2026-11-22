from datetime import datetime
from app.extensions import db

class Faculty(db.Model):
    __tablename__ = "faculty"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), unique=True, nullable=True)
    employee_id = db.Column(db.String(32), unique=True, nullable=False, index=True)
    full_name = db.Column(db.String(128), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id", ondelete="RESTRICT"), nullable=False)
    email = db.Column(db.String(128), unique=True, nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship("User", back_populates="faculty")
    department = db.relationship("Department", back_populates="faculty")
    invigilation_assignments = db.relationship("InvigilationAssignment", back_populates="faculty", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "employee_id": self.employee_id,
            "full_name": self.full_name,
            "department_id": self.department_id,
            "department_code": self.department.code if self.department else None,
            "department_name": self.department.name if self.department else None,
            "email": self.email,
            "phone": self.phone,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def to_summary_dict(self):
        return {
            "id": self.id,
            "employee_id": self.employee_id,
            "full_name": self.full_name,
            "department_code": self.department.code if self.department else None,
        }
