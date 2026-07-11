import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { CategoryBadge, EmptyState, PageLoader, formatWhen } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const STATUS_STYLES = {
  approved: "bg-leaf/10 text-leaf",
  pending: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-ink/5 text-ink/50",
};

export default function FacultyDashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState(null);
  const [categories, setCategories] = useState([]);
  const [slotCategory, setSlotCategory] = useState("tech");
  const [slots, setSlots] = useState(null);
  const [club, setClub] = useState({ name: "", description: "", category: "general" });
  const [clubMsg, setClubMsg] = useState(null);

  useEffect(() => {
    api.get("/events/mine").then((d) => setEvents(d.events)).catch(() => setEvents([]));
    api.get("/events/categories").then((d) => setCategories(d.categories)).catch(() => {});
  }, []);

  useEffect(() => {
    setSlots(null);
    api.get(`/events/smart-slots/${slotCategory}`).then(setSlots).catch(() => setSlots({ slots: [], sample: 0 }));
  }, [slotCategory]);

  const createClub = async () => {
    setClubMsg(null);
    try {
      await api.post("/clubs", club);
      setClubMsg({ ok: true, text: `"${club.name}" created. Students can join it now.` });
      setClub({ name: "", description: "", category: "general" });
    } catch (err) {
      setClubMsg({ ok: false, text: err.message });
    }
  };

  if (!events) return <PageLoader />;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Coordinator dashboard</p>
          <h1 className="mt-1 text-3xl font-extrabold">Welcome, {user.name.split(" ")[0]}</h1>
        </div>
        <Link to="/events/new" className="btn-primary">+ Create event</Link>
      </div>

      <section className="card border-l-4 border-marigold">
        <p className="eyebrow">💡 Smart scheduling</p>
        <p className="mt-1 text-sm text-ink/60">
          Best day and time slot by average registrations and show-up rate, from past events.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <select className="field max-w-[180px]" value={slotCategory} onChange={(e) => setSlotCategory(e.target.value)}>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {slots && <span className="text-xs text-ink/50">Based on {slots.sample} past events</span>}
        </div>
        {slots && slots.slots.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {slots.slots.map((s, i) => (
              <div key={i} className="rounded-xl bg-paper p-4">
                <p className="font-display font-bold">{s.day} {s.slot}</p>
                <p className="mt-1 text-xs text-ink/60">
                  ~{s.avgRegistrations} registrations · {s.showUpRate}% show up
                </p>
              </div>
            ))}
          </div>
        ) : (
          slots && <p className="mt-3 text-sm text-ink/50">No history for this category yet — run one and the model starts learning.</p>
        )}
      </section>

      <section>
        <h2 className="text-xl font-bold">Your events</h2>
        {events.length === 0 ? (
          <div className="mt-4"><EmptyState title="No events yet" hint="Create your first event and it goes to admin for approval." /></div>
        ) : (
          <ul className="mt-4 divide-y divide-ink/5 rounded-2xl bg-white shadow-card">
            {events.map((e) => (
              <li key={e._id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <Link to={`/events/${e._id}`} className="font-semibold hover:text-violet2">{e.title}</Link>
                  <p className="text-xs text-ink/50">
                    {formatWhen(e.startsAt)} · {e.registeredCount}/{e.capacity} registered
                  </p>
                  {e.status === "rejected" && e.rejectionReason && (
                    <p className="mt-1 text-xs text-red-600">Rejected: {e.rejectionReason}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <CategoryBadge category={e.category} />
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[e.status]}`}>
                    {e.status}
                  </span>
                  <Link to={`/events/${e._id}/attendance`} className="btn-ghost !px-3 !py-1.5 text-xs">
                    Check-in
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {["faculty", "admin"].includes(user.role) && (
        <section className="card max-w-lg">
          <h2 className="font-display text-lg font-bold">Start a club</h2>
          {clubMsg && (
            <p className={`mt-2 rounded-lg px-3 py-2 text-sm ${clubMsg.ok ? "bg-leaf/10 text-leaf" : "bg-red-50 text-red-700"}`}>
              {clubMsg.text}
            </p>
          )}
          <div className="mt-3 space-y-3">
            <input className="field" placeholder="Club name" value={club.name}
              onChange={(e) => setClub({ ...club, name: e.target.value })} />
            <input className="field" placeholder="One-line description" value={club.description}
              onChange={(e) => setClub({ ...club, description: e.target.value })} />
            <select className="field" value={club.category} onChange={(e) => setClub({ ...club, category: e.target.value })}>
              <option value="general">general</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button className="btn-primary" onClick={createClub} disabled={!club.name}>
              Create club
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
