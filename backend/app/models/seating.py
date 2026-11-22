from datetime import datetime
from app.extensions import db

class SeatingPlan(db.Model):
    __tablename__ = "seating_plans"

    id = db.Column(db.Integer, primary_key=True)
    exam_id = db.Column(db.Integer, db.ForeignKey("examinations.id", ondelete="CASCADE"), nullable=False, index=True)
    version = db.Column(db.Integer, nullable=False, default=1)
    status = db.Column(db.Enum("DRAFT", "PUBLISHED", "ARCHIVED", name="plan_status_enum"), nullable=False, default="DRAFT", index=True)
    created_by_user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    published_at = db.Column(db.DateTime, nullable=True)

    __table_args__ = (
        db.UniqueConstraint("exam_id", "version", name="uq_exam_version"),
    )

    examination = db.relationship("Examination", back_populates="seating_plans")
    creator = db.relationship("User")
    allocations = db.relationship("SeatingAllocation", back_populates="seating_plan", cascade="all, delete-orphan", lazy="select")

    def to_dict(self, include_allocations=False):
        allocated_count = len(self.allocations) if self.allocations else 0
        data = {
            "id": self.id,
            "plan_name": f"{self.examination.name} (v{self.version})" if self.examination else f"Plan #{self.id}",
            "exam_id": self.exam_id,
            "exam_name": self.examination.name if self.examination else None,
            "subject_code": self.examination.subject_code if self.examination else None,
            "exam_date": self.examination.exam_date.isoformat() if self.examination and self.examination.exam_date else None,
            "start_time": self.examination.start_time.strftime("%H:%M") if self.examination and self.examination.start_time else None,
            "end_time": self.examination.end_time.strftime("%H:%M") if self.examination and self.examination.end_time else None,
            "version": self.version,
            "status": self.status,
            "total_allocated": allocated_count,
            "allocated_seats": allocated_count,
            "session": "Morning" if self.examination and self.examination.start_time and self.examination.start_time.hour < 12 else "Afternoon",
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "published_at": self.published_at.isoformat() if self.published_at else None,
        }
        if include_allocations:
            data["allocations"] = [a.to_dict() for a in self.allocations]
        return data


class SeatingAllocation(db.Model):
    __tablename__ = "seating_allocations"

    id = db.Column(db.Integer, primary_key=True)
    seating_plan_id = db.Column(db.Integer, db.ForeignKey("seating_plans.id", ondelete="CASCADE"), nullable=False, index=True)
    exam_id = db.Column(db.Integer, db.ForeignKey("examinations.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    seat_id = db.Column(db.Integer, db.ForeignKey("seats.id", ondelete="RESTRICT"), nullable=False)
    hall_id = db.Column(db.Integer, db.ForeignKey("halls.id", ondelete="RESTRICT"), nullable=False, index=True)
    status = db.Column(db.Enum("ALLOCATED", "REASSIGNED", "CANCELLED", name="alloc_status_enum"), default="ALLOCATED", nullable=False)
    notes = db.Column(db.String(255), nullable=True)
    allocated_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("exam_id", "student_id", name="uq_alloc_exam_student"),
        db.UniqueConstraint("exam_id", "seat_id", name="uq_alloc_exam_seat"),
    )

    seating_plan = db.relationship("SeatingPlan", back_populates="allocations")
    examination = db.relationship("Examination", back_populates="allocations")
    student = db.relationship("Student", back_populates="allocations")
    seat = db.relationship("Seat", back_populates="allocations")
    hall = db.relationship("Hall", back_populates="allocations")

    def to_dict(self):
        return {
            "id": self.id,
            "seating_plan_id": self.seating_plan_id,
            "exam_id": self.exam_id,
            "student_id": self.student_id,
            "student_name": self.student.full_name if self.student else None,
            "usn": self.student.usn if self.student else None,
            "department_code": self.student.department.code if self.student and self.student.department else None,
            "semester": self.student.semester if self.student else None,
            "section": self.student.section if self.student else None,
            "hall_id": self.hall_id,
            "hall_name": self.hall.name if self.hall else None,
            "building": self.hall.building if self.hall else None,
            "floor": self.hall.floor if self.hall else None,
            "seat_id": self.seat_id,
            "seat_label": self.seat.seat_label if self.seat else None,
            "row_num": self.seat.row_num if self.seat else None,
            "seat_num": self.seat.seat_num if self.seat else None,
            "status": self.status,
            "notes": self.notes,
            "allocated_at": self.allocated_at.isoformat() if self.allocated_at else None,
        }
