from fastapi import FastAPI, Response, Cookie, Form
from typing import Annotated
import bcrypt
import secrets
import db.SQLite as SQLite


def generate_token_for_user(user_id: int, db_manager: SQLite.SQLiteDBManager) -> str:
    token = secrets.token_urlsafe(32)
    db_manager.queryDB(
        "INSERT INTO Tokens (user_id, token, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
        (user_id, token),
    )
    return token



class Server:
    def __init__(self):
        self.app = FastAPI(
            title="rubix-backend",
            version="1.0.0",
        )
        self.db_manager = SQLite.SQLiteDBManager()
    
    def setRoutes(self):
        @self.app.get("/active")
        async def root():
            return {
                "success": "true"
            }

        @self.app.get("/user/all")
        async def get_all_users(token_cookie: Annotated[str | None, Cookie()] = None):
            return {
                "users": [
                    {
                        "id": 1,
                        "name": ""
                    }
                ],
                "success": True
            }

        @self.app.post("/user/score/{user_id}")
        async def get_user_score(user_id: int, token_cookie: Annotated[str | None, Cookie()] = None):
            return {
                "score": 1,
                "user_id": user_id,
                "success": True
            }

        @self.app.get("/user/{user_id}")
        async def get_user(user_id: int, token_cookie: Annotated[str | None, Cookie()] = None):
            return {
                "id": user_id,
                "name": "",
                "success": True
            }

        @self.app.post("/user/create")
        async def create_user(username: Annotated[str, Form()], password: Annotated[str, Form()]):
            self.db_manager.queryDB("SELECT id FROM Users WHERE username = ?", (username,))
            if self.db_manager.cursor.fetchone():
                return {
                    "success": False,
                    "message": "Username already exists"
                }

            salt = bcrypt.gensalt()

            password_hash = bcrypt.hashpw(password.encode('utf-8'), salt)

            self.db_manager.queryDB("INSERT INTO Users (username, password_hash, password_salt, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)", (username, password_hash, salt))

            return {
                "id": 1,
                "username": username,
                "success": True
            }
            
        @self.app.post("/user/login")
        async def login_user(username: Annotated[str, Form()], password: Annotated[str, Form()], response: Response):
            
            result = self.db_manager.queryDB("SELECT id, password_hash FROM Users WHERE username = ?", (username,))
                        
            if not result[0] or len(result) > 1:
                return {
                    "success": False,
                    "message": "User not found"
                }

            user_id, stored_password_hash = result[0]

            if bcrypt.checkpw(password.encode('utf-8'), stored_password_hash):
                self.db_manager.queryDB("SELECT token FROM Tokens WHERE user_id = ?", (user_id,))
                token_result = self.db_manager.cursor.fetchone()
                if token_result:
                    token = token_result[0]
                else:
                    token = generate_token_for_user(user_id, self.db_manager)
                response.set_cookie(key="token", value=token, httponly=True)
                return {
                    "id": user_id,
                    "success": True
                }
            

            return {
                "id": 1,
                "success": False,
            }
            
        @self.app.post("/user/logout")
        async def logout_user(token_cookie: Annotated[str | None, Cookie()] = None, response: Response = None):
            if response:
                response.delete_cookie(key="token")
            return {
                "success": True
            }
            
        @self.app.get("/user/me")
        async def get_current_user(token_cookie: Annotated[str | None, Cookie()] = None):
            if not token_cookie:
                return {
                    "success": False,
                    "message": "Not authenticated"
                }
            self.db_manager.queryDB("SELECT user_id FROM Tokens WHERE token = ?", (token_cookie,))
            result = self.db_manager.cursor.fetchone()
            if not result:
                return {
                    "success": False,
                    "message": "Invalid token"
                }
            user_id = result[0]
            self.db_manager.queryDB("SELECT username FROM Users WHERE id = ?", (user_id,))
            user_result = self.db_manager.cursor.fetchone()
            if not user_result:
                return {
                    "success": False,
                    "message": "User not found"
                }
            username = user_result[0]
            return {
                "id": user_id,
                "username": username,
                "success": True
            }
            
        @self.app.post("/score/best")
        async def get_best_scores(cube_size: Annotated[int, Form()]):
            
            # select best scores for completed games of the given cube size
            self.db_manager.queryDB(
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
            scores = self.db_manager.cursor.fetchall()

            print(scores)

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


server = Server()
server.setRoutes()
app = server.app