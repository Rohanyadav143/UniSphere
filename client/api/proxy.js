const backendApi = "https://unisphere-backend-h5p9.onrender.com/api";

function forwardCookie(cookie) {
  const attributes = cookie.split(";").map(part => part.trim()).filter(part => !/^domain=/i.test(part));
  const sameSiteIndex = attributes.findIndex(part => /^samesite=/i.test(part));
  if (sameSiteIndex >= 0) attributes[sameSiteIndex] = "SameSite=Lax";
  else attributes.push("SameSite=Lax");
  if (!attributes.some(part => /^path=/i.test(part))) attributes.push("Path=/");
  if (!attributes.some(part => /^secure$/i.test(part))) attributes.push("Secure");
  return attributes.join("; ");
}

function upstreamPath(url) {
  const path = url.searchParams.get("path");
  if (!path || !/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(path)) {
    return null;
  }
  return path;
}

export default {
  async fetch(request) {
    const incoming = new URL(request.url);
    const path = upstreamPath(incoming);
    if (!path) {
      return Response.json({ success: false, message: "API route was not specified." }, { status: 400 });
    }

    const query = new URLSearchParams(incoming.searchParams);
    query.delete("path");
    const queryString = query.toString();
    const headers = new Headers();
    for (const name of ["accept", "content-type", "cookie", "authorization", "origin"]) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }

    try {
      const upstream = await fetch(`${backendApi}/${path}${queryString ? `?${queryString}` : ""}`, {
        method: request.method,
        headers,
        body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer(),
        redirect: "manual"
      });

      const responseHeaders = new Headers({
        "Cache-Control": "private, no-store, max-age=0"
      });
      const contentType = upstream.headers.get("content-type");
      if (contentType) responseHeaders.set("Content-Type", contentType);

      const cookies = typeof upstream.headers.getSetCookie === "function"
        ? upstream.headers.getSetCookie()
        : upstream.headers.get("set-cookie") ? [upstream.headers.get("set-cookie")] : [];
      for (const cookie of cookies) responseHeaders.append("Set-Cookie", forwardCookie(cookie));

      return new Response(upstream.body, {
        status: upstream.status,
        headers: responseHeaders
      });
    } catch (error) {
      console.error("API proxy request failed:", error.message);
      return Response.json(
        { success: false, message: "The learning service is temporarily unavailable. Please try again." },
        { status: 502, headers: { "Cache-Control": "private, no-store, max-age=0" } }
      );
    }
  }
};
