import { useEffect, useMemo, useRef, useState } from "react";
import { listTrips } from "@/lib/api";
import MapView from "@/components/MapView";
import AIConcierge from "@/components/AIConcierge";
import { LocateFixed, Bot, CloudRain, Wallet, Gauge, Compass, Signal, TrafficCone, Timer } from "lucide-react";

// Basic simulated traffic engine — uses time-of-day, weekend, and current speed
function computeTraffic(speedKmh, tsMs) {
  const d = new Date(tsMs);
  const hr = d.getHours(); const dow = d.getDay();
  const isWeekend = dow === 0 || dow === 6;
  let base = 30; // 0-100 congestion
  if (!isWeekend && (hr >= 8 && hr <= 11)) base = 82;      // morning rush
  else if (!isWeekend && (hr >= 17 && hr <= 20)) base = 88; // evening rush
  else if (hr >= 12 && hr <= 15) base = 55;
  else if (hr >= 21 || hr <= 6) base = 18;
  // If moving slowly, congestion inferred higher; fast means clear
  if (speedKmh !== null && !isNaN(speedKmh)) {
    if (speedKmh < 5) base = Math.min(100, base + 8);
    else if (speedKmh > 40) base = Math.max(5, base - 20);
  }
  const label = base >= 75 ? "Heavy" : base >= 45 ? "Moderate" : "Light";
  const color = base >= 75 ? "#DC2626" : base >= 45 ? "#F59E0B" : "#059669";
  return { level: base, label, color };
}

