export function youtubeIdFromUrl(value = "") {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (!["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtube-nocookie.com"].includes(url.hostname)) {
      return "";
    }
    const id = url.hostname.includes("youtu.be")
      ? url.pathname.split("/").filter(Boolean)[0]
      : url.searchParams.get("v") || url.pathname.split("/").filter(Boolean).at(-1);
    return /^[\w-]{11}$/.test(id || "") ? id : "";
  } catch {
    return "";
  }
}
