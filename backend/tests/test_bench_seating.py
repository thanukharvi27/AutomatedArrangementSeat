"""Bench (LEFT | RIGHT) seating allocation: branch separation, side modes, reassignment, migration."""
from datetime import date, time

import pytest
from sqlalchemy import text

from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.department import Department
from app.models.student import Student
from app.models.hall import Hall, Seat
from app.models.exam import Examination, ExamRegistration
from app.models.seating import SeatingPlan, SeatingAllocation
from app.services.allocation_engine import AllocationEngine, AllocationError, bench_key
from config import TestConfig


@pytest.fixture
def app():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def depts(app):
    out = {}
    for code in ("CSE", "ECE", "MECH"):
        d = Department(code=code, name=code)
        db.session.add(d)
        out[code] = d
    db.session.flush()
    return out


def make_hall(name, rows, benches_per_row):
    seats_per_row = benches_per_row * 2
    hall = Hall(name=name, building="Block A", floor=1, capacity=rows * seats_per_row, num_rows=rows,
                seats_per_row=seats_per_row, room_type="EXAM_HALL", status="ACTIVE")
    db.session.add(hall)
    db.session.flush()
    for r in range(1, rows + 1):
        for c in range(1, seats_per_row + 1):
            db.session.add(Seat(hall_id=hall.id, row_num=r, seat_num=c, seat_label=f"{chr(64 + r)}{c}"))
    db.session.flush()
    return hall


_usn = {"n": 0}


def make_students(dept, n):
    out = []
    for i in range(n):
        _usn["n"] += 1
        s = Student(usn=f"4XX23{dept.code}{i + 1:03d}", full_name=f"{dept.code} Student {i + 1}",
                    department_id=dept.id, semester=5, section="A", email=f"s{_usn['n']}@x.edu")
        db.session.add(s)
        out.append(s)
    db.session.flush()
    return out


def make_exam(name, students, start=time(9, 0), end=time(12, 0), dept=None):
    exam = Examination(name=name, subject_code=name, department_id=(dept or students[0].department).id,
                       semester=5, exam_date=date(2027, 1, 10), start_time=start, end_time=end)
    db.session.add(exam)
    db.session.flush()
    for s in students:
        db.session.add(ExamRegistration(exam_id=exam.id, student_id=s.id))
    db.session.commit()
    return exam


def assert_no_bench_duplicates(plan_id):
    benches = {}
    for a in SeatingAllocation.query.filter_by(seating_plan_id=plan_id).all():
        benches.setdefault(bench_key(a.seat), []).append(a.student.department_id)
    for depts_on_bench in benches.values():
        assert len(depts_on_bench) <= 2
        assert len(set(depts_on_bench)) == len(depts_on_bench), "same branch on one bench"
    return benches


def summary_of(plan):
    return plan.config_dict["summary"]


# 1
@pytest.mark.parametrize("policy", ["INTERLEAVE", "CONSECUTIVE"])
def test_both_sides_pairs_cse_with_ece(depts, policy):
    hall = make_hall("H1", rows=5, benches_per_row=10)  # 50 benches
    cse, ece = make_students(depts["CSE"], 50), make_students(depts["ECE"], 50)
    exam = make_exam("E1", cse + ece)
    plan = AllocationEngine.generate_plan(exam.id, [hall.id], policy=policy, side_mode="BOTH")
    s = summary_of(plan)
    assert s["total_allocated"] == 100 and s["total_unallocated"] == 0
    assert s["left_used"] == 50 and s["right_used"] == 50 and s["benches_selected"] == 50
    assert s["allocated_by_branch"] == {"CSE": 50, "ECE": 50}
    benches = assert_no_bench_duplicates(plan.id)
    assert len(benches) == 50
    first = {a.seat.position: a.student.usn for a in plan.allocations if a.seat.bench_num == 1}
    assert first == {"LEFT": "4XX23CSE001", "RIGHT": "4XX23ECE001"}


# 2
def test_left_only_reports_unallocated(depts):
    hall = make_hall("H1", rows=5, benches_per_row=10)
    exam = make_exam("E1", make_students(depts["CSE"], 50) + make_students(depts["ECE"], 50))
    with pytest.raises(AllocationError) as err:
        AllocationEngine.generate_plan(exam.id, [hall.id], side_mode="LEFT")
    assert err.value.payload["total_unallocated"] == 50
    assert len(err.value.payload["unallocated_students"]) == 50
    assert SeatingPlan.query.count() == 0

    plan = AllocationEngine.generate_plan(exam.id, [hall.id], side_mode="LEFT", allow_partial=True)
    s = summary_of(plan)
    assert s["total_allocated"] == 50 and s["total_unallocated"] == 50
    assert s["right_used"] == 0 and s["positions_selected"] == 50
    assert len(s["unallocated_students"]) == 50
    assert all(a.seat.position == "LEFT" for a in plan.allocations)
    allocated = {a.student_id for a in plan.allocations}
    assert not allocated & {u["student_id"] for u in s["unallocated_students"]}


