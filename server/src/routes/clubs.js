import { Router } from "express";
import { z } from "zod";
import Club from "../models/Club.js";
import User from "../models/User.js";
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
});

router.post("/", requireAuth, requireRole("faculty", "admin"), validate(clubSchema), async (req, res, next) => {
  try {
    const club = await Club.create({ ...req.body, coordinator: req.user._id });
    res.status(201).json({ club });
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

export default router;
