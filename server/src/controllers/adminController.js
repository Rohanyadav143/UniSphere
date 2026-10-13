import mongoose from "mongoose";
import Roadmap from "../models/Roadmap.js";
import Topic from "../models/Topic.js";
import Lesson from "../models/Lesson.js";
import DsaQuestion from "../models/DsaQuestion.js";
import Progress from "../models/Progress.js";
import User from "../models/User.js";
import { slugify } from "../utils/slug.js";
import { youtubeIdFromUrl } from "../utils/youtube.js";
import { ApiError } from "../middleware/errors.js";

const models = { roadmaps: Roadmap, topics: Topic, lessons: Lesson, "dsa-questions": DsaQuestion };

function documentData(type, body) {
  const data = { ...body };
  delete data._id;
  delete data.createdAt;
  delete data.updatedAt;
  if (data.title && !data.slug) data.slug = slugify(data.title);
  if (type === "roadmaps" && !["mern", "dsa"].includes(data.type)) data.type = "course";
  if (type === "lessons") {
    data.youtubeVideoId = youtubeIdFromUrl(data.youtubeUrl);
    if (data.youtubeUrl && !data.youtubeVideoId) throw new ApiError(400, "Enter a valid YouTube video URL.");
  }
  if (type === "dsa-questions" && data.url) {
    let parsed;
    try { parsed = new URL(data.url); } catch { throw new ApiError(400, "Enter a valid DSA question URL."); }
    if (!["http:", "https:"].includes(parsed.protocol)) throw new ApiError(400, "Enter a valid DSA question URL.");
  }
  return data;
}

async function ensureRelations(type, data, requireLecture = false) {
  if (type === "topics" && !(await Roadmap.exists({ _id: data.roadmapId }))) throw new ApiError(400, "Choose a valid roadmap.");
  if (type === "lessons") {
    const topic = await Topic.findById(data.topicId).populate({ path: "roadmapId", select: "type" });
    if (!topic) throw new ApiError(400, "Choose a valid topic.");
    if (!topic.roadmapId) throw new ApiError(400, "The selected topic is not linked to a course.");
    if (requireLecture && !data.description?.trim()) throw new ApiError(400, "Add a description for this lesson.");
    if (requireLecture && !data.duration?.trim()) throw new ApiError(400, "Add the lesson duration.");
    if (requireLecture && !data.youtubeUrl && !data.youtubeVideoId) throw new ApiError(400, "Add a YouTube lecture URL for this lesson.");
    if (topic.roadmapId.type !== "dsa" && data.problemUrl) throw new ApiError(400, "Problem links can only be added to DSA lessons.");
  }
  if (type === "dsa-questions") {
    const topic = await Topic.findById(data.topicId).populate({ path: "roadmapId", select: "type" });
    if (!topic) throw new ApiError(400, "Choose a valid DSA topic.");
    if (topic.roadmapId?.type !== "dsa") throw new ApiError(400, "DSA questions can only be added to DSA topics.");
  }
}

function successData(type, doc) {
  return { type, item: doc };
}

export async function adminOverview(_request, response) {
  const [users, roadmaps, topicCounts, lessonCounts, questionCounts, videos, completedItems] = await Promise.all([
    User.countDocuments(),
    Roadmap.find().select("_id title slug type pathType order isPublished").sort({ order: 1, title: 1 }).lean(),
    Topic.aggregate([{ $group: { _id: "$roadmapId", count: { $sum: 1 } } }]),
    Lesson.aggregate([
      { $lookup: { from: Topic.collection.name, localField: "topicId", foreignField: "_id", as: "topic" } },
      { $unwind: "$topic" },
      { $group: { _id: "$topic.roadmapId", count: { $sum: 1 } } }
    ]),
    DsaQuestion.aggregate([
      { $lookup: { from: Topic.collection.name, localField: "topicId", foreignField: "_id", as: "topic" } },
      { $unwind: "$topic" },
      { $group: { _id: "$topic.roadmapId", count: { $sum: 1 } } }
    ]),
    Lesson.countDocuments({ youtubeVideoId: { $ne: "" } }),
    Progress.countDocuments({ completed: true })
  ]);
  const topicCountByRoadmap = new Map(topicCounts.map(({ _id, count }) => [_id.toString(), count]));
  const lessonCountByRoadmap = new Map(lessonCounts.map(({ _id, count }) => [_id.toString(), count]));
  const questionCountByRoadmap = new Map(questionCounts.map(({ _id, count }) => [_id.toString(), count]));
  const courses = roadmaps.map(roadmap => {
    return {
      ...roadmap,
      topicCount: topicCountByRoadmap.get(roadmap._id.toString()) || 0,
      lessonCount: lessonCountByRoadmap.get(roadmap._id.toString()) || 0,
      questionCount: questionCountByRoadmap.get(roadmap._id.toString()) || 0
    };
  });
  response.json({ success: true, data: { users, courses, videos, completedItems } });
}

