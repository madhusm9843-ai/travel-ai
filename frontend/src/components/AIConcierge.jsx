import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, Trash2, X } from "lucide-react";
import { sendChat, getChatHistory, clearChat } from "@/lib/api";
import { getSessionId } from "@/lib/session";

const FAST_TRIGGERS = [
  "Plan My Trip",
  "Modify My Trip",
  "Find Nearby Places",
  "Find Food",
  "Find Hotels",
  "What Can I Do Here?",
  "Check My Budget",
  "Ask About My Trip",
];

export default function AIConcierge({ context, open, onClose }) {
  const sid = getSessionId();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    getChatHistory(sid).then((docs) => setMessages(docs)).catch(() => {});
  }, [open, sid]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text) => {
    const t = (text ?? input).trim();
    if (!t || loading) return;
    setInput("");
    const userMsg = { role: "user", content: t, id: `tmp-${Date.now()}` };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);
    try {
      const res = await sendChat({ session_id: sid, message: t, context: context || null });
      setMessages((m) => [...m, { role: "assistant", content: res.reply, id: res.message_id }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Hmm, I couldn't reach the travel intelligence engine. Please try again in a moment.", id: `err-${Date.now()}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const wipe = async () => { await clearChat(sid); setMessages([]); };

  if (!open) return null;

  return (
    <aside
      className="fixed right-4 top-20 bottom-4 w-[380px] max-w-[92vw] flex flex-col card-soft z-40"
      data-testid="ai-concierge-panel"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--tm-border)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[var(--tm-orange)] grid place-items-center text-white">
            <Bot size={16} />
          </div>
          <div>
            <div className="font-display font-bold text-sm">TravelMate Assistant</div>
            <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Online · Llama 3.3
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="text-[var(--tm-muted)] hover:text-[var(--tm-ink)]" aria-label="Clear chat" onClick={wipe} data-testid="chat-clear">
            <Trash2 size={16} />
          </button>
          <button className="text-[var(--tm-muted)] hover:text-[var(--tm-ink)]" aria-label="Close" onClick={onClose} data-testid="chat-close">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b border-[var(--tm-border)] bg-[#fdf3ec]">
        {FAST_TRIGGERS.slice(0, 6).map((t) => (
          <button key={t} className="chip text-[11px]" onClick={() => send(t)} data-testid={`chip-${t.replace(/\s+/g, "-").toLowerCase()}`}>
            {t}
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#fffaf6]">
        {messages.length === 0 && (
          <div className="text-center py-8 text-[var(--tm-muted)] text-sm">
            <Sparkles className="mx-auto mb-2 text-[var(--tm-orange)]" />
            Hola! I&apos;m your TravelMate AI companion. Want to reroute any stop, adjust budget, or add unspoiled food spots to your Kerala Nature Escape? Just type below!
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-[var(--tm-orange)] text-white rounded-tr-sm"
                  : "bg-white border border-[var(--tm-border)] text-[var(--tm-ink)] rounded-tl-sm"
              }`}
              data-testid={`chat-msg-${m.role}`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-white border border-[var(--tm-border)] px-3.5 py-2.5 text-sm text-[var(--tm-muted)]">
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--tm-orange)] animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--tm-orange)] animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--tm-orange)] animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            </div>
          </div>
        )}
      </div>

      <form
        className="p-3 border-t border-[var(--tm-border)] flex items-center gap-2"
        onSubmit={(e) => { e.preventDefault(); send(); }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about routes, food, hidden gems, or budget..."
          className="flex-1 rounded-full border border-[var(--tm-border)] px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--tm-orange)]/40 bg-white"
          data-testid="chat-input"
        />
        <button type="submit" className="w-10 h-10 rounded-full bg-[var(--tm-orange)] text-white grid place-items-center hover:bg-[var(--tm-orange-hover)] disabled:opacity-50" disabled={loading} data-testid="chat-send">
          <Send size={16} />
        </button>
      </form>
    </aside>
  );
}
