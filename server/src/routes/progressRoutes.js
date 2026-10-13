import { Router } from "express";
import { dashboard, listProgress, removeProgress, setProgress, syncProgress } from "../controllers/progressController.js";
import { authenticateUser } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { progressSchema, syncSchema } from "../validators/schemas.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();
router.use(authenticateUser);
router.get("/", asyncHandler(listProgress));
router.post("/", validate(progressSchema), asyncHandler(setProgress));
router.post("/sync", validate(syncSchema), asyncHandler(syncProgress));
router.patch("/:contentId", (request, _response, next) => {
  request.body = { ...request.body, contentId: request.params.contentId };
  next();
}, validate(progressSchema), asyncHandler(setProgress));
router.delete("/:contentId", (request, _response, next) => {
  request.body = { ...request.body, contentId: request.params.contentId };
  next();
}, validate(progressSchema.omit({ completed: true })), asyncHandler(removeProgress));
router.get("/dashboard", asyncHandler(dashboard));

export default router;
