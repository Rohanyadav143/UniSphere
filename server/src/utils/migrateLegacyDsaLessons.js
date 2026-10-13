import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import Lesson from "../models/Lesson.js";

await connectDatabase();
try {
  await Lesson.init();
  const database = mongoose.connection.db;
  const legacyCollection = database.collection("dsaproblems");
  const legacyItems = await legacyCollection.find({}).sort({ topicId: 1, order: 1 }).toArray();
  const lessonsCollection = database.collection(Lesson.collection.name);

  for (const item of legacyItems) {
    const existingSlug = await lessonsCollection.findOne({ topicId: item.topicId, slug: item.slug, _id: { $ne: item._id } }, { projection: { _id: 1 } });
    if (existingSlug) throw new Error(`Cannot migrate lesson "${item.slug}": that topic already has a lesson with this URL slug.`);
    const { difficulty, practiceUrl, practicePlatform, tags, ...legacyFields } = item;
    await lessonsCollection.updateOne(
      { _id: item._id },
      {
        $setOnInsert: {
          ...legacyFields,
          problemUrl: item.problemUrl || practiceUrl || "",
          duration: item.duration || "",
          concepts: item.concepts || [],
          createdAt: item.createdAt || new Date(),
          updatedAt: item.updatedAt || new Date()
        }
      },
      { upsert: true }
    );
  }

  const legacyIds = legacyItems.map(item => item._id);
  if (legacyIds.length) {
    const progressCollection = database.collection("progresses");
    const oldProgress = await progressCollection.find({ contentType: "dsa_problem", contentId: { $in: legacyIds } }).toArray();
    for (const progress of oldProgress) {
      const existing = await progressCollection.findOne({
        _id: { $ne: progress._id },
        userId: progress.userId,
        contentType: "lesson",
        contentId: progress.contentId
      });
      if (existing) {
        await progressCollection.updateOne({ _id: existing._id }, {
          $set: {
            completed: Boolean(existing.completed || progress.completed),
            completedAt: new Date(Math.max(new Date(existing.completedAt || 0).getTime(), new Date(progress.completedAt || 0).getTime()))
          }
        });
        await progressCollection.deleteOne({ _id: progress._id });
      } else {
        await progressCollection.updateOne({ _id: progress._id }, { $set: { contentType: "lesson" } });
      }
    }
    if (await progressCollection.countDocuments({ contentType: "dsa_problem" })) {
      throw new Error("Some legacy completion records could not be migrated; the old collection was kept.");
    }
  }

  const migratedCount = await lessonsCollection.countDocuments({ _id: { $in: legacyIds } });
  if (migratedCount !== legacyItems.length) throw new Error("Legacy lesson migration verification failed; the old collection was kept.");
  if (legacyItems.length) await legacyCollection.drop();
  console.log(JSON.stringify({ migratedLessons: migratedCount, migratedProgressRecords: legacyIds.length ? "verified" : 0, legacyCollectionRemoved: legacyItems.length > 0 }));
} finally {
  await mongoose.disconnect();
}
