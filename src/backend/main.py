import secrets
from typing import Annotated
from fastapi import FastAPI, Response, Cookie, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware  # Importieren Sie die Middleware
import bcrypt
import db.SQLite as SQLite


class Server:
    """SomeDocString"""
    def __init__(self):
        self.app = FastAPI(
            title="rubix-backend",
            version="1.0.0",
        )
        self.db_manager = SQLite.SQLiteDBManager()

        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    def _generate_token_for_user(self, user_id: int) -> str:
        token = secrets.token_urlsafe(32)
        self.db_manager.queryDB(
            "INSERT INTO Tokens (user_id, token, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
            (user_id, token),
        )
        return token

    def set_routes(self) -> None:
        """Setup routes"""
        @self.app.get("/active")
        async def root():
            return {
                "success": "true"
            }

        @self.app.post("/user/create")
        async def create_user(username: Annotated[str, Form()], password: Annotated[str, Form()]):
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

            print(username)
            print(password)

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
                    print(token)
                    response.set_cookie(key="token", value=token, httponly=True)

                    return {
                        "id": user_id,
                        "success": True
                    }

            raise HTTPException(
                status_code=409,
                detail="Invalid username or password"
            )

        @self.app.post("/user/logout")
        async def logout_user(response: Response = None):
            if response:
                response.delete_cookie(key="token")
            return {
                "success": True
            }

        @self.app.post("/me")
        async def get_current_user(token: Annotated[str | None, Cookie()] = None):
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
        async def get_current_user_best_score(token: Annotated[str | None, Cookie()] = None):
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
        async def get_best_scores(cube_size: Annotated[int, Form()]):

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

server = Server()
server.set_routes()
app = server.app