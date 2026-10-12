import os
import sqlite3
from datetime import datetime
from flask import Flask, render_template, request, jsonify, g

app = Flask(__name__)
app.config["DATABASE"] = os.environ.get("DATABASE", "tasks.db")

PRIORITIES = ("Low", "Medium", "High")
CATEGORIES = ("Personal", "College", "Work", "Other")

# Columns added in this version (old databases get them automatically)
NEW_COLUMNS = {
    "description": "TEXT NOT NULL DEFAULT ''",
    "due_date": "TEXT NOT NULL DEFAULT ''",
    "priority": "TEXT NOT NULL DEFAULT 'Medium'",
    "category": "TEXT NOT NULL DEFAULT 'Personal'",
}


def get_db():
    """Open one SQLite connection per request; create/upgrade the table."""
    if "db" not in g:
        g.db = sqlite3.connect(app.config["DATABASE"])
        g.db.row_factory = sqlite3.Row
        g.db.execute(
            "CREATE TABLE IF NOT EXISTS tasks ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "title TEXT NOT NULL, "
            "completed INTEGER NOT NULL DEFAULT 0)"
        )
        existing = [r["name"] for r in g.db.execute("PRAGMA table_info(tasks)")]
        for name, definition in NEW_COLUMNS.items():
            if name not in existing:
                g.db.execute(f"ALTER TABLE tasks ADD COLUMN {name} {definition}")
        g.db.commit()
    return g.db


@app.teardown_appcontext
def close_db(error=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def task_to_dict(row):
    d = dict(row)
    d["completed"] = bool(d["completed"])
    return d


def clean_task(data):
    """Validate input. Returns (cleaned_data, error_message)."""
    data = data or {}
    title = str(data.get("title", "")).strip()
    description = str(data.get("description", "")).strip()
    due_date = str(data.get("due_date", "")).strip()
    priority = data.get("priority", "Medium")
    category = data.get("category", "Personal")

    if not title:
        return None, "Task title cannot be empty."
    if len(title) > 100:
        return None, "Title must be 100 characters or fewer."
    if len(description) > 300:
        return None, "Description must be 300 characters or fewer."
    if priority not in PRIORITIES:
        return None, "Invalid priority."
    if category not in CATEGORIES:
        return None, "Invalid category."
    if due_date:
        try:
            datetime.strptime(due_date, "%Y-%m-%d")
        except ValueError:
            return None, "Invalid due date."
    return {
        "title": title, "description": description,
        "due_date": due_date, "priority": priority, "category": category,
    }, None


def get_task(task_id):
    return get_db().execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/tasks", methods=["GET"])
def list_tasks():
    rows = get_db().execute("SELECT * FROM tasks ORDER BY id DESC").fetchall()
    return jsonify([task_to_dict(r) for r in rows])


@app.route("/api/tasks", methods=["POST"])
def create_task():
    t, error = clean_task(request.get_json(silent=True))
    if error:
        return jsonify({"error": error}), 400
    db = get_db()
    cur = db.execute(
        "INSERT INTO tasks (title, description, due_date, priority, category) "
        "VALUES (?, ?, ?, ?, ?)",
        (t["title"], t["description"], t["due_date"], t["priority"], t["category"]),
    )
    db.commit()
    return jsonify(task_to_dict(get_task(cur.lastrowid))), 201


@app.route("/api/tasks/<int:task_id>", methods=["PUT"])
def update_task(task_id):
    if get_task(task_id) is None:
        return jsonify({"error": "Task not found."}), 404
    t, error = clean_task(request.get_json(silent=True))
    if error:
        return jsonify({"error": error}), 400
    db = get_db()
    db.execute(
        "UPDATE tasks SET title=?, description=?, due_date=?, priority=?, category=? "
        "WHERE id=?",
        (t["title"], t["description"], t["due_date"], t["priority"], t["category"], task_id),
    )
    db.commit()
    return jsonify(task_to_dict(get_task(task_id)))


@app.route("/api/tasks/<int:task_id>/toggle", methods=["POST"])
def toggle_task(task_id):
    if get_task(task_id) is None:
        return jsonify({"error": "Task not found."}), 404
    db = get_db()
    db.execute("UPDATE tasks SET completed = 1 - completed WHERE id = ?", (task_id,))
    db.commit()
    return jsonify(task_to_dict(get_task(task_id)))


@app.route("/api/tasks/<int:task_id>", methods=["DELETE"])
def delete_task(task_id):
    if get_task(task_id) is None:
        return jsonify({"error": "Task not found."}), 404
    db = get_db()
    db.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    db.commit()
    return jsonify({"deleted": task_id})


if __name__ == "__main__":
    app.run(debug=True)