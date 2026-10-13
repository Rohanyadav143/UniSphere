import mongoose from "mongoose";

const roadmapSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 100 },
  slug: { type: String, required: true, unique: true, lowercase: true, index: true },
  type: { type: String, required: true, enum: ["mern", "dsa", "course"], default: "course" },
  pathType: { type: String, default: "", trim: true, maxlength: 50 },
  description: { type: String, default: "", maxlength: 500 },
  thumbnail: { type: String, default: "" },
  order: { type: Number, default: 0 },
  isPublished: { type: Boolean, default: true }
}, { timestamps: true, versionKey: false });

export default mongoose.model("Roadmap", roadmapSchema);
