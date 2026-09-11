from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import logging
import uuid
import httpx
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Any, Dict
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

GROQ_API_KEY = os.environ.get('GROQ_API_KEY', '')
GROQ_MODEL = os.environ.get('GROQ_MODEL', 'llama-3.3-70b-versatile')
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

app = FastAPI(title="TravelMate AI API")
api_router = APIRouter(prefix="/api")


# ---------- Models ----------
def now_iso():
    return datetime.now(timezone.utc).isoformat()


class ChatRequest(BaseModel):
    session_id: str
    message: str
    context: Optional[Dict[str, Any]] = None


class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    role: str  # 'user' | 'assistant'
    content: str
    timestamp: str = Field(default_factory=now_iso)


class TripPreferences(BaseModel):
    model_config = ConfigDict(extra="ignore")
    session_id: str
    destination: str
    start_date: str
    end_date: str
    budget: int  # in INR
    travelers: int = 2
    interests: List[str] = []
    travel_style: str = "balanced"  # relaxed | balanced | packed
    diet: str = "any"
    include_festivals: bool = True
    notes: str = ""


class Trip(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    title: str
    destination: str
    start_date: str
    end_date: str
    budget: int
    travelers: int
    preferences: Dict[str, Any]
    itinerary: List[Dict[str, Any]] = []
    created_at: str = Field(default_factory=now_iso)


class BookingRequest(BaseModel):
    session_id: str
    type: str  # flight | train | bus | metro
    option_id: str
    passenger_name: str
    seat: Optional[str] = None
    extras: Optional[Dict[str, Any]] = None


# ---------- Destinations catalog ----------
DESTINATIONS = [
    # ---- India ----
    {"id": "kerala", "region": "India", "name": "Kerala", "country": "India",
     "tagline": "Backwaters, Hills & Coastal Charm", "days": "5 Days",
     "image": "https://images.unsplash.com/photo-1624554305378-0f440dd3a8c1?crop=entropy&cs=srgb&fm=jpg&q=85",
     "lat": 10.8505, "lng": 76.2711,
     "highlights": ["Alleppey Backwaters", "Munnar Tea Gardens", "Fort Kochi", "Wayanad"],
     "best_season": "Sep – Mar"},
    {"id": "goa", "region": "India", "name": "Goa", "country": "India",
     "tagline": "Beaches, Cafés & Sunsets", "days": "3–4 Days",
     "image": "https://images.unsplash.com/photo-1685271552630-9bc169185566?crop=entropy&cs=srgb&fm=jpg&q=85",
     "lat": 15.2993, "lng": 74.1240,
     "highlights": ["Palolem Beach", "Old Goa Churches", "Anjuna Flea Market", "Dudhsagar Falls"],
     "best_season": "Nov – Feb"},
    {"id": "rajasthan", "region": "India", "name": "Rajasthan", "country": "India",
     "tagline": "Forts, Palaces & Desert Nights", "days": "6 Days",
     "image": "https://images.unsplash.com/photo-1713682995521-22ec819b50ac?crop=entropy&cs=srgb&fm=jpg&q=85",
     "lat": 26.9124, "lng": 75.7873,
     "highlights": ["Jaipur City Palace", "Udaipur Lakes", "Jaisalmer Dunes", "Pushkar"],
     "best_season": "Oct – Mar"},
    {"id": "himachal", "region": "India", "name": "Himachal Pradesh", "country": "India",
     "tagline": "Snow, Alpine Valleys & Villages", "days": "5 Days",
     "image": "https://images.unsplash.com/photo-1641310045101-fd176a42cd44?crop=entropy&cs=srgb&fm=jpg&q=85",
     "lat": 31.1048, "lng": 77.1734,
     "highlights": ["Manali", "Spiti Valley", "Kasol", "Shimla"],
     "best_season": "Mar – Jun & Oct – Feb"},
    {"id": "tamilnadu", "region": "India", "name": "Tamil Nadu", "country": "India",
     "tagline": "Temples, Coasts & Hill Stations", "days": "5 Days",
     "image": "https://images.unsplash.com/photo-1621351183012-e2f9972dd9bf?crop=entropy&cs=srgb&fm=jpg&q=85",
     "lat": 11.1271, "lng": 78.6569,
     "highlights": ["Madurai Meenakshi", "Pondicherry", "Ooty", "Mahabalipuram"],
     "best_season": "Nov – Mar"},
    {"id": "karnataka", "region": "India", "name": "Karnataka", "country": "India",
     "tagline": "Palaces, Coffee Hills & Coastline", "days": "5 Days",
     "image": "https://images.unsplash.com/photo-1600100397917-8b47f0d7fa26?crop=entropy&cs=srgb&fm=jpg&q=85",
     "lat": 15.3173, "lng": 75.7139,
     "highlights": ["Coorg", "Hampi", "Mysore Palace", "Gokarna"],
     "best_season": "Oct – Mar"},
    {"id": "ladakh", "region": "India", "name": "Ladakh", "country": "India",
     "tagline": "Moonscapes, Monasteries & High-Altitude Lakes", "days": "7 Days",
     "image": "https://images.unsplash.com/photo-1589308078055-15b7a4b2c8b6?crop=entropy&cs=srgb&fm=jpg&q=85",
     "lat": 34.1526, "lng": 77.5771,
     "highlights": ["Pangong Tso", "Nubra Valley", "Leh Palace", "Magnetic Hill"],
     "best_season": "May – Sep"},
    {"id": "andaman", "region": "India", "name": "Andaman Islands", "country": "India",
     "tagline": "Turquoise Waters & Coral Reefs", "days": "5 Days",
     "image": "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?crop=entropy&cs=srgb&fm=jpg&q=85",
     "lat": 11.7401, "lng": 92.6586,
     "highlights": ["Radhanagar Beach", "Cellular Jail", "Havelock", "Neil Island"],
     "best_season": "Oct – May"},
    {"id": "uttarakhand", "region": "India", "name": "Uttarakhand", "country": "India",
     "tagline": "Rishikesh, Rivers & Himalayan Trails", "days": "5 Days",
     "image": "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?crop=entropy&cs=srgb&fm=jpg&q=85",
     "lat": 30.0668, "lng": 79.0193,
     "highlights": ["Rishikesh", "Nainital", "Valley of Flowers", "Auli Skiing"],
     "best_season": "Mar – Jun & Sep – Nov"},
    {"id": "meghalaya", "region": "India", "name": "Meghalaya", "country": "India",
     "tagline": "Living Root Bridges & Cloud Villages", "days": "5 Days",
     "image": "https://images.unsplash.com/photo-1667980148516-e4e4edd44a45?crop=entropy&cs=srgb&fm=jpg&q=85",
     "lat": 25.4670, "lng": 91.3662,
     "highlights": ["Cherrapunji", "Dawki River", "Mawlynnong", "Nohkalikai Falls"],
     "best_season": "Oct – May"},

    # ---- International ----
    {"id": "bali", "region": "International", "name": "Bali", "country": "Indonesia",
     "tagline": "Rice Terraces, Beach Clubs & Temples", "days": "7 Days",
     "image": "https://images.unsplash.com/photo-1537996194471-e657df975ab4?crop=entropy&cs=srgb&fm=jpg&q=85",
     "lat": -8.3405, "lng": 115.0920,
     "highlights": ["Ubud", "Uluwatu Temple", "Seminyak", "Nusa Penida"],
     "best_season": "Apr – Oct"},
    {"id": "tokyo", "region": "International", "name": "Tokyo", "country": "Japan",
     "tagline": "Neon Nights, Sushi & Ancient Shrines", "days": "6 Days",
     "image": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?crop=entropy&cs=srgb&fm=jpg&q=85",
     "lat": 35.6762, "lng": 139.6503,
     "highlights": ["Shibuya", "Asakusa", "Mount Fuji Day Trip", "TeamLab Planets"],
     "best_season": "Mar – May & Sep – Nov"},
    {"id": "paris", "region": "International", "name": "Paris", "country": "France",
     "tagline": "Boulevards, Bistros & Boulangeries", "days": "5 Days",
     "image": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?crop=entropy&cs=srgb&fm=jpg&q=85",
     "lat": 48.8566, "lng": 2.3522,
     "highlights": ["Louvre", "Eiffel Tower", "Montmartre", "Versailles"],
     "best_season": "Apr – Jun & Sep – Oct"},
    {"id": "dubai", "region": "International", "name": "Dubai", "country": "UAE",
     "tagline": "Skylines, Souks & Desert Safaris", "days": "4 Days",
     "image": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?crop=entropy&cs=srgb&fm=jpg&q=85",
     "lat": 25.2048, "lng": 55.2708,
     "highlights": ["Burj Khalifa", "Palm Jumeirah", "Old Dubai", "Desert Dunes"],
     "best_season": "Nov – Mar"},
    {"id": "iceland", "region": "International", "name": "Iceland", "country": "Iceland",
     "tagline": "Glaciers, Geysers & Northern Lights", "days": "7 Days",
     "image": "https://images.unsplash.com/photo-1520175480921-4edfa2983e0f?crop=entropy&cs=srgb&fm=jpg&q=85",
     "lat": 64.9631, "lng": -19.0208,
     "highlights": ["Golden Circle", "Blue Lagoon", "Vík Beach", "Jökulsárlón"],
     "best_season": "Sep – Mar (auroras)"},
    {"id": "swiss-alps", "region": "International", "name": "Swiss Alps", "country": "Switzerland",
     "tagline": "Peaks, Scenic Rails & Chocolate Villages", "days": "6 Days",
     "image": "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?crop=entropy&cs=srgb&fm=jpg&q=85",
     "lat": 46.5197, "lng": 7.9597,
     "highlights": ["Interlaken", "Zermatt", "Jungfraujoch", "Lucerne"],
     "best_season": "Jun – Sep & Dec – Feb"},
    {"id": "phuket", "region": "International", "name": "Phuket", "country": "Thailand",
     "tagline": "Emerald Bays, Longtails & Night Markets", "days": "5 Days",
     "image": "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?crop=entropy&cs=srgb&fm=jpg&q=85",
     "lat": 7.8804, "lng": 98.3923,
     "highlights": ["Phi Phi Islands", "Old Phuket Town", "Big Buddha", "James Bond Island"],
     "best_season": "Nov – Apr"},
    {"id": "singapore", "region": "International", "name": "Singapore", "country": "Singapore",
     "tagline": "Gardens, Hawker Food & Skyparks", "days": "4 Days",
     "image": "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?crop=entropy&cs=srgb&fm=jpg&q=85",
     "lat": 1.3521, "lng": 103.8198,
     "highlights": ["Marina Bay", "Gardens by the Bay", "Sentosa", "Little India"],
     "best_season": "Feb – Apr"},
]


# ---------- AI Helpers ----------
SYSTEM_PROMPT = (
    "You are TravelMate AI, a world-class travel concierge. "
    "You craft hyper-personalized, day-by-day itineraries for destinations across India AND international hotspots "
    "(Bali, Tokyo, Paris, Dubai, Iceland, Swiss Alps, Phuket, Singapore, etc.). "
    "You share local secret gems, honest budget breakdowns in the traveller's currency, cultural festivals near travel dates, "
    "food recommendations that respect dietary preferences, and practical transit tips (metro, bus, train, flight). "
    "Answer in a warm, editorial tone. Use short paragraphs, bullet lists with '- ' or '• ', and **bold** for emphasis. "
    "When asked for structured plans, respond in the requested JSON format only."
)


async def groq_chat(messages: List[Dict[str, str]], temperature: float = 0.6, json_mode: bool = False) -> str:
    if not GROQ_API_KEY:
        raise HTTPException(500, "GROQ_API_KEY not configured")
    payload = {
        "model": GROQ_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": 3000,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}
    headers = {"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=90) as hc:
        r = await hc.post(GROQ_URL, json=payload, headers=headers)
        if r.status_code != 200:
            raise HTTPException(r.status_code, f"Groq error: {r.text[:300]}")
        data = r.json()
        return data["choices"][0]["message"]["content"]


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"service": "TravelMate AI", "status": "ok"}


@api_router.get("/destinations")
async def list_destinations():
    return DESTINATIONS


@api_router.get("/destinations/{dest_id}")
async def get_destination(dest_id: str):
    for d in DESTINATIONS:
        if d["id"] == dest_id:
            return d
    raise HTTPException(404, "Destination not found")


@api_router.post("/chat")
async def chat(req: ChatRequest):
    # Load recent history
    history_docs = await db.chat_messages.find(
        {"session_id": req.session_id}, {"_id": 0}
    ).sort("timestamp", 1).to_list(30)

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if req.context:
        ctx_text = "Current trip context: " + json.dumps(req.context)[:1500]
        messages.append({"role": "system", "content": ctx_text})
    for m in history_docs[-20:]:
        messages.append({"role": m["role"], "content": m["content"]})
    messages.append({"role": "user", "content": req.message})

    user_msg = ChatMessage(session_id=req.session_id, role="user", content=req.message)
    await db.chat_messages.insert_one(user_msg.model_dump())

    reply = await groq_chat(messages, temperature=0.7)

    assistant_msg = ChatMessage(session_id=req.session_id, role="assistant", content=reply)
    await db.chat_messages.insert_one(assistant_msg.model_dump())

    return {"reply": reply, "message_id": assistant_msg.id}


@api_router.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    """SSE streaming endpoint — yields token-by-token like ChatGPT/Claude."""
    history_docs = await db.chat_messages.find(
        {"session_id": req.session_id}, {"_id": 0}
    ).sort("timestamp", 1).to_list(30)

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if req.context:
        messages.append({"role": "system", "content": "Current trip context: " + json.dumps(req.context)[:1500]})
    for m in history_docs[-20:]:
        messages.append({"role": m["role"], "content": m["content"]})
    messages.append({"role": "user", "content": req.message})

    user_msg = ChatMessage(session_id=req.session_id, role="user", content=req.message)
    await db.chat_messages.insert_one(user_msg.model_dump())

    assistant_id = str(uuid.uuid4())

    async def event_gen():
        yield f"event: start\ndata: {json.dumps({'message_id': assistant_id})}\n\n"
        buffer_text = ""
        payload = {
            "model": GROQ_MODEL,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 3000,
            "stream": True,
        }
        headers = {"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"}
        try:
            async with httpx.AsyncClient(timeout=120) as hc:
                async with hc.stream("POST", GROQ_URL, json=payload, headers=headers) as r:
                    if r.status_code != 200:
                        err_body = (await r.aread()).decode(errors="ignore")[:300]
                        yield f"event: error\ndata: {json.dumps({'error': err_body})}\n\n"
                        return
                    async for line in r.aiter_lines():
                        if not line or not line.startswith("data:"):
                            continue
                        data = line[5:].strip()
                        if data == "[DONE]":
                            break
                        try:
                            obj = json.loads(data)
                            delta = obj.get("choices", [{}])[0].get("delta", {}).get("content", "")
                            if delta:
                                buffer_text += delta
                                yield f"data: {json.dumps({'delta': delta})}\n\n"
                        except Exception:
                            continue
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'error': str(e)[:200]})}\n\n"

        # persist final message
        if buffer_text:
            assistant_msg = ChatMessage(id=assistant_id, session_id=req.session_id, role="assistant", content=buffer_text)
            await db.chat_messages.insert_one(assistant_msg.model_dump())
        yield f"event: done\ndata: {json.dumps({'message_id': assistant_id})}\n\n"

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


