import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, Trash2, X, Square, User, MapPin, LocateFixed, ExternalLink, Phone } from "lucide-react";
import { streamChat, chatNearby, getChatHistory, clearChat, NEARBY_INTENT_RE } from "@/lib/api";
import { getSessionId } from "@/lib/session";

const FAST_TRIGGERS = [
  "Hotels near me",
  "Restaurants nearby",
  "Cafés close by",
  "Best time to visit Ladakh",
  "Metro route in Paris",
  "Budget breakup for Bali",
];

function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split("\n");
  const blocks = [];
  let listBuf = null;
  const flushList = () => {
    if (!listBuf) return;
    blocks.push({ kind: listBuf.ordered ? "ol" : "ul", items: listBuf.items });
    listBuf = null;
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const ul = line.match(/^\s*(?:[-•*])\s+(.*)$/);
    const ol = line.match(/^\s*(\d+)\.\s+(.*)$/);
    if (ul) {
      if (!listBuf || listBuf.ordered) { flushList(); listBuf = { ordered: false, items: [] }; }
      listBuf.items.push(ul[1]);
    } else if (ol) {
      if (!listBuf || !listBuf.ordered) { flushList(); listBuf = { ordered: true, items: [] }; }
      listBuf.items.push(ol[2]);
    } else if (line.trim() === "") { flushList(); blocks.push({ kind: "br" }); }
    else { flushList(); blocks.push({ kind: "p", text: line }); }
  }
  flushList();

  const inline = (s) => {
    const parts = [];
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
    let last = 0; let m; let i = 0;
    while ((m = regex.exec(s)) !== null) {
      if (m.index > last) parts.push(s.slice(last, m.index));
      const tok = m[0];
      if (tok.startsWith("**")) parts.push(<strong key={i++}>{tok.slice(2, -2)}</strong>);
      else if (tok.startsWith("`")) parts.push(<code key={i++} className="bg-black/10 rounded px-1 py-0.5 text-[11px]">{tok.slice(1, -1)}</code>);
      else parts.push(<em key={i++}>{tok.slice(1, -1)}</em>);
      last = m.index + tok.length;
    }
    if (last < s.length) parts.push(s.slice(last));
    return parts;
  };

  return blocks.map((b, i) => {
    if (b.kind === "br") return <div key={i} className="h-2" />;
    if (b.kind === "ul") return <ul key={i} className="list-disc pl-5 space-y-1">{b.items.map((it, j) => <li key={j}>{inline(it)}</li>)}</ul>;
    if (b.kind === "ol") return <ol key={i} className="list-decimal pl-5 space-y-1">{b.items.map((it, j) => <li key={j}>{inline(it)}</li>)}</ol>;
    return <p key={i} className="leading-relaxed">{inline(b.text)}</p>;
  });
}

