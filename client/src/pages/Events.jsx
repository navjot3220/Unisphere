import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { EmptyState, EventCard, PageLoader } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Events() {
  const { user } = useAuth();
  const [events, setEvents] = useState(null);
  const [recs, setRecs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [recommended, setRecommended] = useState(false);

  useEffect(() => {
    api.get("/events/categories").then((d) => setCategories(d.categories)).catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (q) params.set("q", q);
    api.get(`/events?${params}`).then((d) => setEvents(d.events)).catch(() => setEvents([]));
  }, [category, q]);

  useEffect(() => {
    if (!user) return;
    api.get("/recommendations").then((d) => setRecs(d.recommendations)).catch(() => {});
  }, [user]);

  // "Recommended for Me": reshuffle — recommended events float to the top with reasons.
  const recIds = new Map(recs.map((r) => [r.event._id, r.reasons]));
  const shown =
    recommended && events
      ? [...events].sort((a, b) => (recIds.has(b._id) ? 1 : 0) - (recIds.has(a._id) ? 1 : 0))
      : events;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Events</h1>
          <p className="mt-1 text-sm text-ink/60">Everything approved and upcoming, campus-wide.</p>
        </div>
        {user && (
          <Link to="/events/new" className="btn-primary">
            + Create event
          </Link>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input
          className="field max-w-xs"
          placeholder="Search events"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="field max-w-[180px]" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {user && (
          <button
            onClick={() => setRecommended(!recommended)}
            className={`btn ${recommended ? "bg-marigold text-ink" : "btn-ghost"}`}
          >
            🎯 Recommended for me
          </button>
        )}
      </div>

      {!shown ? (
        <PageLoader />
      ) : shown.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No events match"
            hint="Try clearing the search or picking a different category."
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((e) => (
            <EventCard key={e._id} event={e} reasons={recommended ? recIds.get(e._id) : null} />
          ))}
        </div>
      )}
    </div>
  );
}
