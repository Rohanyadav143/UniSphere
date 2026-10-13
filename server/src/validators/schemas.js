import { z } from "zod";
const progressType = z.enum(["lesson", "dsaQuestion"]);

const slug = z.string().trim().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i).optional();
const httpUrl = max => z.string().trim().max(max).url().refine(value => {
  try { return ["http:", "https:"].includes(new URL(value).protocol); }
  catch { return false; }
});
const youtubeUrl = httpUrl(500).or(z.literal("")).optional();
const url = httpUrl(1000).or(z.literal("")).optional();

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(10).max(128),
  guestProgress: z.array(z.string().regex(/^(?:lesson|dsaQuestion):[a-f\d]{24}$/i)).max(1000).optional()
});
export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
  guestProgress: z.array(z.string().regex(/^(?:lesson|dsaQuestion):[a-f\d]{24}$/i)).max(1000).optional()
});
export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  avatar: httpUrl(500).or(z.literal("")).optional()
});
export const progressSchema = z.object({
  contentType: progressType,
  contentId: z.string().regex(/^[a-f\d]{24}$/i),
  completed: z.boolean()
});
export const syncSchema = z.object({
  items: z.array(z.string().regex(/^(?:lesson|dsaQuestion):[a-f\d]{24}$/i)).max(1000)
});
export const reorderSchema = z.object({ direction: z.enum(["up", "down"]) });
export const userBlockSchema = z.object({ isBlocked: z.boolean() });
export const roadmapSchema = z.object({
  title: z.string().trim().min(2).max(100),
  slug,
  type: z.enum(["mern", "dsa", "course"]).default("course"),
  pathType: z.string().trim().max(50).optional(),
  description: z.string().trim().max(500).optional(),
  order: z.number().int().min(0).max(10000).optional(),
  isPublished: z.boolean().optional()
});
export const topicSchema = z.object({
  roadmapId: z.string().regex(/^[a-f\d]{24}$/i),
  title: z.string().trim().min(1).max(120),
  slug,
  description: z.string().trim().max(1000).optional(),
  order: z.number().int().min(0).max(10000).optional(),
  isPublished: z.boolean().optional()
});
export const lessonSchema = z.object({
  topicId: z.string().regex(/^[a-f\d]{24}$/i),
  title: z.string().trim().min(1).max(160),
  slug,
  description: z.string().trim().max(4000).optional(),
  youtubeUrl,
  problemUrl: url,
  duration: z.string().trim().max(30).optional(),
  concepts: z.array(z.string().trim().min(1).max(100)).max(20).optional(),
  order: z.number().int().min(0).max(10000).optional(),
  isPublished: z.boolean().optional()
});
export const dsaQuestionSchema = z.object({
  topicId: z.string().regex(/^[a-f\d]{24}$/i),
  title: z.string().trim().min(1).max(160),
  slug,
  url: httpUrl(1000),
  order: z.number().int().min(0).max(10000).optional(),
  isPublished: z.boolean().optional()
});