# 3
def test_single_branch_one_per_bench(depts):
    hall = make_hall("H1", rows=5, benches_per_row=10)
    exam = make_exam("E1", make_students(depts["CSE"], 50))
    plan = AllocationEngine.generate_plan(exam.id, [hall.id], side_mode="BOTH")
    s = summary_of(plan)
    assert s["total_allocated"] == 50 and s["vacant_positions"] == 50
    benches = assert_no_bench_duplicates(plan.id)
    assert len(benches) == 50 and all(len(v) == 1 for v in benches.values())


# 4
@pytest.mark.parametrize("policy", ["INTERLEAVE", "CONSECUTIVE"])
def test_three_branches_fill_30_benches(depts, policy):
    hall = make_hall("H1", rows=3, benches_per_row=10)
    students = make_students(depts["CSE"], 30) + make_students(depts["ECE"], 20) + make_students(depts["MECH"], 10)
    exam = make_exam("E1", students)
    plan = AllocationEngine.generate_plan(exam.id, [hall.id], policy=policy)
    assert summary_of(plan)["total_allocated"] == 60
    assert_no_bench_duplicates(plan.id)


# 4b: equal three-way split needs every pair combination
@pytest.mark.parametrize("policy", ["INTERLEAVE", "CONSECUTIVE"])
def test_three_equal_branches(depts, policy):
    hall = make_hall("H1", rows=3, benches_per_row=10)
    students = make_students(depts["CSE"], 20) + make_students(depts["ECE"], 20) + make_students(depts["MECH"], 20)
    plan = AllocationEngine.generate_plan(make_exam("E1", students).id, [hall.id], policy=policy)
    assert summary_of(plan)["total_allocated"] == 60
    assert_no_bench_duplicates(plan.id)


# 5
def test_unequal_branches_seat_the_maximum(depts):
    hall = make_hall("H1", rows=3, benches_per_row=10)  # 30 benches
    exam = make_exam("E1", make_students(depts["CSE"], 40) + make_students(depts["ECE"], 10))
    plan = AllocationEngine.generate_plan(exam.id, [hall.id], allow_partial=True)
    s = summary_of(plan)
    # at most one CSE per bench: 30 CSE + 10 ECE
    assert s["total_allocated"] == 40
    assert s["allocated_by_branch"] == {"CSE": 30, "ECE": 10}
    assert s["unallocated_by_branch"] == {"CSE": 10}
    assert_no_bench_duplicates(plan.id)


# 6
def test_multiple_halls(depts):
    h1, h2 = make_hall("H1", 2, 5), make_hall("H2", 2, 5)  # 10 benches each
    exam = make_exam("E1", make_students(depts["CSE"], 20) + make_students(depts["ECE"], 20))
    plan = AllocationEngine.generate_plan(exam.id, [h1.id, h2.id])
    assert summary_of(plan)["total_allocated"] == 40
    assert {a.hall_id for a in plan.allocations} == {h1.id, h2.id}
    assert_no_bench_duplicates(plan.id)


# 7
def test_disabled_seats_and_positions(depts):
    hall = make_hall("H1", 1, 4)  # 8 positions
    a1 = Seat.query.filter_by(hall_id=hall.id, seat_label="A1").one()
    a1.is_active = False
    db.session.commit()
    exam = make_exam("E1", make_students(depts["CSE"], 2) + make_students(depts["ECE"], 2))

    plan = AllocationEngine.generate_plan(exam.id, [hall.id], side_mode="RIGHT")
    assert all(a.seat.position == "RIGHT" for a in plan.allocations)
    assert summary_of(plan)["total_allocated"] == 4

    with pytest.raises(AllocationError, match="inactive"):
        AllocationEngine.generate_plan(exam.id, [hall.id], side_mode="CUSTOM", seat_ids=[a1.id])

    chosen = [s.id for s in Seat.query.filter(Seat.hall_id == hall.id, Seat.seat_label.in_(["A3", "A4", "A5", "A6"]))]
    plan = AllocationEngine.generate_plan(exam.id, [hall.id], side_mode="CUSTOM", seat_ids=chosen)
    assert {a.seat_id for a in plan.allocations} == set(chosen)
    assert plan.config_dict["seat_ids"] == sorted(chosen)
    assert_no_bench_duplicates(plan.id)


# 8
def test_insufficient_capacity(depts):
    hall = make_hall("H1", 1, 2)  # 4 positions
    exam = make_exam("E1", make_students(depts["CSE"], 3) + make_students(depts["ECE"], 3))
    with pytest.raises(AllocationError, match="Insufficient capacity: only 4 of 6"):
        AllocationEngine.generate_plan(exam.id, [hall.id])
    assert SeatingAllocation.query.count() == 0


