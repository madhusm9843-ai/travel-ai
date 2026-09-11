import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getTrip } from "@/lib/api";
import MapView from "@/components/MapView";
import AIConcierge from "@/components/AIConcierge";
import { Bot, Calendar, MapPin, Wallet, Share2, Download } from "lucide-react";

export default function TripDetail() {
  const { id } = useParams();
  const [trip, setTrip] = useState(null);
  const [dayIdx, setDayIdx] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => { getTrip(id).then(setTrip).catch(() => setTrip({ error: true })); }, [id]);

  const plan = trip?.itinerary?.[0];
  const days = plan?.days || [];
  const activeDay = days[dayIdx];

  const markers = useMemo(() => {
    if (!activeDay) return [];
    return (activeDay.stops || []).map((s, i) => ({
      id: `${dayIdx}-${i}`, lat: s.lat, lng: s.lng, name: s.name,
      description: s.description, time: s.time, number: i + 1,
    })).filter((m) => m.lat && m.lng);
  }, [activeDay, dayIdx]);

  const center = markers.length ? [markers[0].lat, markers[0].lng] : [20.5937, 78.9629];

  if (!trip) return <div className="p-10 text-center text-[var(--tm-muted)]">Loading trip…</div>;
  if (trip.error) return <div className="p-10 text-center">Trip not found. <Link to="/trips" className="text-[var(--tm-orange)]">Go back</Link></div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-[var(--tm-orange)]">Selected · {trip.destination}</div>
          <h1 className="font-display font-bold text-4xl md:text-5xl mt-1">{trip.title}</h1>
          <p className="text-[var(--tm-body)] mt-2 max-w-2xl">{plan?.summary}</p>
        </div>
        <div className="flex gap-2">
          <button className="pill-ghost text-sm" onClick={() => window.print()} data-testid="trip-export"><Download size={14}/> Export PDF</button>
          <button className="pill-ghost text-sm" onClick={() => navigator.clipboard?.writeText(window.location.href)} data-testid="trip-share"><Share2 size={14}/> Share</button>
          <button className="pill-btn text-sm" onClick={() => setChatOpen(true)} data-testid="trip-open-ai"><Bot size={14}/> AI Concierge</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Stat icon={Calendar} label="Duration" value={`${days.length} days`} />
        <Stat icon={Wallet} label="Budget" value={`₹${trip.budget?.toLocaleString("en-IN")}`} />
        <Stat icon={MapPin} label="Destination" value={trip.destination} />
      </div>

      {/* Day tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {days.map((d, i) => (
          <button key={i}
            className={`px-4 py-2 rounded-2xl text-sm font-semibold ${
              i === dayIdx ? "bg-black text-white" : "bg-white border border-[var(--tm-border)] text-[var(--tm-ink)]"
            }`}
            onClick={() => setDayIdx(i)}
            data-testid={`day-tab-${i}`}
          >
            <div className="text-[10px] uppercase tracking-widest opacity-70">Day {d.day || i + 1}{i === dayIdx ? " (Focus)" : ""}</div>
            <div>{d.title}</div>
          </button>
        ))}
      </div>

      {/* Steps + Map */}
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-3">
          {(activeDay?.stops || []).map((s, i) => (
            <div key={i} className="card-soft p-4 flex gap-4 items-start hover:-translate-y-0.5 transition-transform" data-testid={`stop-${dayIdx}-${i}`}>
              <div className="w-10 h-10 rounded-full bg-[var(--tm-orange)] text-white grid place-items-center font-bold">{i + 1}</div>
              <div className="flex-1">
                <div className="text-[10px] uppercase tracking-widest text-[var(--tm-orange)]">{s.time} · {s.kind}</div>
                <div className="font-display font-bold text-lg mt-0.5">{s.name}</div>
                <div className="text-sm text-[var(--tm-body)] mt-1">{s.description}</div>
                {s.cost_inr ? <div className="text-xs text-[var(--tm-muted)] mt-2">Est. ₹{s.cost_inr}</div> : null}
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-2">
          <MapView center={center} zoom={11} markers={markers} height={520} />
          {plan?.budget_breakdown && (
            <div className="card-soft p-5 mt-4">
              <div className="text-xs uppercase tracking-widest text-[var(--tm-muted)] font-semibold">Budget Breakdown</div>
              <div className="mt-3 space-y-2 text-sm">
                {Object.entries(plan.budget_breakdown).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between border-b border-dashed border-[var(--tm-border)] pb-1.5">
                    <span className="capitalize text-[var(--tm-body)]">{k}</span>
                    <span className="font-semibold">₹{Number(v).toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {plan?.festivals?.length > 0 && (
            <div className="card-soft p-5 mt-4">
              <div className="text-xs uppercase tracking-widest text-[var(--tm-muted)] font-semibold">Festivals Around Your Dates</div>
              <div className="mt-3 space-y-2 text-sm">
                {plan.festivals.map((f, i) => (
                  <div key={i}>
                    <div className="font-semibold">{f.name}</div>
                    <div className="text-xs text-[var(--tm-muted)]">{f.date} · {f.place}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <AIConcierge open={chatOpen} onClose={() => setChatOpen(false)} context={{ trip_title: trip.title, destination: trip.destination, day: activeDay?.title }} />
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="card-soft p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-[var(--tm-orange-light)] text-[var(--tm-orange)] grid place-items-center"><Icon size={16}/></div>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-[var(--tm-muted)]">{label}</div>
        <div className="font-display font-bold text-lg">{value}</div>
      </div>
    </div>
  );
}
