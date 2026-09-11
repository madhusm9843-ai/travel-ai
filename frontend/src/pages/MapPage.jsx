import { useEffect, useState } from "react";
import MapView from "@/components/MapView";
import { listDestinations } from "@/lib/api";
import { MapPin, LocateFixed, Globe } from "lucide-react";
import { toast } from "sonner";

const REGIONS = ["All", "India", "International"];

export default function MapPage() {
  const [dests, setDests] = useState([]);
  const [focus, setFocus] = useState(null);
  const [region, setRegion] = useState("All");

  useEffect(() => { listDestinations().then(setDests); }, []);

  const shown = dests.filter((d) => region === "All" || d.region === region);
  const markers = shown.map((d, i) => ({
    id: d.id, lat: d.lat, lng: d.lng, name: d.name, description: `${d.country} · ${d.tagline}`, number: i + 1,
  }));

  const locate = () => {
    if (!navigator.geolocation) return toast.error("Geolocation not supported");
    toast.loading("Locating you…", { id: "loc" });
    navigator.geolocation.getCurrentPosition(
      (p) => { toast.success("Location locked", { id: "loc" }); setFocus({ lat: p.coords.latitude, lng: p.coords.longitude, zoom: 14 }); },
      () => toast.error("Could not access location", { id: "loc" }),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const worldView = () => setFocus({ lat: 20, lng: 30, zoom: 2 });

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-[var(--tm-orange)] font-semibold">Geospatial Explorer</div>
          <h1 className="font-display font-bold text-4xl md:text-5xl mt-1">Interactive Map & Live Location</h1>
          <p className="text-[var(--tm-body)] mt-2 max-w-2xl">Toggle satellite for terrain clarity, share your live GPS, and fly to any city across India or the world.</p>
        </div>
        <div className="flex gap-2">
          <button className="pill-btn text-sm" onClick={locate} data-testid="use-live-location"><LocateFixed size={14}/> Use My Live Location</button>
          <button className="pill-ghost text-sm" onClick={worldView} data-testid="world-view"><Globe size={14}/> World View</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {REGIONS.map((r) => (
          <button key={r}
            className={`chip ${region === r ? "active" : ""}`}
            onClick={() => setRegion(r)}
            data-testid={`map-region-${r.toLowerCase()}`}
          >{r}</button>
        ))}
      </div>

      <MapView markers={markers} focus={focus} height={560} />

      <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 stagger">
        {shown.map((d) => (
          <button key={d.id}
            className="card-soft p-4 text-left hover:-translate-y-0.5 transition-transform"
            onClick={() => setFocus({ lat: d.lat, lng: d.lng, zoom: 9 })}
            data-testid={`map-fly-${d.id}`}
          >
            <div className="w-8 h-8 rounded-full bg-[var(--tm-orange-light)] text-[var(--tm-orange)] grid place-items-center"><MapPin size={14}/></div>
            <div className="font-display font-bold mt-2">{d.name}</div>
            <div className="text-[11px] text-[var(--tm-muted)]">{d.country} · Fly to →</div>
          </button>
        ))}
      </div>
    </div>
  );
}
