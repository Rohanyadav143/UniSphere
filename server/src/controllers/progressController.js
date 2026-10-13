import Progress from "../models/Progress.js";
import Lesson from "../models/Lesson.js";
import Topic from "../models/Topic.js";
import Roadmap from "../models/Roadmap.js";
import DsaQuestion from "../models/DsaQuestion.js";
import { ApiError } from "../middleware/errors.js";

export async function listProgress(request, response) {
  const rows = await Progress.find({ userId: request.user._id, completed: true })
    .sort({ completedAt: -1 }).limit(2000).lean();
  response.json({
    success: true,
    data: rows.map(row => ({ contentType: row.contentType, contentId: row.contentId.toString(), completedAt: row.completedAt }))
  });
}

export async function setProgress(request, response) {
  const { contentType, contentId, completed } = request.body;
  if (completed) {
    const content = contentType === "lesson"
      ? await Lesson.findOne({ _id: contentId, isPublished: true }).select("_id")
      : await DsaQuestion.findOne({ _id: contentId, isPublished: true })
        .populate({ path: "topicId", populate: { path: "roadmapId", select: "type" } });
    if (!content) throw new ApiError(404, "Learning content not found.");
    if (contentType === "dsaQuestion" && content.topicId?.roadmapId?.type !== "dsa") throw new ApiError(404, "DSA question not found.");
    const result = await Progress.findOneAndUpdate(
      { userId: request.user._id, contentType, contentId },
      { $set: { completed: true, completedAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    response.json({ success: true, data: { contentType, contentId, completed: true, completedAt: result.completedAt } });
  } else {
    await Progress.deleteOne({ userId: request.user._id, contentType, contentId });
    response.json({ success: true, data: { contentType, contentId, completed: false, completedAt: null } });
  }
}

export async function removeProgress(request, response) {
  const { contentType, contentId } = request.body;
  await Progress.deleteOne({ userId: request.user._id, contentType, contentId });
  response.json({ success: true, data: { contentType, contentId, completed: false, completedAt: null } });
}

export async function syncProgress(request, response) {
  const operations = [];
  for (const entry of [...new Set(request.body.items)]) {
    const separator = entry.indexOf(":");
    const contentType = entry.slice(0, separator);
    const contentId = entry.slice(separator + 1);
    const content = contentType === "lesson"
      ? await Lesson.exists({ _id: contentId, isPublished: true })
      : await DsaQuestion.findOne({ _id: contentId, isPublished: true })
        .populate({ path: "topicId", populate: { path: "roadmapId", select: "type" } }).select("_id topicId").lean();
    if (content && (contentType !== "dsaQuestion" || content.topicId?.roadmapId?.type === "dsa")) {
      operations.push({
        updateOne: {
          filter: { userId: request.user._id, contentType, contentId },
          update: { $setOnInsert: { completed: true, completedAt: new Date() } },
          upsert: true
        }
      });
    }
  }
  if (operations.length) await Progress.bulkWrite(operations, { ordered: false });
  const rows = await Progress.find({ userId: request.user._id, completed: true }).select("contentType contentId completedAt").lean();
  response.json({ success: true, data: rows.map(row => ({ contentType: row.contentType, contentId: row.contentId.toString(), completedAt: row.completedAt })) });
}

export async function dashboard(request, response) {
  const [roadmaps, topics, lessons, questions, progress] = await Promise.all([
    Roadmap.find({ isPublished: true }).sort({ order: 1 }).lean(),
    Topic.find({ isPublished: true }).sort({ order: 1 }).populate({ path: "roadmapId", select: "title slug type pathType" }).lean(),
    Lesson.find({ isPublished: true }).sort({ order: 1 }).lean(),
    DsaQuestion.find({ isPublished: true }).sort({ order: 1 }).lean(),
    Progress.find({ userId: request.user._id, completed: true }).sort({ completedAt: -1 }).limit(2000).lean()
  ]);
  const completed = new Set(progress.map(row => `${row.contentType}:${row.contentId}`));
  const byType = Object.fromEntries(roadmaps.map(roadmap => [roadmap.slug, { total: 0, completed: 0 }]));
  const topicsById = new Map(topics.map(topic => [topic._id.toString(), topic]));
  const topicsByRoadmap = new Map(roadmaps.map(roadmap => [roadmap._id.toString(), []]));
  const lessonsByTopic = new Map();
  const questionsByTopic = new Map();
  for (const topic of topics) {
    const roadmapId = topic.roadmapId?._id.toString();
    if (roadmapId && topicsByRoadmap.has(roadmapId)) topicsByRoadmap.get(roadmapId).push(topic);
  }
  for (const lesson of lessons) {
    const topicId = lesson.topicId.toString();
    const topic = topicsById.get(topicId);
    const roadmapSlug = topic?.roadmapId?.slug;
    if (!roadmapSlug || !byType[roadmapSlug]) continue;
    byType[roadmapSlug].total++;
    if (completed.has(`lesson:${lesson._id}`)) byType[roadmapSlug].completed++;
    if (!lessonsByTopic.has(topicId)) lessonsByTopic.set(topicId, []);
    lessonsByTopic.get(topicId).push(lesson);
  }
  for (const question of questions) {
    const topicId = question.topicId.toString();
    const topic = topicsById.get(topicId);
    const roadmapSlug = topic?.roadmapId?.slug;
    if (!topic || topic.roadmapId?.type !== "dsa" || !roadmapSlug || !byType[roadmapSlug]) continue;
    byType[roadmapSlug].total++;
    if (completed.has(`dsaQuestion:${question._id}`)) byType[roadmapSlug].completed++;
    if (!questionsByTopic.has(topicId)) questionsByTopic.set(topicId, []);
    questionsByTopic.get(topicId).push(question);
  }
  for (const value of Object.values(byType)) value.percentage = value.total ? Math.round(value.completed / value.total * 100) : 0;
  const roadmapProgress = roadmaps.map(roadmap => ({
    _id: roadmap._id,
    title: roadmap.title,
    slug: roadmap.slug,
    type: roadmap.type,
    progress: byType[roadmap.slug]
  }));

  const orderedContent = roadmaps.flatMap(roadmap => (topicsByRoadmap.get(roadmap._id.toString()) || []).flatMap(topic => {
    const lessons = (lessonsByTopic.get(topic._id.toString()) || []).map(item => ({
      id: item._id.toString(),
      contentType: "lesson",
      title: item.title,
      slug: item.slug,
      topic: topic.title,
      topicSlug: topic.slug,
      roadmap: roadmap.title,
      roadmapSlug: roadmap.slug,
      completed: completed.has(`lesson:${item._id}`)
    }));
    const dsaQuestions = roadmap.type === "dsa" ? (questionsByTopic.get(topic._id.toString()) || []).map(item => ({
      id: item._id.toString(),
      contentType: "dsaQuestion",
      title: item.title,
      topic: topic.title,
      topicSlug: topic.slug,
      roadmap: roadmap.title,
      roadmapSlug: roadmap.slug,
      url: item.url,
      completed: completed.has(`dsaQuestion:${item._id}`)
    })) : [];
    return [...lessons, ...dsaQuestions];
  }));
  const recentlyCompleted = progress.slice(0, 8).map(row => {
    if (row.contentType === "dsaQuestion") {
      const question = questions.find(item => item._id.equals(row.contentId));
      const topic = question && topicsById.get(question.topicId.toString());
      const roadmap = topic && roadmaps.find(item => item._id.equals(topic.roadmapId?._id));
      return question && topic && roadmap ? {
        title: question.title,
        slug: question.slug,
        topic: topic.title,
        topicSlug: topic.slug,
        roadmap: roadmap.title,
        roadmapSlug: roadmap.slug,
        contentType: row.contentType,
        completedAt: row.completedAt,
        url: question.url
      } : null;
    }
    const content = lessons.find(item => item._id.equals(row.contentId));
    const topic = content && topicsById.get(content.topicId.toString());
    const roadmap = topic && roadmaps.find(item => item._id.equals(topic.roadmapId._id));
    return content && topic && roadmap ? {
      title: content.title,
      slug: content.slug,
      topic: topic.title,
      topicSlug: topic.slug,
      roadmap: roadmap.title,
      roadmapSlug: roadmap.slug,
      contentType: row.contentType,
      completedAt: row.completedAt
    } : null;
  }).filter(Boolean);
  const continueItems = {};
  for (const roadmap of roadmaps) {
    continueItems[roadmap.slug] = orderedContent.find(item => item.roadmapSlug === roadmap.slug && !item.completed) || null;
  }
  response.json({
    success: true,
    data: {
      roadmaps: roadmapProgress,
      progress: byType,
      totalCompleted: progress.length,
      recentlyCompleted,
      continueLearning: continueItems
    }
  });
}
