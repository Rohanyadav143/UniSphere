import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import contentRoutes from "./routes/contentRoutes.js";
import progressRoutes from "./routes/progressRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { ApiError, errorHandler, notFound } from "./middleware/errors.js";

const app = express();
function normalizeOrigin(origin) {
  const url = new URL(origin);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("CLIENT_URL entries must use HTTP or HTTPS.");
  }
  return url.origin;
}

const configuredOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean)
  .map(normalizeOrigin);
const allowedOrigins = [...new Set([...configuredOrigins, "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"])];

function isAllowedOrigin(origin) {
  if (!origin) return true;
  try {
    const url = new URL(origin);
    if (allowedOrigins.includes(url.origin)) return true;
    const isLocalDevHost = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    const isViteDevPort = /^517\d*$/.test(url.port || "5173");
    return isLocalDevHost && isViteDevPort;
  } catch {
    return false;
  }
}

app.disable("x-powered-by");
app.set("trust proxy", process.env.NODE_ENV === "production" ? 1 : false);
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: process.env.NODE_ENV === "production" ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      frameSrc: ["https://www.youtube-nocookie.com", "https://www.youtube.com"],
      connectSrc: ["'self'", ...allowedOrigins]
    }
  } : false
}));
app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new ApiError(403, "Origin is not allowed by CORS."));
  },
  credentials: true
}));
app.use(express.json({ limit: "64kb" }));
app.use(cookieParser());
app.use((request, _response, next) => {
  const origin = request.get("origin");
  if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method) && origin && !isAllowedOrigin(origin)) {
    return next(new ApiError(403, "Request origin is not allowed."));
  }
  next();
});
app.get("/health", (_request, response) => response.json({ success: true, data: { status: "ok" } }));
app.use("/api/auth", authRoutes);
app.use("/api", contentRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/admin", adminRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
