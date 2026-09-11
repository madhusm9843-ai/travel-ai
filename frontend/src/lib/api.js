import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL;
export const API = `${BASE}/api`;

export const http = axios.create({ baseURL: API, timeout: 120000 });

export const listDestinations = () => http.get("/destinations").then((r) => r.data);
export const getDestination = (id) => http.get(`/destinations/${id}`).then((r) => r.data);

export const sendChat = (payload) => http.post("/chat", payload).then((r) => r.data);
export const getChatHistory = (sid) => http.get(`/chat/${sid}`).then((r) => r.data);
export const clearChat = (sid) => http.delete(`/chat/${sid}`).then((r) => r.data);

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
