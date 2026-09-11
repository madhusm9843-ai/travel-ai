import { useEffect, useState } from "react";
import { listTrips } from "@/lib/api";
import { getSessionId } from "@/lib/session";
import MapView from "@/components/MapView";
import AIConcierge from "@/components/AIConcierge";
import { LocateFixed, Bot, CloudRain, Wallet } from "lucide-react";

export default function LiveTrip() {
  const [trips, setTrips] = useState([]);
  const [tripId, setTripId] = useState("");
  const [coords, setCoords] = useState(null);
  const [chatOpen, setChatOpen] = useState(true);

  useEffect(() => { listTrips(getSessionId()).then((t) => { setTrips(t); if (t[0]) setTripId(t[0].id); }); }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {}
    );
  }, []);

  const trip = trips.find((t) => t.id === tripId);
  const plan = trip?.itinerary?.[0];
  const today = plan?.days?.[0];
  const markers = (today?.stops || []).map((s, i) => ({
    id: i, lat: s.lat, lng: s.lng, name: s.name, description: s.description, time: s.time, number: i + 1,
  })).filter((m) => m.lat);

  const center = coords ? [coords.lat, coords.lng] : (markers[0] ? [markers[0].lat, markers[0].lng] : [20.5937, 78.9629]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-[var(--tm-orange)] font-semibold">Live Trip Mode</div>
          <h1 className="font-display font-bold text-4xl md:text-5xl mt-1">Real-time companion</h1>
          <p className="text-[var(--tm-body)] mt-2 max-w-2xl">Your GPS-anchored dashboard with today&apos;s flow, budget pulse, and instant AI reroute.</p>
        </div>
        <button className="pill-btn text-sm" onClick={() => setChatOpen(true)} data-testid="live-open-ai"><Bot size={14}/> Ask Concierge</button>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="card-soft p-5">
          <div className="text-[10px] uppercase tracking-widest text-[var(--tm-muted)] flex items-center gap-1.5"><LocateFixed size={12}/> Current Location</div>
          <div className="font-display font-bold text-lg mt-1">
            {coords ? `${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}` : "Locating…"}
          </div>
        </div>
        <div className="card-soft p-5">
          <div className="text-[10px] uppercase tracking-widest text-[var(--tm-muted)] flex items-center gap-1.5"><Wallet size={12}/> Remaining Budget</div>
          <div className="font-display font-bold text-lg mt-1">₹{trip?.budget?.toLocaleString("en-IN") || "—"}</div>
        </div>
        <div className="card-soft p-5">
          <div className="text-[10px] uppercase tracking-widest text-[var(--tm-muted)] flex items-center gap-1.5"><CloudRain size={12}/> Weather</div>
          <div className="font-display font-bold text-lg mt-1">19°C · Mist & Light Rain</div>
        </div>
      </div>

      {trips.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {trips.map((t) => (
            <button key={t.id} className={`chip ${tripId === t.id ? "active" : ""}`} onClick={() => setTripId(t.id)} data-testid={`live-trip-${t.id}`}>{t.title}</button>
          ))}
        </div>
      )}

      <MapView center={center} zoom={coords ? 13 : 6} markers={markers} height={520} />

      <AIConcierge open={chatOpen} onClose={() => setChatOpen(false)} context={{ mode: "live", trip: trip?.title, coords }} />
    </div>
  );
}