def _row_plan(depts):
    hall = make_hall("H1", 1, 2)  # bench 1 = A1|A2, bench 2 = A3|A4
    exam = make_exam("E1", make_students(depts["CSE"], 2) + make_students(depts["ECE"], 2))
    plan = AllocationEngine.generate_plan(exam.id, [hall.id])
    by_label = {a.seat.seat_label: a for a in plan.allocations}
    seats = {s.seat_label: s.id for s in Seat.query.filter_by(hall_id=hall.id)}
    return plan, by_label, seats


# 9
def test_reassign_to_occupied_position_swaps(depts):
    plan, by_label, seats = _row_plan(depts)
    assert by_label["A1"].student.department.code == "CSE" and by_label["A2"].student.department.code == "ECE"
    a1_student, a3_student = by_label["A1"].student_id, by_label["A3"].student_id
    AllocationEngine.reassign_seat(by_label["A1"].id, seats["A3"], plan_id=plan.id)  # CSE <-> CSE
    after = {a.seat.seat_label: a.student_id for a in SeatingPlan.query.get(plan.id).allocations}
    assert after["A3"] == a1_student and after["A1"] == a3_student and len(after) == 4
    assert_no_bench_duplicates(plan.id)


# 10
def test_reassign_violating_branch_separation(depts):
    plan, by_label, seats = _row_plan(depts)
    # moving A1 (CSE) onto A4 (ECE) swaps ECE into A1 next to A2 (ECE)
    with pytest.raises(AllocationError, match="two students of the same branch cannot share a bench"):
        AllocationEngine.reassign_seat(by_label["A1"].id, seats["A4"], plan_id=plan.id)
    with pytest.raises(AllocationError, match="not found"):
        AllocationEngine.reassign_seat(by_label["A1"].id, seats["A4"], plan_id=plan.id + 99)


def test_reassign_into_disabled_position(depts):
    hall = make_hall("H1", 1, 2)
    exam = make_exam("E1", make_students(depts["CSE"], 1))
    plan = AllocationEngine.generate_plan(exam.id, [hall.id], side_mode="LEFT")
    a2 = Seat.query.filter_by(hall_id=hall.id, seat_label="A2").one()
    with pytest.raises(AllocationError, match="disabled for this plan"):
        AllocationEngine.reassign_seat(plan.allocations[0].id, a2.id, plan_id=plan.id)


# 11
def test_exam_conflicts_and_shared_benches(depts):
    hall = make_hall("H1", 1, 4)
    cse = make_students(depts["CSE"], 4)
    e1 = make_exam("E1", cse)
    e2 = make_exam("E2", cse[:1], start=time(10, 0), end=time(13, 0))
    AllocationEngine.generate_plan(e1.id, [hall.id], side_mode="LEFT")
    with pytest.raises(AllocationError, match="Schedule conflict"):
        AllocationEngine.generate_plan(e2.id, [hall.id])

    # another overlapping exam fills the free RIGHT positions, never beside a CSE student
    ece = make_students(depts["ECE"], 4)
    e3 = make_exam("E3", ece, start=time(10, 0), end=time(13, 0))
    p3 = AllocationEngine.generate_plan(e3.id, [hall.id])
    assert all(a.seat.position == "RIGHT" for a in p3.allocations)
    e4 = make_exam("E4", make_students(depts["MECH"], 1), start=time(9, 30), end=time(12, 0))
    with pytest.raises(AllocationError, match="No free seat positions"):
        AllocationEngine.generate_plan(e4.id, [hall.id])


def test_cross_exam_bench_rule(depts):
    hall = make_hall("H1", 1, 2)
    e1 = make_exam("E1", make_students(depts["CSE"], 2))
    AllocationEngine.generate_plan(e1.id, [hall.id], side_mode="LEFT")
    # a different CSE exam in the same slot may not take the free RIGHT positions beside those CSE students
    other_cse = [Student(usn=f"9CSE{i}", full_name="x", department_id=depts["CSE"].id, semester=3,
                         section="B", email=f"o{i}@x.edu") for i in range(2)]
    db.session.add_all(other_cse)
    db.session.flush()
    e2 = make_exam("E2", other_cse, start=time(10, 0), end=time(11, 0))
    with pytest.raises(AllocationError, match="0 of 2"):
        AllocationEngine.generate_plan(e2.id, [hall.id])


