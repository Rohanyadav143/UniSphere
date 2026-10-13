import mongoose from "mongoose";

const progressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  contentType: { type: String, required: true, enum: ["lesson", "dsaQuestion"] },
  contentId: { type: mongoose.Schema.Types.ObjectId, required: true },
  completed: { type: Boolean, default: true },
  completedAt: { type: Date, default: Date.now }
}, { timestamps: true, versionKey: false });
progressSchema.index({ userId: 1, contentType: 1, contentId: 1 }, { unique: true });
progressSchema.index({ userId: 1, completedAt: -1 });

export default mongoose.model("Progress", progressSchema);
