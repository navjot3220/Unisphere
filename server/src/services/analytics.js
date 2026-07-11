import Event, { EVENT_CATEGORIES } from "../models/Event.js";
import Registration from "../models/Registration.js";
import User from "../models/User.js";

/**
 * Engagement heatmap: department × category participation counts, plus
 * automated insights (underperforming categories, near-capacity events,
 * departments with low participation).
 */
export async function engagementHeatmap() {
  const regs = await Registration.find({ status: { $ne: "cancelled" } })
    .populate("user", "department")
    .populate("event", "category");

  const departments = [...new Set((await User.find({}, "department")).map((u) => u.department))].sort();
  const matrix = {};
  for (const d of departments) {
    matrix[d] = Object.fromEntries(EVENT_CATEGORIES.map((c) => [c, 0]));
  }
  for (const r of regs) {
    const d = r.user?.department;
    const c = r.event?.category;
    if (d && c && matrix[d]) matrix[d][c] += 1;
  }
  return { departments, categories: EVENT_CATEGORIES, matrix };
}

export async function adminInsights() {
  const insights = [];
  const now = new Date();

  // Category participation totals
  const regs = await Registration.find({ status: { $ne: "cancelled" } }).populate(
    "event",
    "category"
  );
  const byCategory = {};
  for (const r of regs) {
    const c = r.event?.category;
    if (c) byCategory[c] = (byCategory[c] || 0) + 1;
  }
  const totals = Object.entries(byCategory).sort((a, b) => a[1] - b[1]);
  if (totals.length >= 2) {
    const [lowCat, lowCount] = totals[0];
    const [topCat, topCount] = totals[totals.length - 1];
    if (topCount >= lowCount * 3) {
      insights.push({
        type: "underperforming",
        message: `"${lowCat}" events draw ${lowCount} registrations vs ${topCount} for "${topCat}". Consider co-hosting or better time slots.`,
      });
    }
  }

  // Near-capacity upcoming events
  const upcoming = await Event.find({ status: "approved", startsAt: { $gte: now } });
  for (const e of upcoming) {
    if (e.registeredCount / e.capacity >= 0.9) {
      insights.push({
        type: "capacity",
        message: `"${e.title}" is at ${e.registeredCount}/${e.capacity} capacity. Consider a bigger venue or a second session.`,
      });
    }
  }

  // Schedule collisions: two approved events overlapping in time
  const sorted = [...upcoming].sort((a, b) => a.startsAt - b.startsAt);
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i + 1].startsAt < sorted[i].endsAt) {
      insights.push({
        type: "overlap",
        message: `"${sorted[i].title}" and "${sorted[i + 1].title}" overlap. Expect split attendance.`,
      });
    }
  }

  // Low-participation departments
  const heat = await engagementHeatmap();
  for (const d of heat.departments) {
    const total = Object.values(heat.matrix[d]).reduce((a, b) => a + b, 0);
    if (total === 0) {
      insights.push({
        type: "demographic",
        message: `No event registrations from ${d} yet. A targeted event could close the gap.`,
      });
    }
  }

  return insights.slice(0, 8);
}

export async function platformStats() {
  const [users, events, regs, checkins] = await Promise.all([
    User.countDocuments(),
    Event.countDocuments({ status: "approved" }),
    Registration.countDocuments({ status: { $ne: "cancelled" } }),
    Registration.countDocuments({ status: "checked_in" }),
  ]);
  return { users, events, registrations: regs, checkIns: checkins };
}
