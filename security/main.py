"""
============================================================
security/main.py — Service de Sécurité Python (FastAPI)
SoutenancePro · ESP-UCAD · 2025/2026

Fonctions :
  - Authentification + génération JWT (HS256)
  - Hachage bcrypt (12 rounds)
  - Protection brute-force (rate limiting par IP)
  - Blacklist des tokens révoqués
  - Renouvellement de tokens (refresh)
============================================================
"""

from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from pydantic import BaseModel, field_validator
import bcrypt as _bcrypt
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from contextlib import asynccontextmanager
from typing import Optional
import sqlite3, os, hashlib, time, re
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ── CONFIG ──────────────────────────────────────────────────
SECRET_KEY  = os.getenv("JWT_SECRET",  "soutenance_secret_esp_ucad_2025")
ALGORITHM   = "HS256"
ACCESS_TTL  = int(os.getenv("ACCESS_TTL",  "480"))    # minutes (8h)
REFRESH_TTL = int(os.getenv("REFRESH_TTL", "10080"))  # minutes (7 jours)

# Chemin de la DB partagée avec Node.js
DB_PATH = Path(__file__).parent.parent / "backend" / "data" / "soutenance.db"

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:8080,http://127.0.0.1:3000"
).split(",")

# ── LIFESPAN (remplace @app.on_event deprecated) ───────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("\n🔐 SoutenancePro Security Service démarré")
    print(f"   Algorithme JWT : {ALGORITHM}")
    print(f"   Token TTL      : {ACCESS_TTL} min (access) / {REFRESH_TTL} min (refresh)")
    print(f"   Rate limit     : {MAX_ATTEMPTS} tentatives / {WINDOW_SECS}s par IP")
    print(f"   Base de données: {DB_PATH}")
    yield
    print("\n🔐 Security Service arrêté")

# ── APP ─────────────────────────────────────────────────────
app = FastAPI(
    title="SoutenancePro — Security Service",
    description="Authentification sécurisée ESP-UCAD",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── CRYPTO ──────────────────────────────────────────────────
# bcrypt used directly
security = HTTPBearer(auto_error=False)

# In-memory stores (production → Redis)
_blacklist: set[str]             = set()
_failed:    dict[str, list[float]] = {}

MAX_ATTEMPTS = 5
WINDOW_SECS  = 300   # 5 minutes

# ── DATABASE ────────────────────────────────────────────────
def get_user(username: str) -> Optional[dict]:
    if not DB_PATH.exists():
        return None
    with sqlite3.connect(str(DB_PATH)) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT * FROM users WHERE username = ?", (username,)
        ).fetchone()
        return dict(row) if row else None

def log_event(event_type: str, detail: str, ip: str = ""):
    try:
        if DB_PATH.exists():
            with sqlite3.connect(str(DB_PATH)) as conn:
                conn.execute(
                    "INSERT INTO activity_log (type, message) VALUES (?, ?)",
                    ("edit", f"[SEC:{event_type}] {detail} (IP:{ip})")
                )
    except Exception:
        pass

# ── MODELS ──────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def sanitize(cls, v: str) -> str:
        v = v.strip()
        if not re.match(r'^[a-zA-Z0-9_\-\.@]{2,50}$', v):
            raise ValueError("Identifiant invalide")
        return v

    @field_validator("password")
    @classmethod
    def check_pw(cls, v: str) -> str:
        if len(v) < 4 or len(v) > 128:
            raise ValueError("Mot de passe invalide")
        return v

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def strong(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Minimum 6 caractères requis")
        return v

class TokenRefreshRequest(BaseModel):
    refresh_token: str

class HashRequest(BaseModel):
    password: str

# ── TOKEN HELPERS ────────────────────────────────────────────
def make_token(data: dict, ttl_minutes: int, token_type: str) -> str:
    payload = {
        **data,
        "exp":  datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes),
        "iat":  datetime.now(timezone.utc),
        "type": token_type,
        "jti":  hashlib.sha256(f"{data.get('sub')}{time.time()}".encode()).hexdigest()[:16],
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def access_token(data: dict)  -> str: return make_token(data, ACCESS_TTL,  "access")
def refresh_token(data: dict) -> str: return make_token(data, REFRESH_TTL, "refresh")
def decode(token: str)        -> dict: return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
def tok_hash(t: str)          -> str:  return hashlib.sha256(t.encode()).hexdigest()

# ── RATE LIMITING ────────────────────────────────────────────
def get_ip(request: Request) -> str:
    fwd = request.headers.get("X-Forwarded-For")
    return fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "?")

def check_rate(ip: str):
    now   = time.time()
    recent = [t for t in _failed.get(ip, []) if now - t < WINDOW_SECS]
    _failed[ip] = recent
    if len(recent) >= MAX_ATTEMPTS:
        wait = int(WINDOW_SECS - (now - recent[0]))
        raise HTTPException(429, f"Trop de tentatives. Réessayez dans {wait}s.")

def record_fail(ip: str):  _failed.setdefault(ip, []).append(time.time())
def clear_fail(ip: str):   _failed.pop(ip, None)

# ── ROUTES ───────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "SoutenancePro Security", "time": datetime.now().isoformat()}


