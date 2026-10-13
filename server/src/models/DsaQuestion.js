import mongoose from "mongoose";

const dsaQuestionSchema = new mongoose.Schema({
  topicId: { type: mongoose.Schema.Types.ObjectId, ref: "Topic", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  slug: { type: String, required: true, lowercase: true },
  url: { type: String, required: true, trim: true, maxlength: 1000 },
  order: { type: Number, default: 0 },
  isPublished: { type: Boolean, default: true }
}, { timestamps: true, versionKey: false });
dsaQuestionSchema.index({ topicId: 1, slug: 1 }, { unique: true });
dsaQuestionSchema.index({ topicId: 1, order: 1 });

export default mongoose.model("DsaQuestion", dsaQuestionSchema);
