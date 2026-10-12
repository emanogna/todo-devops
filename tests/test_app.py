import os
import sys
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import app


@pytest.fixture
def client(tmp_path):
    app.config["DATABASE"] = str(tmp_path / "test.db")  # fresh DB for every test
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


def make_task(client, **extra):
    data = {"title": "Study DevOps", "priority": "High", "category": "College",
            "due_date": "2030-01-01"}
    data.update(extra)
    return client.post("/api/tasks", json=data)


def test_homepage_loads(client):
    r = client.get("/")
    assert r.status_code == 200
    assert b"TaskFlow" in r.data


def test_add_task(client):
    r = make_task(client)
    assert r.status_code == 201
    tasks = client.get("/api/tasks").get_json()
    assert len(tasks) == 1
    assert tasks[0]["title"] == "Study DevOps"
    assert tasks[0]["priority"] == "High"


def test_empty_title_rejected(client):
    r = make_task(client, title="   ")
    assert r.status_code == 400
    assert client.get("/api/tasks").get_json() == []


def test_edit_task(client):
    make_task(client)
    r = client.put("/api/tasks/1", json={"title": "Updated", "priority": "Low",
                                         "category": "Work", "due_date": ""})
    assert r.status_code == 200
    assert r.get_json()["title"] == "Updated"
    assert r.get_json()["category"] == "Work"


def test_complete_task(client):
    make_task(client)
    r = client.post("/api/tasks/1/toggle")
    assert r.get_json()["completed"] is True
    r = client.post("/api/tasks/1/toggle")
    assert r.get_json()["completed"] is False


def test_delete_task(client):
    make_task(client)
    assert client.delete("/api/tasks/1").status_code == 200
    assert client.get("/api/tasks").get_json() == []


def test_missing_task_returns_404(client):
    assert client.delete("/api/tasks/99").status_code == 404