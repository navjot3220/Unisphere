import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";
import { EmptyState, EventCard, PageLoader, TicketPass } from "../components/ui.jsx";
import { Avatar } from "../components/Avatar.jsx";
import { ImageUpload } from "../components/ImageUpload.jsx";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [regs, setRegs] = useState(null);
  const [recs, setRecs] = useState([]);
  const [engagement, setEngagement] = useState(null);

  useEffect(() => {
    api.get("/registrations/mine").then((d) => setRegs(d.registrations)).catch(() => setRegs([]));
    api.get("/recommendations").then((d) => setRecs(d.recommendations)).catch(() => {});
    api.get("/recommendations/engagement").then((d) => setEngagement(d.engagementScore)).catch(() => {});
  }, []);

  if (!regs) return <PageLoader />;

  const now = new Date();
  const upcoming = regs.filter((r) => new Date(r.event.startsAt) >= now);
  const past = regs.filter((r) => new Date(r.event.startsAt) < now);
  const attended = past.filter((r) => r.status === "checked_in").length;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar src={user.profilePicture} name={user.name} className="h-20 w-20 text-3xl shadow-sm" />
          <div>
            <p className="eyebrow">Student dashboard</p>
            <h1 className="mt-1 text-3xl font-extrabold">Hey, {user.name.split(" ")[0]}</h1>
            <Link to="/profile" className="inline-block mt-1 text-xs text-violet2 hover:underline">Edit Profile</Link>
          </div>
        </div>
        <div className="flex gap-3 text-center">
          <Stat value={upcoming.length} label="Upcoming" />
          <Stat value={attended} label="Attended" />
          <Stat value={engagement ?? "–"} label="Engagement" highlight />
        </div>
      </div>

      <section>
        <h2 className="text-xl font-bold">Your passes</h2>
        <p className="mt-1 text-sm text-ink/60">Show the QR at the door — it's your ticket.</p>
        {upcoming.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No upcoming events"
              hint="Register for something and your pass appears here."
              action={<Link to="/events" className="btn-primary">Browse events</Link>}
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {upcoming.map((r) => (
              <TicketPass key={r._id} registration={r} />
            ))}
          </div>
        )}
      </section>

      {recs.length > 0 && (
        <section>
          <h2 className="text-xl font-bold">🎯 Suggested for you</h2>
          <p className="mt-1 text-sm text-ink/60">
            Scored from your clubs, attendance history, and what {user.department} is into.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recs.map((r) => (
              <EventCard key={r.event._id} event={r.event} reasons={r.reasons} />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="text-xl font-bold">Past events</h2>
          <ul className="mt-3 divide-y divide-ink/5 rounded-2xl bg-white shadow-card">
            {past.map((r) => (
              <li key={r._id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="font-medium">{r.event.title}</span>
                <span className={r.status === "checked_in" ? "font-semibold text-leaf" : "text-ink/40"}>
                  {r.status === "checked_in" ? "✓ Attended" : "Registered, no check-in"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ value, label, highlight }) {
  return (
    <div className={`rounded-2xl px-4 py-2 ${highlight ? "bg-marigold" : "bg-white shadow-card"}`}>
      <p className="font-display text-2xl font-extrabold leading-none">{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-ink/60">{label}</p>
    </div>
  );
}
