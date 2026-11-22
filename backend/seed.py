import os
import sys
from datetime import datetime, date, time, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.department import Department
from app.models.student import Student
from app.models.faculty import Faculty
from app.models.hall import Hall, Seat
from app.models.exam import Examination, ExamRegistration
from app.models.invigilation import InvigilationAssignment
from app.services.allocation_engine import AllocationEngine

def seed_database():
    app = create_app()
    with app.app_context():
        print("Clearing and creating database schema...")
        db.drop_all()
        db.create_all()

        print("1. Creating Departments...")
        depts = {
            "CSE": Department(code="CSE", name="Computer Science and Engineering"),
            "ECE": Department(code="ECE", name="Electronics and Communication Engineering"),
            "ISE": Department(code="ISE", name="Information Science and Engineering"),
            "ME": Department(code="ME", name="Mechanical Engineering"),
        }
        for d in depts.values():
            db.session.add(d)
        db.session.flush()

        print("2. Creating Users...")
        admin = User(username="admin", email="admin@college.edu", role="ADMIN", is_active=True)
        admin.set_password("Admin@123")
        
        fac1_user = User(username="faculty1", email="dr.sharma@college.edu", role="FACULTY", is_active=True)
        fac1_user.set_password("Faculty@123")

        fac2_user = User(username="faculty2", email="prof.ananya@college.edu", role="FACULTY", is_active=True)
        fac2_user.set_password("Faculty@123")
        
        stu1_user = User(username="student1", email="arjun.v@college.edu", role="STUDENT", is_active=True)
        stu1_user.set_password("Student@123")

        stu2_user = User(username="student2", email="priya.nair@college.edu", role="STUDENT", is_active=True)
        stu2_user.set_password("Student@123")

        db.session.add_all([admin, fac1_user, fac2_user, stu1_user, stu2_user])
        db.session.flush()

        print("3. Creating Faculty Profiles...")
        fac1 = Faculty(
            user_id=fac1_user.id,
            employee_id="FAC-001",
            full_name="Dr. Rakesh Sharma",
            department_id=depts["CSE"].id,
            email="dr.sharma@college.edu",
            phone="9876543210",
            is_active=True
        )
        fac2 = Faculty(
            user_id=fac2_user.id,
            employee_id="FAC-002",
            full_name="Prof. Ananya Roy",
            department_id=depts["ECE"].id,
            email="prof.ananya@college.edu",
            phone="9876543211",
            is_active=True
        )
        db.session.add_all([fac1, fac2])
        db.session.flush()

        print("4. Creating Students...")
        cse_names = [
            "Arjun Verma", "Priya Nair", "Rohan Patil", "Sneha Rao", "Karthik Gowda",
            "Divya Sharma", "Aditya Kulkarni", "Meera Hegde", "Siddharth Joshi", "Pooja Reddy",
            "Vikram Bhat", "Ananya Deshpande", "Nikhil Kamath", "Deepa Prabhu", "Varun Shenoy",
            "Kavya Shetty", "Abhishek Pai", "Tanvi Nayak", "Harish Kumar", "Bhavana Murthy"
        ]
        ece_names = [
            "Rahul Mehta", "Shruti Iyer", "Manoj Nambiar", "Swathi Pillai", "Gautam Menon",
            "Kavitha Swaminathan", "Prashanth Nair", "Lakshmi Krishnan", "Chirag Hegde", "Rashmi Rao",
            "Naveen Raj", "Sangeetha Prabhu"
        ]
        ise_names = [
            "Akash Rao", "Sindhu Murthy", "Tejas Prabhu", "Archana Pai", "Vinay Kumar",
            "Preethi Shenoy", "Sandeep Hegde", "Lavanya Joshi"
        ]

        students = []
        for i, name in enumerate(cse_names, 1):
            usn = f"1MS22CS{i:03d}"
            uid = stu1_user.id if i == 1 else (stu2_user.id if i == 2 else None)
            s = Student(
                user_id=uid,
                usn=usn,
                full_name=name,
                department_id=depts["CSE"].id,
                semester=5,
                section="A" if i <= 10 else "B",
                email=f"{name.lower().replace(' ', '.')}@college.edu",
                status="ACTIVE"
            )
            students.append(s)
            db.session.add(s)

        for i, name in enumerate(ece_names, 1):
            usn = f"1MS22EC{i:03d}"
            s = Student(
                usn=usn,
                full_name=name,
                department_id=depts["ECE"].id,
                semester=5,
                section="A",
                email=f"{name.lower().replace(' ', '.')}@college.edu",
                status="ACTIVE"
            )
            students.append(s)
            db.session.add(s)

        for i, name in enumerate(ise_names, 1):
            usn = f"1MS22IS{i:03d}"
            s = Student(
                usn=usn,
                full_name=name,
                department_id=depts["ISE"].id,
                semester=5,
                section="A",
                email=f"{name.lower().replace(' ', '.')}@college.edu",
                status="ACTIVE"
            )
            students.append(s)
            db.session.add(s)

        db.session.flush()

        print("5. Creating Examination Halls and Seats...")
        h1 = Hall(name="LH-101", building="Block A", floor=1, room_type="CLASSROOM", capacity=30, num_rows=5, seats_per_row=6, status="ACTIVE")
        h2 = Hall(name="LH-102", building="Block A", floor=1, room_type="CLASSROOM", capacity=24, num_rows=4, seats_per_row=6, status="ACTIVE")
        h3 = Hall(name="LH-201", building="Block B", floor=2, room_type="CLASSROOM", capacity=36, num_rows=6, seats_per_row=6, status="ACTIVE")
        h4 = Hall(name="AUD-1", building="Main Block", floor=1, room_type="AUDITORIUM", capacity=40, num_rows=5, seats_per_row=8, status="ACTIVE")
        db.session.add_all([h1, h2, h3, h4])
        db.session.flush()

        for h in [h1, h2, h3, h4]:
            for r in range(1, h.num_rows + 1):
                row_letter = chr(64 + r)
                for sc in range(1, h.seats_per_row + 1):
                    seat = Seat(hall_id=h.id, row_num=r, seat_num=sc, seat_label=f"{row_letter}{sc}", is_active=True)
                    db.session.add(seat)
        db.session.flush()

        print("6. Creating Examinations & Registrations...")
        today = date.today()
        exam_dbms = Examination(
            name="Database Management Systems",
            subject_code="22CS501",
            department_id=depts["CSE"].id,
            semester=5,
            exam_date=today + timedelta(days=2),
            start_time=time(9, 30),
            end_time=time(12, 30),
            status="SCHEDULED"
        )
        exam_dsp = Examination(
            name="Digital Signal Processing",
            subject_code="22EC501",
            department_id=depts["ECE"].id,
            semester=5,
            exam_date=today + timedelta(days=3),
            start_time=time(9, 30),
            end_time=time(12, 30),
            status="SCHEDULED"
        )
        exam_cn = Examination(
            name="Computer Networks",
            subject_code="22CS502",
            department_id=depts["CSE"].id,
            semester=5,
            exam_date=today + timedelta(days=5),
            start_time=time(14, 0),
            end_time=time(17, 0),
            status="SCHEDULED"
        )
        exam_se = Examination(
            name="Software Engineering",
            subject_code="22IS501",
            department_id=depts["ISE"].id,
            semester=5,
            exam_date=today + timedelta(days=6),
            start_time=time(10, 0),
            end_time=time(13, 0),
            status="SCHEDULED"
        )
        db.session.add_all([exam_dbms, exam_dsp, exam_cn, exam_se])
        db.session.flush()

        # Register students
        for s in students:
            if s.department_id == depts["CSE"].id:
                db.session.add(ExamRegistration(exam_id=exam_dbms.id, student_id=s.id, status="ELIGIBLE"))
                db.session.add(ExamRegistration(exam_id=exam_cn.id, student_id=s.id, status="ELIGIBLE"))
            elif s.department_id == depts["ECE"].id:
                db.session.add(ExamRegistration(exam_id=exam_dsp.id, student_id=s.id, status="ELIGIBLE"))
            elif s.department_id == depts["ISE"].id:
                db.session.add(ExamRegistration(exam_id=exam_se.id, student_id=s.id, status="ELIGIBLE"))
        db.session.commit()

        print("7. Generating and Publishing Seating Plans...")
        # Generate & publish DBMS seating
        plan1 = AllocationEngine.generate_plan(exam_id=exam_dbms.id, hall_ids=[h1.id], user_id=admin.id, policy="INTERLEAVE")
        plan1.status = "PUBLISHED"
        plan1.published_at = datetime.utcnow()
        exam_dbms.status = "SEATING_PUBLISHED"

        # Generate & publish DSP seating
        plan2 = AllocationEngine.generate_plan(exam_id=exam_dsp.id, hall_ids=[h2.id], user_id=admin.id, policy="CONSECUTIVE")
        plan2.status = "PUBLISHED"
        plan2.published_at = datetime.utcnow()
        exam_dsp.status = "SEATING_PUBLISHED"

        # Generate DRAFT plan for Computer Networks (so admin can view & test publishing in UI)
        plan3 = AllocationEngine.generate_plan(exam_id=exam_cn.id, hall_ids=[h3.id], user_id=admin.id, policy="INTERLEAVE")
        plan3.status = "DRAFT"
        exam_cn.status = "SEATING_DRAFT"

        print("8. Assigning Invigilation Duties...")
        duty1 = InvigilationAssignment(
            exam_id=exam_dbms.id,
            hall_id=h1.id,
            faculty_id=fac1.id,
            duty_date=exam_dbms.exam_date,
            start_time=exam_dbms.start_time,
            end_time=exam_dbms.end_time,
            status="ASSIGNED"
        )
        duty2 = InvigilationAssignment(
            exam_id=exam_dsp.id,
            hall_id=h2.id,
            faculty_id=fac2.id,
            duty_date=exam_dsp.exam_date,
            start_time=exam_dsp.start_time,
            end_time=exam_dsp.end_time,
            status="ASSIGNED"
        )
        db.session.add_all([duty1, duty2])
        db.session.commit()

        print("=" * 60)
        print("SEEDING COMPLETE!")
        print("=" * 60)
        print("Sample Credentials:")
        print("  Admin:    admin     / Admin@123")
        print("  Student:  student1  / Student@123  (USN: 1MS22CS001, Arjun Verma)")
        print("  Student:  student2  / Student@123  (USN: 1MS22CS002, Priya Nair)")
        print("  Faculty:  faculty1  / Faculty@123  (Dr. Rakesh Sharma)")
        print("  Faculty:  faculty2  / Faculty@123  (Prof. Ananya Roy)")
        print("=" * 60)

if __name__ == "__main__":
    seed_database()
