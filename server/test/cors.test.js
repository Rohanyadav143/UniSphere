import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

const frontendOrigin = "https://unisphere-frontend-delta.vercel.app";
process.env.CLIENT_URL = `${frontendOrigin}/`;
const { default: app } = await import("../src/app.js");

test("CORS accepts the configured frontend origin with a trailing slash", async () => {
  const response = await request(app)
    .options("/api/roadmaps")
    .set("Origin", frontendOrigin)
    .set("Access-Control-Request-Method", "GET");

  assert.equal(response.status, 204);
  assert.equal(response.headers["access-control-allow-origin"], frontendOrigin);
  assert.equal(response.headers["access-control-allow-credentials"], "true");
});