@api_router.get("/chat/{session_id}")
async def chat_history(session_id: str):
    docs = await db.chat_messages.find(
        {"session_id": session_id}, {"_id": 0}
    ).sort("timestamp", 1).to_list(200)
    return docs


@api_router.delete("/chat/{session_id}")
async def clear_chat(session_id: str):
    await db.chat_messages.delete_many({"session_id": session_id})
    return {"ok": True}


@api_router.post("/itinerary/generate")
async def generate_itinerary(prefs: TripPreferences):
    # Compute # days
    try:
        d1 = datetime.fromisoformat(prefs.start_date)
        d2 = datetime.fromisoformat(prefs.end_date)
        num_days = max(1, (d2 - d1).days + 1)
    except Exception:
        num_days = 5

    ask = f"""Craft a detailed {num_days}-day itinerary for {prefs.destination}, India.
Traveler profile:
- Travelers: {prefs.travelers}
- Budget (total INR): {prefs.budget}
- Interests: {', '.join(prefs.interests) or 'general sightseeing'}
- Travel style: {prefs.travel_style}
- Dietary preference: {prefs.diet}
- Include cultural festivals near dates {prefs.start_date} to {prefs.end_date}: {prefs.include_festivals}
- Additional notes: {prefs.notes or 'none'}

CRITICAL: The "days" array MUST contain EXACTLY {num_days} objects, one per day (day 1 through day {num_days}). Do NOT return fewer or more days.

Return STRICT JSON with this shape:
{{
  "title": "string",
  "summary": "1-2 sentence overview",
  "budget_breakdown": {{"stay": int, "food": int, "transit": int, "activities": int, "buffer": int}},
  "festivals": [{{"name": "string", "date": "YYYY-MM-DD", "place": "string"}}],
  "days": [
    {{
      "day": 1,
      "title": "string",
      "stops": [
        {{"time": "09:00 AM", "kind": "Attraction & Nature Walk", "name": "string",
          "description": "string", "lat": 0.0, "lng": 0.0, "cost_inr": 0}}
      ]
    }}
  ]
}}
Each day must have 3-5 stops with realistic lat/lng inside India. Costs sum roughly to the budget.
The "days" array length MUST equal {num_days}.
"""
    raw = await groq_chat(
        [
            {"role": "system", "content": SYSTEM_PROMPT + " You MUST return valid JSON only."},
            {"role": "user", "content": ask},
        ],
        temperature=0.6,
        json_mode=True,
    )
    try:
        plan = json.loads(raw)
    except Exception:
        cleaned = raw.strip().strip("`")
        if cleaned.startswith("json"):
            cleaned = cleaned[4:].strip()
        plan = json.loads(cleaned)

    # Post-process: guarantee days length == num_days by padding with a light day if AI shortchanged us
    days_out = plan.get("days") or []
    while len(days_out) < num_days:
        idx = len(days_out) + 1
        days_out.append({
            "day": idx,
            "title": f"Day {idx} · Free Exploration",
            "stops": [
                {"time": "10:00 AM", "kind": "Flex Day", "name": f"Open exploration in {prefs.destination}",
                 "description": "Reserved buffer day — swap in extra stops using the AI concierge.",
                 "lat": 0, "lng": 0, "cost_inr": 0},
            ],
        })
    plan["days"] = days_out[:num_days]

    trip = Trip(
        session_id=prefs.session_id,
        title=plan.get("title", f"{prefs.destination} Escape"),
        destination=prefs.destination,
        start_date=prefs.start_date,
        end_date=prefs.end_date,
        budget=prefs.budget,
        travelers=prefs.travelers,
        preferences=prefs.model_dump(),
        itinerary=[plan],
    )
    await db.trips.insert_one(trip.model_dump())
    return trip


