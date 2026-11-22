from datetime import datetime
from app.extensions import db

class InvigilationAssignment(db.Model):
    __tablename__ = "invigilation_assignments"

    id = db.Column(db.Integer, primary_key=True)
    exam_id = db.Column(db.Integer, db.ForeignKey("examinations.id", ondelete="CASCADE"), nullable=False, index=True)
    hall_id = db.Column(db.Integer, db.ForeignKey("halls.id", ondelete="RESTRICT"), nullable=False, index=True)
    faculty_id = db.Column(db.Integer, db.ForeignKey("faculty.id", ondelete="RESTRICT"), nullable=False, index=True)
    duty_date = db.Column(db.Date, nullable=False, index=True)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    status = db.Column(db.Enum("ASSIGNED", "CONFIRMED", "SUBSTITUTED", "CANCELLED", name="duty_status_enum"), default="ASSIGNED", nullable=False)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("exam_id", "hall_id", "faculty_id", name="uq_duty_exam_hall_faculty"),
    )

    examination = db.relationship("Examination", back_populates="invigilation_assignments")
    hall = db.relationship("Hall", back_populates="invigilation_assignments")
    faculty = db.relationship("Faculty", back_populates="invigilation_assignments")

    def to_dict(self):
        return {
            "id": self.id,
            "exam_id": self.exam_id,
            "exam_name": self.examination.name if self.examination else None,
            "subject_code": self.examination.subject_code if self.examination else None,
            "hall_id": self.hall_id,
            "hall_name": self.hall.name if self.hall else None,
            "building": self.hall.building if self.hall else None,
            "faculty_id": self.faculty_id,
            "faculty_name": self.faculty.full_name if self.faculty else None,
            "employee_id": self.faculty.employee_id if self.faculty else None,
            "duty_date": self.duty_date.isoformat() if self.duty_date else None,
            "start_time": self.start_time.strftime("%H:%M") if self.start_time else None,
            "end_time": self.end_time.strftime("%H:%M") if self.end_time else None,
            "status": self.status,
            "notes": self.notes,
        }
