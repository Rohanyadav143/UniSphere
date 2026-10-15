import test from "node:test";
import assert from "node:assert/strict";
import proxy from "../api/proxy.js";

function makeRequest(path, { method = "GET", headers = {}, body } = {}) {
  const [route, ...queryParts] = path.split("&");
  const query = new URLSearchParams({ path: route });
  for (const part of queryParts) {
    const [name, value] = part.split("=");
    query.append(name, value);
  }
  return new Request(`https://unisphere-frontend-delta.vercel.app/api/proxy?${query}`, {
    method,
    headers,
    body: ["GET", "HEAD"].includes(method) ? undefined : body
  });
}

test("Vercel proxy forwards API path, query, cookies and host-only session cookies", async () => {
  const originalFetch = globalThis.fetch;
  let forwarded;
  globalThis.fetch = async (url, options) => {
    forwarded = { url, options };
    return new Response('{"success":true}', {
      status: 200,
      headers: [
        ["Content-Type", "application/json"],
        ["Set-Cookie", "unisphere_session=token; Domain=onrender.com; Path=/; HttpOnly; Secure; SameSite=None"]
      ]
    });
  };

  try {
    const response = await proxy.fetch(makeRequest("auth/me&course=mern", {
      headers: {
        cookie: "unisphere_session=browser-token",
        origin: "https://unisphere-frontend-delta.vercel.app"
      }
    }));

    assert.equal(forwarded.url, "https://unisphere-backend-h5p9.onrender.com/api/auth/me?course=mern");
    assert.equal(forwarded.options.headers.get("cookie"), "unisphere_session=browser-token");
    assert.equal(forwarded.options.headers.get("origin"), "https://unisphere-frontend-delta.vercel.app");
    assert.equal(response.status, 200);
    assert.match(response.headers.get("set-cookie"), /SameSite=Lax/);
    assert.doesNotMatch(response.headers.get("set-cookie"), /Domain=/i);
    assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Vercel proxy forwards JSON bodies to backend auth routes", async () => {
  const originalFetch = globalThis.fetch;
  let forwarded;
  globalThis.fetch = async (url, options) => {
    forwarded = { url, options };
    return Response.json({ success: true });
  };

  try {
    const response = await proxy.fetch(makeRequest("auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "learner@example.com", password: "private-password" })
    }));
    assert.equal(forwarded.url, "https://unisphere-backend-h5p9.onrender.com/api/auth/login");
    assert.deepEqual(JSON.parse(new TextDecoder().decode(forwarded.options.body)), {
      email: "learner@example.com",
      password: "private-password"
    });
    assert.equal(response.status, 200);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Vercel proxy rejects missing or unsafe forwarded API paths", async () => {
  for (const path of ["", "../admin/users", "/auth/login"]) {
    const request = new Request(`https://unisphere-frontend-delta.vercel.app/api/proxy?path=${encodeURIComponent(path)}`);
    const response = await proxy.fetch(request);
    assert.equal(response.status, 400);
  }
});

test("Vercel proxy returns 502 when the backend cannot be reached", async () => {
  const originalFetch = globalThis.fetch;
  const originalConsoleError = console.error;
  globalThis.fetch = async () => { throw new Error("upstream unavailable"); };
  console.error = () => {};

  try {
    const response = await proxy.fetch(makeRequest("roadmaps"));
    assert.equal(response.status, 502);
    assert.match(await response.text(), /temporarily unavailable/);
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
  }
});
