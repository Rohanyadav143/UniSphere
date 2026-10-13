import { Router } from "express";
import rateLimit from "express-rate-limit";
import { currentUser, login, logout, register, updateProfile } from "../controllers/authController.js";
import { authenticateUser, optionalUser } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { loginSchema, profileSchema, registerSchema } from "../validators/schemas.js";

const router = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Too many sign-in attempts. Please try again in a few minutes." }
});

router.post("/register", authLimiter, validate(registerSchema), asyncHandler(register));
router.post("/login", authLimiter, validate(loginSchema), asyncHandler(login));
router.post("/logout", asyncHandler(logout));
router.get("/me", optionalUser, currentUser);
router.patch("/profile", authenticateUser, validate(profileSchema), asyncHandler(updateProfile));

export default router;
