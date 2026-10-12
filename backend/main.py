"""Campus Customs API. Run from the backend/ folder:

    uvicorn main:app --reload --port 8000

Problem 3: serves catalogue + inventory data and product images to the React front end.
Problem 4: create account / login / logout with hashed passwords and a session cookie (below).
Problem 5: /api/chat runs the PydanticAI shopping agent (agent.py, tools.py, models.py, prompts/prompt.md).
"""

import hashlib
import hmac
import json
import logging
import os
import re
import secrets
import sqlite3
import time
from pathlib import Path

from fastapi import Cookie, FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from agent import run_chat
from models import (
    ChatDeps,
    ChatHistoryMessage,
    ChatReply,
    ChatRequest,
    ChatTurn,
    LoginRequest,
    PageContext,
    ProductCard,
    PublicUser,
    SignupRequest,
)
from tools import DATA_DIR, SIZE_ORDER, get_db, load_product_card, product_from_row


# ---------- Password hashing + session tokens ----------
# Passwords: pbkdf2_sha256$<salt>$<hex hash> (PBKDF2-HMAC-SHA256, 120,000 iterations, salt used as
# UTF-8 text; matches the seed DB). Signup makes a random salt; login re-hashes with the stored salt
# and compares in constant time. Sessions: HMAC-signed "<user_id>.<expires>.<signature>" in an
# HttpOnly cookie.

ALGORITHM = "pbkdf2_sha256"
ITERATIONS = 120_000
SESSION_COOKIE = "cc_session"
SESSION_TTL_SECONDS = 7 * 24 * 3600

_SECRET_FILE = Path(__file__).resolve().parent / ".session_secret"


def _pbkdf2(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), ITERATIONS).hex()


def hash_password(password: str) -> str:
    salt = secrets.token_hex(8)
    return f"{ALGORITHM}${salt}${_pbkdf2(password, salt)}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algorithm, salt, expected = stored.split("$")
    except ValueError:
        return False
    if algorithm != ALGORITHM:
        return False
    return hmac.compare_digest(_pbkdf2(password, salt), expected)


# Used when an email isn't found, so a miss takes as long as a wrong password
# (stops attackers from learning which emails have accounts by timing responses).
_DUMMY_HASH = hash_password(secrets.token_hex(16))


def burn_time(password: str) -> None:
    verify_password(password, _DUMMY_HASH)


def _secret() -> bytes:
    env = os.environ.get("SESSION_SECRET")
    if env:
        return env.encode()
    if not _SECRET_FILE.exists():
        _SECRET_FILE.write_text(secrets.token_hex(32))
        _SECRET_FILE.chmod(0o600)
    return _SECRET_FILE.read_text().strip().encode()


def _sign(payload: str) -> str:
    return hmac.new(_secret(), payload.encode(), hashlib.sha256).hexdigest()


def make_session_token(user_id: int) -> str:
    payload = f"{user_id}.{int(time.time()) + SESSION_TTL_SECONDS}"
    return f"{payload}.{_sign(payload)}"


def read_session_token(token: str | None) -> int | None:
    """Return the user id if the token is authentic and unexpired, else None."""
    if not token:
        return None
    try:
        user_id, expires, signature = token.split(".")
        if not hmac.compare_digest(_sign(f"{user_id}.{expires}"), signature):
            return None
        if int(expires) < time.time():
            return None
        return int(user_id)
    except ValueError:
        return None


log = logging.getLogger("campus_customs")

