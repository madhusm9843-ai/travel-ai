"""Backend tests for TravelMate AI iteration 2."""
import os
import json
import time
import uuid
import httpx
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback read from frontend .env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip()
API = f"{BASE_URL}/api"


# ---------- Destinations ----------
def test_destinations_list_18_with_region():
    r = requests.get(f"{API}/destinations", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 18, f"expected 18, got {len(data)}"
    for d in data:
        assert "match" not in d, f"match key present in {d.get('id')}"
        assert d.get("region") in ("India", "International")
        assert d.get("country")
    india = [d for d in data if d["region"] == "India"]
    intl = [d for d in data if d["region"] == "International"]
    assert len(india) == 10
    assert len(intl) == 8


def test_destination_bali():
    r = requests.get(f"{API}/destinations/bali", timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert d["region"] == "International"
    assert d["country"] == "Indonesia"


def test_destination_tokyo():
    r = requests.get(f"{API}/destinations/tokyo", timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert d["name"] == "Tokyo"
    assert d["country"] == "Japan"


# ---------- Chat streaming ----------
@pytest.fixture(scope="module")
def stream_session_id():
    sid = f"TEST_stream_{uuid.uuid4().hex[:8]}"
    yield sid
    # cleanup
    try:
        requests.delete(f"{API}/chat/{sid}", timeout=10)
    except Exception:
        pass


def test_chat_stream_sse_format_and_persistence(stream_session_id):
    sid = stream_session_id
    events = []
    deltas = []
    msg_id = None
    with httpx.stream(
        "POST",
        f"{API}/chat/stream",
        json={"session_id": sid, "message": "Say hi in one short sentence."},
        timeout=60,
    ) as r:
        assert r.status_code == 200
        ct = r.headers.get("content-type", "")
        assert "text/event-stream" in ct, ct
        # X-Accel-Buffering may be stripped by Cloudflare in transit; verify against backend directly if possible
        # (skipped strict assertion - proxy behavior)
        cur_event = "message"
        cur_data = ""
        for line in r.iter_lines():
            if line == "":
                if cur_data:
                    events.append((cur_event, cur_data))
                    if cur_event == "start":
                        try:
                            msg_id = json.loads(cur_data).get("message_id")
                        except Exception:
                            pass
                    elif cur_event == "message":
                        try:
                            deltas.append(json.loads(cur_data).get("delta", ""))
                        except Exception:
                            pass
                cur_event, cur_data = "message", ""
                continue
            if line.startswith("event:"):
                cur_event = line[6:].strip()
            elif line.startswith("data:"):
                cur_data += line[5:].strip()

    assert any(e[0] == "start" for e in events), "no start event"
    assert any(e[0] == "done" for e in events), "no done event"
    assert msg_id, "no message_id from start event"
    assert len(deltas) > 0, "no delta chunks"
    full = "".join(deltas)
    assert len(full) > 0

    # verify persisted
    time.sleep(0.5)
    hist = requests.get(f"{API}/chat/{sid}", timeout=15).json()
    roles = [m["role"] for m in hist]
    assert "user" in roles and "assistant" in roles
    asst = [m for m in hist if m["role"] == "assistant"]
    assert any(m["content"].strip() == full.strip() for m in asst), "assistant reply not persisted"


def test_chat_stream_multi_turn(stream_session_id):
    sid = stream_session_id
    got_delta = False
    with httpx.stream(
        "POST",
        f"{API}/chat/stream",
        json={"session_id": sid, "message": "What did I just ask you?"},
        timeout=60,
    ) as r:
        assert r.status_code == 200
        for line in r.iter_lines():
            if line.startswith("data:") and '"delta"' in line:
                got_delta = True
    assert got_delta


def test_chat_non_stream_backward_compat():
    sid = f"TEST_nostream_{uuid.uuid4().hex[:8]}"
    r = requests.post(f"{API}/chat", json={"session_id": sid, "message": "hello"}, timeout=90)
    assert r.status_code == 200
    d = r.json()
    assert "reply" in d and d["reply"]
    requests.delete(f"{API}/chat/{sid}", timeout=10)


# ---------- Itinerary day count fix ----------
def test_itinerary_exact_5_days():
    sid = f"TEST_it_{uuid.uuid4().hex[:8]}"
    payload = {
        "session_id": sid,
        "destination": "Goa",
        "start_date": "2026-04-01",
        "end_date": "2026-04-05",
        "budget": 40000,
        "travelers": 2,
        "interests": ["beach"],
        "travel_style": "balanced",
        "diet": "any",
        "include_festivals": True,
    }
    r = requests.post(f"{API}/itinerary/generate", json=payload, timeout=180)
    assert r.status_code == 200, r.text[:400]
    trip = r.json()
    days = trip["itinerary"][0]["days"]
    assert len(days) == 5, f"expected 5 days, got {len(days)}"
    # cleanup
    requests.delete(f"{API}/trips/{trip['id']}", timeout=10)


# ---------- Transport search ----------
@pytest.mark.parametrize("ttype", ["bus", "metro", "train", "flight"])
def test_transport_search(ttype):
    r = requests.get(
        f"{API}/transport/search",
        params={"type": ttype, "origin": "Bangalore", "destination": "Mysore", "date": "2026-04-01"},
        timeout=30,
    )
    assert r.status_code == 200
    d = r.json()
    assert d["type"] == ttype
    assert isinstance(d["options"], list) and len(d["options"]) > 0
