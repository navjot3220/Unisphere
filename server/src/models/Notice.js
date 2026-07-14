import mongoose from "mongoose";

const noticeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    club: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    priority: { type: String, enum: ["Important", "General", "Event"], default: "General" },
    attachment: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Notice", noticeSchema);
