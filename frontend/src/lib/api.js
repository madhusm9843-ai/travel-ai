import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL;
export const API = `${BASE}/api`;

export const http = axios.create({ baseURL: API, timeout: 120000 });

export const listDestinations = () => http.get("/destinations").then((r) => r.data);
export const getDestination = (id) => http.get(`/destinations/${id}`).then((r) => r.data);

export const sendChat = (payload) => http.post("/chat", payload).then((r) => r.data);
export const chatNearby = (payload) => http.post("/chat/nearby", payload).then((r) => r.data);
export const nearbyPois = (params) => http.get("/nearby", { params }).then((r) => r.data);
export const getChatHistory = (sid) => http.get(`/chat/${sid}`).then((r) => r.data);
export const clearChat = (sid) => http.delete(`/chat/${sid}`).then((r) => r.data);

// Regex for detecting "nearby" intent client-side to route the message to /chat/nearby
export const NEARBY_INTENT_RE = /\b(near\s?me|nearby|near\s?by|close\s?by|around\s?(me|here)|within|walking\s?distance)\b|\b(hotels?|restaurants?|caf[eé]s?|coffee|pubs?|bars?|shops?|malls?|atms?|hospitals?|pharmac(y|ies)|petrol|gas station|attractions?|museums?|viewpoints?|temples?|churches)\s+(near|around|close|nearby|by me)/i;

// Streaming chat via SSE (fetch + ReadableStream)
export async function streamChat({ session_id, message, context }, { onDelta, onStart, onDone, onError, signal }) {
  const res = await fetch(`${API}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id, message, context: context || null }),
    signal,
  });
  if (!res.ok || !res.body) {
    onError?.(new Error(`HTTP ${res.status}`));
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const raw = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const lines = raw.split("\n");
      let event = "message";
      let data = "";
      for (const l of lines) {
        if (l.startsWith("event:")) event = l.slice(6).trim();
        else if (l.startsWith("data:")) data += l.slice(5).trim();
      }
      if (!data) continue;
      try {
        const obj = JSON.parse(data);
        if (event === "start") onStart?.(obj);
        else if (event === "done") onDone?.(obj);
        else if (event === "error") onError?.(new Error(obj.error || "stream error"));
        else if (obj.delta) onDelta?.(obj.delta);
      } catch {}
    }
  }
  onDone?.();
}

export const generateItinerary = (payload) =>
  http.post("/itinerary/generate", payload).then((r) => r.data);

export const listTrips = (sid) => http.get(`/trips`, { params: { session_id: sid } }).then((r) => r.data);
export const getTrip = (id) => http.get(`/trips/${id}`).then((r) => r.data);
export const deleteTrip = (id) => http.delete(`/trips/${id}`).then((r) => r.data);

export const searchTransport = (type, origin, destination, date) =>
  http.get("/transport/search", { params: { type, origin, destination, date } }).then((r) => r.data);

export const createBooking = (payload) => http.post("/bookings", payload).then((r) => r.data);
export const listBookings = (sid) => http.get("/bookings", { params: { session_id: sid } }).then((r) => r.data);

export const getFestivals = (destination, date) =>
  http.get("/festivals", { params: { destination, date } }).then((r) => r.data);
