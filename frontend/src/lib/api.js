import axios from "axios";
import { getSessionId } from "@/lib/session";

const BASE = process.env.REACT_APP_BACKEND_URL;
export const API = `${BASE}/api`;

export const http = axios.create({ baseURL: API, timeout: 120000 });

// Attach X-Session-Id on every request (SEC-001 mitigation)
http.interceptors.request.use((config) => {
  const sid = getSessionId();
  if (sid) {
    config.headers = config.headers || {};
    config.headers["X-Session-Id"] = sid;
  }
  return config;
});

export const listDestinations = () => http.get("/destinations").then((r) => r.data);
export const getDestination = (id) => http.get(`/destinations/${id}`).then((r) => r.data);

export const sendChat = (payload) => http.post("/chat", payload).then((r) => r.data);
export const chatNearby = (payload) => http.post("/chat/nearby", payload).then((r) => r.data);
export const nearbyPois = (params) => http.get("/nearby", { params }).then((r) => r.data);
export const getChatHistory = () => http.get("/chat").then((r) => r.data);
export const clearChat = () => http.delete("/chat").then((r) => r.data);

export const NEARBY_INTENT_RE = /\b(near\s?me|nearby|near\s?by|close\s?by|around\s?(me|here)|within|walking\s?distance)\b|\b(hotels?|restaurants?|caf[eé]s?|coffee|pubs?|bars?|shops?|malls?|atms?|hospitals?|pharmac(y|ies)|petrol|gas station|attractions?|museums?|viewpoints?|temples?|churches)\s+(near|around|close|nearby|by me)/i;

// Streaming chat via SSE (fetch + ReadableStream) — includes X-Session-Id header
export async function streamChat({ message, context }, { onDelta, onStart, onDone, onError, signal }) {
  const sid = getSessionId();
  const res = await fetch(`${API}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Session-Id": sid },
    body: JSON.stringify({ message, context: context || null }),
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

export const listTrips = () => http.get("/trips").then((r) => r.data);
export const getTrip = (id) => http.get(`/trips/${id}`).then((r) => r.data);
export const deleteTrip = (id) => http.delete(`/trips/${id}`).then((r) => r.data);

export const searchTransport = (type, origin, destination, date) =>
  http.get("/transport/search", { params: { type, origin, destination, date } }).then((r) => r.data);

export const createBooking = (payload) => http.post("/bookings", payload).then((r) => r.data);
export const listBookings = () => http.get("/bookings").then((r) => r.data);

export const getFestivals = (destination, date) =>
  http.get("/festivals", { params: { destination, date } }).then((r) => r.data);
