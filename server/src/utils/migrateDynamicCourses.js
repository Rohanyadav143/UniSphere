import "dotenv/config";
import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";

await connectDatabase();
try {
  const collection = mongoose.connection.db.collection("roadmaps");
  const indexes = await collection.listIndexes().toArray();
  const uniqueTypeIndex = indexes.find(index => index.unique && index.key?.type === 1);
  if (uniqueTypeIndex) {
    await collection.dropIndex(uniqueTypeIndex.name);
    console.log(`Removed legacy unique course-type index: ${uniqueTypeIndex.name}`);
  } else {
    console.log("No legacy unique course-type index found.");
  }
} finally {
  await mongoose.disconnect();
}
