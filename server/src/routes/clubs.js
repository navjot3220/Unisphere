import { Router } from "express";
import { z } from "zod";
import Club from "../models/Club.js";
import User from "../models/User.js";
import Event from "../models/Event.js";
import Notice from "../models/Notice.js";
import Notification from "../models/Notification.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const clubs = await Club.find()
      .populate("coordinator", "name")
      .sort({ name: 1 });
    res.json({
      clubs: clubs.map((c) => ({
        ...c.toObject(),
        memberCount: c.members.length,
        members: undefined,
      })),
    });
  } catch (err) {
    next(err);
  }
});

const clubSchema = z.object({
  name: z.string().min(2, "Club name needs at least 2 characters."),
  description: z.string().default(""),
  category: z.string().default("general"),
  coordinatorId: z.string().optional(),
});

router.post("/", requireAuth, requireRole("faculty", "admin"), validate(clubSchema), async (req, res, next) => {
  try {
    const coordinator = req.user.role === "admin" && req.body.coordinatorId
      ? req.body.coordinatorId
      : req.user._id;
    const club = await Club.create({ ...req.body, coordinator });
    res.status(201).json({ club });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const club = await Club.findById(req.params.id)
      .populate("coordinator", "name email department profilePicture role")
      .populate("members", "name email department profilePicture academicYear role");
    
    if (!club) return res.status(404).json({ error: "Club not found" });

    const upcomingEvents = await Event.find({ 
      club: club._id, 
      startsAt: { $gte: new Date() },
      status: "approved"
    }).sort({ startsAt: 1 }).limit(5);

    res.json({ club, upcomingEvents });
  } catch (err) {
    next(err);
  }
});

const clubUpdateSchema = z.object({
  name: z.string().min(2, "Club name needs at least 2 characters.").optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  banner: z.string().optional(),
  logo: z.string().optional(),
});

router.put("/:id", requireAuth, requireRole("admin"), validate(clubUpdateSchema), async (req, res, next) => {
  try {
    const club = await Club.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate("coordinator", "name email department profilePicture role")
      .populate("members", "name email department profilePicture academicYear role");
    if (!club) return res.status(404).json({ error: "Club not found" });
    res.json({ club });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/join", requireAuth, async (req, res, next) => {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) return res.status(404).json({ error: "Club not found." });
    if (club.members.some((m) => String(m) === String(req.user._id))) {
      return res.status(409).json({ error: "You're already a member." });
    }
    club.members.push(req.user._id);
    await club.save();
    await User.updateOne({ _id: req.user._id }, { $addToSet: { clubs: club._id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/leave", requireAuth, async (req, res, next) => {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) return res.status(404).json({ error: "Club not found." });
    club.members = club.members.filter((m) => String(m) !== String(req.user._id));
    await club.save();
    await User.updateOne({ _id: req.user._id }, { $pull: { clubs: club._id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// --- Notice Board Routes ---

router.get("/:id/notices", async (req, res, next) => {
  try {
    const notices = await Notice.find({ club: req.params.id })
      .populate("author", "name role profilePicture")
      .sort({ createdAt: -1 });
    res.json({ notices });
  } catch (err) {
    next(err);
  }
});

const noticeSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  priority: z.enum(["Important", "General", "Event"]).default("General"),
  attachment: z.string().optional(),
});

router.post("/:id/notices", requireAuth, validate(noticeSchema), async (req, res, next) => {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) return res.status(404).json({ error: "Club not found" });

    // Check permissions (coordinator or admin)
    if (req.user.role !== "admin" && String(club.coordinator) !== String(req.user._id)) {
      return res.status(403).json({ error: "Only the coordinator or admin can post notices." });
    }

    const notice = await Notice.create({
      ...req.body,
      club: club._id,
      author: req.user._id,
    });

    // Notify all members
    if (club.members && club.members.length > 0) {
      const notifications = club.members.map((memberId) => ({
        user: memberId,
        club: club._id,
        notice: notice._id,
        message: `New notice in ${club.name}: ${notice.title}`,
      }));
      await Notification.insertMany(notifications);
    }

    await notice.populate("author", "name role profilePicture");
    res.status(201).json({ notice });
  } catch (err) {
    next(err);
  }
});

router.put("/:id/notices/:noticeId", requireAuth, validate(noticeSchema), async (req, res, next) => {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) return res.status(404).json({ error: "Club not found" });

    if (req.user.role !== "admin" && String(club.coordinator) !== String(req.user._id)) {
      return res.status(403).json({ error: "Only the coordinator or admin can edit notices." });
    }

    const notice = await Notice.findOneAndUpdate(
      { _id: req.params.noticeId, club: club._id },
      req.body,
      { new: true }
    ).populate("author", "name role profilePicture");

    if (!notice) return res.status(404).json({ error: "Notice not found" });

    res.json({ notice });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id/notices/:noticeId", requireAuth, async (req, res, next) => {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) return res.status(404).json({ error: "Club not found" });

    if (req.user.role !== "admin" && String(club.coordinator) !== String(req.user._id)) {
      return res.status(403).json({ error: "Only the coordinator or admin can delete notices." });
    }

    const notice = await Notice.findOneAndDelete({ _id: req.params.noticeId, club: club._id });
    if (!notice) return res.status(404).json({ error: "Notice not found" });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
