import secrets
import os
from typing import Annotated
from fastapi import FastAPI, Response, Request, Cookie, Form, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware  # Importieren Sie die Middleware
import bcrypt
import sqlite3
from pathlib import Path

class Server:
    """SomeDocString"""
    def __init__(self):
        self.app = FastAPI(
            title="rubix-backend",
            version="1.0.0",
        )
        self.db_manager = SQLite()

        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"]
        )
                
        self.app.mount("/", StaticFiles(directory="dist", html=True), name="frontend")
        self.templates = Jinja2Templates(directory="templates")

    def _generate_token_for_user(self, user_id: int) -> str:
        token = secrets.token_urlsafe(32)
        self.db_manager.queryDB(
            "INSERT INTO Tokens (user_id, token, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
            (user_id, token),
        )
        return token

    def set_routes(self) -> None:
        """Setup routes"""

        @self.app.get("/")
        async def root():
            return FileResponse(os.path.join("dist", "index.html"))

        @self.app.get("/active")
        async def active():
            return {
                "success": "true"
            }


        @self.app.post("/user/create")
        async def create_user(
            username: Annotated[str, Form()],
            password: Annotated[str, Form()]
        ):
            user = self.db_manager.queryDB(
                "SELECT id FROM Users WHERE username = ?",
                (username,)
            )

            if user:
                raise HTTPException(
                    status_code=409,
                    detail="Username already exists"
                )

            if len(user) > 13:
                raise HTTPException(
                    status_code=409,
                    detail="Username too long"
                )

            if password == "" or password.__contains__(" "):
                raise HTTPException(
                    status_code=409,
                    detail="Password cannot be empty or have a space"
                )

            if len(password) < 8:
                raise HTTPException(
                    status_code=409,
                    detail="Password must be at least 8 characters"
                )

            if password == "12345678" or password == "password" or password == "qwerty" or password == "87654321":
                raise HTTPException(
                    status_code=409,
                    detail="Password is too common"
                )

            salt = bcrypt.gensalt()

            password_hash = bcrypt.hashpw(password.encode('utf-8'), salt)

            self.db_manager.queryDB(
                "INSERT INTO Users (username, password_hash, password_salt, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
                (username, password_hash, salt)
            )

            return {
                "id": 1,
                "username": username,
                "success": True
            }


        @self.app.post("/user/login")
        async def login_user(
            username: Annotated[str, Form()],
            password: Annotated[str, Form()],
            response: Response
        ):

            result = self.db_manager.queryDB(
                "SELECT id, password_hash FROM Users WHERE username = ?",
                (username,)
            )

            if len(result) == 0:
                raise HTTPException(
                    status_code=409,
                    detail="Invalid username or password"
                )

            if result[0] or len(result) > 1:
                user_id, stored_password_hash = result[0]

                if bcrypt.checkpw(password.encode('utf-8'), stored_password_hash):
                    token_result = self.db_manager.queryDB("SELECT token FROM Tokens WHERE user_id = ?", (user_id,))
                    if token_result:
                        token = token_result[0]
                    else:
                        token = self._generate_token_for_user(user_id)
                    token = str(token).replace("('", "")
                    token = token.replace("',)", "")
                    response.set_cookie(
                        key="token",
                        value=token,
                        httponly=True,
                        max_age=2592000,
                        samesite="lax",
                        secure=False
                    )

                    return {
                        "id": user_id,
                        "success": True
                    }

            raise HTTPException(
                status_code=409,
                detail="Invalid username or password"
            )


        @self.app.post("/user/logout")
        async def logout_user(
            response: Response = None
        ):
            if response:
                response.delete_cookie(key="token")
            return {
                "success": True
            }


        @self.app.post("/me")
        async def get_current_user(
            token: Annotated[str | None, Cookie()] = None
        ):
            if not token:
                return {
                    "success": False,
                    "message": "Not authenticated"
                }

            result = self.db_manager.queryDB(
                "SELECT user_id FROM Tokens WHERE token = ?",
                (token,)
            )

            if not result:
                return {
                    "success": False,
                    "message": "Invalid token"
                }

            user_id = result[0][0]

            username = self.db_manager.queryDB( "SELECT username FROM Users WHERE id = ?", (user_id,))

            return {
                "success": True,
                "username": username[0]
            }


        @self.app.post("/score/best/me")
        async def get_current_user_best_score(
            token: Annotated[str | None, Cookie()] = None
        ):
            if not token:
                return {
                    "success": False,
                    "message": "Not authenticated"
                }

            result = self.db_manager.queryDB(
                "SELECT user_id FROM Tokens WHERE token = ?",
                (token,)
            )

            if not result:
                return {
                    "success": False,
                    "message": "Invalid token"
                }

            user_id = result[0][0]
            user_best_score_result = self.db_manager.queryDB(
                """
                SELECT Scores.moves_count, Scores.solve_time_ms, Games.cube_size
                FROM Scores
                JOIN Games ON Scores.game_id = Games.id
                WHERE Scores.user_id = ? AND Games.completed = 1
                ORDER BY Scores.solve_time_ms ASC
                LIMIT 1
                """,
                (user_id,)
            )

            if not user_best_score_result:
                return {
                    "success": False,
                    "message": "No completed scores found"
                }
            if len(user_best_score_result) > 1:
                return {
                    "success": False,
                    "message": "Internal Server Error"
                }

            best_moves, best_time, best_size = user_best_score_result[0]

            return {
                "best_moves": best_moves,
                "best_time": best_time,
                "best_size": best_size,
                "success": True
            }


        @self.app.post("/score/best")
        async def get_best_scores(
            cube_size: Annotated[int, Form()]
        ):
            scores = self.db_manager.queryDB(
                """
                SELECT Scores.user_id, Users.username, Scores.moves_count, Scores.solve_time_ms
                FROM Scores
                JOIN Games ON Scores.game_id = Games.id
                JOIN Users ON Scores.user_id = Users.id
                WHERE Games.cube_size = ? AND Games.completed = 1
                ORDER BY Scores.solve_time_ms ASC
                LIMIT 10
                """,
                (cube_size,)
            )

            return {
                "scores": [
                    {
                        "user_id": user_id,
                        "username": username,
                        "moves": moves,
                        "solve_time_ms": solve_time_ms
                    }
                    for user_id, username, moves, solve_time_ms in scores
                ],
                "success": True
            }

        # @self.app.post("/game/update")
        # def update_game(
        #     state: Annotated[str, Form()],
        #     cube_size: Annotated[int, Form()],
        # ):
        #     if len(state) > 10000:
        #         raise HTTPException(
        #             status_code=409,
        #             detail="State string is too long"
        #         )
        #
        #     result = self.db_manager.queryDB(
        #         """
        #         UPDATE Games SET state = ?, last_updated = CURRENT_TIMESTAMP
        #         WHERE cube_size = ? AND completed = 0
        #         """,
        #         (cube_size,)
        #     )
        #
        #     return {
        #         "success": True,
        #         "message": "Game state updated successfully"
        #     }
            
class SQLite:
    def __init__(self):
        db_path = Path(__file__).resolve().parents[2] / "public" / "db" / "rubix.db"
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

server = Server()
server.set_routes()
app = server.app