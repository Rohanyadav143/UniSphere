import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  password: { type: String, required: true, minlength: 10, select: false },
  role: { type: String, enum: ["student", "admin"], default: "student" },
  isBlocked: { type: Boolean, default: false },
  avatar: { type: String, default: "" },
  lastActiveAt: { type: Date, default: Date.now }
}, { timestamps: true, versionKey: false });

userSchema.pre("save", async function hashPassword() {
  if (this.isModified("password")) this.password = await bcrypt.hash(this.password, 12);
});
userSchema.methods.verifyPassword = function verifyPassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model("User", userSchema);
