import cron from "node-cron";
import nodemailer from "nodemailer";
import Event from "../models/Event.js";
import Registration from "../models/Registration.js";

function buildTransport() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  // Dev fallback: log emails as JSON to the console instead of sending.
  return nodemailer.createTransport({ jsonTransport: true });
}

const transport = buildTransport();

export async function sendMail(to, subject, text) {
  const info = await transport.sendMail({
    from: process.env.MAIL_FROM || "UniSphere <no-reply@unisphere.local>",
    to,
    subject,
    text,
  });
  if (info.message) console.log("[mail:dev]", subject, "->", to);
  return info;
}

/**
 * Every 15 minutes: find approved events starting within 24h whose reminders
 * haven't gone out, email every registered attendee, and mark the event.
 */
export function startReminderScheduler() {
  cron.schedule("*/15 * * * *", async () => {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 24 * 3600 * 1000);
    const events = await Event.find({
      status: "approved",
      remindersSent: false,
      startsAt: { $gte: now, $lte: windowEnd },
    });

    for (const event of events) {
      const regs = await Registration.find({
        event: event._id,
        status: "registered",
      }).populate("user", "name email");

      await Promise.allSettled(
        regs.map((r) =>
          sendMail(
            r.user.email,
            `Reminder: ${event.title} is tomorrow`,
            `Hi ${r.user.name},\n\n"${event.title}" starts ${event.startsAt.toLocaleString()} at ${event.location}.\nYour QR pass is in your UniSphere dashboard.\n\nSee you there!`
          )
        )
      );
      event.remindersSent = true;
      await event.save();
      console.log(`[reminders] sent for "${event.title}" (${regs.length} attendees)`);
    }
  });
  console.log("[reminders] scheduler running (every 15 min)");
}
