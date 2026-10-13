"""Clearspace Photos — lightweight sync backend.

The Clearspace app is 100% on-device: photos never leave the browser.
This backend exists only to:
  - expose a health endpoint (so the preview environment can route traffic)
  - optionally persist anonymous progress snapshots keyed by a client-generated
    device id, so a user can continue their streak if they clear localStorage.

No photos, no filenames, no sensitive data are ever stored.
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

load_dotenv()

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Clearspace Photos")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ProgressSnapshot(BaseModel):
    device_id: str = Field(..., min_length=4, max_length=128)
    freed_bytes: int = 0
    cleared_count: int = 0
    kept_count: int = 0
    favorite_count: int = 0
    streak_days: int = 0
    xp: int = 0
    unlocked_achievements: list[str] = []
    updated_at: Optional[str] = None


@app.get("/api/ping")
async def ping():
    return {"ok": True, "service": "clearspace", "time": datetime.now(timezone.utc).isoformat()}


@app.post("/api/progress")
async def save_progress(payload: ProgressSnapshot):
    doc = payload.model_dump()
    doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.progress.update_one(
        {"device_id": payload.device_id},
        {"$set": doc},
        upsert=True,
    )
    return {"ok": True, "updated_at": doc["updated_at"]}


@app.get("/api/progress/{device_id}")
async def get_progress(device_id: str):
    doc = await db.progress.find_one({"device_id": device_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="No progress found for this device")
    return doc
