import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema({
  topicId: { type: mongoose.Schema.Types.ObjectId, ref: "Topic", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  slug: { type: String, required: true, lowercase: true },
  description: { type: String, default: "", maxlength: 4000 },
  youtubeUrl: { type: String, default: "", maxlength: 500 },
  youtubeVideoId: { type: String, default: "" },
  problemUrl: { type: String, default: "", maxlength: 1000 },
  duration: { type: String, default: "", maxlength: 30 },
  concepts: { type: [String], default: [] },
  order: { type: Number, default: 0 },
  isPublished: { type: Boolean, default: true }
}, { timestamps: true, versionKey: false });
lessonSchema.index({ topicId: 1, slug: 1 }, { unique: true });
lessonSchema.index({ topicId: 1, order: 1 });
lessonSchema.index({ title: "text", description: "text" });

export default mongoose.model("Lesson", lessonSchema);