function PoiCard({ p, onFly }) {
  return (
    <div className="min-w-[200px] max-w-[220px] rounded-2xl border border-[var(--tm-border)] bg-white overflow-hidden shrink-0" data-testid={`poi-card-${p.name.replace(/\s+/g, '-').toLowerCase()}`}>
      <div className="h-24 bg-[#f3eae1] relative">
        <img src={p.photo} alt={p.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
        <span className="absolute top-2 left-2 rounded-full bg-black/80 text-white text-[10px] font-semibold px-2 py-0.5">{p.distance_m < 1000 ? `${p.distance_m}m` : `${(p.distance_m/1000).toFixed(1)}km`}</span>
      </div>
      <div className="p-2.5">
        <div className="font-semibold text-[13px] leading-tight line-clamp-2">{p.name}</div>
        <div className="text-[10px] text-[var(--tm-muted)] mt-0.5 uppercase tracking-widest">{p.category}{p.cuisine ? ` · ${p.cuisine}` : ""}{p.stars ? ` · ★${p.stars}` : ""}</div>
        <div className="flex items-center gap-1.5 mt-2">
          <button className="text-[10px] font-semibold text-[var(--tm-orange)] flex items-center gap-1 hover:underline" onClick={() => onFly?.(p)}>
            <MapPin size={10}/> View on map
          </button>
          {p.phone && (
            <a href={`tel:${p.phone}`} className="text-[10px] font-semibold text-[var(--tm-muted)] flex items-center gap-1 hover:text-[var(--tm-ink)]">
              <Phone size={10}/> Call
            </a>
          )}
          <a href={p.osm_url} target="_blank" rel="noreferrer" className="text-[10px] font-semibold text-[var(--tm-muted)] flex items-center gap-1 hover:text-[var(--tm-ink)] ml-auto">
            <ExternalLink size={10}/>
          </a>
        </div>
      </div>
    </div>
  );
}

export default function AIConcierge({ context, open, onClose, coords, onFocusMap, onPois }) {
  const sid = getSessionId();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [liveCoords, setLiveCoords] = useState(coords || null);
  const scrollRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => { if (coords) setLiveCoords(coords); }, [coords]);

  useEffect(() => {
    if (!open) return;
    getChatHistory(sid).then(setMessages).catch(() => {});
  }, [open, sid]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const askLocation = () => new Promise((res) => {
    if (!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition(
      (p) => { const c = { lat: p.coords.latitude, lng: p.coords.longitude }; setLiveCoords(c); res(c); },
      () => res(null),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });

  const stop = () => { abortRef.current?.abort(); abortRef.current = null; setStreaming(false); };

  const send = async (text) => {
    const t = (text ?? input).trim();
    if (!t || streaming) return;
    setInput("");
    const userMsg = { role: "user", content: t, id: `u-${Date.now()}` };
    const asstId = `a-${Date.now()}`;
    setMessages((m) => [...m, userMsg]);
    setStreaming(true);

    const isNearby = NEARBY_INTENT_RE.test(t);
    if (isNearby) {
      // Prompt geolocation if needed
      let c = liveCoords || (await askLocation());
      if (!c) {
        setMessages((m) => [...m, { role: "assistant", id: asstId, content: "I couldn't access your location. Please allow location permission in your browser to get nearby recommendations." }]);
        setStreaming(false);
        return;
      }
      setMessages((m) => [...m, { role: "assistant", id: asstId, content: "Scanning nearby places on OpenStreetMap…", streaming: true }]);
      try {
        const res = await chatNearby({ session_id: sid, message: t, lat: c.lat, lng: c.lng, radius: 2000, context: context || null });
        setMessages((m) => m.map((x) => x.id === asstId ? { ...x, content: res.reply, pois: res.pois || [], category: res.category, streaming: false } : x));
        onPois?.(res.pois || []);
      } catch {
        setMessages((m) => m.map((x) => x.id === asstId ? { ...x, content: "Nearby search failed. Please try again in a moment.", streaming: false } : x));
      } finally {
        setStreaming(false);
      }
      return;
    }

    // Regular streaming
    setMessages((m) => [...m, { role: "assistant", content: "", id: asstId, streaming: true }]);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let acc = "";
    try {
      await streamChat(
        { session_id: sid, message: t, context: { ...(context || {}), coords: liveCoords } },
        {
          onDelta: (d) => { acc += d; setMessages((m) => m.map((x) => x.id === asstId ? { ...x, content: acc } : x)); },
          onDone: () => { setMessages((m) => m.map((x) => x.id === asstId ? { ...x, streaming: false } : x)); },
          onError: () => { setMessages((m) => m.map((x) => x.id === asstId ? { ...x, content: acc || "Sorry, the AI is briefly unavailable. Please retry.", streaming: false } : x)); },
          signal: ctrl.signal,
        }
      );
    } finally { setStreaming(false); abortRef.current = null; }
  };

  const wipe = async () => { await clearChat(sid); setMessages([]); };
  const flyToPoi = (p) => { onFocusMap?.({ lat: p.lat, lng: p.lng, zoom: 16 }); };

  if (!open) return null;

  return (
    <aside className="fixed right-4 top-20 bottom-4 w-[440px] max-w-[95vw] flex flex-col card-soft z-40" data-testid="ai-concierge-panel">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--tm-border)]">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-[var(--tm-orange)] grid place-items-center text-white"><Bot size={18} /></div>
          <div>
            <div className="font-display font-bold text-sm">TravelMate Assistant</div>
            <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" /> Online · Streaming
              {liveCoords && <span className="ml-1 text-[var(--tm-muted)]">· <LocateFixed size={10} className="inline"/> live GPS</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="text-[var(--tm-muted)] hover:text-[var(--tm-ink)]" aria-label="Clear chat" onClick={wipe} data-testid="chat-clear"><Trash2 size={16} /></button>
          <button className="text-[var(--tm-muted)] hover:text-[var(--tm-ink)]" aria-label="Close" onClick={onClose} data-testid="chat-close"><X size={18} /></button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#fffaf6]">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-full bg-[var(--tm-orange)] text-white grid place-items-center mx-auto"><Sparkles /></div>
            <div className="mt-3 font-display font-bold text-lg">Ask me anything travel</div>
            <p className="text-sm text-[var(--tm-muted)] mt-1 max-w-xs mx-auto">Try "hotels near me" — I'll ping OpenStreetMap and pin them on the map.</p>
            <div className="flex flex-wrap gap-1.5 justify-center mt-4">
              {FAST_TRIGGERS.map((t) => (
                <button key={t} className="chip text-[11px]" onClick={() => send(t)} data-testid={`chip-${t.split(" ")[0].toLowerCase()}`}>{t}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-7 h-7 rounded-full grid place-items-center shrink-0 ${m.role === "user" ? "bg-black text-white" : "bg-[var(--tm-orange)] text-white"}`}>
              {m.role === "user" ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-sm ${m.role === "user" ? "bg-[var(--tm-orange)] text-white rounded-tr-sm" : "bg-white border border-[var(--tm-border)] text-[var(--tm-ink)] rounded-tl-sm"}`} data-testid={`chat-msg-${m.role}`}>
              <div className="prose-sm">
                {m.role === "assistant" ? renderMarkdown(m.content) : <span className="whitespace-pre-wrap">{m.content}</span>}
                {m.streaming && (<span className="inline-block w-1.5 h-4 align-[-2px] ml-0.5 bg-[var(--tm-orange)] animate-pulse rounded-sm" />)}
              </div>
              {m.pois && m.pois.length > 0 && (
                <div className="mt-3 -mx-1" data-testid="poi-cards">
                  <div className="flex gap-2 overflow-x-auto pb-1 px-1">
                    {m.pois.map((p, i) => <PoiCard key={i} p={p} onFly={flyToPoi} />)}
                  </div>
                </div>
              )}
              {m.pois && m.pois.length === 0 && m.category && (
                <div className="mt-2 text-[11px] text-[var(--tm-muted)]">No {m.category}s found within 2 km — try widening the search.</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <form className="p-3 border-t border-[var(--tm-border)] flex items-center gap-2 bg-white rounded-b-2xl"
        onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input value={input} onChange={(e) => setInput(e.target.value)}
          placeholder={liveCoords ? "Ask about routes, food, hotels near me…" : "Message TravelMate AI…"}
          className="flex-1 rounded-full border border-[var(--tm-border)] px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--tm-orange)]/40 bg-white"
          data-testid="chat-input" disabled={streaming} />
        {streaming ? (
          <button type="button" onClick={stop} className="w-10 h-10 rounded-full bg-black text-white grid place-items-center hover:opacity-90" data-testid="chat-stop"><Square size={14} fill="currentColor" /></button>
        ) : (
          <button type="submit" className="w-10 h-10 rounded-full bg-[var(--tm-orange)] text-white grid place-items-center hover:bg-[var(--tm-orange-hover)]" data-testid="chat-send"><Send size={16} /></button>
        )}
      </form>
    </aside>
  );
}