export async function listAdminUsers(request, response) {
  const page = Math.max(1, Number.parseInt(request.query.page, 10) || 1);
  const limit = Math.min(100, Number.parseInt(request.query.limit, 10) || 50);
  const [users, total] = await Promise.all([
    User.find().select("_id name email role isBlocked createdAt lastActiveAt").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments()
  ]);
  const counts = await Progress.aggregate([
    { $match: { completed: true, userId: { $in: users.map(user => user._id) } } },
    { $group: { _id: { userId: "$userId", type: "$contentType" }, count: { $sum: 1 } } }
  ]);
  const progressMap = new Map(counts.map(row => [`${row._id.userId}:${row._id.type}`, row.count]));
  response.json({
    success: true,
    data: {
      items: users.map(user => ({
        ...user,
        completedItems: (progressMap.get(`${user._id}:lesson`) || 0) + (progressMap.get(`${user._id}:dsaQuestion`) || 0)
      })),
      total,
      page,
      pages: Math.ceil(total / limit)
    }
  });
}

export async function setAdminUserBlocked(request, response) {
  if (!mongoose.isValidObjectId(request.params.id)) throw new ApiError(404, "Student account not found.");
  const user = await User.findOne({ _id: request.params.id, role: "student" });
  if (!user) throw new ApiError(404, "Student account not found.");
  user.isBlocked = request.body.isBlocked;
  await user.save({ validateModifiedOnly: true });
  response.json({ success: true, data: { id: user._id, isBlocked: user.isBlocked } });
}

export async function deleteAdminUser(request, response) {
  if (!mongoose.isValidObjectId(request.params.id)) throw new ApiError(404, "Student account not found.");
  const user = await User.findOne({ _id: request.params.id, role: "student" }).select("_id");
  if (!user) throw new ApiError(404, "Student account not found.");
  await Promise.all([
    Progress.deleteMany({ userId: user._id }),
    user.deleteOne()
  ]);
  response.json({ success: true, data: { id: user._id } });
}

export async function adminUserProgress(request, response) {
  const user = await User.findById(request.params.id).select("_id name email role createdAt");
  if (!user) throw new ApiError(404, "User not found.");
  const rows = await Progress.find({ userId: user._id, completed: true }).sort({ completedAt: -1 }).limit(1000).lean();
  response.json({ success: true, data: { user, progress: rows } });
}

export async function listAdminContent(request, response) {
  const Model = models[request.params.type];
  if (!Model) throw new ApiError(404, "Content type not found.");
  let query = {};
  let populate = "";
  if (request.params.type === "topics" && request.query.roadmapId) query.roadmapId = request.query.roadmapId;
  if (["lessons", "dsa-questions"].includes(request.params.type) && request.query.topicId) query.topicId = request.query.topicId;
  if (request.params.type === "topics") populate = "roadmapId";
  if (request.params.type === "lessons") {
    let cursor = Model.find(query).sort({ order: 1, createdAt: 1 })
      .populate({ path: "topicId", select: "title slug roadmapId", populate: { path: "roadmapId", select: "title slug type" } });
    return response.json({ success: true, data: await cursor.lean() });
  }
  if (request.params.type === "dsa-questions") {
    let cursor = Model.find(query).sort({ order: 1, createdAt: 1 })
      .populate({ path: "topicId", select: "title slug roadmapId", populate: { path: "roadmapId", select: "title slug type" } });
    return response.json({ success: true, data: await cursor.lean() });
  }
  let cursor = Model.find(query).sort({ order: 1, createdAt: 1 });
  if (populate) cursor = cursor.populate(populate, "title slug type pathType");
  response.json({ success: true, data: await cursor.lean() });
}

