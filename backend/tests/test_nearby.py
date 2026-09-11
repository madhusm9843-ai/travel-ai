"""Backend tests for nearby POI + location-aware chat (iteration 3)."""
import os
import uuid
import time
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip()
API = f"{BASE_URL}/api"

# Bangalore center - reliably has POIs via Overpass mirror
BLR = {"lat": 12.9716, "lng": 77.5946}


# ---------- /api/nearby ----------
def test_nearby_restaurant_basic():
    r = requests.get(f"{API}/nearby", params={**BLR, "category": "restaurant", "radius": 1500}, timeout=60)
    assert r.status_code == 200, r.text[:300]
    data = r.json()
    assert data["category"] == "restaurant"
    assert data["count"] >= 5, f"expected >=5 results, got {data['count']}"
    results = data["results"]
    assert isinstance(results, list) and len(results) == data["count"]
    # Fields
    for p in results:
        assert p.get("name")
        assert isinstance(p["lat"], (int, float))
        assert isinstance(p["lng"], (int, float))
        assert isinstance(p["distance_m"], int)
        assert p["photo"].startswith("https://source.unsplash.com/")
        assert p["osm_url"].startswith("https://www.openstreetmap.org/")
    # Sorted ascending
    dists = [p["distance_m"] for p in results]
    assert dists == sorted(dists), "results not sorted by distance"


@pytest.mark.parametrize("cat", ["hotel", "cafe", "attraction"])
def test_nearby_categories_nonempty(cat):
    r = requests.get(f"{API}/nearby", params={**BLR, "category": cat, "radius": 2000}, timeout=60)
    assert r.status_code == 200
    data = r.json()
    assert data["count"] > 0, f"empty for {cat}"


def test_nearby_empty_ocean():
    r = requests.get(f"{API}/nearby", params={"lat": 0, "lng": 0, "category": "restaurant", "radius": 200}, timeout=60)
    assert r.status_code == 200
    data = r.json()
    assert data["count"] == 0
    assert data["results"] == []


# ---------- /api/chat/nearby ----------
@pytest.fixture(scope="module")
def nearby_sid():
    sid = f"TEST_nearby_{uuid.uuid4().hex[:8]}"
    yield sid
    try:
        requests.delete(f"{API}/chat/{sid}", timeout=10)
    except Exception:
        pass


def test_chat_nearby_hotel_infer_and_persist(nearby_sid):
    r = requests.post(
        f"{API}/chat/nearby",
        json={"session_id": nearby_sid, "message": "hotels near me", **BLR, "radius": 2000},
        timeout=120,
    )
    assert r.status_code == 200, r.text[:400]
    d = r.json()
    assert d["category"] == "hotel"
    assert isinstance(d["pois"], list) and len(d["pois"]) > 0
    assert d.get("reply") and len(d["reply"]) > 20
    # Reply references at least one POI name (case-insensitive substring)
    reply_l = d["reply"].lower()
    names = [p["name"].lower() for p in d["pois"]]
    assert any(n in reply_l for n in names), f"no POI name found in reply. names={names[:3]}"

    # Persistence
    time.sleep(0.4)
    hist = requests.get(f"{API}/chat/{nearby_sid}", timeout=15).json()
    roles = [m["role"] for m in hist]
    assert "user" in roles and "assistant" in roles


@pytest.mark.parametrize("msg,expected", [
    ("where should I eat?", "restaurant"),
    ("good place to eat nearby", "restaurant"),
    ("eating spots close by", "restaurant"),
    ("hotels near me", "hotel"),
    ("coffee shops close by", "cafe"),
    ("places to see nearby", "attraction"),
])
def test_chat_nearby_infers_category(msg, expected):
    sid = f"TEST_inf_{uuid.uuid4().hex[:6]}"
    r = requests.post(
        f"{API}/chat/nearby",
        json={"session_id": sid, "message": msg, **BLR, "radius": 2000},
        timeout=120,
    )
    assert r.status_code == 200, r.text[:300]
    d = r.json()
    assert d["category"] == expected, f"'{msg}' -> {d['category']}, expected {expected}"
    requests.delete(f"{API}/chat/{sid}", timeout=10)


# ---------- Regression: /api/chat still works ----------
def test_chat_regression_non_nearby():
    sid = f"TEST_reg_{uuid.uuid4().hex[:6]}"
    r = requests.post(f"{API}/chat", json={"session_id": sid, "message": "Best time to visit Ladakh?"}, timeout=90)
    assert r.status_code == 200
    assert r.json().get("reply")
    requests.delete(f"{API}/chat/{sid}", timeout=10)
