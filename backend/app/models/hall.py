from datetime import datetime
from app.extensions import db

class Hall(db.Model):
    __tablename__ = "halls"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), unique=True, nullable=False)
    building = db.Column(db.String(64), nullable=False)
    floor = db.Column(db.Integer, nullable=False, default=1)
    room_type = db.Column(db.Enum("CLASSROOM", "LAB", "EXAM_HALL", "AUDITORIUM", "SEMINAR_HALL", name="room_type_enum"), nullable=False, default="CLASSROOM")
    capacity = db.Column(db.Integer, nullable=False)
    num_rows = db.Column(db.Integer, nullable=False)
    seats_per_row = db.Column(db.Integer, nullable=False)
    status = db.Column(db.Enum("ACTIVE", "MAINTENANCE", "INACTIVE", name="hall_status_enum"), nullable=False, default="ACTIVE", index=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    seats = db.relationship("Seat", back_populates="hall", cascade="all, delete-orphan", lazy="select")
    allocations = db.relationship("SeatingAllocation", back_populates="hall", lazy="dynamic")
    invigilation_assignments = db.relationship("InvigilationAssignment", back_populates="hall", lazy="dynamic")

    def to_dict(self, include_seats=False):
        active_seats = [s for s in self.seats if s.is_active] if self.seats else []
        data = {
            "id": self.id,
            "name": self.name,
            "hall_code": self.name,
            "building": self.building,
            "floor": self.floor,
            "room_type": self.room_type,
            "capacity": self.capacity,
            "num_rows": self.num_rows,
            "rows_count": self.num_rows,
            "seats_per_row": self.seats_per_row,
            "cols_count": self.seats_per_row,
            "benches_per_row": self.seats_per_row,
            "total_generated_seats": len(self.seats) if self.seats else 0,
            "active_seats_count": len(active_seats),
            "status": self.status,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_seats:
            data["seats"] = [s.to_dict() for s in sorted(self.seats, key=lambda s: (s.row_num, s.seat_num))]
        return data


class Seat(db.Model):
    __tablename__ = "seats"

    id = db.Column(db.Integer, primary_key=True)
    hall_id = db.Column(db.Integer, db.ForeignKey("halls.id", ondelete="CASCADE"), nullable=False, index=True)
    row_num = db.Column(db.Integer, nullable=False)
    seat_num = db.Column(db.Integer, nullable=False)
    seat_label = db.Column(db.String(16), nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("hall_id", "seat_label", name="uq_hall_seat"),
    )

    hall = db.relationship("Hall", back_populates="seats")
    allocations = db.relationship("SeatingAllocation", back_populates="seat", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "hall_id": self.hall_id,
            "hall_name": self.hall.name if self.hall else None,
            "row_num": self.row_num,
            "seat_num": self.seat_num,
            "seat_label": self.seat_label,
            "is_active": self.is_active,
        }
