import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/[...path].js";

function createResponse() {
  return {
    headers: {},
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    end(body) {
      this.body = body.toString();
    }
  };
}

test("API proxy forwards same-origin cookie and returns host-only session cookies", async () => {
  const originalFetch = globalThis.fetch;
  let forwardedRequest;
  globalThis.fetch = async (url, options) => {
    forwardedRequest = { url, options };
    return {
      status: 200,
      headers: {
        get: name => name === "content-type" ? "application/json; charset=utf-8" : null,
        getSetCookie: () => [
          "unisphere_session=token; Domain=onrender.com; Path=/; HttpOnly; Secure; SameSite=None",
          "pathway_session=; Domain=onrender.com; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=None"
        ]
      },
      arrayBuffer: async () => Buffer.from('{"success":true}')
    };
  };

  try {
    const response = createResponse();
    await handler({
      url: "/api/auth/me?fresh=1",
      method: "GET",
      headers: { host: "unisphere-frontend-delta.vercel.app", cookie: "unisphere_session=browser-token" }
    }, response);

    assert.equal(forwardedRequest.url, "https://unisphere-backend-h5p9.onrender.com/api/auth/me?fresh=1");
    assert.equal(forwardedRequest.options.headers.get("cookie"), "unisphere_session=browser-token");
    assert.equal(response.statusCode, 200);
    assert.match(response.headers["set-cookie"][0], /SameSite=Lax/);
    assert.doesNotMatch(response.headers["set-cookie"][0], /Domain=/i);
    assert.equal(response.headers["set-cookie"].length, 2);
    assert.equal(response.headers["cache-control"], "private, no-store, max-age=0");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("API proxy returns a clear 502 when the backend cannot be reached", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("upstream unavailable"); };
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    const response = createResponse();
    await handler({ url: "/api/roadmaps", method: "GET", headers: {} }, response);
    assert.equal(response.statusCode, 502);
    assert.match(response.body, /temporarily unavailable/);
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
  }
});

test("API proxy forwards JSON login payloads to the authentication endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let forwardedRequest;
  globalThis.fetch = async (url, options) => {
    forwardedRequest = { url, options };
    return {
      status: 200,
      headers: { get: () => "application/json; charset=utf-8" },
      arrayBuffer: async () => Buffer.from('{"success":true}')
    };
  };

  try {
    const response = createResponse();
    await handler({
      url: "/api/auth/login",
      method: "POST",
      headers: { host: "unisphere-frontend-delta.vercel.app", "content-type": "application/json" },
      body: { email: "learner@example.com", password: "private-password" }
    }, response);

    assert.equal(forwardedRequest.url, "https://unisphere-backend-h5p9.onrender.com/api/auth/login");
    assert.deepEqual(JSON.parse(forwardedRequest.options.body), { email: "learner@example.com", password: "private-password" });
    assert.equal(forwardedRequest.options.headers.get("content-type"), "application/json");
    assert.equal(response.statusCode, 200);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
