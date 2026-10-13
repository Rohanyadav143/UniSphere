import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../src/app.js";
import { dsaQuestionSchema, lessonSchema, registerSchema, progressSchema, roadmapSchema } from "../src/validators/schemas.js";
import { slugify } from "../src/utils/slug.js";
import { youtubeIdFromUrl } from "../src/utils/youtube.js";

test("health endpoint reports a ready API", async () => {
  const response = await request(app).get("/health");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { success: true, data: { status: "ok" } });
});

test("unknown API routes use the standard not-found response", async () => {
  const response = await request(app).get("/api/not-a-route");
  assert.equal(response.status, 404);
  assert.deepEqual(response.body, { success: false, message: "Resource not found" });
});

test("progress endpoints require authentication", async () => {
  const response = await request(app).get("/api/progress");
  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
});

test("registration never accepts a caller-selected role", () => {
  const parsed = registerSchema.parse({
    name: "Jordan Learner",
    email: "jordan@example.com",
    password: "a-secure-password",
    role: "admin"
  });
  assert.equal(parsed.role, undefined);
  assert.equal(registerSchema.safeParse({
    name: "Jordan Learner",
    email: "jordan@example.com",
    password: "a-secure-password",
    guestProgress: ["dsaQuestion:507f1f77bcf86cd799439011"]
  }).success, true);
});

test("progress validation only permits known content types and Mongo IDs", () => {
  assert.equal(progressSchema.safeParse({ contentType: "lesson", contentId: "507f1f77bcf86cd799439011", completed: true }).success, true);
  assert.equal(progressSchema.safeParse({ contentType: "dsaQuestion", contentId: "507f1f77bcf86cd799439011", completed: true }).success, true);
  assert.equal(progressSchema.safeParse({ contentType: "admin", contentId: "507f1f77bcf86cd799439011", completed: true }).success, false);
  assert.equal(progressSchema.safeParse({ contentType: "dsa_problem", contentId: "507f1f77bcf86cd799439011", completed: true }).success, false);
  assert.equal(progressSchema.safeParse({ contentType: "lesson", contentId: "not-an-id", completed: true }).success, false);
});

test("DSA sheet questions require a topic and a valid problem URL", () => {
  const question = dsaQuestionSchema.parse({
    topicId: "507f1f77bcf86cd799439011",
    title: "Two Sum",
    url: "https://leetcode.com/problems/two-sum/"
  });
  assert.equal(question.url, "https://leetcode.com/problems/two-sum/");
  assert.equal(dsaQuestionSchema.safeParse({ topicId: "507f1f77bcf86cd799439011", title: "Broken", url: "javascript:alert(1)" }).success, false);
});

test("courses can be created dynamically and lessons require the expected content", () => {
  const course = roadmapSchema.parse({ title: "Python Foundations" });
  assert.equal(course.type, "course");
  assert.equal(roadmapSchema.safeParse({ title: "Unknown type", type: "other" }).success, false);
  const lesson = lessonSchema.parse({
    topicId: "507f1f77bcf86cd799439011",
    title: "Python variables",
    description: "Learn the basics.",
    youtubeUrl: "https://www.youtube.com/watch?v=UB1O30fR-EE",
    problemUrl: "https://leetcode.com/problems/two-sum/",
    duration: "8 min"
  });
  assert.equal(lesson.problemUrl, "https://leetcode.com/problems/two-sum/");
});

test("localhost Vite dev ports are accepted for browser requests", async () => {
  const allowed = await request(app).options("/api/auth/login").set("Origin", "http://localhost:5174").set("Access-Control-Request-Method", "POST");
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers["access-control-allow-origin"], "http://localhost:5174");
});

test("slug generation and YouTube normalization are safe", () => {
  assert.equal(slugify("Find Second Largest Element"), "find-second-largest-element");
  assert.equal(youtubeIdFromUrl("https://www.youtube.com/watch?v=UB1O30fR-EE"), "UB1O30fR-EE");
  assert.equal(youtubeIdFromUrl("https://youtu.be/UB1O30fR-EE"), "UB1O30fR-EE");
  assert.equal(youtubeIdFromUrl("https://example.com/watch?v=UB1O30fR-EE"), "");
});
