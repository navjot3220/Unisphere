import { Router } from "express";
import Event from "../models/Event.js";
import User from "../models/User.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { adminInsights, engagementHeatmap, platformStats } from "../services/analytics.js";

const router = Router();
router.use(requireAuth, requireRole("admin"));

router.get("/stats", async (req, res, next) => {
  try {
    res.json(await platformStats());
  } catch (err) {
    next(err);
  }
});

router.get("/heatmap", async (req, res, next) => {
  try {
    res.json(await engagementHeatmap());
  } catch (err) {
    next(err);
  }
});

router.get("/insights", async (req, res, next) => {
  try {
    res.json({ insights: await adminInsights() });
  } catch (err) {
    next(err);
  }
});

router.get("/pending-events", async (req, res, next) => {
  try {
    const events = await Event.find({ status: "pending" })
      .populate("organizer", "name role")
      .populate("club", "name")
      .sort({ createdAt: 1 });
    res.json({ events });
  } catch (err) {
    next(err);
  }
});

router.post("/events/:id/approve", async (req, res, next) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true }
    );
    if (!event) return res.status(404).json({ error: "Event not found." });
    res.json({ event });
  } catch (err) {
    next(err);
  }
});

router.post("/events/:id/reject", async (req, res, next) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { status: "rejected", rejectionReason: req.body.reason || "" },
      { new: true }
    );
    if (!event) return res.status(404).json({ error: "Event not found." });
    res.json({ event });
  } catch (err) {
    next(err);
  }
});

router.get("/users", async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ users: users.map((u) => u.toSafeJSON()) });
  } catch (err) {
    next(err);
  }
});

router.put("/users/:id/role", async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!["student", "faculty", "admin"].includes(role)) {
      return res.status(400).json({ error: "Unknown role." });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({ user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
});

export default router;
