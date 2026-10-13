import Roadmap from "../models/Roadmap.js";
import Topic from "../models/Topic.js";
import Lesson from "../models/Lesson.js";
import DsaQuestion from "../models/DsaQuestion.js";
import Progress from "../models/Progress.js";
import { ApiError } from "../middleware/errors.js";

export async function listRoadmaps(request, response) {
  const roadmaps = await Roadmap.find({ isPublished: true }).sort({ order: 1, title: 1 }).lean();
  const data = await Promise.all(roadmaps.map(async roadmap => {
    const topics = await Topic.find({ roadmapId: roadmap._id, isPublished: true }).sort({ order: 1 }).lean();
    const grouped = await Lesson.aggregate([
      { $match: { topicId: { $in: topics.map(topic => topic._id) }, isPublished: true } },
      { $group: { _id: "$topicId", count: { $sum: 1 }, itemIds: { $push: "$_id" } } }
    ]);
    const questionGroups = roadmap.type === "dsa" ? await DsaQuestion.aggregate([
      { $match: { topicId: { $in: topics.map(topic => topic._id) }, isPublished: true } },
      { $group: { _id: "$topicId", count: { $sum: 1 }, itemIds: { $push: "$_id" } } }
    ]) : [];
    const completedIds = request.user
      ? new Set((await Progress.find({ userId: request.user._id, contentType: { $in: ["lesson", "dsaQuestion"] }, completed: true }).select("contentType contentId").lean()).map(item => `${item.contentType}:${item.contentId}`))
      : new Set();
    const countMap = new Map(grouped.map(group => [group._id.toString(), group]));
    const questionMap = new Map(questionGroups.map(group => [group._id.toString(), group]));
    const mappedTopics = topics.map(topic => {
      const group = countMap.get(topic._id.toString());
      const itemIds = (group?.itemIds || []).map(id => id.toString());
      const questionGroup = questionMap.get(topic._id.toString());
      const questionIds = (questionGroup?.itemIds || []).map(id => id.toString());
      return {
        ...topic,
        itemCount: (group?.count || 0) + questionIds.length,
        itemIds,
        questionIds,
        completedCount: itemIds.filter(id => completedIds.has(`lesson:${id}`)).length + questionIds.filter(id => completedIds.has(`dsaQuestion:${id}`)).length
      };
    });
    const total = mappedTopics.reduce((sum, topic) => sum + topic.itemCount, 0);
    const completed = mappedTopics.reduce((sum, topic) => sum + topic.completedCount, 0);
    return { ...roadmap, topics: mappedTopics, progress: { completed, total, percentage: total ? Math.round(completed / total * 100) : 0 } };
  }));
  response.json({ success: true, data });
}

export async function getRoadmap(request, response) {
  const roadmap = await Roadmap.findOne({ slug: request.params.slug, isPublished: true }).lean();
  if (!roadmap) throw new ApiError(404, "Roadmap not found.");
  const topics = await Topic.find({ roadmapId: roadmap._id, isPublished: true }).sort({ order: 1 }).lean();
  const grouped = await Lesson.aggregate([
    { $match: { topicId: { $in: topics.map(topic => topic._id) }, isPublished: true } },
    { $group: { _id: "$topicId", count: { $sum: 1 }, itemIds: { $push: "$_id" } } }
  ]);
  const questionGroups = roadmap.type === "dsa" ? await DsaQuestion.aggregate([
    { $match: { topicId: { $in: topics.map(topic => topic._id) }, isPublished: true } },
    { $group: { _id: "$topicId", count: { $sum: 1 }, itemIds: { $push: "$_id" } } }
  ]) : [];
  const completedIds = request.user
    ? new Set((await Progress.find({ userId: request.user._id, contentType: { $in: ["lesson", "dsaQuestion"] }, completed: true }).select("contentType contentId").lean()).map(item => `${item.contentType}:${item.contentId}`))
    : new Set();
  const countMap = new Map(grouped.map(group => [group._id.toString(), group]));
  const questionMap = new Map(questionGroups.map(group => [group._id.toString(), group]));
  const mappedTopics = topics.map(topic => {
    const group = countMap.get(topic._id.toString());
    const itemIds = (group?.itemIds || []).map(id => id.toString());
    const questionIds = (questionMap.get(topic._id.toString())?.itemIds || []).map(id => id.toString());
    return {
      ...topic,
      itemCount: (group?.count || 0) + questionIds.length,
      itemIds,
      questionIds,
      completedCount: itemIds.filter(id => completedIds.has(`lesson:${id}`)).length + questionIds.filter(id => completedIds.has(`dsaQuestion:${id}`)).length
    };
  });
  const total = mappedTopics.reduce((sum, topic) => sum + topic.itemCount, 0);
  const completed = mappedTopics.reduce((sum, topic) => sum + topic.completedCount, 0);
  response.json({ success: true, data: { ...roadmap, topics: mappedTopics, progress: { completed, total, percentage: total ? Math.round(completed / total * 100) : 0 } } });
}

