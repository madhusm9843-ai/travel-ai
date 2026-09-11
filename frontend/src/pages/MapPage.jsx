import { useEffect, useState } from "react";
import MapView from "@/components/MapView";
import { listDestinations } from "@/lib/api";
import { MapPin } from "lucide-react";

const FILTERS = ["All Places", "Attractions", "Food & Dining", "Hotels", "Cafés", "Heritage & Temples", "Shopping", "Live Events"];

export default function MapPage() {
  const [dests, setDests] = useState([]);
  const [focus, setFocus] = useState(null);
  const [filter, setFilter] = useState("All Places");

  useEffect(() => { listDestinations().then(setDests); }, []);

  const markers = dests.map((d, i) => ({
    id: d.id, lat: d.lat, lng: d.lng, name: d.name, description: d.tagline, number: i + 1,
  }));

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-[var(--tm-orange)] font-semibold">Geospatial Explorer</div>
          <h1 className="font-display font-bold text-4xl md:text-5xl mt-1">Interactive Route & Exploration Map</h1>
          <p className="text-[var(--tm-body)] mt-2 max-w-2xl">Live visual itinerary connecting India&apos;s iconic mountain corridors. Toggle satellite for terrain clarity.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {FILTERS.map((f) => (
          <button key={f}
            className={`chip ${filter === f ? "active" : ""}`}
            onClick={() => setFilter(f)}
            data-testid={`map-filter-${f.split(" ")[0].toLowerCase()}`}
          >{f}</button>
        ))}
      </div>

      <MapView markers={markers} focus={focus} height={560} />

      <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 stagger">
        {dests.map((d) => (
          <button key={d.id}
            className="card-soft p-4 text-left hover:-translate-y-0.5 transition-transform"
            onClick={() => setFocus({ lat: d.lat, lng: d.lng, zoom: 8 })}
            data-testid={`map-fly-${d.id}`}
          >
            <div className="w-8 h-8 rounded-full bg-[var(--tm-orange-light)] text-[var(--tm-orange)] grid place-items-center"><MapPin size={14}/></div>
            <div className="font-display font-bold mt-2">{d.name}</div>
            <div className="text-[11px] text-[var(--tm-muted)]">Fly to region →</div>
          </button>
        ))}
      </div>
    </div>
  );
}
