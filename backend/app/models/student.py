from datetime import datetime
from app.extensions import db

class Student(db.Model):
    __tablename__ = "students"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), unique=True, nullable=True)
    usn = db.Column(db.String(32), unique=True, nullable=False, index=True)
    full_name = db.Column(db.String(128), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id", ondelete="RESTRICT"), nullable=False, index=True)
    semester = db.Column(db.Integer, nullable=False)
    section = db.Column(db.String(8), nullable=False, default="A")
    email = db.Column(db.String(128), unique=True, nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    status = db.Column(db.Enum("ACTIVE", "INACTIVE", name="student_status_enum"), default="ACTIVE", nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship("User", back_populates="student")
    department = db.relationship("Department", back_populates="students")
    registrations = db.relationship("ExamRegistration", back_populates="student", cascade="all, delete-orphan", lazy="dynamic")
    allocations = db.relationship("SeatingAllocation", back_populates="student", cascade="all, delete-orphan", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "usn": self.usn,
            "full_name": self.full_name,
            "department_id": self.department_id,
            "department_code": self.department.code if self.department else None,
            "department_name": self.department.name if self.department else None,
            "semester": self.semester,
            "section": self.section,
            "email": self.email,
            "phone": self.phone,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def to_summary_dict(self):
        return {
            "id": self.id,
            "usn": self.usn,
            "full_name": self.full_name,
            "department_code": self.department.code if self.department else None,
            "semester": self.semester,
            "section": self.section,
        }
