"""Clearspace backend tests: /api/ping, /api/progress merge, /api/pair codes."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://snapquest-organiser.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture
def device_id():
    return f"TEST_dev_{uuid.uuid4().hex[:12]}"


def test_ping():
    r = requests.get(f"{API}/ping", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data["ok"] is True
    assert data["service"] == "clearspace"


# Progress merge semantics
def test_progress_post_initial_and_merge_counters(device_id):
    initial = {
        "device_id": device_id, "platform": "web",
        "freed_bytes": 1000, "cleared_count": 2, "kept_count": 1, "favorite_count": 1,
        "xp": 10, "burst_sets_completed": 1, "perfect_kept": 0, "best_streak": 2,
        "unlocked_achievements": ["first-clear"],
        "history": {"2026-01-01": {"bytes": 1000, "cleared": 2, "kept": 1, "favorites": 1}},
    }
    r = requests.post(f"{API}/progress", json=initial, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["freed_bytes"] == 1000
    assert d["platforms"] == ["web"]
    assert "_id" not in d

    # Second post with lower counters on some + higher on others + different platform
    incoming = {
        "device_id": device_id, "platform": "ios",
        "freed_bytes": 500,  # lower, should remain 1000
        "cleared_count": 5,  # higher
        "kept_count": 1, "favorite_count": 0, "xp": 20,
        "burst_sets_completed": 0, "perfect_kept": 2, "best_streak": 1,
        "unlocked_achievements": ["burst-buster"],
        "history": {"2026-01-01": {"bytes": 800, "cleared": 3, "kept": 1, "favorites": 0}},
    }
    r2 = requests.post(f"{API}/progress", json=incoming, timeout=15)
    assert r2.status_code == 200
    m = r2.json()
    assert m["freed_bytes"] == 1000  # max
    assert m["cleared_count"] == 5
    assert m["xp"] == 20
    assert m["burst_sets_completed"] == 1
    assert m["perfect_kept"] == 2
    assert m["best_streak"] == 2
    assert set(m["unlocked_achievements"]) == {"first-clear", "burst-buster"}
    assert sorted(m["platforms"]) == ["ios", "web"]
    # history merged per-day by max
    assert m["history"]["2026-01-01"]["bytes"] == 1000
    assert m["history"]["2026-01-01"]["cleared"] == 3

    # GET verifies persistence
    g = requests.get(f"{API}/progress/{device_id}", timeout=15)
    assert g.status_code == 200
    gd = g.json()
    assert gd["freed_bytes"] == 1000
    assert sorted(gd["platforms"]) == ["ios", "web"]


def test_progress_get_missing_404():
    r = requests.get(f"{API}/progress/TEST_nonexistent_{uuid.uuid4().hex}", timeout=15)
    assert r.status_code == 404


# Pair code lifecycle
def test_pair_code_create_and_redeem_once(device_id):
    r = requests.post(f"{API}/pair", json={"device_id": device_id}, timeout=15)
    assert r.status_code == 200
    pc = r.json()
    assert len(pc["code"]) == 6
    assert "expires_at" in pc

    # First redemption succeeds
    r1 = requests.get(f"{API}/pair/{pc['code']}", timeout=15)
    assert r1.status_code == 200
    assert r1.json()["device_id"] == device_id

    # Second redemption 404
    r2 = requests.get(f"{API}/pair/{pc['code']}", timeout=15)
    assert r2.status_code == 404


def test_pair_invalid_code_404():
    r = requests.get(f"{API}/pair/ZZZZZZ", timeout=15)
    assert r.status_code == 404