export async function createAdminContent(request, response) {
  const type = request.params.type;
  const Model = models[type];
  if (!Model) throw new ApiError(404, "Content type not found.");
  const data = documentData(type, request.body);
  await ensureRelations(type, data, type === "lessons");
  const doc = await Model.create(data);
  response.status(201).json({ success: true, data: successData(type, doc) });
}

export async function updateAdminContent(request, response) {
  const type = request.params.type;
  const Model = models[type];
  if (!Model) throw new ApiError(404, "Content type not found.");
  if (!mongoose.isValidObjectId(request.params.id)) throw new ApiError(404, "Content not found.");
  const existing = await Model.findById(request.params.id);
  if (!existing) throw new ApiError(404, "Content not found.");
  const data = documentData(type, { ...existing.toObject(), ...request.body });
  await ensureRelations(type, data);
  const doc = await Model.findByIdAndUpdate(request.params.id, { $set: data }, { new: true, runValidators: true });
  response.json({ success: true, data: successData(type, doc) });
}

export async function deleteAdminContent(request, response) {
  const type = request.params.type;
  const Model = models[type];
  if (!Model) throw new ApiError(404, "Content type not found.");
  const doc = await Model.findById(request.params.id);
  if (!doc) throw new ApiError(404, "Content not found.");
  if (type === "roadmaps") {
    const topics = await Topic.find({ roadmapId: doc._id }).select("_id");
    const topicIds = topics.map(topic => topic._id);
    const lessons = await Lesson.find({ topicId: { $in: topicIds } }).select("_id");
    const questions = await DsaQuestion.find({ topicId: { $in: topicIds } }).select("_id");
    await Promise.all([
      Progress.deleteMany({ contentId: { $in: lessons.map(item => item._id) }, contentType: "lesson" }),
      Progress.deleteMany({ contentId: { $in: questions.map(item => item._id) }, contentType: "dsaQuestion" }),
      Lesson.deleteMany({ topicId: { $in: topicIds } }),
      DsaQuestion.deleteMany({ topicId: { $in: topicIds } }),
      Topic.deleteMany({ roadmapId: doc._id })
    ]);
  } else if (type === "topics") {
    const lessons = await Lesson.find({ topicId: doc._id }).select("_id");
    const questions = await DsaQuestion.find({ topicId: doc._id }).select("_id");
    await Promise.all([
      Progress.deleteMany({ contentId: { $in: lessons.map(item => item._id) }, contentType: "lesson" }),
      Progress.deleteMany({ contentId: { $in: questions.map(item => item._id) }, contentType: "dsaQuestion" }),
      Lesson.deleteMany({ topicId: doc._id }),
      DsaQuestion.deleteMany({ topicId: doc._id })
    ]);
  } else if (type === "dsa-questions") {
    await Progress.deleteMany({ contentId: doc._id, contentType: "dsaQuestion" });
  } else {
    await Progress.deleteMany({ contentId: doc._id, contentType: "lesson" });
  }
  await doc.deleteOne();
  response.json({ success: true, data: { id: doc._id } });
}

export async function reorderAdminContent(request, response) {
  const type = request.params.type;
  const Model = models[type];
  if (!Model) throw new ApiError(404, "Content type not found.");
  const current = await Model.findById(request.params.id);
  if (!current) throw new ApiError(404, "Content not found.");
  const scopeField = type === "topics" ? "roadmapId" : ["lessons", "dsa-questions"].includes(type) ? "topicId" : null;
  const scope = scopeField ? { [scopeField]: current[scopeField] } : {};
  const siblings = await Model.find(scope).sort({ order: 1, createdAt: 1, _id: 1 });
  const index = siblings.findIndex(item => item._id.equals(current._id));
  const targetIndex = index + (request.body.direction === "up" ? -1 : 1);
  if (targetIndex < 0 || targetIndex >= siblings.length) {
    response.json({ success: true, data: { moved: false, item: current } });
    return;
  }
  [siblings[index], siblings[targetIndex]] = [siblings[targetIndex], siblings[index]];
  await Model.bulkWrite(siblings.map((item, order) => ({
    updateOne: { filter: { _id: item._id }, update: { $set: { order } } }
  })));
  response.json({ success: true, data: { moved: true } });
}
