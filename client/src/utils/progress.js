export const GUEST_PROGRESS_KEY = "unisphere-progress-v2";
const LEGACY_GUEST_PROGRESS_KEY = "pathway-progress-v2";

export function loadGuestProgress() {
  try {
    let stored = localStorage.getItem(GUEST_PROGRESS_KEY);
    if (stored === null) {
      stored = localStorage.getItem(LEGACY_GUEST_PROGRESS_KEY);
      if (stored !== null) {
        localStorage.setItem(GUEST_PROGRESS_KEY, stored);
        localStorage.removeItem(LEGACY_GUEST_PROGRESS_KEY);
      }
    }
    const parsed = JSON.parse(stored || "[]");
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter(item => typeof item === "string").map(item => item.replace(/^dsa_problem:/, "lesson:")))];
  } catch {
    return [];
  }
}

export function contentKey(type, id) {
  return `${type}:${id}`;
}

export function getYoutubeId(url, id) {
  if (id) return id;
  if (!url) return "";
  try {
    const parsed = new URL(url);
    const value = parsed.hostname === "youtu.be"
      ? parsed.pathname.slice(1)
      : parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean).pop();
    return /^[\w-]{11}$/.test(value || "") ? value : "";
  } catch {
    return "";
  }
}

export function percent(completed, total) {
  return total ? Math.round(completed / total * 100) : 0;
}
