import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { ApiError } from "./errors.js";

export async function authenticateUser(request, _response, next) {
  try {
    const token = request.cookies?.unisphere_session || request.cookies?.pathway_session;
    if (!token) throw new ApiError(401, "Please sign in to continue.");
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select("_id name email role avatar createdAt isBlocked");
    if (!user) throw new ApiError(401, "Please sign in to continue.");
    if (user.isBlocked) throw new ApiError(403, "Your account has been blocked. Contact an administrator.");
    request.user = user;
    next();
  } catch (error) {
    next(error instanceof ApiError ? error : new ApiError(401, "Please sign in to continue."));
  }
}

export function requireAdmin(request, _response, next) {
  if (request.user?.role !== "admin") return next(new ApiError(403, "Administrator access required."));
  next();
}

export function optionalUser(request, _response, next) {
  const token = request.cookies?.unisphere_session || request.cookies?.pathway_session;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    User.findById(payload.sub).select("_id name email role avatar createdAt isBlocked")
      .then(user => { request.user = user && !user.isBlocked ? user : null; next(); })
      .catch(next);
  } catch {
    next();
  }
}
