from flask import Flask, jsonify, request, send_from_directory
from db import setup_database, get_connection
import os

app = Flask(__name__)
app.json.sort_keys = False

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")

@app.route("/app")
def serve_app():
    return send_from_directory(FRONTEND_DIR, "index.html")

@app.route("/app/<path:filename>")
def serve_app_files(filename):
    return send_from_directory(FRONTEND_DIR, filename)

@app.route("/")
def home():
    return {"message": "Todo API is running"}


@app.route("/todos", methods=["GET"])
def get_todos():

    connection = get_connection()
    cursor = connection.cursor()

    todos = []
    cursor.execute("SELECT * FROM todos")
    rows = cursor.fetchall()
    for row in rows:
        todos.append({
            "id": row[0],
            "title": row[1],
            "details": row[2],
            "due_date": row[3],
            "priority": row[4],
            "done": row[5],
            "project_id": row[6]
        })

    connection.close()
    return jsonify({"todos": todos})


@app.route("/todos", methods=["POST"])
def create_todo():
    data = request.get_json() or {}
    title = data.get("title")
    details = data.get("details")
    due_date = data.get("due_date")
    priority = data.get("priority")
    project_id = data.get("project_id")

    if not title or not priority:
        return jsonify({"error": "Title and priority are required"}), 400

    if priority not in ["low", "medium", "high"]:
        return jsonify({"error": "Priority must be low, medium, or high"}), 400

    try:
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute("INSERT INTO todos(title, details, due_date, priority, project_id) VALUES(?, ?, ?, ?, ?)", (title, details, due_date, priority, project_id))
        connection.commit()
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        connection.close()

    return jsonify({"message": "Todo created successfully"}), 201


@app.route("/todos/<int:todo_id>", methods=["DELETE"])
def delete_todo(todo_id):
    try:
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute("DELETE FROM todos WHERE id=?", (todo_id,))

        if cursor.rowcount == 0:
            return jsonify({"error": "Todo not found"}), 404

        connection.commit()
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        connection.close()

    return jsonify({"message": "Todo deleted successfully"}), 200


@app.route("/todos/<int:todo_id>", methods=["PUT"])
def done_todo(todo_id):
    data = request.get_json() or {}
    done = data.get("done")

    if done not in (0, 1, True, False):
        return jsonify({"error": "Done must be 0, 1, True, or False"}), 400

    done = 1 if done in (1, True) else 0

    try:
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute("UPDATE todos SET done=? WHERE id=?", (done, todo_id,))
        connection.commit()
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        connection.close()

    return jsonify({"message": "Todo marked as done"}), 200


@app.route("/projects", methods=["GET"])
def get_projects():
    connection = get_connection()
    cursor = connection.cursor()
    projects = []
    cursor.execute("SELECT id, name FROM projects")
    rows = cursor.fetchall()
    for row in rows:
        projects.append({"id": row[0], "name": row[1]})
    connection.close()
    return jsonify({"projects": projects})

@app.route("/projects", methods=["POST"])
def create_project():
    data = request.get_json() or {}
    name = data.get("name")

    if not name:
        return jsonify({"error": "Name is required"}), 400

    try:
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute("INSERT INTO projects(name) VALUES(?)", (name,))
        connection.commit()
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        connection.close()

    return jsonify({"message": "Project created successfully"}), 201

@app.route("/projects/<int:project_id>", methods=["DELETE"])
def delete_project(project_id):
    try:
        connection = get_connection()
        connection.execute("PRAGMA foreign_keys = ON")
        cursor = connection.cursor()
        cursor.execute("DELETE FROM projects WHERE id=?", (project_id,))

        if cursor.rowcount == 0:
            return jsonify({"error": "Project not found"}), 404

        connection.commit()
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        connection.close()

    return jsonify({"message": "Project deleted successfully"}), 200


@app.route("/todos/<int:todo_id>/edit", methods=["PUT"])
def update_todo(todo_id):
    data = request.get_json() or {}
    
    title = data.get("title")
    details = data.get("details")
    due_date = data.get("due_date")
    priority = data.get("priority")

    if not title or priority not in ["low", "medium", "high"]:
        return jsonify({"error": "Title and priority are required"}), 400

    try:
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute("UPDATE todos SET title=?, details=?, due_date=?, priority=? WHERE id=?", (title, details, due_date, priority, todo_id,))
        connection.commit()
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        connection.close()
    return jsonify({"message": "Todo updated successfully"}), 200
    

if __name__ == "__main__":
    setup_database()
    app.run(debug=True)