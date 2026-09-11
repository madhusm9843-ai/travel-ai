import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Layers, LocateFixed, ZoomIn, ZoomOut } from "lucide-react";

// Fix default icon paths (leaflet + webpack)
const defaultIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

function tmIcon(number, isMe = false) {
  const bg = isMe ? "#2563EB" : "#FF5A1F";
  const pulse = isMe ? `<div style="position:absolute;inset:-8px;border-radius:999px;background:${bg};opacity:0.35;animation:tmpulse 1.4s ease-out infinite"></div>` : "";
  return L.divIcon({
    className: "tm-div-icon",
    html: `<div style="position:relative;background:${bg};color:white;border-radius:999px;width:30px;height:30px;display:grid;place-items:center;border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,.3);font-weight:800;font-family:Manrope,sans-serif;font-size:12px">${pulse}${number ?? "•"}</div><style>@keyframes tmpulse{0%{transform:scale(1);opacity:0.5}100%{transform:scale(2.4);opacity:0}}</style>`,
    iconSize: [30, 30], iconAnchor: [15, 15],
  });
}

function ControlBar({ onLocate, onZoomIn, onZoomOut, layer, setLayer }) {
  return (
    <div className="absolute top-3 right-3 z-[400] flex flex-col gap-2" data-testid="map-controls">
      <button className="w-10 h-10 rounded-full bg-white shadow-md grid place-items-center hover:bg-[var(--tm-orange-light)]" onClick={onZoomIn} aria-label="Zoom in" data-testid="map-zoom-in"><ZoomIn size={16} /></button>
      <button className="w-10 h-10 rounded-full bg-white shadow-md grid place-items-center hover:bg-[var(--tm-orange-light)]" onClick={onZoomOut} aria-label="Zoom out" data-testid="map-zoom-out"><ZoomOut size={16} /></button>
      <button className="w-10 h-10 rounded-full bg-white shadow-md grid place-items-center hover:bg-[var(--tm-orange-light)]" onClick={onLocate} aria-label="Locate me" data-testid="map-locate"><LocateFixed size={16} /></button>
      <button
        className={`px-3 h-10 rounded-full shadow-md text-xs font-semibold flex items-center gap-1.5 ${layer === "satellite" ? "bg-[var(--tm-orange)] text-white" : "bg-white text-[var(--tm-ink)]"}`}
        onClick={() => setLayer(layer === "satellite" ? "streets" : "satellite")}
        data-testid="map-layer-toggle"
      >
        <Layers size={14} /> {layer === "satellite" ? "Satellite" : "Map"}
      </button>
    </div>
  );
}

function MapWiring({ setControls, focus, follow }) {
  const map = useMap();
  useEffect(() => {
    setControls({
      zoomIn: () => map.zoomIn(),
      zoomOut: () => map.zoomOut(),
      locate: () => map.locate({ setView: true, maxZoom: 15 }),
    });
    map.on("locationfound", (e) => {
      L.circleMarker(e.latlng, { radius: 8, color: "#FF5A1F", fillColor: "#FF5A1F", fillOpacity: 0.9 })
        .addTo(map).bindPopup("You are here").openPopup();
    });
  }, [map, setControls]);

  useEffect(() => {
    if (focus?.lat && focus?.lng) map.flyTo([focus.lat, focus.lng], focus.zoom || 12, { duration: 1.2 });
  }, [focus, map]);

  // Auto-follow live GPS smoothly if follow prop provided
  useEffect(() => {
    if (follow?.lat && follow?.lng) {
      map.panTo([follow.lat, follow.lng], { animate: true, duration: 0.8 });
    }
  }, [follow?.lat, follow?.lng, map]);

  return null;
}

export default function MapView({ center = [20.5937, 78.9629], zoom = 5, markers = [], focus, follow, height = 480 }) {
  const [layer, setLayer] = useState("streets");
  const [controls, setControls] = useState({});

  return (
    <div className="relative rounded-2xl overflow-hidden border border-[var(--tm-border)]" style={{ height }} data-testid="map-view">
      <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }} zoomControl={false} scrollWheelZoom>
        {layer === "streets" ? (
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        ) : (
          <>
            <TileLayer
              attribution='Tiles &copy; Esri'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
              opacity={0.85}
            />
          </>
        )}
        {markers.map((m, i) => (
          <Marker key={m.id ?? i} position={[m.lat, m.lng]} icon={tmIcon(m.number ?? i + 1, m.id === "me")}>
            <Popup>
              <div className="font-display font-bold text-sm">{m.name}</div>
              {m.description && <div className="text-xs text-[var(--tm-body)] mt-1">{m.description}</div>}
              {m.time && <div className="text-[10px] mt-1 uppercase tracking-wider text-[var(--tm-orange)]">{m.time}</div>}
            </Popup>
          </Marker>
        ))}
        <MapWiring setControls={setControls} focus={focus} follow={follow} />
      </MapContainer>
      <ControlBar
        onLocate={() => controls.locate?.()}
        onZoomIn={() => controls.zoomIn?.()}
        onZoomOut={() => controls.zoomOut?.()}
        layer={layer}
        setLayer={setLayer}
      />
    </div>
  );
}
