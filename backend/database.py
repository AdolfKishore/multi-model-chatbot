
import sqlite3
from pathlib import Path

DATABASE_NAME = Path(__file__).resolve().parent / "chatbot_history.db"


def get_connection():
    connection = sqlite3.connect(DATABASE_NAME, timeout=10)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():
    with get_connection() as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS model_comparisons (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                prompt TEXT NOT NULL,
                provider TEXT NOT NULL,
                model TEXT NOT NULL,
                response TEXT,
                response_time_seconds REAL,
                status TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        connection.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL COLLATE NOCASE UNIQUE,
                age INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)


def save_model_result(
    prompt, provider, model, response, response_time_seconds, status
):
    with get_connection() as connection:
        connection.execute("""
            INSERT INTO model_comparisons (
                prompt, provider, model, response,
                response_time_seconds, status
            ) VALUES (?, ?, ?, ?, ?, ?)
        """, (
            prompt, provider, model, response,
            response_time_seconds, status
        ))


def get_model_results(limit=50):
    with get_connection() as connection:
        rows = connection.execute("""
            SELECT id, prompt, provider, model, response,
                   response_time_seconds, status, created_at
            FROM model_comparisons
            ORDER BY id DESC
            LIMIT ?
        """, (limit,)).fetchall()
        return [dict(row) for row in rows]


def get_users():
    with get_connection() as connection:
        rows = connection.execute("""
            SELECT id, name, email, age, created_at
            FROM users ORDER BY id DESC
        """).fetchall()
        return [dict(row) for row in rows]


def get_user(user_id):
    with get_connection() as connection:
        row = connection.execute("""
            SELECT id, name, email, age, created_at
            FROM users WHERE id = ?
        """, (user_id,)).fetchone()
        return dict(row) if row else None


def create_user(name, email, age):
    with get_connection() as connection:
        cursor = connection.execute("""
            INSERT INTO users (name, email, age)
            VALUES (?, ?, ?)
        """, (name, email, age))
        row = connection.execute("""
            SELECT id, name, email, age, created_at
            FROM users WHERE id = ?
        """, (cursor.lastrowid,)).fetchone()
        return dict(row)


def update_user(user_id, name, email, age):
    with get_connection() as connection:
        cursor = connection.execute("""
            UPDATE users SET name = ?, email = ?, age = ?
            WHERE id = ?
        """, (name, email, age, user_id))
        if cursor.rowcount == 0:
            return None
        row = connection.execute("""
            SELECT id, name, email, age, created_at
            FROM users WHERE id = ?
        """, (user_id,)).fetchone()
        return dict(row) if row else None


def delete_user(user_id):
    with get_connection() as connection:
        cursor = connection.execute(
            "DELETE FROM users WHERE id = ?", (user_id,)
        )
        return cursor.rowcount > 0
