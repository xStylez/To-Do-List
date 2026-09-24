import sqlite3

def get_connection():
    return sqlite3.connect("to_do_project.db")
    

def setup_database():
    connection = get_connection()
    cursor = connection.cursor()
    connection.execute("PRAGMA foreign_keys = ON")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS projects(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS todos(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          details TEXT,
          due_date TEXT,
          priority TEXT NOT NULL,
          done BOOLEAN NOT NULL DEFAULT 0,
          project_id INTEGER,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS notes(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          details TEXT
        )
    """)

    connection.commit()
    connection.close()