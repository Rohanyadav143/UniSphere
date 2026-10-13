import mongoose from "mongoose";

const topicSchema = new mongoose.Schema({
  roadmapId: { type: mongoose.Schema.Types.ObjectId, ref: "Roadmap", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  slug: { type: String, required: true, lowercase: true },
  description: { type: String, default: "", maxlength: 1000 },
  order: { type: Number, default: 0 },
  isPublished: { type: Boolean, default: true }
}, { timestamps: true, versionKey: false });
topicSchema.index({ roadmapId: 1, slug: 1 }, { unique: true });
topicSchema.index({ roadmapId: 1, order: 1 });
topicSchema.index({ title: "text", description: "text" });

export default mongoose.model("Topic", topicSchema);
