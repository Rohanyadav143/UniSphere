import { Router } from "express";
import { adminOverview, adminUserProgress, createAdminContent, deleteAdminContent, deleteAdminUser, listAdminContent, listAdminUsers, reorderAdminContent, setAdminUserBlocked, updateAdminContent } from "../controllers/adminController.js";
import { authenticateUser, requireAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { dsaQuestionSchema, lessonSchema, reorderSchema, roadmapSchema, topicSchema, userBlockSchema } from "../validators/schemas.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();
router.use(authenticateUser, requireAdmin);
router.get("/overview", asyncHandler(adminOverview));
router.get("/users", asyncHandler(listAdminUsers));
router.get("/users/:id/progress", asyncHandler(adminUserProgress));
router.patch("/users/:id/block", validate(userBlockSchema), asyncHandler(setAdminUserBlocked));
router.delete("/users/:id", asyncHandler(deleteAdminUser));

const schemas = {
  roadmaps: roadmapSchema,
  topics: topicSchema,
  lessons: lessonSchema,
  "dsa-questions": dsaQuestionSchema
};

router.get("/:type", asyncHandler(listAdminContent));
router.post("/:type", (request, response, next) => {
  const schema = schemas[request.params.type];
  if (!schema) return next();
  return validate(schema)(request, response, next);
}, asyncHandler(createAdminContent));
router.patch("/:type/:id", (request, response, next) => {
  const schema = schemas[request.params.type];
  if (!schema) return next();
  return validate(schema.partial())(request, response, next);
}, asyncHandler(updateAdminContent));
router.patch("/:type/:id/reorder", validate(reorderSchema), asyncHandler(reorderAdminContent));
router.delete("/:type/:id", asyncHandler(deleteAdminContent));

export default router;