@app.post("/auth/login")
async def login(body: LoginRequest, request: Request):
    ip = get_ip(request)
    check_rate(ip)

    user = get_user(body.username)

    # Même message pour utilisateur inexistant et mauvais mot de passe
    # (empêche l'énumération des comptes)
    if not user or not _bcrypt.checkpw(body.password.encode(), user["password"].encode() if isinstance(user["password"], str) else user["password"]):
        record_fail(ip)
        log_event("LOGIN_FAIL", f"user={body.username}", ip)
        raise HTTPException(401, "Identifiants incorrects")

    clear_fail(ip)
    log_event("LOGIN_OK", f"user={body.username}", ip)

    payload = {
        "sub":      str(user["id"]),
        "username": user["username"],
        "role":     user["role"],
    }

    return {
        "access_token":  access_token(payload),
        "refresh_token": refresh_token(payload),
        "token_type":    "bearer",
        "expires_in":    ACCESS_TTL * 60,
        "user": {
            "id":       user["id"],
            "username": user["username"],
            "role":     user["role"],
        },
    }


@app.post("/auth/refresh")
async def do_refresh(body: TokenRefreshRequest, request: Request):
    ip = get_ip(request)
    try:
        payload = decode(body.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(401, "Token invalide")
        if tok_hash(body.refresh_token) in _blacklist:
            raise HTTPException(401, "Token révoqué")
    except JWTError:
        log_event("REFRESH_FAIL", "invalid token", ip)
        raise HTTPException(401, "Token invalide ou expiré")

    # Rotation du refresh token (révocation de l'ancien)
    _blacklist.add(tok_hash(body.refresh_token))
    new_payload = {"sub": payload["sub"], "username": payload["username"], "role": payload["role"]}

    return {
        "access_token":  access_token(new_payload),
        "refresh_token": refresh_token(new_payload),
        "token_type":    "bearer",
        "expires_in":    ACCESS_TTL * 60,
    }


@app.post("/auth/logout")
async def logout(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(security),
    request: Request = None,
):
    if creds:
        _blacklist.add(tok_hash(creds.credentials))
        log_event("LOGOUT", "token révoqué", get_ip(request) if request else "")
    return {"message": "Déconnecté avec succès"}


@app.post("/auth/verify")
async def verify(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if not creds:
        raise HTTPException(401, "Token manquant")
    if tok_hash(creds.credentials) in _blacklist:
        raise HTTPException(401, "Token révoqué")
    try:
        p = decode(creds.credentials)
        return {"valid": True, "user": {"id": p["sub"], "username": p["username"], "role": p["role"]}}
    except JWTError:
        raise HTTPException(401, "Token invalide")


@app.post("/auth/change-password")
async def change_password(
    body: ChangePasswordRequest,
    creds: Optional[HTTPAuthorizationCredentials] = Depends(security),
    request: Request = None,
):
    if not creds:
        raise HTTPException(401, "Token requis")
    try:
        p = decode(creds.credentials)
    except JWTError:
        raise HTTPException(401, "Token invalide")

    user = get_user(p["username"])
    if not user or not _bcrypt.checkpw(body.current_password.encode(), user["password"].encode() if isinstance(user["password"], str) else user["password"]):
        log_event("PWD_FAIL", f"user={p['username']}", get_ip(request) if request else "")
        raise HTTPException(401, "Mot de passe actuel incorrect")

    new_hash = _bcrypt.hashpw(body.new_password.encode(), _bcrypt.gensalt(rounds=12)).decode()
    if DB_PATH.exists():
        with sqlite3.connect(str(DB_PATH)) as conn:
            conn.execute("UPDATE users SET password=? WHERE id=?", (new_hash, user["id"]))

    log_event("PWD_CHANGED", f"user={p['username']}", get_ip(request) if request else "")
    return {"message": "Mot de passe modifié avec succès"}


@app.post("/auth/hash")
async def hash_pw(
    body: HashRequest,
    creds: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    """Endpoint admin : hacher un mot de passe avec bcrypt"""
    if not creds:
        raise HTTPException(401, "Non autorisé")
    try:
        p = decode(creds.credentials)
        if p.get("role") != "admin":
            raise HTTPException(403, "Accès admin requis")
    except JWTError:
        raise HTTPException(401, "Token invalide")

    h = _bcrypt.hashpw(body.password.encode(), _bcrypt.gensalt(rounds=12)).decode()
    return {"hash": h, "algorithm": "bcrypt", "rounds": 12}


@app.get("/auth/stats")
async def security_stats(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """Vue d'ensemble sécurité (admin uniquement)"""
    if not creds:
        raise HTTPException(401, "Non autorisé")
    try:
        p = decode(creds.credentials)
        if p.get("role") != "admin":
            raise HTTPException(403, "Accès admin requis")
    except JWTError:
        raise HTTPException(401, "Token invalide")

    now = time.time()
    locked = sum(
        1 for attempts in _failed.values()
        if len([t for t in attempts if now - t < WINDOW_SECS]) >= MAX_ATTEMPTS
    )
    return {
        "tokens_revoked":  len(_blacklist),
        "ips_locked":      locked,
        "ips_tracked":     len(_failed),
    }


# ── ERROR HANDLERS ───────────────────────────────────────────
@app.exception_handler(422)
async def validation_handler(request, exc):
    errors = exc.errors() if hasattr(exc, "errors") else []
    msg = errors[0].get("msg", "Données invalides") if errors else "Données invalides"
    return JSONResponse(status_code=422, content={"detail": msg})


# ── MAIN ─────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)
