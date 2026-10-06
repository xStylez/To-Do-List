from flask import Flask, jsonify, request, send_from_directory, session
from db import setup_database, get_connection
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta
import os

app = Flask(__name__)
app.secret_key = "dev-secret"
app.permanent_session_lifetime = timedelta(minutes=30)
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

    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    todos = []
    cursor.execute("SELECT * FROM todos WHERE user_id = ?", (user_id,))
    rows = cursor.fetchall()
    for row in rows:
        todos.append({
            "id": row[0],
            "title": row[1],
            "details": row[2],
            "due_date": row[3],
            "priority": row[4],
            "done": row[5],
            "project_id": row[6],
        })

    connection.close()
    return jsonify({"todos": todos})


@app.route("/todos", methods=["POST"])
def create_todo():

    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

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
        cursor.execute("INSERT INTO todos(title, details, due_date, priority, project_id, user_id) VALUES(?, ?, ?, ?, ?, ?)", (title, details, due_date, priority, project_id, user_id))
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

        user_id = session.get("user_id")
        if not user_id:
            return jsonify({"error": "Unauthorized"}), 401

        cursor.execute("DELETE FROM todos WHERE id=? AND user_id=?", (todo_id, user_id))

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

    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    if done not in (0, 1, True, False):
        return jsonify({"error": "Done must be 0, 1, True, or False"}), 400

    done = 1 if done in (1, True) else 0

    try:
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute("UPDATE todos SET done=? WHERE id=? AND user_id=?", (done, todo_id, user_id))
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
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    projects = []
    cursor.execute("SELECT id, name FROM projects WHERE user_id = ?", (user_id,))
    rows = cursor.fetchall()
    for row in rows:
        projects.append({"id": row[0], "name": row[1]})
    connection.close()
    return jsonify({"projects": projects})

@app.route("/projects", methods=["POST"])
def create_project():
    data = request.get_json() or {}
    name = data.get("name")
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    if not name:
        return jsonify({"error": "Name is required"}), 400

    try:
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute("INSERT INTO projects(name, user_id) VALUES(?, ?)", (name, user_id))
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
        user_id = session.get("user_id")

        if not user_id:
            return jsonify({"error": "Unauthorized"}), 401

        cursor.execute("DELETE FROM projects WHERE id=? AND user_id=?", (project_id, user_id))

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
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    title = data.get("title")
    details = data.get("details")
    due_date = data.get("due_date")
    priority = data.get("priority")

    if not title or priority not in ["low", "medium", "high"]:
        return jsonify({"error": "Title and priority are required"}), 400

    try:
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute("UPDATE todos SET title=?, details=?, due_date=?, priority=? WHERE id=? AND user_id=?", (title, details, due_date, priority, todo_id, user_id))
        connection.commit()
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        connection.close()
    return jsonify({"message": "Todo updated successfully"}), 200


@app.route("/notes", methods=["GET"])
def get_notes():
    connection = get_connection()
    cursor = connection.cursor()
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    cursor.execute("SELECT id, title, details FROM notes WHERE user_id = ?", (user_id,))
    rows = cursor.fetchall()
    connection.close()
    notes = [{"id": row[0], "title": row[1], "details": row[2]} for row in rows]
    return jsonify({"notes": notes})

@app.route("/notes", methods=["POST"])
def create_note():
    data = request.get_json() or {}
    title = data.get("title")
    details = data.get("details")
    user_id = session.get("user_id")

    if not title:
        return jsonify({"error": "Title is required"}), 400
    
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute("INSERT INTO notes(title, details, user_id) VALUES(?, ?, ?)", (title, details, user_id))
        connection.commit()
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        connection.close()
    return jsonify({"message": "Note created successfully"}), 201
    

@app.route("/notes/<int:note_id>", methods=["DELETE"])
def delete_note(note_id):
    try:
        connection = get_connection()
        cursor = connection.cursor()
        user_id = session.get("user_id")

        if not user_id:
            return jsonify({"error": "Unauthorized"}), 401

        cursor.execute("DELETE FROM notes WHERE id = ? AND user_id = ?", (note_id, user_id))

        if cursor.rowcount == 0:
            return jsonify({"error": "Note not found"}), 404

        connection.commit()
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        connection.close()

    return jsonify({"message": "Note deleted"}), 200


@app.route("/register", methods=["POST"])
def register():
    
    data = request.get_json() or {}
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400
    
    password_hash = generate_password_hash(password)

    try:
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute("INSERT INTO users(username, password_hash) VALUES(?, ?)", (username, password_hash))
        connection.commit()
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        connection.close()

    return jsonify({"message": "User registered successfully"}), 201
    

@app.route("/login", methods=["POST"])
def login():
    
    data = request.get_json() or {}
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    try:
        connection = get_connection()
        cursor = connection.cursor()
        cursor.execute("SELECT id, password_hash FROM users where username = ?", (username,))
        user = cursor.fetchone()
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        connection.close()

    if not user or not check_password_hash(user[1], password):
        return jsonify({"error": "Invalid username or password"}), 401

    session.permanent = True
    session["user_id"] = user[0]

    return jsonify({"message": "Logged in successfully"}), 200
    
@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Logged out successfully"}), 200

@app.route("/me")
def me():
    if not session.get("user_id"):
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify({"message": "User is logged in"}), 200


setup_database()

if __name__ == "__main__":
    app.run(debug=True)

