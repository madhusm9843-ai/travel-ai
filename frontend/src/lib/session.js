// Simple anonymous session ID persisted in localStorage
const KEY = "tm_session_id";

export function getSessionId() {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id =
      (crypto?.randomUUID?.() ||
        "s_" + Math.random().toString(36).slice(2) + Date.now().toString(36));
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
