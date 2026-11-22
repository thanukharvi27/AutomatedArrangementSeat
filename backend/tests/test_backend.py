import pytest
from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.department import Department
from app.models.student import Student
from app.models.faculty import Faculty
from app.models.hall import Hall
from app.models.exam import Examination
from app.models.seating import SeatingPlan, SeatingAllocation
from app.services.allocation_engine import AllocationEngine

@pytest.fixture
def app():
    app = create_app()
    app.config.update({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "JWT_SECRET_KEY": "test-secret-key-12345",
    })
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

def test_app_creation(app):
    assert app is not None
    assert app.config["TESTING"] is True

def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "healthy"
    assert "ExamEase" in data["service"]

def test_user_authentication(client, app):
    with app.app_context():
        user = User(
            username="testadmin",
            email="testadmin@college.edu",
            role="ADMIN",
        )
        user.set_password("Admin@123")
        db.session.add(user)
        db.session.commit()

    # Valid login
    res = client.post("/api/auth/login", json={
        "username": "testadmin",
        "password": "Admin@123"
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert "access_token" in data
    assert data["user"]["role"] == "ADMIN"

    # Invalid login
    bad_res = client.post("/api/auth/login", json={
        "username": "testadmin",
        "password": "WrongPassword"
    })
    assert bad_res.status_code == 401
    assert bad_res.get_json()["success"] is False

def test_department_model(app):
    with app.app_context():
        dept = Department(name="Computer Science", code="CS")
        db.session.add(dept)
        db.session.commit()

        queried = Department.query.filter_by(code="CS").first()
        assert queried is not None
        assert queried.name == "Computer Science"

def test_hall_creation(app):
    with app.app_context():
        hall = Hall(
            name="LH-101",
            building="Main Block",
            floor=1,
            capacity=30,
            num_rows=5,
            seats_per_row=6,
            room_type="EXAM_HALL"
        )
        db.session.add(hall)
        db.session.commit()

        assert hall.id is not None
        assert hall.capacity == 30
        assert hall.name == "LH-101"
