import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listTrips, deleteTrip } from "@/lib/api";
import { Sparkles, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function MyTrips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = () =>
    listTrips()
      .then(setTrips)
      .finally(() => setLoading(false));
  useEffect(() => { refresh(); }, []);

  const remove = async (id) => { await deleteTrip(id); toast.success("Trip removed"); refresh(); };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="text-xs uppercase tracking-widest text-[var(--tm-orange)] font-semibold">Saved Journeys</div>
          <h1 className="font-display font-bold text-4xl md:text-5xl mt-1">My Trips</h1>
        </div>
        <Link to="/plan" className="pill-btn" data-testid="trips-new"><Sparkles size={16}/> New Trip</Link>
      </div>

      {loading && <div className="text-[var(--tm-muted)]">Loading your trips…</div>}
      {!loading && trips.length === 0 && (
        <div className="card-soft p-10 text-center">
          <div className="font-display font-bold text-xl">No trips yet</div>
          <p className="text-[var(--tm-body)] mt-1">Craft your first AI-guided journey in under 30 seconds.</p>
          <Link to="/plan" className="pill-btn mt-6 inline-flex">Plan My First Trip</Link>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-4 stagger">
        {trips.map((t) => (
          <div key={t.id} className="card-soft p-5" data-testid={`trip-card-${t.id}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-widest text-[var(--tm-orange)]">{t.destination}</div>
                <div className="font-display font-bold text-xl mt-1">{t.title}</div>
                <div className="text-xs text-[var(--tm-muted)] mt-1">{t.start_date} → {t.end_date} · ₹{t.budget?.toLocaleString("en-IN")} · {t.travelers} travelers</div>
              </div>
              <button aria-label="Delete" onClick={() => remove(t.id)} className="text-[var(--tm-muted)] hover:text-red-500" data-testid={`trip-del-${t.id}`}><Trash2 size={16}/></button>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-[var(--tm-body)]">{t.itinerary?.[0]?.days?.length || 0} days · {t.itinerary?.[0]?.summary?.slice(0, 60) || "AI plan ready"}…</div>
              <Link to={`/trips/${t.id}`} className="pill-ghost text-sm" data-testid={`trip-open-${t.id}`}>Open <ArrowRight size={14}/></Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
