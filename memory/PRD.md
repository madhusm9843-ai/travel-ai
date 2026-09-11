# TravelMate AI – PRD

## Original Problem
Travel website with AI tutor (like ChatGPT) that collects user preferences (destination, budget, dates, interests, cultural festivals) and returns a personalised plan. Interactive maps with satellite + live location + zoom. Flight/train/metro/bus booking. Data stored on server. Neat, attractive frontend using provided reference screenshots.

## Architecture
- Backend: FastAPI + MongoDB. Groq API (openai/gpt-oss-120b) for AI. httpx for HTTP.
- Frontend: React 19 + Tailwind + shadcn/ui + Leaflet + react-leaflet + framer-motion + sonner.
- Maps: Leaflet with OSM + Esri Satellite tiles (no key required).
- Auth: None. Anonymous session id in localStorage.

## Implemented (Feb 2026)
- Home landing with hero, popular destinations grid, 6-feature grid, testimonial
- Explore destinations page with search
- Plan Trip form: destination chips, dates, budget, travelers, interests, style, diet, notes, festival toggle → calls /api/itinerary/generate
- My Trips list + Trip Detail with day tabs, numbered stops, Leaflet map, budget breakdown, festival overlay
- Interactive Map page: 6 destinations, filter chips, satellite toggle, geolocation, fly-to buttons
- Bookings module: flights / trains / buses / metro simulated search + book (PNR generated) + list bookings
- Live Trip Mode: current GPS, budget, weather, day map, AI panel
- Persistent AI Concierge chat (floating FAB) with fast-trigger chips, history persisted per session
- Cultural festivals endpoint (AI-cached)

## Personas
- Weekend traveller couples planning short trips
- Solo backpackers looking for offbeat gems
- Family planners needing budget clarity

## Backlog / P1
- Real transport APIs (Amadeus/IRCTC) instead of mock
- User accounts with sharable trip links
- Multi-language support (Hindi, Tamil)
- Offline PWA mode for Live Trip
- Photo upload for trips via object storage