@api_router.get("/trips")
async def list_trips(session_id: str):
    docs = await db.trips.find({"session_id": session_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return docs


@api_router.get("/trips/{trip_id}")
async def get_trip(trip_id: str):
    doc = await db.trips.find_one({"id": trip_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Trip not found")
    return doc


@api_router.delete("/trips/{trip_id}")
async def delete_trip(trip_id: str):
    await db.trips.delete_one({"id": trip_id})
    return {"ok": True}


# ---------- Simulated Booking ----------
def _mock_flights(origin: str, destination: str, date: str):
    airlines = ["IndiGo", "Vistara", "Air India", "SpiceJet", "Akasa Air"]
    times = [("06:15", "08:45"), ("09:30", "12:00"), ("13:45", "16:20"), ("18:10", "20:35"), ("22:00", "00:35")]
    out = []
    for i, (dep, arr) in enumerate(times):
        out.append({
            "id": f"FL-{i+1}", "airline": airlines[i], "flight_no": f"{airlines[i][:2].upper()}{100+i*23}",
            "depart": dep, "arrive": arr, "duration": "2h 30m",
            "price": 3200 + i * 450, "stops": 0 if i % 2 == 0 else 1,
            "origin": origin, "destination": destination, "date": date,
        })
    return out


def _mock_trains(origin: str, destination: str, date: str):
    names = ["Rajdhani Exp", "Shatabdi Exp", "Vande Bharat", "Duronto", "Tejas"]
    out = []
    for i, n in enumerate(names):
        out.append({
            "id": f"TR-{i+1}", "name": n, "number": f"122{i+10}",
            "depart": ["06:00", "08:30", "14:20", "17:50", "22:10"][i],
            "arrive": ["14:20", "16:15", "22:05", "07:40", "10:20"][i],
            "duration": ["8h 20m", "7h 45m", "7h 45m", "13h 50m", "12h 10m"][i],
            "class": ["3AC", "CC", "EC", "2AC", "3AC"][i],
            "price": [1450, 980, 2200, 2650, 1580][i],
            "origin": origin, "destination": destination, "date": date,
        })
    return out


def _mock_buses(origin: str, destination: str, date: str):
    operators = ["VRL Travels", "SRS Travels", "RedBus Sleeper", "Kallada AC", "Orange Tours"]
    out = []
    for i, o in enumerate(operators):
        out.append({
            "id": f"BS-{i+1}", "operator": o, "bus_type": ["AC Sleeper", "Non-AC Seater", "Volvo Multi-Axle", "AC Semi-Sleeper", "Sleeper"][i],
            "depart": ["20:30", "21:15", "22:00", "22:45", "23:30"][i],
            "arrive": ["06:00", "07:30", "08:10", "09:15", "10:20"][i],
            "duration": ["9h 30m", "10h 15m", "10h 10m", "10h 30m", "10h 50m"][i],
            "price": [780, 550, 1250, 890, 620][i],
            "origin": origin, "destination": destination, "date": date,
        })
    return out


def _mock_metro(origin: str, destination: str):
    return [
        {"id": "MT-1", "line": "Purple Line", "depart": "Now + 3 min",
         "duration": "22 min", "changes": 0, "fare": 40,
         "origin": origin, "destination": destination},
        {"id": "MT-2", "line": "Green + Purple", "depart": "Now + 6 min",
         "duration": "28 min", "changes": 1, "fare": 45,
         "origin": origin, "destination": destination},
    ]


@api_router.get("/transport/search")
async def transport_search(type: str, origin: str, destination: str, date: str = ""):
    t = type.lower()
    if t == "flight":
        return {"type": t, "options": _mock_flights(origin, destination, date)}
    if t == "train":
        return {"type": t, "options": _mock_trains(origin, destination, date)}
    if t == "bus":
        return {"type": t, "options": _mock_buses(origin, destination, date)}
    if t == "metro":
        return {"type": t, "options": _mock_metro(origin, destination)}
    raise HTTPException(400, "type must be flight | train | bus | metro")


@api_router.post("/bookings")
async def create_booking(req: BookingRequest):
    booking = {
        "id": str(uuid.uuid4()),
        "session_id": req.session_id,
        "type": req.type,
        "option_id": req.option_id,
        "passenger_name": req.passenger_name,
        "seat": req.seat or f"S{uuid.uuid4().hex[:3].upper()}",
        "status": "CONFIRMED",
        "pnr": f"TM{uuid.uuid4().hex[:6].upper()}",
        "extras": req.extras or {},
        "created_at": now_iso(),
    }
    await db.bookings.insert_one(booking)
    booking.pop("_id", None)
    return booking


@api_router.get("/bookings")
async def list_bookings(session_id: str):
    docs = await db.bookings.find({"session_id": session_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return docs


# ---------- Cultural festivals near date (AI backed, cached) ----------
@api_router.get("/festivals")
async def festivals(destination: str, date: str):
    key = f"{destination.lower()}::{date}"
    cached = await db.festivals_cache.find_one({"key": key}, {"_id": 0})
    if cached:
        return cached["value"]
    ask = (
        f"List up to 5 cultural or religious festivals happening in or near {destination}, India within 14 days of "
        f"{date}. Return STRICT JSON: {{\"festivals\": [{{\"name\": str, \"date\": \"YYYY-MM-DD\", \"place\": str, "
        f"\"summary\": str}}]}}. If none, return empty list."
    )
    raw = await groq_chat(
        [{"role": "system", "content": "Return JSON only."}, {"role": "user", "content": ask}],
        temperature=0.3, json_mode=True,
    )
    try:
        val = json.loads(raw)
    except Exception:
        val = {"festivals": []}
    await db.festivals_cache.insert_one({"key": key, "value": val, "cached_at": now_iso()})
    return val


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
