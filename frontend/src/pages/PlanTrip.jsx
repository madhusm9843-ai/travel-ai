import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Sparkles, Wallet, Users, Calendar, Loader2 } from "lucide-react";
import { generateItinerary, listDestinations } from "@/lib/api";
import { toast } from "sonner";

const INTERESTS = [
  "Nature & Trails", "Beaches", "Heritage & Temples", "Food & Street Eats",
  "Wildlife", "Adventure Sports", "Art & Museums", "Nightlife", "Wellness & Yoga", "Shopping",
];

const STYLES = [
  { value: "relaxed", label: "Relaxed" },
  { value: "balanced", label: "Balanced" },
  { value: "packed", label: "Packed" },
];
const DIETS = ["any", "vegetarian", "vegan", "halal", "jain"];

export default function PlanTrip() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const preselect = params.get("dest");
  const [dests, setDests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    destination: "",
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
    budget: 30000,
    travelers: 2,
    interests: [],
    travel_style: "balanced",
    diet: "any",
    include_festivals: true,
    notes: "",
  });

  useEffect(() => {
    listDestinations().then((d) => {
      setDests(d);
      if (preselect) {
        const match = d.find((x) => x.id === preselect);
        if (match) setForm((f) => ({ ...f, destination: match.name }));
      }
    });
  }, [preselect]);

  const days = useMemo(() => {
    const a = new Date(form.start_date);
    const b = new Date(form.end_date);
    return Math.max(1, Math.round((b - a) / 86400000) + 1);
  }, [form.start_date, form.end_date]);

  const toggle = (k, v) => {
    setForm((f) => ({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.destination) return toast.error("Pick a destination first");
    if (!form.budget || form.budget < 1000) return toast.error("Budget must be at least ₹1,000");
    setLoading(true);
    try {
      const trip = await generateItinerary({ ...form });
      toast.success("Your AI itinerary is ready!");
      nav(`/trips/${trip.id}`);
    } catch (err) {
      toast.error("AI generation failed. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-widest text-[var(--tm-orange)] font-semibold">Trip Planner</div>
        <h1 className="font-display font-bold text-4xl md:text-5xl mt-1">Tell us how you want to travel</h1>
        <p className="text-[var(--tm-body)] mt-2 max-w-2xl">
          Share your vibe, budget, and dates. Our generative AI crafts a {days}-day itinerary
          with map routes, food picks, and festival overlays.
        </p>
      </div>

      <form className="grid lg:grid-cols-3 gap-6" onSubmit={submit}>
        <div className="lg:col-span-2 card-soft p-6 md:p-8 space-y-6">
          <div>
            <label className="text-xs uppercase tracking-widest text-[var(--tm-muted)] font-semibold">Destination</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {dests.map((d) => (
                <button type="button" key={d.id}
                  className={`chip ${form.destination === d.name ? "active" : ""}`}
                  onClick={() => setForm((f) => ({ ...f, destination: d.name }))}
                  data-testid={`plan-dest-${d.id}`}
                >{d.name}</button>
              ))}
            </div>
            <input
              className="mt-3 w-full rounded-full border border-[var(--tm-border)] bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--tm-orange)]/30"
              placeholder="Or type your own destination"
              value={form.destination}
              onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
              data-testid="plan-dest-input"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-[var(--tm-muted)] font-semibold flex items-center gap-1.5"><Calendar size={12}/> Start Date</label>
              <input type="date" className="mt-2 w-full rounded-full border border-[var(--tm-border)] bg-white px-4 py-2.5 text-sm outline-none"
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} data-testid="plan-start" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-[var(--tm-muted)] font-semibold flex items-center gap-1.5"><Calendar size={12}/> End Date</label>
              <input type="date" className="mt-2 w-full rounded-full border border-[var(--tm-border)] bg-white px-4 py-2.5 text-sm outline-none"
                value={form.end_date}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} data-testid="plan-end" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-[var(--tm-muted)] font-semibold flex items-center gap-1.5"><Wallet size={12}/> Budget (INR)</label>
              <input type="number" min={1000} step={500}
                className="mt-2 w-full rounded-full border border-[var(--tm-border)] bg-white px-4 py-2.5 text-sm outline-none"
                value={form.budget}
                onChange={(e) => setForm((f) => ({ ...f, budget: Number(e.target.value) }))} data-testid="plan-budget" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-[var(--tm-muted)] font-semibold flex items-center gap-1.5"><Users size={12}/> Travelers</label>
              <input type="number" min={1}
                className="mt-2 w-full rounded-full border border-[var(--tm-border)] bg-white px-4 py-2.5 text-sm outline-none"
                value={form.travelers}
                onChange={(e) => setForm((f) => ({ ...f, travelers: Number(e.target.value) }))} data-testid="plan-travelers" />
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-[var(--tm-muted)] font-semibold">Interests</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {INTERESTS.map((i) => (
                <button type="button" key={i}
                  className={`chip ${form.interests.includes(i) ? "active" : ""}`}
                  onClick={() => toggle("interests", i)}
                  data-testid={`interest-${i.split(" ")[0].toLowerCase()}`}
                >{i}</button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-[var(--tm-muted)] font-semibold">Travel Style</label>
              <div className="mt-2 flex gap-2">
                {STYLES.map((s) => (
                  <button type="button" key={s.value}
                    className={`chip flex-1 justify-center ${form.travel_style === s.value ? "active" : ""}`}
                    onClick={() => setForm((f) => ({ ...f, travel_style: s.value }))}
                    data-testid={`style-${s.value}`}
                  >{s.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-[var(--tm-muted)] font-semibold">Diet</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {DIETS.map((d) => (
                  <button type="button" key={d}
                    className={`chip ${form.diet === d ? "active" : ""}`}
                    onClick={() => setForm((f) => ({ ...f, diet: d }))}
                    data-testid={`diet-${d}`}
                  >{d}</button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-[var(--tm-muted)] font-semibold">Anything else?</label>
            <textarea rows={3}
              className="mt-2 w-full rounded-2xl border border-[var(--tm-border)] bg-white px-4 py-2.5 text-sm outline-none"
              placeholder="e.g., 2nd anniversary trip, prefer boutique stays, one museum every day..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} data-testid="plan-notes" />
          </div>

          <div className="flex items-center gap-3">
            <input id="fest" type="checkbox" checked={form.include_festivals}
              onChange={(e) => setForm((f) => ({ ...f, include_festivals: e.target.checked }))}
              data-testid="plan-festivals" />
            <label htmlFor="fest" className="text-sm">Overlay cultural festivals happening during my dates</label>
          </div>

          <button type="submit" className="pill-btn w-full justify-center" disabled={loading} data-testid="plan-submit">
            {loading ? <><Loader2 className="animate-spin" size={16}/> Crafting itinerary...</> : <><Sparkles size={16}/> Generate My AI Itinerary</>}
          </button>
        </div>

        <aside className="card-soft p-6 h-fit sticky top-24">
          <div className="text-xs uppercase tracking-widest text-[var(--tm-orange)] font-semibold">Live Summary</div>
          <div className="mt-4 space-y-3 text-sm">
            <Row k="Destination" v={form.destination || "—"} />
            <Row k="Duration" v={`${days} day${days > 1 ? "s" : ""}`} />
            <Row k="Budget" v={`₹${form.budget.toLocaleString("en-IN")}`} />
            <Row k="Per person / day" v={`₹${Math.round(form.budget / days / Math.max(1, form.travelers)).toLocaleString("en-IN")}`} />
            <Row k="Travelers" v={form.travelers} />
            <Row k="Style" v={STYLES.find((s) => s.value === form.travel_style)?.label} />
            <Row k="Diet" v={form.diet} />
          </div>
          <div className="mt-6 rounded-xl bg-[#fdf3ec] p-3 text-xs text-[var(--tm-body)]">
            <strong className="text-[var(--tm-orange)]">Tip:</strong> Add 2–3 interests for the AI to weave in offbeat gems along your route.
          </div>
        </aside>
      </form>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex items-center justify-between border-b border-dashed border-[var(--tm-border)] pb-2">
      <span className="text-[var(--tm-muted)]">{k}</span>
      <span className="font-semibold">{v}</span>
    </div>
  );
}
