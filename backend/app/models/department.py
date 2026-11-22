from datetime import datetime
from app.extensions import db

class Department(db.Model):
    __tablename__ = "departments"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(16), unique=True, nullable=False)
    name = db.Column(db.String(128), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    students = db.relationship("Student", back_populates="department", lazy="dynamic")
    faculty = db.relationship("Faculty", back_populates="department", lazy="dynamic")
    examinations = db.relationship("Examination", back_populates="department", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "name": self.name,
            "student_count": self.students.count() if hasattr(self.students, "count") else 0,
        }
