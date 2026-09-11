import { useEffect, useMemo, useState } from "react";
import { listDestinations } from "@/lib/api";
import DestinationCard from "@/components/DestinationCard";
import { Search, Globe, MapPin } from "lucide-react";

const REGIONS = ["All", "India", "International"];

export default function Explore() {
  const [dests, setDests] = useState([]);
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("All");

  useEffect(() => { listDestinations().then(setDests).catch(() => {}); }, []);

  const filtered = useMemo(() =>
    dests
      .filter((d) => region === "All" || d.region === region)
      .filter((d) =>
        d.name.toLowerCase().includes(q.toLowerCase()) ||
        d.tagline.toLowerCase().includes(q.toLowerCase()) ||
        (d.country || "").toLowerCase().includes(q.toLowerCase())
      ), [dests, q, region]);

  const indiaCount = dests.filter((d) => d.region === "India").length;
  const intlCount = dests.filter((d) => d.region === "International").length;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-[var(--tm-orange)] font-semibold">Curated Guides</div>
          <h1 className="font-display font-bold text-4xl md:text-5xl mt-1">Explore the World</h1>
          <p className="text-[var(--tm-body)] mt-2 max-w-lg">Hand-picked destinations across India and iconic international escapes — every guide enriched with AI-verified must-do experiences.</p>
        </div>
        <div className="flex items-center gap-2 card-soft px-4 py-2 w-full md:w-80">
          <Search size={16} className="text-[var(--tm-muted)]" />
          <input
            className="flex-1 bg-transparent outline-none text-sm"
            placeholder="Search destinations, activities, countries..."
            value={q} onChange={(e) => setQ(e.target.value)}
            data-testid="explore-search"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {REGIONS.map((r) => (
          <button key={r}
            className={`chip ${region === r ? "active" : ""}`}
            onClick={() => setRegion(r)}
            data-testid={`region-filter-${r.toLowerCase()}`}
          >
            {r === "India" ? <MapPin size={12}/> : r === "International" ? <Globe size={12}/> : null}
            {r} {r === "India" ? `(${indiaCount})` : r === "International" ? `(${intlCount})` : `(${dests.length})`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 stagger">
        {filtered.map((d) => <DestinationCard key={d.id} d={d} />)}
        {filtered.length === 0 && <div className="text-[var(--tm-muted)] text-sm">No matches. Try a different keyword.</div>}
      </div>
    </div>
  );
}
