const backendApi = "https://unisphere-backend-h5p9.onrender.com/api";

function forwardedCookie(cookie) {
  const parts = cookie.split(";").map(part => part.trim());
  const attributes = parts.filter(part => !/^domain=/i.test(part));
  const sameSiteIndex = attributes.findIndex(part => /^samesite=/i.test(part));
  if (sameSiteIndex >= 0) attributes[sameSiteIndex] = "SameSite=Lax";
  else attributes.push("SameSite=Lax");
  if (!attributes.some(part => /^path=/i.test(part))) attributes.push("Path=/");
  if (!attributes.some(part => /^secure$/i.test(part))) attributes.push("Secure");
  return attributes.join("; ");
}

async function requestBody(request) {
  if (request.body === undefined || request.body === null) return undefined;
  if (Buffer.isBuffer(request.body) || typeof request.body === "string") return request.body;
  return JSON.stringify(request.body);
}

export default async function handler(request, response) {
  const incoming = new URL(request.url, `https://${request.headers.host || "localhost"}`);
  const apiPath = incoming.pathname.replace(/^\/api(?=\/|$)/, "");
  const headers = new Headers();
  for (const name of ["accept", "content-type", "cookie"]) {
    const value = request.headers[name];
    if (value) headers.set(name, value);
  }

  try {
    const upstream = await fetch(`${backendApi}${apiPath}${incoming.search}`, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : await requestBody(request),
      redirect: "manual"
    });

    response.statusCode = upstream.status;
    response.setHeader("Cache-Control", "private, no-store, max-age=0");
    const contentType = upstream.headers.get("content-type");
    if (contentType) response.setHeader("Content-Type", contentType);

    const cookies = typeof upstream.headers.getSetCookie === "function"
      ? upstream.headers.getSetCookie()
      : upstream.headers.get("set-cookie") ? [upstream.headers.get("set-cookie")] : [];
    if (cookies.length) response.setHeader("Set-Cookie", cookies.map(forwardedCookie));

    const body = Buffer.from(await upstream.arrayBuffer());
    response.end(body);
  } catch (error) {
    console.error("API proxy request failed:", error.message);
    response.statusCode = 502;
    response.setHeader("Cache-Control", "private, no-store, max-age=0");
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(JSON.stringify({ success: false, message: "The learning service is temporarily unavailable. Please try again." }));
  }
}
