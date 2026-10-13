import "dotenv/config";
import app from "./app.js";
import { connectDatabase } from "./config/database.js";

const port = Number(process.env.PORT) || 4000;

try {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters.");
  }
  if (process.env.NODE_ENV === "production" && !process.env.CLIENT_URL) {
    throw new Error("CLIENT_URL must be configured in production.");
  }
  await connectDatabase();
  app.listen(port, "0.0.0.0", () => console.log(`UniSphere API listening on port ${port}`));
} catch (error) {
  console.error("Unable to start UniSphere API:", error.message);
  process.exitCode = 1;
}