app = FastAPI(title="Campus Customs API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# Product images: data/products/x.jpg -> /media/products/x.jpg
app.mount("/media", StaticFiles(directory=DATA_DIR), name="media")


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


# ---------- Products ----------


@app.get("/api/products")
def list_products(q: str | None = None) -> list[dict]:
    """All products with total stock and per-size inventory. Optional `q` does a simple text match."""
    sql = """
        SELECT c.*, COALESCE(SUM(i.quantity), 0) AS total_stock
        FROM catalogue c LEFT JOIN inventory i ON i.product_id = c.product_id
    """
    params: list[str] = []
    if q:
        sql += """ WHERE LOWER(c.name || ' ' || c.garment_type || ' ' || c.description
                   || ' ' || c.colors || ' ' || c.search_tags) LIKE ?"""
        params.append(f"%{q.lower()}%")
    sql += " GROUP BY c.product_id ORDER BY c.name"

    with get_db() as conn:
        rows = conn.execute(sql, params).fetchall()
        # Per-size stock for every product in one query (lets the page filter by "in stock in my size").
        inventory: dict[str, list[dict]] = {}
        for r in conn.execute("SELECT product_id, size, quantity FROM inventory"):
            inventory.setdefault(r["product_id"], []).append({"size": r["size"], "quantity": r["quantity"]})
    order = {s: i for i, s in enumerate(SIZE_ORDER)}
    return [
        {
            **product_from_row(r),
            "total_stock": r["total_stock"],
            "inventory": sorted(inventory.get(r["product_id"], []), key=lambda i: order.get(i["size"], 99)),
        }
        for r in rows
    ]


@app.get("/api/products/{product_id}")
def get_product(product_id: str) -> ProductCard:
    with get_db() as conn:
        card = load_product_card(conn, product_id)
    if card is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return card


# ---------- Auth ----------

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MIN_PASSWORD_LEN = 8


def public_user(row: sqlite3.Row) -> PublicUser:
    # Never include password_hash in anything sent to the browser or the LLM.
    return PublicUser(
        id=row["id"],
        first_name=row["first_name"] or row["name"].split(" ")[0],
        last_name=row["last_name"] or "",
        email=row["email"],
    )


def current_user(cc_session: str | None) -> PublicUser | None:
    user_id = read_session_token(cc_session)
    if user_id is None:
        return None
    with get_db() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return public_user(row) if row else None


def start_session(response: Response, user_id: int) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        make_session_token(user_id),
        max_age=SESSION_TTL_SECONDS,
        httponly=True,  # page JavaScript can't read it, so injected scripts can't steal it
        samesite="lax",
        # secure=True once served over HTTPS in production
    )


@app.post("/api/auth/signup", status_code=201)
def signup(req: SignupRequest, response: Response) -> PublicUser:
    first, last = req.first_name.strip(), req.last_name.strip()
    email = req.email.strip().lower()
    if not first or not last:
        raise HTTPException(400, "First and last name are required.")
    if not EMAIL_RE.match(email):
        raise HTTPException(400, "Please enter a valid email address.")
    if len(req.password) < MIN_PASSWORD_LEN:
        raise HTTPException(400, f"Password must be at least {MIN_PASSWORD_LEN} characters.")
    if req.password != req.confirm_password:
        raise HTTPException(400, "Passwords don't match.")

    with get_db(write=True) as conn:
        try:
            cur = conn.execute(
                "INSERT INTO users (name, email, password_hash, first_name, last_name) "
                "VALUES (?, ?, ?, ?, ?)",
                (f"{first} {last}", email, hash_password(req.password), first, last),
            )
        except sqlite3.IntegrityError:
            raise HTTPException(409, "An account with that email already exists.")
        row = conn.execute("SELECT * FROM users WHERE id = ?", (cur.lastrowid,)).fetchone()

    start_session(response, row["id"])
    return public_user(row)


@app.post("/api/auth/login")
def login(req: LoginRequest, response: Response) -> PublicUser:
    email = req.email.strip().lower()
    with get_db() as conn:
        row = conn.execute("SELECT * FROM users WHERE LOWER(email) = ?", (email,)).fetchone()

    if row is None:
        burn_time(req.password)
        ok = False
    else:
        ok = verify_password(req.password, row["password_hash"])
    if not ok:
        # Same message either way so attackers can't tell which emails exist.
        raise HTTPException(401, "Incorrect email or password.")

    start_session(response, row["id"])
    return public_user(row)


@app.post("/api/auth/logout")
def logout(response: Response) -> dict:
    response.delete_cookie(SESSION_COOKIE)
    return {"ok": True}


@app.get("/api/auth/me")
def me(cc_session: str | None = Cookie(default=None)) -> PublicUser:
    user = current_user(cc_session)
    if user is None:
        raise HTTPException(401, "Not logged in.")
    return user


# ---------- Chat ----------

HISTORY_LOAD_LIMIT = 50