# 12
def test_regenerate_creates_versions(depts):
    hall = make_hall("H1", 1, 4)
    exam = make_exam("E1", make_students(depts["CSE"], 2) + make_students(depts["ECE"], 2))
    plan = AllocationEngine.generate_plan(exam.id, [hall.id])
    again = AllocationEngine.generate_plan(exam.id, [hall.id], side_mode="LEFT", allow_partial=True)
    assert again.id == plan.id and again.config_dict["side_mode"] == "LEFT"  # draft is reused
    again.status = "PUBLISHED"
    db.session.commit()
    with pytest.raises(AllocationError, match="PUBLISHED"):
        AllocationEngine.generate_plan(exam.id, [hall.id])
    v2 = AllocationEngine.generate_plan(exam.id, [hall.id], force=True)
    assert v2.version == 2 and SeatingPlan.query.get(plan.id).status == "ARCHIVED"
    assert summary_of(v2)["total_allocated"] == 4


def _login(client):
    user = User(username="adm", email="adm@x.edu", role="ADMIN")
    user.set_password("Admin@123")
    db.session.add(user)
    db.session.commit()
    token = client.post("/api/auth/login", json={"username": "adm", "password": "Admin@123"}).get_json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# 13
def test_api_preview_generate_publish_view(client, depts):
    h = _login(client)
    hall = make_hall("H1", 2, 3)
    exam = make_exam("E1", make_students(depts["CSE"], 6) + make_students(depts["ECE"], 6))

    layout = client.get(f"/api/seating-plans/layout?exam_id={exam.id}", headers=h).get_json()
    assert layout["total_eligible"] == 12 and layout["eligible_by_branch"] == {"CSE": 6, "ECE": 6}
    seat = layout["halls"][0]["seats"][1]
    assert seat["position"] == "RIGHT" and seat["bench_num"] == 1 and layout["halls"][0]["total_benches"] == 6

    body = {"exam_id": exam.id, "hall_ids": [hall.id], "side_mode": "LEFT"}
    preview = client.post("/api/seating-plans/generate", json={**body, "dry_run": True}, headers=h).get_json()
    assert preview["summary"]["total_allocated"] == 6 and preview["summary"]["total_unallocated"] == 6
    assert SeatingPlan.query.count() == 0

    res = client.post("/api/seating-plans/generate", json=body, headers=h)
    assert res.status_code == 400 and res.get_json()["capacity_report"]["total_unallocated"] == 6
    res = client.post("/api/seating-plans/generate", json={**body, "side_mode": "BOTH"}, headers=h)
    assert res.status_code == 201
    plan_id = res.get_json()["plan"]["id"]
    assert res.get_json()["summary"]["total_allocated"] == 12

    bad = client.post("/api/seating-plans/generate", json={**body, "seat_ids": ["x"]}, headers=h)
    assert bad.status_code == 400

    assert client.post(f"/api/seating-plans/{plan_id}/publish", headers=h).status_code == 200
    detail = client.get(f"/api/seating-plans/{plan_id}", headers=h).get_json()
    assert detail["plan"]["status"] == "PUBLISHED" and detail["plan"]["config"]["side_mode"] == "BOTH"
    grid = detail["halls"][0]["seats_grid"]
    assert {"bench_num", "position", "enabled"} <= set(grid[0])
    assert grid[0]["allocation"]["position"] == "LEFT"
    pdf = client.get(f"/api/seating-plans/{plan_id}/pdf", headers=h)
    assert pdf.status_code == 200 and pdf.data[:4] == b"%PDF"


# 14
def test_plans_created_before_migration(client, depts):
    from app.schema_upgrade import ensure_schema
    h = _login(client)
    hall = make_hall("H1", 1, 2)
    exam = make_exam("E1", make_students(depts["CSE"], 1) + make_students(depts["ECE"], 1))
    plan = AllocationEngine.generate_plan(exam.id, [hall.id])
    plan_id, hall_id = plan.id, hall.id
    db.session.commit()
    db.session.close()

    # simulate a database from before the bench feature: no config column
    with db.engine.begin() as conn:
        conn.execute(text("ALTER TABLE seating_plans DROP COLUMN config"))
    assert ensure_schema() == ["seating_plans.config"]
    assert ensure_schema() == []
    assert db.session.execute(text("SELECT config FROM seating_plans")).scalar() is None
    assert SeatingAllocation.query.filter_by(seating_plan_id=plan_id).count() == 2

    detail = client.get(f"/api/seating-plans/{plan_id}", headers=h).get_json()
    assert detail["plan"]["config"] is None and detail["plan"]["total_allocated"] == 2
    assert all(s["enabled"] for s in detail["halls"][0]["seats_grid"])
    # legacy plan reassignment still applies branch separation by default
    allocs = SeatingAllocation.query.filter_by(seating_plan_id=plan_id).all()
    a3 = Seat.query.filter_by(hall_id=hall_id, seat_label="A3").one()
    moved = AllocationEngine.reassign_seat(allocs[0].id, a3.id, plan_id=plan_id)
    assert moved.seat.seat_label == "A3"