export default function LiveTrip() {
  const [trips, setTrips] = useState([]);
  const [tripId, setTripId] = useState("");
  const [gps, setGps] = useState(null); // { lat, lng, accuracy, speed, heading, ts }
  const [tickTs, setTickTs] = useState(Date.now());
  const [chatOpen, setChatOpen] = useState(true);
  const [focus, setFocus] = useState(null);
  const [poiMarkers, setPoiMarkers] = useState([]);
  const watchIdRef = useRef(null);
  const lastPosRef = useRef(null); // { lat, lng, ts }

  useEffect(() => {
    listTrips().then((t) => { setTrips(t); if (t[0]) setTripId(t[0].id); });
  }, []);

  // GPS watcher — updates whenever the device sends a new fix
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const now = Date.now();
        let inferredSpeed = null;
        if (lastPosRef.current) {
          const { lat, lng, ts } = lastPosRef.current;
          const R = 6371000;
          const dLat = (p.coords.latitude - lat) * Math.PI / 180;
          const dLng = (p.coords.longitude - lng) * Math.PI / 180;
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat * Math.PI/180) * Math.cos(p.coords.latitude * Math.PI/180) * Math.sin(dLng / 2) ** 2;
          const dist = 2 * R * Math.asin(Math.sqrt(a));
          const dt = Math.max(0.001, (now - ts) / 1000);
          inferredSpeed = dist / dt; // m/s
        }
        lastPosRef.current = { lat: p.coords.latitude, lng: p.coords.longitude, ts: now };
        setGps({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
          speed: p.coords.speed ?? inferredSpeed,
          heading: p.coords.heading,
          altitude: p.coords.altitude,
          ts: now,
        });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 500, timeout: 10000 }
    );
    watchIdRef.current = id;
    return () => { if (id) navigator.geolocation.clearWatch(id); };
  }, []);

  // Per-second tick for traffic + timer refresh
  useEffect(() => {
    const iv = setInterval(() => setTickTs(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  const trip = trips.find((t) => t.id === tripId);
  const plan = trip?.itinerary?.[0];
  const today = plan?.days?.[0];
  const stopMarkers = (today?.stops || []).map((s, i) => ({
    id: `s${i}`, lat: s.lat, lng: s.lng, name: s.name, description: s.description, time: s.time, number: i + 1,
  })).filter((m) => m.lat);

  const meMarker = gps ? [{ id: "me", lat: gps.lat, lng: gps.lng, name: "You are here", description: `Accuracy ±${Math.round(gps.accuracy)}m`, number: "•" }] : [];

  const speedKmh = gps?.speed != null ? Math.max(0, gps.speed * 3.6) : null;
  const traffic = useMemo(() => computeTraffic(speedKmh, tickTs), [speedKmh, tickTs]);

  const center = gps ? [gps.lat, gps.lng] : (stopMarkers[0] ? [stopMarkers[0].lat, stopMarkers[0].lng] : [20.5937, 78.9629]);
  const compassDir = (h) => {
    if (h == null || isNaN(h)) return "—";
    const dirs = ["N","NE","E","SE","S","SW","W","NW"];
    return dirs[Math.round(((h % 360) / 45)) % 8];
  };

  // Fake-live ETA to first upcoming stop
  const eta = useMemo(() => {
    if (!gps || stopMarkers.length === 0) return null;
    const first = stopMarkers[0];
    const R = 6371000;
    const dLat = (first.lat - gps.lat) * Math.PI / 180;
    const dLng = (first.lng - gps.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(gps.lat*Math.PI/180)*Math.cos(first.lat*Math.PI/180)*Math.sin(dLng/2)**2;
    const distM = 2 * R * Math.asin(Math.sqrt(a));
    // assume 25 km/h avg reduced by traffic
    const avgKmh = Math.max(6, 30 - traffic.level * 0.25);
    const mins = Math.round((distM / 1000) / avgKmh * 60);
    return { distanceKm: distM / 1000, minutes: mins };
  }, [gps, stopMarkers, traffic.level]);

  const secondsSinceUpdate = gps ? Math.max(0, Math.floor((tickTs - gps.ts) / 1000)) : null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-widest text-[var(--tm-orange)] font-semibold">Live Trip Mode</div>
          <h1 className="font-display font-bold text-4xl md:text-5xl mt-1">Real-time GPS + traffic</h1>
          <p className="text-[var(--tm-body)] mt-2 max-w-2xl">Updates every second. Ask the AI for hotels or restaurants near you — it will pin them on the map.</p>
        </div>
        <button className="pill-btn text-sm" onClick={() => setChatOpen(true)} data-testid="live-open-ai"><Bot size={14}/> Ask Concierge</button>
      </div>

      <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-3 mb-4">
        <div className="card-soft p-4" data-testid="stat-location">
          <div className="text-[10px] uppercase tracking-widest text-[var(--tm-muted)] flex items-center gap-1.5"><LocateFixed size={12}/> Live Location</div>
          <div className="font-display font-bold text-base mt-1">
            {gps ? `${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}` : "Locating…"}
          </div>
          <div className="text-[11px] text-[var(--tm-muted)] mt-1">
            {gps ? <>±{Math.round(gps.accuracy)}m · updated {secondsSinceUpdate}s ago</> : "Awaiting fix"}
          </div>
        </div>
        <div className="card-soft p-4" data-testid="stat-speed">
          <div className="text-[10px] uppercase tracking-widest text-[var(--tm-muted)] flex items-center gap-1.5"><Gauge size={12}/> Speed</div>
          <div className="font-display font-bold text-2xl mt-1">
            {speedKmh != null ? `${speedKmh.toFixed(1)}` : "—"} <span className="text-sm text-[var(--tm-muted)] font-normal">km/h</span>
          </div>
          <div className="text-[11px] text-[var(--tm-muted)] mt-1 flex items-center gap-1.5"><Compass size={11}/> Heading {compassDir(gps?.heading)}</div>
        </div>
        <div className="card-soft p-4" data-testid="stat-traffic">
          <div className="text-[10px] uppercase tracking-widest text-[var(--tm-muted)] flex items-center gap-1.5"><TrafficCone size={12}/> Traffic Around You</div>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: traffic.color }} />
            <div className="font-display font-bold text-lg" style={{ color: traffic.color }}>{traffic.label}</div>
          </div>
          <div className="h-1.5 mt-2 rounded-full bg-[var(--tm-border)] overflow-hidden">
            <div className="h-full transition-[width] duration-700" style={{ width: `${traffic.level}%`, background: traffic.color }} />
          </div>
          <div className="text-[10px] text-[var(--tm-muted)] mt-1">Congestion index · live</div>
        </div>
        <div className="card-soft p-4" data-testid="stat-eta">
          <div className="text-[10px] uppercase tracking-widest text-[var(--tm-muted)] flex items-center gap-1.5"><Timer size={12}/> Next Stop ETA</div>
          <div className="font-display font-bold text-lg mt-1">{eta ? `${eta.minutes} min` : "—"}</div>
          <div className="text-[11px] text-[var(--tm-muted)] mt-1">{eta ? `${eta.distanceKm.toFixed(1)} km · via road` : "Set a trip first"}</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-3 mb-6">
        <div className="card-soft p-4" data-testid="stat-budget">
          <div className="text-[10px] uppercase tracking-widest text-[var(--tm-muted)] flex items-center gap-1.5"><Wallet size={12}/> Remaining Budget</div>
          <div className="font-display font-bold text-lg mt-1">₹{trip?.budget?.toLocaleString("en-IN") || "—"}</div>
        </div>
        <div className="card-soft p-4">
          <div className="text-[10px] uppercase tracking-widest text-[var(--tm-muted)] flex items-center gap-1.5"><CloudRain size={12}/> Weather</div>
          <div className="font-display font-bold text-lg mt-1">28°C · Partly cloudy</div>
        </div>
        <div className="card-soft p-4">
          <div className="text-[10px] uppercase tracking-widest text-[var(--tm-muted)] flex items-center gap-1.5"><Signal size={12}/> GPS Signal</div>
          <div className="font-display font-bold text-lg mt-1">{gps ? (gps.accuracy < 20 ? "Excellent" : gps.accuracy < 50 ? "Good" : "Fair") : "—"}</div>
        </div>
        <div className="card-soft p-4">
          <div className="text-[10px] uppercase tracking-widest text-[var(--tm-muted)] flex items-center gap-1.5"><Bot size={12}/> Ask AI</div>
          <div className="text-sm mt-1 text-[var(--tm-body)]">"Hotels near me" and I'll pin them right on the map.</div>
        </div>
      </div>

      {trips.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {trips.map((t) => (
            <button key={t.id} className={`chip ${tripId === t.id ? "active" : ""}`} onClick={() => setTripId(t.id)} data-testid={`live-trip-${t.id}`}>{t.title}</button>
          ))}
        </div>
      )}

      <MapView center={center} zoom={gps ? 15 : 6} markers={[...stopMarkers, ...poiMarkers, ...meMarker]} focus={focus} height={540} follow={gps} />

      <AIConcierge
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        context={{ mode: "live", trip: trip?.title, speed_kmh: speedKmh, traffic: traffic.label }}
        coords={gps ? { lat: gps.lat, lng: gps.lng } : null}
        onFocusMap={(f) => setFocus({ ...f, ts: Date.now() })}
        onPois={(pois) => setPoiMarkers((pois || []).map((p, i) => ({ id: `poi-${i}-${p.name}`, lat: p.lat, lng: p.lng, name: p.name, description: `${p.category} · ${p.distance_m}m`, number: "★" })))}
      />
    </div>
  );
}
