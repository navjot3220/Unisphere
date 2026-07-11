import { Router } from "express";
import Event from "../models/Event.js";
import Registration from "../models/Registration.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { computeEngagement } from "../services/recommender.js";
import { passToDataURL, signPass, verifyPass } from "../services/qr.js";
import { sendMail } from "../services/reminders.js";

const router = Router();

// Register for an event
router.post("/:eventId", requireAuth, async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event || event.status !== "approved") {
      return res.status(404).json({ error: "Event not available for registration." });
    }
    if (event.startsAt < new Date()) {
      return res.status(400).json({ error: "This event has already started." });
    }
    if (event.registeredCount >= event.capacity) {
      return res.status(409).json({ error: "This event is full." });
    }
    const existing = await Registration.findOne({ event: event._id, user: req.user._id });
    if (existing && existing.status !== "cancelled") {
      return res.status(409).json({ error: "You're already registered for this event." });
    }

    let reg;
    if (existing) {
      existing.status = "registered";
      reg = await existing.save();
    } else {
      reg = await Registration.create({ event: event._id, user: req.user._id });
    }
    await Event.updateOne({ _id: event._id }, { $inc: { registeredCount: 1 } });
    computeEngagement(req.user._id).catch(() => {});
    sendMail(
      req.user.email,
      `You're in: ${event.title}`,
      `Hi ${req.user.name},\n\nYou're registered for "${event.title}" on ${event.startsAt.toLocaleString()} at ${event.location}. Your QR pass is in your dashboard.`
    ).catch(() => {});

    res.status(201).json({ registration: reg });
  } catch (err) {
    next(err);
  }
});

// My registrations with signed QR passes
router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const regs = await Registration.find({ user: req.user._id, status: { $ne: "cancelled" } })
      .populate({ path: "event", populate: { path: "club", select: "name" } })
      .sort({ createdAt: -1 });

    const withPasses = await Promise.all(
      regs
        .filter((r) => r.event)
        .map(async (r) => {
          const token = signPass({
            registrationId: r._id,
            userId: req.user._id,
            eventId: r.event._id,
          });
          return {
            ...r.toObject(),
            pass: { token, qr: await passToDataURL(token) },
          };
        })
    );
    res.json({ registrations: withPasses });
  } catch (err) {
    next(err);
  }
});

// Cancel my registration
router.delete("/:eventId", requireAuth, async (req, res, next) => {
  try {
    const reg = await Registration.findOne({
      event: req.params.eventId,
      user: req.user._id,
      status: "registered",
    });
    if (!reg) return res.status(404).json({ error: "No active registration found." });
    reg.status = "cancelled";
    await reg.save();
    await Event.updateOne({ _id: reg.event }, { $inc: { registeredCount: -1 } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// QR check-in: scanner posts the signed pass token
router.post("/check-in/qr", requireAuth, requireRole("faculty", "admin", "student"), async (req, res, next) => {
  try {
    const decoded = verifyPass(req.body.token);
    if (!decoded) return res.status(400).json({ error: "Invalid or tampered pass." });

    const reg = await Registration.findById(decoded.registrationId)
      .populate("user", "name department")
      .populate("event", "title organizer startsAt");
    if (!reg || String(reg.event._id) !== decoded.eventId) {
      return res.status(404).json({ error: "Pass doesn't match any registration." });
    }
    const isOwner = String(reg.event.organizer) === String(req.user._id);
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ error: "Only this event's organizer or an admin can check people in." });
    }
    if (reg.status === "checked_in") {
      return res.status(409).json({ error: `${reg.user.name} is already checked in.` });
    }
    if (reg.status === "cancelled") {
      return res.status(400).json({ error: "This registration was cancelled." });
    }
    reg.status = "checked_in";
    reg.checkedInAt = new Date();
    reg.checkedInBy = "qr";
    await reg.save();
    computeEngagement(reg.user._id).catch(() => {});
    res.json({ ok: true, attendee: reg.user.name, event: reg.event.title });
  } catch (err) {
    next(err);
  }
});

// Manual check-in by registration id
router.post("/check-in/manual/:registrationId", requireAuth, requireRole("faculty", "admin", "student"), async (req, res, next) => {
  try {
    const reg = await Registration.findById(req.params.registrationId)
      .populate("user", "name")
      .populate("event", "title organizer");
    if (!reg) return res.status(404).json({ error: "Registration not found." });
    const isOwner = String(reg.event.organizer) === String(req.user._id);
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ error: "Only this event's organizer or an admin can check people in." });
    }
    if (reg.status === "checked_in") {
      return res.status(409).json({ error: `${reg.user.name} is already checked in.` });
    }
    reg.status = "checked_in";
    reg.checkedInAt = new Date();
    reg.checkedInBy = "manual";
    await reg.save();
    computeEngagement(reg.user._id).catch(() => {});
    res.json({ ok: true, attendee: reg.user.name });
  } catch (err) {
    next(err);
  }
});

export default router;
