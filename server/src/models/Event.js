import mongoose from "mongoose";

export const EVENT_CATEGORIES = [
  "technology",
  "business",
  "arts",
];

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: { type: String, enum: EVENT_CATEGORIES, required: true },
    coverImage: { type: String, default: "" },
    location: { type: String, required: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    capacity: { type: Number, default: 100, min: 1 },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    club: { type: mongoose.Schema.Types.ObjectId, ref: "Club", default: null },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
    },
    rejectionReason: { type: String, default: "" },
    registeredCount: { type: Number, default: 0 },
    remindersSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

eventSchema.index({ startsAt: 1, status: 1 });
eventSchema.index({ category: 1 });

export default mongoose.model("Event", eventSchema);
