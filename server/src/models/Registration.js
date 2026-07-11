import mongoose from "mongoose";

const registrationSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["registered", "checked_in", "cancelled"],
      default: "registered",
    },
    checkedInAt: { type: Date, default: null },
    checkedInBy: { type: String, enum: ["qr", "manual", null], default: null },
  },
  { timestamps: true }
);

// One active registration per user per event
registrationSchema.index({ event: 1, user: 1 }, { unique: true });

export default mongoose.model("Registration", registrationSchema);
