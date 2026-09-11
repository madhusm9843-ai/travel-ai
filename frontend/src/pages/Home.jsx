import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Compass, Route, MapPin, Utensils, PartyPopper, Radar, CheckCircle2, Star } from "lucide-react";
import DestinationCard from "@/components/DestinationCard";
import { listDestinations } from "@/lib/api";

const FEATURES = [
  { icon: Sparkles, title: "AI Personalized Plans", desc: "Every itinerary respects your pace, interests and energy levels. Adjust stops in one tap with real-time route optimization." },
  { icon: Route, title: "Smart Budget Breakdown", desc: "Real-cost calculations for food, stay, transit and entry fees. Never be caught off-guard by surge pricing or hidden costs." },
  { icon: MapPin, title: "Interactive Maps & Routes", desc: "Pointers for verified hotels, roadside food gems, and viewpoint overlooks with integrated distance calculations." },
  { icon: Utensils, title: "Authentic Food & Cafés", desc: "Filtered by dietary preferences (Veg, Vegan, Coastal, Halal) curated from genuine local food explorers, not sponsored ads." },
  { icon: PartyPopper, title: "Festivals & Live Events", desc: "Automatically surfaces authentic festivities, boat races, and night markets taking place during your exact visit dates." },
  { icon: Radar, title: "Real-Time AI Guidance", desc: "Rain spoiled your morning? Ask the concierge in plain English to swap outdoor treks for a spice workshop in 5 seconds." },
];

export default function Home() {
  const [dests, setDests] = useState([]);
  useEffect(() => { listDestinations().then(setDests).catch(() => {}); }, []);

  return (
    <div className="max-w-7xl mx-auto px-6">
      {/* Hero */}
      <section className="grid md:grid-cols-2 gap-12 items-center pt-14 pb-16">
        <div className="fade-up">
          <div className="chip mb-6" data-testid="hero-badge">
            <Sparkles size={12} className="text-[var(--tm-orange)]" /> Next-Gen Travel Intelligence
          </div>
          <h1 className="text-5xl md:text-6xl font-display font-extrabold tracking-tighter leading-[1.02]">
            Plan your perfect trip
            <br />
            <span className="text-[var(--tm-orange)]">with generative AI</span>.
          </h1>
          <p className="mt-6 text-[var(--tm-body)] max-w-lg leading-relaxed">
            Tell us what you love, your budget, and how you want to travel. Our AI crafts hyper-personalised, day-by-day itineraries with local secret gems, accurate budgets, and transit maps in seconds.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/plan" className="pill-btn" data-testid="hero-cta-plan"><Sparkles size={16} /> Plan My Trip</Link>
            <Link to="/explore" className="pill-ghost" data-testid="hero-cta-explore"><Compass size={16} /> Explore Destinations</Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-6 text-sm text-[var(--tm-body)]">
            <div className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-600" /> 48,000+ AI Trips Planned</div>
            <div className="flex items-center gap-1.5"><Star size={14} className="text-[var(--tm-orange)]" /> 4.9/5 Explorer Score</div>
          </div>
        </div>

        <div className="relative fade-up" style={{ animationDelay: "0.15s" }}>
          <div className="mx-auto w-[280px] md:w-[340px] aspect-[9/16] rounded-[36px] bg-black p-2 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.25)] rotate-2">
            <div className="w-full h-full rounded-[28px] overflow-hidden relative">
              <img alt="Kerala backwaters" src="https://images.unsplash.com/photo-1616085490777-e329b0afc73c?crop=entropy&cs=srgb&fm=jpg&q=85" className="w-full h-full object-cover" />
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <div className="text-[10px] uppercase tracking-widest text-[var(--tm-orange)] flex items-center gap-1"><Sparkles size={10}/> Trending AI Destination</div>
                <div className="font-display font-bold text-2xl text-white">Kerala, India</div>
                <div className="text-[11px] text-white/80 mt-1">Backwaters, hills, spice gardens · clocked ‘hyper-explorer’ favourite</div>
              </div>
              <span className="absolute top-4 right-4 badge-match">4.9★</span>
            </div>
          </div>
          <div className="absolute -bottom-4 -left-4 card-soft p-3 max-w-[220px] rotate-[-4deg] hidden md:block">
            <div className="text-[10px] uppercase tracking-widest text-[var(--tm-muted)]">Adaptive AI</div>
            <div className="text-sm font-semibold mt-1">Auto-routes stops to save 3+ hrs travel time</div>
            <button className="mt-2 text-[11px] font-semibold text-[var(--tm-orange)]">Inspect Plan →</button>
          </div>
        </div>
      </section>

      {/* Destinations */}
      <section className="pb-16">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-3xl md:text-4xl font-display font-bold">Popular Places in India</h2>
            <div className="text-xs uppercase tracking-widest text-[var(--tm-muted)] mt-1">Tap to see</div>
          </div>
          <Link to="/explore" className="text-[var(--tm-orange)] font-semibold text-sm hover:underline" data-testid="see-all-dests">
            Explore all destinations →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger">
          {dests.slice(0, 4).map((d) => (
            <DestinationCard key={d.id} d={d} />
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-16 text-center">
        <div className="text-xs uppercase tracking-widest text-[var(--tm-orange)] font-semibold">Architected for Travelers</div>
        <h2 className="text-3xl md:text-4xl font-display font-bold mt-2 max-w-2xl mx-auto">Six Superpowers Inside TravelMate AI</h2>
        <p className="text-[var(--tm-body)] mt-3 max-w-2xl mx-auto">Beyond generic summaries. Real timetables, localised cost guardrails, and dynamic route orchestration.</p>
        <div className="grid md:grid-cols-3 gap-4 mt-10 text-left stagger">
          {FEATURES.map((f) => (
            <div key={f.title} className="card-soft p-6 hover:-translate-y-1 transition-transform">
              <div className="w-10 h-10 rounded-full bg-[var(--tm-orange-light)] text-[var(--tm-orange)] grid place-items-center mb-4"><f.icon size={18} /></div>
              <div className="font-display font-bold text-lg">{f.title}</div>
              <p className="text-sm text-[var(--tm-body)] mt-2 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonial */}
      <section className="pb-20">
        <div className="card-soft p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6 bg-[#f7ede4]">
          <div className="flex-1">
            <div className="text-[var(--tm-orange)]">★★★★★</div>
            <p className="mt-2 font-display text-lg">“TravelMate AI planned our 5-day Munnar & Alleppey trip in 20 seconds. The local seafood recommendations in Fort Kochi were spot-on!”</p>
            <div className="text-xs text-[var(--tm-muted)] mt-2">Pooja & Rohan M. · Bangalore</div>
          </div>
          <Link to="/plan" className="pill-btn whitespace-nowrap" data-testid="testimonial-cta">Start Your Free Plan</Link>
        </div>
      </section>
    </div>
  );
}
