import sqlite3
from pathlib import Path


class SQLiteDBManager:
    def __init__(self):
        db_path = Path(__file__).resolve().parents[3] / "data" / "rubix.db"
        db_path.parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(db_path)
        self.cursor = self.db.cursor()
        self.initTables()

    def initTables(self):
        self.cursor.execute("PRAGMA foreign_keys = ON")

        self.cursor.execute(
            '''CREATE TABLE IF NOT EXISTS Users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR UNIQUE NOT NULL,
                password_hash VARCHAR NOT NULL,
                password_salt VARCHAR NOT NULL,
                created_at TIMESTAMP
            )'''
        )

        self.cursor.execute(
            '''CREATE TABLE IF NOT EXISTS Games (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                cube_size INTEGER NOT NULL,
                state TEXT NOT NULL,
                started_at TIMESTAMP,
                updated_at TIMESTAMP,
                completed BOOLEAN,
                FOREIGN KEY(user_id) REFERENCES Users(id)
            )'''
        )

        self.cursor.execute(
            '''CREATE TABLE IF NOT EXISTS Scores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                moves_count INTEGER,
                solve_time_ms INTEGER,
                created_at TIMESTAMP,
                FOREIGN KEY(game_id) REFERENCES Games(id),
                FOREIGN KEY(user_id) REFERENCES Users(id)
            )'''
        )
        
        self.cursor.execute(
            '''CREATE TABLE IF NOT EXISTS Tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token VARCHAR UNIQUE NOT NULL,
                created_at TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES Users(id)
            )'''
        )

        self.db.commit()
        
    def queryDB(self, query, params=()):
        self.cursor.execute(query, params)
        self.db.commit()
        return self.cursor.fetchall()


if __name__ == "__main__":
    DBManager = SQLiteDBManager()
    data = DBManager.queryDB("SELECT * FROM Users")
    print(data)