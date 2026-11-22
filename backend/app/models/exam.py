from datetime import datetime, date, time
from app.extensions import db

class Examination(db.Model):
    __tablename__ = "examinations"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), nullable=False)
    subject_code = db.Column(db.String(32), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id", ondelete="RESTRICT"), nullable=False, index=True)
    semester = db.Column(db.Integer, nullable=False)
    exam_date = db.Column(db.Date, nullable=False, index=True)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    exam_type = db.Column(db.Enum("REGULAR", "SUPPLEMENTARY", "INTERNAL", name="exam_type_enum"), nullable=False, default="REGULAR")
    status = db.Column(db.Enum("SCHEDULED", "SEATING_DRAFT", "SEATING_PUBLISHED", "COMPLETED", "CANCELLED", name="exam_status_enum"), nullable=False, default="SCHEDULED", index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    department = db.relationship("Department", back_populates="examinations")
    registrations = db.relationship("ExamRegistration", back_populates="examination", cascade="all, delete-orphan", lazy="dynamic")
    seating_plans = db.relationship("SeatingPlan", back_populates="examination", cascade="all, delete-orphan", lazy="dynamic")
    allocations = db.relationship("SeatingAllocation", back_populates="examination", cascade="all, delete-orphan", lazy="dynamic")
    invigilation_assignments = db.relationship("InvigilationAssignment", back_populates="examination", cascade="all, delete-orphan", lazy="dynamic")

    def to_dict(self):
        registered_count = self.registrations.filter_by(status="ELIGIBLE").count()
        allocated_count = self.allocations.filter_by(status="ALLOCATED").count()
        return {
            "id": self.id,
            "name": self.name,
            "course_name": self.name,
            "subject_code": self.subject_code,
            "course_code": self.subject_code,
            "department_id": self.department_id,
            "department_code": self.department.code if self.department else None,
            "department_name": self.department.name if self.department else None,
            "semester": self.semester,
            "exam_date": self.exam_date.isoformat() if self.exam_date else None,
            "start_time": self.start_time.strftime("%H:%M") if self.start_time else None,
            "end_time": self.end_time.strftime("%H:%M") if self.end_time else None,
            "exam_type": self.exam_type,
            "session": "Morning" if self.start_time and self.start_time.hour < 12 else "Afternoon",
            "status": self.status,
            "registered_students_count": registered_count,
            "allocated_students_count": allocated_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ExamRegistration(db.Model):
    __tablename__ = "exam_registrations"

    id = db.Column(db.Integer, primary_key=True)
    exam_id = db.Column(db.Integer, db.ForeignKey("examinations.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    status = db.Column(db.Enum("ELIGIBLE", "INELIGIBLE", "WITHDRAWN", name="reg_status_enum"), nullable=False, default="ELIGIBLE")
    registered_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("exam_id", "student_id", name="uq_exam_student"),
    )

    examination = db.relationship("Examination", back_populates="registrations")
    student = db.relationship("Student", back_populates="registrations")

    def to_dict(self):
        return {
            "id": self.id,
            "exam_id": self.exam_id,
            "student_id": self.student_id,
            "student": self.student.to_dict() if self.student else None,
            "status": self.status,
            "registered_at": self.registered_at.isoformat() if self.registered_at else None,
        }