def _saved_products(products_json: str | None) -> list[dict]:
    try:
        return json.loads(products_json) if products_json else []
    except json.JSONDecodeError:
        return []


def load_history(user_id: int, limit: int) -> list[sqlite3.Row]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT role, content, products_json, created_at FROM chat_messages "
            "WHERE user_id = ? ORDER BY id DESC LIMIT ?",
            (user_id, limit),
        ).fetchall()
    return list(reversed(rows))


def history_for_agent(user_id: int) -> list[ChatTurn]:
    """Saved turns for the model. Products shown are listed by id so "this one" can be resolved."""
    turns = []
    for r in load_history(user_id, 20):
        content = r["content"]
        shown = _saved_products(r["products_json"])
        if r["role"] == "assistant" and shown:
            listed = ", ".join(f"{p['product_id']} ({p['name']})" for p in shown[:8])
            more = f" and {len(shown) - 8} more" if len(shown) > 8 else ""
            content += f"\n[Products shown: {listed}{more}]"
        turns.append(ChatTurn(role=r["role"], content=content))
    return turns


def save_turn(user_id: int, message: str, reply: ChatReply) -> None:
    products_json = json.dumps([p.model_dump() for p in reply.products]) if reply.products else None
    with get_db(write=True) as conn:
        conn.execute(
            "INSERT INTO chat_messages (user_id, role, content) VALUES (?, 'user', ?)",
            (user_id, message),
        )
        conn.execute(
            "INSERT INTO chat_messages (user_id, role, content, products_json) "
            "VALUES (?, 'assistant', ?, ?)",
            (user_id, reply.reply, products_json),
        )


SAFE_PATH_RE = re.compile(r"^/[A-Za-z0-9/_\-]*$")


def build_deps(user: PublicUser | None, page: PageContext | None) -> ChatDeps:
    """Agent context for one message. Customer fields come from the session cookie; page fields are
    checked against the DB so a tampered request can't inject text into the agent's instructions."""
    deps = ChatDeps()
    if user:
        deps.user_id = user.id
        deps.first_name = user.first_name
        deps.last_name = user.last_name
        deps.email = user.email
    if page:
        if SAFE_PATH_RE.match(page.path):
            deps.page_path = page.path
        if page.product_id:
            with get_db() as conn:
                row = conn.execute(
                    "SELECT product_id, name FROM catalogue WHERE product_id = ?", (page.product_id,)
                ).fetchone()
            if row:  # unknown ids are ignored, so only real catalogue names reach the prompt
                deps.viewing_product_id = row["product_id"]
                deps.viewing_product_name = row["name"]
    return deps


@app.post("/api/chat")
async def chat(req: ChatRequest, cc_session: str | None = Cookie(default=None)) -> ChatReply:
    """Website chat message -> PydanticAI agent -> reply + product cards.

    Logged-in shoppers: history comes from (and is saved to) chat_messages, scoped to their user id.
    Guests: the browser sends the recent turns of the current conversation; nothing is saved.
    `page` tells the agent which product page (if any) the shopper is looking at.
    """
    user = current_user(cc_session)
    message = req.message.strip()
    if not message:
        raise HTTPException(400, "Message is empty.")

    deps = build_deps(user, req.page)
    history = history_for_agent(user.id) if user else req.history

    try:
        reply = await run_chat(message, deps, history)
    except Exception:
        log.exception("Agent run failed")
        raise HTTPException(502, "Our assistant is having trouble right now. Please try again in a moment.")

    if user:
        save_turn(user.id, message, reply)
    return reply


@app.get("/api/chat/history")
def chat_history(cc_session: str | None = Cookie(default=None)) -> list[ChatHistoryMessage]:
    """The logged-in shopper's own recent messages (empty for guests)."""
    user = current_user(cc_session)
    if user is None:
        return []
    return [
        ChatHistoryMessage(
            role=r["role"],
            content=r["content"],
            products=[ProductCard.model_validate({"inventory": [], "total_stock": 0, **p})
                      for p in _saved_products(r["products_json"])],
            created_at=r["created_at"],
        )
        for r in load_history(user.id, HISTORY_LOAD_LIMIT)
    ]
