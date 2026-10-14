import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Progress from "../models/Progress.js";
import Lesson from "../models/Lesson.js";
import DsaQuestion from "../models/DsaQuestion.js";
import { ApiError } from "../middleware/errors.js";

const publicUser = user => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar,
  createdAt: user.createdAt
});

function cookieOptions() {
  const sameSite = process.env.COOKIE_SAME_SITE || "lax";
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite,
    path: "/",
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
    maxAge: 7 * 24 * 60 * 60 * 1000
  };
}

function issueCookie(response, user) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters.");
  }
  const token = jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: "7d", issuer: "unisphere-api" });
  response.cookie("unisphere_session", token, cookieOptions());
}

async function synchronizeProgress(userId, entries = []) {
  const operations = [];
  for (const entry of [...new Set(entries)]) {
    const split = entry.indexOf(":");
    const contentType = entry.slice(0, split);
    const contentId = entry.slice(split + 1);
    const content = contentType === "lesson"
      ? await Lesson.exists({ _id: contentId, isPublished: true })
      : await DsaQuestion.findOne({ _id: contentId, isPublished: true })
        .populate({ path: "topicId", populate: { path: "roadmapId", select: "type" } }).select("_id topicId").lean();
    if (!content || (contentType === "dsaQuestion" && content.topicId?.roadmapId?.type !== "dsa")) continue;
    operations.push({
      updateOne: {
        filter: { userId, contentType, contentId },
        update: { $setOnInsert: { completed: true, completedAt: new Date() } },
        upsert: true
      }
    });
  }
  if (operations.length) await Progress.bulkWrite(operations, { ordered: false });
}

export async function register(request, response) {
  const { name, email, password, guestProgress } = request.body;
  if (await User.exists({ email: email.toLowerCase() })) throw new ApiError(409, "An account with this email already exists.");
  const user = await User.create({ name, email, password, role: "student" });
  await synchronizeProgress(user._id, guestProgress);
  issueCookie(response, user);
  response.status(201).json({ success: true, data: { user: publicUser(user) } });
}

export async function login(request, response) {
  const { email, password, guestProgress } = request.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user || !(await user.verifyPassword(password))) throw new ApiError(401, "Email or password is incorrect.");
  if (user.isBlocked) throw new ApiError(403, "Your account has been blocked. Contact an administrator.");
  user.lastActiveAt = new Date();
  await user.save({ validateModifiedOnly: true });
  await synchronizeProgress(user._id, guestProgress);
  issueCookie(response, user);
  response.json({ success: true, data: { user: publicUser(user) } });
}

export async function logout(_request, response) {
  const sameSite = process.env.COOKIE_SAME_SITE || "lax";
  response.clearCookie("pathway_session", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite,
    path: "/",
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {})
  });
  response.clearCookie("unisphere_session", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite,
    path: "/",
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {})
  });
  response.json({ success: true, data: { message: "Signed out." } });
}

export function currentUser(request, response) {
  response.json({ success: true, data: { user: request.user ? publicUser(request.user) : null } });
}

export async function updateProfile(request, response) {
  const user = await User.findByIdAndUpdate(request.user._id, request.body, { new: true, runValidators: true })
    .select("_id name email role avatar createdAt");
  response.json({ success: true, data: { user: publicUser(user) } });
}
