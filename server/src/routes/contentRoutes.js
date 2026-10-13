import { Router } from "express";
import { getLesson, getRoadmap, getTopic, listRoadmaps, search } from "../controllers/contentController.js";
import { optionalUser } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();
router.get("/roadmaps", optionalUser, asyncHandler(listRoadmaps));
router.get("/roadmaps/:slug", optionalUser, asyncHandler(getRoadmap));
router.get("/topics/:slug", optionalUser, asyncHandler(getTopic));
router.get("/lessons/:topicSlug/:slug", optionalUser, asyncHandler(getLesson));
router.get("/lessons/:slug", optionalUser, asyncHandler(getLesson));
router.get("/search", asyncHandler(search));

export default router;
