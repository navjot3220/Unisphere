import Event from "../models/Event.js";
import Registration from "../models/Registration.js";
import User from "../models/User.js";

/**
 * Smart Event Recommender
 * ------------------------
 * Content-based scoring over four signals, each with a human-readable reason
 * so the UI can label cards ("Based on your interests", "Popular in your
 * department", etc.):
 *
 *   +3.0  event hosted by a club the student belongs to
 *   +2.0  category matches the student's attendance history (weighted by count)
 *   +1.5  category matches declared interests
 *   +1.0  popular with the student's department
 *   +0.5  happening within the next 7 days (recency nudge)
 */
export async function recommendForUser(user, limit = 6) {
  const now = new Date();
  const [upcoming, myRegs] = await Promise.all([
    Event.find({ status: "approved", startsAt: { $gte: now } }).populate("club", "name"),
    Registration.find({ user: user._id, status: { $ne: "cancelled" } }).populate(
      "event",
      "category"
    ),
  ]);

  const registeredIds = new Set(myRegs.map((r) => String(r.event?._id)));

  // Category affinity from past behaviour
  const affinity = {};
  for (const r of myRegs) {
    const cat = r.event?.category;
    if (!cat) continue;
    affinity[cat] = (affinity[cat] || 0) + (r.status === "checked_in" ? 2 : 1);
  }

  // Department popularity: which categories do this user's department-mates attend?
  const deptUsers = await User.find({ department: user.department }, "_id");
  const deptRegs = await Registration.find({
    user: { $in: deptUsers.map((u) => u._id) },
    status: { $ne: "cancelled" },
  }).populate("event", "category");
  const deptAffinity = {};
  for (const r of deptRegs) {
    const cat = r.event?.category;
    if (cat) deptAffinity[cat] = (deptAffinity[cat] || 0) + 1;
  }
  const topDeptCats = Object.entries(deptAffinity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([c]) => c);

  const myClubIds = new Set((user.clubs || []).map(String));
  const weekAway = new Date(now.getTime() + 7 * 24 * 3600 * 1000);

  const scored = upcoming
    .filter((e) => !registeredIds.has(String(e._id)))
    .map((e) => {
      let score = 0;
      const reasons = [];
      if (e.club && myClubIds.has(String(e.club._id))) {
        score += 3;
        reasons.push(`Hosted by ${e.club.name}, one of your clubs`);
      }
      if (affinity[e.category]) {
        score += 2 * Math.min(affinity[e.category], 3) * 0.5 + 1;
        reasons.push("Based on events you've attended");
      }
      if ((user.interests || []).includes(e.category)) {
        score += 1.5;
        reasons.push("Matches your interests");
      }
      if (topDeptCats.includes(e.category)) {
        score += 1;
        reasons.push(`Popular in ${user.department}`);
      }
      if (e.startsAt <= weekAway) score += 0.5;
      return { event: e, score, reasons };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}

/**
 * "Students Also Attended" — item-to-item collaborative filtering.
 * Finds users registered for this event, then ranks the other events they
 * registered for by co-occurrence count.
 */
export async function alsoAttended(eventId, limit = 4) {
  const coRegs = await Registration.find({
    event: eventId,
    status: { $ne: "cancelled" },
  });
  const userIds = coRegs.map((r) => r.user);
  if (!userIds.length) return [];

  const others = await Registration.find({
    user: { $in: userIds },
    event: { $ne: eventId },
    status: { $ne: "cancelled" },
  });

  const counts = {};
  for (const r of others) {
    const id = String(r.event);
    counts[id] = (counts[id] || 0) + 1;
  }
  const topIds = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  const events = await Event.find({
    _id: { $in: topIds },
    status: "approved",
    startsAt: { $gte: new Date() },
  }).populate("club", "name");

  return events;
}

/**
 * Smart scheduling for coordinators: aggregates historical check-in rates by
 * (dayOfWeek, timeSlot) for a category and returns the best slots.
 */
export async function suggestTimeSlots(category) {
  const past = await Event.find({
    category,
    status: "approved",
    endsAt: { $lt: new Date() },
  });
  if (!past.length) return { slots: [], sample: 0 };

  const buckets = {}; // key: `${day}-${slot}` -> { events, regs, checkins }
  for (const e of past) {
    const day = e.startsAt.getDay();
    const hour = e.startsAt.getHours();
    const slot = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
    const key = `${day}-${slot}`;
    buckets[key] = buckets[key] || { day, slot, events: 0, regs: 0, checkins: 0 };
    buckets[key].events += 1;
  }

  const regs = await Registration.find({
    event: { $in: past.map((e) => e._id) },
  }).populate("event", "startsAt");

  for (const r of regs) {
    if (!r.event) continue;
    const day = r.event.startsAt.getDay();
    const hour = r.event.startsAt.getHours();
    const slot = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
    const key = `${day}-${slot}`;
    if (!buckets[key]) continue;
    buckets[key].regs += 1;
    if (r.status === "checked_in") buckets[key].checkins += 1;
  }

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const slots = Object.values(buckets)
    .map((b) => ({
      day: days[b.day],
      slot: b.slot,
      avgRegistrations: +(b.regs / b.events).toFixed(1),
      showUpRate: b.regs ? +((b.checkins / b.regs) * 100).toFixed(0) : 0,
    }))
    .sort((a, b) => b.avgRegistrations * (b.showUpRate || 50) - a.avgRegistrations * (a.showUpRate || 50))
    .reverse()
    .sort((a, b) => b.avgRegistrations - a.avgRegistrations)
    .slice(0, 3);

  return { slots, sample: past.length };
}

/**
 * Attendance forecast for an upcoming event: average show-up rate for its
 * category applied to current registrations.
 */
export async function forecastAttendance(event) {
  const past = await Event.find({
    category: event.category,
    status: "approved",
    endsAt: { $lt: new Date() },
  });
  let regs = 0;
  let checkins = 0;
  if (past.length) {
    const rows = await Registration.find({ event: { $in: past.map((e) => e._id) } });
    regs = rows.length;
    checkins = rows.filter((r) => r.status === "checked_in").length;
  }
  const rate = regs ? checkins / regs : 0.7; // default 70% when no history
  return {
    registered: event.registeredCount,
    expectedAttendance: Math.round(event.registeredCount * rate),
    historicalShowUpRate: +(rate * 100).toFixed(0),
    basedOnEvents: past.length,
  };
}

/**
 * Engagement score: check-ins weigh double, recent activity (90 days) gets a
 * boost. Stored on the user so dashboards read it cheaply.
 */
export async function computeEngagement(userId) {
  const regs = await Registration.find({ user: userId, status: { $ne: "cancelled" } });
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 3600 * 1000);
  let score = 0;
  for (const r of regs) {
    const base = r.status === "checked_in" ? 2 : 1;
    const recent = r.createdAt >= ninetyDaysAgo ? 1.5 : 1;
    score += base * recent;
  }
  score = Math.round(score * 10) / 10;
  await User.findByIdAndUpdate(userId, { engagementScore: score });
  return score;
}
