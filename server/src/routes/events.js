import { Router } from "express";
import { z } from "zod";
import Event, { EVENT_CATEGORIES } from "../models/Event.js";
import Registration from "../models/Registration.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { alsoAttended, forecastAttendance, suggestTimeSlots } from "../services/recommender.js";

const router = Router();

const eventSchema = z
  .object({
    title: z.string().min(3, "Title needs at least 3 characters."),
    description: z.string().default(""),
    category: z.enum(EVENT_CATEGORIES),
    location: z.string().min(2, "Add a location."),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    capacity: z.coerce.number().int().min(1).default(100),
    club: z.string().nullable().optional(),
  })
  .refine((d) => d.endsAt > d.startsAt, { message: "End time must be after start time." });

// Public: list approved events with filters
router.get("/", async (req, res, next) => {
  try {
    const { category, club, from, to, q } = req.query;
    const filter = { status: "approved" };
    if (category) filter.category = category;
    if (club) filter.club = club;
    if (from || to) filter.startsAt = {};
    if (from) filter.startsAt.$gte = new Date(from);
    if (to) filter.startsAt.$lte = new Date(to);
    if (q) filter.title = { $regex: q, $options: "i" };
    const events = await Event.find(filter)
      .sort({ startsAt: 1 })
      .populate("club", "name")
      .populate("organizer", "name");
    res.json({ events });
  } catch (err) {
    next(err);
  }
});

router.get("/categories", (req, res) => res.json({ categories: EVENT_CATEGORIES }));

// Faculty/coordinator: my events (any status)
router.get("/mine", requireAuth, async (req, res, next) => {
  try {
    const events = await Event.find({ organizer: req.user._id })
      .sort({ startsAt: -1 })
      .populate("club", "name");
    res.json({ events });
  } catch (err) {
    next(err);
  }
});

// Smart scheduling suggestion (before event creation)
router.get("/smart-slots/:category", requireAuth, requireRole("faculty", "admin", "student"), async (req, res, next) => {
  try {
    if (!EVENT_CATEGORIES.includes(req.params.category)) {
      return res.status(400).json({ error: "Unknown category." });
    }
    res.json(await suggestTimeSlots(req.params.category));
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate("club", "name")
      .populate("organizer", "name role");
    if (!event) return res.status(404).json({ error: "Event not found." });
    res.json({ event });
  } catch (err) {
    next(err);
  }
});

// "Students Also Attended" (AI clustering)
router.get("/:id/also-attended", async (req, res, next) => {
  try {
    res.json({ events: await alsoAttended(req.params.id) });
  } catch (err) {
    next(err);
  }
});

// Predictive attendance forecast (organizer/admin)
router.get("/:id/forecast", requireAuth, requireRole("faculty", "admin"), async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found." });
    res.json(await forecastAttendance(event));
  } catch (err) {
    next(err);
  }
});

// iCal export — add the event straight to any calendar app
router.get("/:id/ics", async (req, res, next) => {
  try {
    const e = await Event.findById(req.params.id);
    if (!e) return res.status(404).json({ error: "Event not found." });
    const dt = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//UniSphere//EN",
      "BEGIN:VEVENT",
      `UID:${e._id}@unisphere`,
      `DTSTAMP:${dt(new Date())}`,
      `DTSTART:${dt(e.startsAt)}`,
      `DTEND:${dt(e.endsAt)}`,
      `SUMMARY:${e.title}`,
      `LOCATION:${e.location}`,
      `DESCRIPTION:${e.description.replace(/\n/g, "\\n")}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    res.set("Content-Type", "text/calendar");
    res.set("Content-Disposition", `attachment; filename="${e.title}.ics"`);
    res.send(ics);
  } catch (err) {
    next(err);
  }
});

// Create (students can create for their clubs; faculty freely). Starts as "pending".
router.post("/", requireAuth, requireRole("student", "faculty", "admin"), validate(eventSchema), async (req, res, next) => {
  try {
    if (req.user.role === "student") {
      const myClubs = (req.user.clubs || []).map(String);
      if (!req.body.club || !myClubs.includes(String(req.body.club))) {
        return res.status(403).json({ error: "Students can only create events for clubs they belong to." });
      }
    }
    const event = await Event.create({
      ...req.body,
      organizer: req.user._id,
      status: req.user.role === "admin" ? "approved" : "pending",
    });
    res.status(201).json({ event });
  } catch (err) {
    next(err);
  }
});

// Update (organizer or admin)
router.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found." });
    const isOwner = String(event.organizer) === String(req.user._id);
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ error: "Only the organizer or an admin can edit this event." });
    }
    const allowed = ["title", "description", "category", "location", "startsAt", "endsAt", "capacity"];
    for (const k of allowed) if (k in req.body) event[k] = req.body[k];
    await event.save();
    res.json({ event });
  } catch (err) {
    next(err);
  }
});

// Cancel (organizer or admin)
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found." });
    const isOwner = String(event.organizer) === String(req.user._id);
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ error: "Only the organizer or an admin can cancel this event." });
    }
    event.status = "cancelled";
    await event.save();
    res.json({ event });
  } catch (err) {
    next(err);
  }
});

// Attendance report for an event (organizer/admin)
router.get("/:id/attendance", requireAuth, requireRole("faculty", "admin", "student"), async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found." });
    const isOwner = String(event.organizer) === String(req.user._id);
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ error: "Only the organizer or an admin can view attendance." });
    }
    const regs = await Registration.find({ event: event._id, status: { $ne: "cancelled" } })
      .populate("user", "name email department")
      .sort({ createdAt: 1 });
    res.json({
      event: { id: event._id, title: event.title, capacity: event.capacity },
      registrations: regs,
      summary: {
        registered: regs.length,
        checkedIn: regs.filter((r) => r.status === "checked_in").length,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
