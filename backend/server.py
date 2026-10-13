"""Clearspace Photos sync backend. Stores only aggregate counters, never photos."""
from __future__ import annotations

import os
import secrets
import string
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

load_dotenv()

client = AsyncIOMotorClient(os.environ.get("MONGO_URL"))
db = client[os.environ.get("DB_NAME")]

app = FastAPI(title="Clearspace Photos")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

COUNTERS = ["freed_bytes", "cleared_count", "kept_count", "favorite_count", "xp",
            "burst_sets_completed", "perfect_kept", "best_streak"]
PAIR_TTL = timedelta(minutes=10)


class DayStat(BaseModel):
    bytes: int = 0
    cleared: int = 0
    kept: int = 0
    favorites: int = 0


class ProgressSnapshot(BaseModel):
    device_id: str = Field(..., min_length=4, max_length=128)
    platform: str = "web"
    freed_bytes: int = 0
    cleared_count: int = 0
    kept_count: int = 0
    favorite_count: int = 0
    streak_days: int = 0
    best_streak: int = 0
    last_review_iso: str | None = None
    xp: int = 0
    burst_sets_completed: int = 0
    perfect_kept: int = 0
    unlocked_achievements: list[str] = []
    unlocked_at: dict[str, str] = {}
    history: dict[str, DayStat] = {}


class PairRequest(BaseModel):
    device_id: str = Field(..., min_length=4, max_length=128)


def merge(existing: dict, incoming: dict) -> dict:
    out = {**existing, **{k: v for k, v in incoming.items() if k not in COUNTERS}}
    for k in COUNTERS:
        out[k] = max(existing.get(k, 0) or 0, incoming.get(k, 0) or 0)
    out["unlocked_achievements"] = sorted(set(existing.get("unlocked_achievements", [])) | set(incoming.get("unlocked_achievements", [])))
    unlocked_at = {**incoming.get("unlocked_at", {}), **existing.get("unlocked_at", {})}
    out["unlocked_at"] = unlocked_at
    history = dict(existing.get("history", {}))
    for day, stat in incoming.get("history", {}).items():
        prev = history.get(day, {})
        history[day] = {f: max(prev.get(f, 0), stat.get(f, 0)) for f in ("bytes", "cleared", "kept", "favorites")}
    out["history"] = history
    a, b = existing.get("last_review_iso"), incoming.get("last_review_iso")
    if a and (not b or a > b):
        out["last_review_iso"] = a
        out["streak_days"] = existing.get("streak_days", 0)
    elif a == b:
        out["streak_days"] = max(existing.get("streak_days", 0), incoming.get("streak_days", 0))
    out["best_streak"] = max(out["best_streak"], out.get("streak_days", 0))
    return out


@app.get("/api/ping")
async def ping():
    return {"ok": True, "service": "clearspace", "time": datetime.now(timezone.utc).isoformat()}


@app.post("/api/progress")
async def sync_progress(payload: ProgressSnapshot):
    incoming = payload.model_dump()
    existing = await db.progress.find_one({"device_id": payload.device_id}, {"_id": 0}) or {}
    merged = merge(existing, incoming)
    merged["updated_at"] = datetime.now(timezone.utc).isoformat()
    platforms = set(existing.get("platforms", [])) | {payload.platform}
    merged["platforms"] = sorted(platforms)
    merged.pop("platform", None)
    await db.progress.update_one({"device_id": payload.device_id}, {"$set": merged}, upsert=True)
    return merged


@app.get("/api/progress/{device_id}")
async def get_progress(device_id: str):
    doc = await db.progress.find_one({"device_id": device_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="No progress found for this device")
    return doc


@app.post("/api/pair")
async def create_pair_code(payload: PairRequest):
    code = "".join(secrets.choice(string.ascii_uppercase.replace("O", "").replace("I", "") + "23456789") for _ in range(6))
    expires = datetime.now(timezone.utc) + PAIR_TTL
    await db.pairs.insert_one({"code": code, "device_id": payload.device_id, "expires_at": expires.isoformat()})
    return {"code": code, "expires_at": expires.isoformat()}


@app.get("/api/pair/{code}")
async def redeem_pair_code(code: str):
    doc = await db.pairs.find_one({"code": code.upper()}, {"_id": 0})
    if not doc or doc["expires_at"] < datetime.now(timezone.utc).isoformat():
        raise HTTPException(status_code=404, detail="Code expired or not found")
    await db.pairs.delete_one({"code": code.upper()})
    return {"device_id": doc["device_id"]}
