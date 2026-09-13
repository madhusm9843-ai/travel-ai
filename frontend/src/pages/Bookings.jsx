import { useEffect, useState } from "react";
import { Plane, TrainFront, Bus, TramFront, Loader2, Check } from "lucide-react";
import { searchTransport, createBooking, listBookings } from "@/lib/api";
import { toast } from "sonner";

const TYPES = [
  { key: "bus", label: "Local Bus", icon: Bus },
  { key: "metro", label: "Metro", icon: TramFront },
  { key: "train", label: "Train", icon: TrainFront },
  { key: "flight", label: "Flight", icon: Plane },
];

export default function Bookings() {
  const [type, setType] = useState("bus");
  const [origin, setOrigin] = useState("Bangalore");
  const [destination, setDestination] = useState("Mysore");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [passenger, setPassenger] = useState("");
  const [bookings, setBookings] = useState([]);

  const refresh = () => listBookings().then(setBookings);
  useEffect(() => { refresh(); }, []);

  const search = async () => {
    if (!origin || !destination) return toast.error("Enter origin and destination");
    setLoading(true);
    try {
      const r = await searchTransport(type, origin, destination, date);
      setResults(r.options || []);
    } finally { setLoading(false); }
  };

  const book = async (opt) => {
    if (!passenger.trim()) return toast.error("Enter passenger name first");
    const booking = await createBooking({
      type, option_id: opt.id, passenger_name: passenger.trim(),
      extras: { origin, destination, date, price: opt.price ?? opt.fare },
    });
    toast.success(`Confirmed! PNR ${booking.pnr}`);
    refresh();
  };

  const popularRoutes = [
    { from: "Bangalore", to: "Mysore", type: "bus" },
    { from: "Delhi", to: "Agra", type: "train" },
    { from: "Mumbai", to: "Goa", type: "train" },
    { from: "Chennai", to: "Pondicherry", type: "bus" },
    { from: "Kochi", to: "Ernakulam", type: "metro" },
    { from: "Delhi", to: "Mumbai", type: "flight" },
  ];

  const setRoute = (r) => { setOrigin(r.from); setDestination(r.to); setType(r.type); setResults([]); };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-widest text-[var(--tm-orange)] font-semibold">Transit Marketplace</div>
        <h1 className="font-display font-bold text-4xl md:text-5xl mt-1">Book local bus, metro, train & flights</h1>
        <p className="text-[var(--tm-body)] mt-2 max-w-2xl">One place for last-mile buses, city metro passes, long-distance trains and domestic flights. Live simulated search, instant PNR, bookings stored to your session.</p>
      </div>

      <div className="mb-6">
        <div className="text-[10px] uppercase tracking-widest text-[var(--tm-muted)] font-semibold mb-2">Popular Routes</div>
        <div className="flex flex-wrap gap-2">
          {popularRoutes.map((r, i) => (
            <button key={i} className="chip" onClick={() => setRoute(r)} data-testid={`popular-route-${i}`}>
              {r.from} → {r.to} · {r.type}
            </button>
          ))}
        </div>
      </div>

      <div className="card-soft p-5 mb-6">
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button key={t.key}
              className={`chip ${type === t.key ? "active" : ""}`}
              onClick={() => { setType(t.key); setResults([]); }}
              data-testid={`booking-type-${t.key}`}
            ><t.icon size={12}/> {t.label}</button>
          ))}
        </div>
        <div className="grid md:grid-cols-4 gap-3 mt-4">
          <input className="rounded-full border border-[var(--tm-border)] bg-white px-4 py-2.5 text-sm outline-none" placeholder="From" value={origin} onChange={(e) => setOrigin(e.target.value)} data-testid="booking-origin"/>
          <input className="rounded-full border border-[var(--tm-border)] bg-white px-4 py-2.5 text-sm outline-none" placeholder="To" value={destination} onChange={(e) => setDestination(e.target.value)} data-testid="booking-dest"/>
          <input type="date" className="rounded-full border border-[var(--tm-border)] bg-white px-4 py-2.5 text-sm outline-none" value={date} onChange={(e) => setDate(e.target.value)} data-testid="booking-date"/>
          <button className="pill-btn justify-center" onClick={search} disabled={loading} data-testid="booking-search">
            {loading ? <Loader2 className="animate-spin" size={16}/> : "Search"}
          </button>
        </div>
        <div className="mt-3">
          <input className="w-full rounded-full border border-[var(--tm-border)] bg-white px-4 py-2.5 text-sm outline-none" placeholder="Passenger name (required to book)" value={passenger} onChange={(e) => setPassenger(e.target.value)} data-testid="booking-passenger"/>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3 stagger">
        {results.map((o) => (
          <div key={o.id} className="card-soft p-5 flex items-center gap-4" data-testid={`booking-result-${o.id}`}>
            <div className="flex-1">
              <div className="text-xs uppercase tracking-widest text-[var(--tm-orange)]">{type}</div>
              <div className="font-display font-bold text-lg">
                {o.airline || o.name || o.operator || o.line}
              </div>
              <div className="text-sm text-[var(--tm-body)]">
                {o.depart && o.arrive ? `${o.depart} → ${o.arrive}` : ""} {o.duration ? `· ${o.duration}` : ""} {o.class ? `· ${o.class}` : ""} {o.bus_type ? `· ${o.bus_type}` : ""} {o.stops !== undefined ? `· ${o.stops === 0 ? "Non-stop" : `${o.stops} stop`}` : ""}
              </div>
            </div>
            <div className="text-right">
              <div className="font-display font-extrabold text-xl">₹{(o.price ?? o.fare).toLocaleString("en-IN")}</div>
              <button className="pill-btn text-xs mt-2" onClick={() => book(o)} data-testid={`booking-book-${o.id}`}>Book</button>
            </div>
          </div>
        ))}
        {!loading && results.length === 0 && (
          <div className="col-span-2 text-center text-[var(--tm-muted)] py-8 text-sm">No results yet. Enter your route and hit Search.</div>
        )}
      </div>

      <div className="mt-10">
        <h2 className="font-display font-bold text-2xl mb-3">Your Bookings</h2>
        {bookings.length === 0 && <div className="text-[var(--tm-muted)] text-sm">No bookings yet.</div>}
        <div className="grid md:grid-cols-2 gap-3 stagger">
          {bookings.map((b) => (
            <div key={b.id} className="card-soft p-5" data-testid={`my-booking-${b.id}`}>
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-emerald-600 font-semibold"><Check size={12}/> {b.status} · {b.type}</div>
              <div className="font-display font-bold text-lg mt-1">{b.passenger_name}</div>
              <div className="text-xs text-[var(--tm-muted)] mt-1">PNR: {b.pnr} · Seat: {b.seat}</div>
              {b.extras?.origin && <div className="text-xs mt-1 text-[var(--tm-body)]">{b.extras.origin} → {b.extras.destination} · {b.extras.date}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
