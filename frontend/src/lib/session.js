// Session ID persisted in localStorage. Kept as a *secret* — sent only via
// X-Session-Id header (never in URL/query) to mitigate accidental leakage.
const KEY = "tm_session_id";

function _randHex(bytes = 24) {
  try {
    const a = new Uint8Array(bytes);
    crypto.getRandomValues(a);
    return Array.from(a).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    // fallback: still uses two random sources but weaker
    return (
      Date.now().toString(36) +
      Math.random().toString(36).slice(2) +
      Math.random().toString(36).slice(2)
    );
  }
}

export function getSessionId() {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto?.randomUUID?.() || _randHex(24);
    // strip dashes → all endpoints accept [A-Za-z0-9_-]{8,128}
    id = String(id).replace(/[^A-Za-z0-9_\-]/g, "");
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function saveLocal(key, val) {
  localStorage.setItem(`tm_${key}`, JSON.stringify(val));
}
export function readLocal(key, fallback = null) {
  try {
    const raw = localStorage.getItem(`tm_${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
