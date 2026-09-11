import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { Bot } from "lucide-react";
import Navbar from "@/components/Navbar";
import Home from "@/pages/Home";
import Explore from "@/pages/Explore";
import PlanTrip from "@/pages/PlanTrip";
import MyTrips from "@/pages/MyTrips";
import TripDetail from "@/pages/TripDetail";
import MapPage from "@/pages/MapPage";
import Bookings from "@/pages/Bookings";
import LiveTrip from "@/pages/LiveTrip";
import AIConcierge from "@/components/AIConcierge";
import "@/App.css";

function App() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <BrowserRouter>
      <div className="min-h-screen grain">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/plan" element={<PlanTrip />} />
          <Route path="/trips" element={<MyTrips />} />
          <Route path="/trips/:id" element={<TripDetail />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/live" element={<LiveTrip />} />
        </Routes>

        {/* Floating chat toggle */}
        <button
          onClick={() => setChatOpen((v) => !v)}
          className="fixed right-5 bottom-5 w-14 h-14 rounded-full bg-[var(--tm-orange)] text-white shadow-2xl grid place-items-center hover:bg-[var(--tm-orange-hover)] z-30"
          aria-label="Open AI concierge"
          data-testid="chat-fab"
        >
          <Bot size={20} />
        </button>
        <AIConcierge open={chatOpen} onClose={() => setChatOpen(false)} />

        <footer className="max-w-7xl mx-auto px-6 py-10 text-xs text-[var(--tm-muted)] flex flex-col md:flex-row justify-between gap-2">
          <div>© 2026 TravelMate AI · Crafted with generative intelligence.</div>
          <div>OpenStreetMap · Esri Satellite · Groq Llama 3.3</div>
        </footer>

        <Toaster position="top-right" richColors />
      </div>
    </BrowserRouter>
  );
}

export default App;