export async function getTopic(request, response) {
  const query = { slug: request.params.slug, isPublished: true };
  if (request.query.roadmap) {
    const roadmap = await Roadmap.findOne({ slug: request.query.roadmap, isPublished: true });
    if (!roadmap) throw new ApiError(404, "Roadmap not found.");
    query.roadmapId = roadmap._id;
  }
  const topic = await Topic.findOne(query).populate({ path: "roadmapId", select: "title slug type" }).lean();
  if (!topic) throw new ApiError(404, "Topic not found.");
  const items = await Lesson.find({ topicId: topic._id, isPublished: true }).sort({ order: 1, _id: 1 }).lean();
  const questions = topic.roadmapId.type === "dsa"
    ? await DsaQuestion.find({ topicId: topic._id, isPublished: true }).sort({ order: 1, _id: 1 }).lean()
    : [];
  const [lessonProgress, questionProgress] = request.user ? await Promise.all([
    Progress.find({ userId: request.user._id, contentType: "lesson", contentId: { $in: items.map(item => item._id) }, completed: true }).select("contentId completedAt").lean(),
    Progress.find({ userId: request.user._id, contentType: "dsaQuestion", contentId: { $in: questions.map(item => item._id) }, completed: true }).select("contentId completedAt").lean()
  ]) : [[], []];
  const lessonProgressMap = new Map(lessonProgress.map(item => [item.contentId.toString(), item]));
  const questionProgressMap = new Map(questionProgress.map(item => [item.contentId.toString(), item]));
  const completedCount = lessonProgress.length + questionProgress.length;
  const totalCount = items.length + questions.length;
  response.json({
    success: true,
    data: {
      ...topic,
      roadmap: topic.roadmapId,
      items: items.map(item => ({ ...item, completed: Boolean(lessonProgressMap.get(item._id.toString())), completedAt: lessonProgressMap.get(item._id.toString())?.completedAt || null })),
      questions: questions.map(item => ({ ...item, completed: Boolean(questionProgressMap.get(item._id.toString())), completedAt: questionProgressMap.get(item._id.toString())?.completedAt || null })),
      progress: { completed: completedCount, total: totalCount, percentage: totalCount ? Math.round(completedCount / totalCount * 100) : 0 }
    }
  });
}

export async function getLesson(request, response) {
  const query = { slug: request.params.slug, isPublished: true };
  if (request.params.topicSlug) {
    const topic = await Topic.findOne({ slug: request.params.topicSlug, isPublished: true }).select("_id");
    if (!topic) throw new ApiError(404, "Lesson not found.");
    query.topicId = topic._id;
  }
  const lesson = await Lesson.findOne(query)
    .populate({ path: "topicId", populate: { path: "roadmapId", select: "title slug type" } }).lean();
  if (!lesson) throw new ApiError(404, "Lesson not found.");
  const lessons = await Lesson.find({ topicId: lesson.topicId._id, isPublished: true }).sort({ order: 1, _id: 1 }).select("_id title slug duration order").lean();
  const index = lessons.findIndex(item => item._id.equals(lesson._id));
  const progress = request.user ? await Progress.findOne({ userId: request.user._id, contentType: "lesson", contentId: lesson._id }) : null;
  response.json({
    success: true,
    data: {
      ...lesson,
      topic: { ...lesson.topicId, roadmap: lesson.topicId.roadmapId },
      completed: Boolean(progress),
      navigation: { previous: lessons[index - 1] || null, next: lessons[index + 1] || null, index: index + 1, total: lessons.length }
    }
  });
}

export async function search(request, response) {
  const q = String(request.query.q || "").trim().slice(0, 80);
  if (q.length < 2) return response.json({ success: true, data: [] });
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matcher = new RegExp(safe, "i");
  const textSearch = q.replace(/["\\]/g, " ").trim();
  const [topics, lessons] = await Promise.all([
    Topic.find({ isPublished: true, $text: { $search: textSearch } }).limit(8).populate({ path: "roadmapId", match: { isPublished: true }, select: "title slug type" }).lean(),
    Lesson.find({ isPublished: true, $text: { $search: textSearch } }).limit(8).populate({ path: "topicId", match: { isPublished: true }, populate: { path: "roadmapId", match: { isPublished: true }, select: "title slug type" } }).lean()
  ]);
  const [matchingTopics, matchingLessons] = await Promise.all([
    topics.length ? topics : Topic.find({ isPublished: true, title: matcher }).limit(8).populate({ path: "roadmapId", match: { isPublished: true }, select: "title slug type" }).lean(),
    lessons.length ? lessons : Lesson.find({ isPublished: true, $or: [{ title: matcher }, { description: matcher }] }).limit(8).populate({ path: "topicId", match: { isPublished: true }, populate: { path: "roadmapId", match: { isPublished: true }, select: "title slug type" } }).lean()
  ]);
  const data = [
    ...matchingTopics.filter(item => item.roadmapId).map(item => ({ id: item._id, title: item.title, detail: `${item.roadmapId.title} / Topic`, href: `/${item.roadmapId.slug}/${item.slug}`, kind: "topic" })),
    ...matchingLessons.filter(item => item.topicId?.roadmapId).map(item => ({ id: item._id, title: item.title, detail: `${item.topicId.roadmapId.title} / ${item.topicId.title}`, href: `/${item.topicId.roadmapId.slug}/${item.topicId.slug}/${item.slug}`, kind: "lesson" }))
  ].slice(0, 20);
  response.json({ success: true, data });
}
