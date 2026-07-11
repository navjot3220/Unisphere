import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["student", "faculty", "admin"], default: "student" },
    department: { type: String, default: "General" },
    interests: [{ type: String }], // category tags, e.g. "tech", "sports"
    clubs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Club" }],
    engagementScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeJSON = function () {
  const { password, __v, ...rest } = this.toObject();
  return rest;
};

export default mongoose.model("User", userSchema);
