import { NavLink, Link } from "react-router-dom";
import { Compass, Sparkles, Map as MapIcon, Ticket, Route, Home as HomeIcon, Radio } from "lucide-react";

const items = [
  { to: "/", label: "Home", icon: HomeIcon, testid: "nav-home" },
  { to: "/explore", label: "Explore", icon: Compass, testid: "nav-explore" },
  { to: "/plan", label: "Plan Trip", icon: Sparkles, testid: "nav-plan" },
  { to: "/trips", label: "My Trips", icon: Route, testid: "nav-trips" },
  { to: "/map", label: "Map", icon: MapIcon, testid: "nav-map" },
  { to: "/live", label: "Live", icon: Radio, testid: "nav-live" },
  { to: "/bookings", label: "Bookings", icon: Ticket, testid: "nav-bookings" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-[#FDF7F2]/85 border-b border-[var(--tm-border)]">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2" data-testid="brand-logo">
          <div className="w-9 h-9 rounded-full bg-[var(--tm-orange)] grid place-items-center text-white">
            <Sparkles size={18} />
          </div>
          <div className="leading-tight">
            <div className="font-display font-bold text-lg">TravelMate <span className="text-[var(--tm-orange)]">AI</span></div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--tm-muted)]">Generative Travel</div>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.to === "/"}
              data-testid={it.testid}
              className={({ isActive }) =>
                `px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-1.5 transition-colors ${
                  isActive ? "bg-[var(--tm-orange)] text-white" : "text-[var(--tm-ink)] hover:bg-[var(--tm-orange-light)]"
                }`
              }
            >
              <it.icon size={14} />
              {it.label}
            </NavLink>
          ))}
        </nav>
        <Link to="/plan" className="pill-btn text-sm" data-testid="cta-plan-header">
          <Sparkles size={14} /> Plan My Trip
        </Link>
      </div>
    </header>
  );
}
