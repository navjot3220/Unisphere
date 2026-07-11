import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { EventCard } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const FEATURES = [
  ["Digital ticket passes", "Every registration comes with a signed QR ticket. Scan at the door, done."],
  ["Recommendations that learn", "Your clubs, your history, your department — events find you."],
  ["Smart scheduling", "Coordinators see which day and time slot actually fills seats."],
  ["Attendance you can trust", "QR passes are cryptographically signed. No screenshots of someone else's pass."],
];

export default function Landing() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);

  useEffect(() => {
    api.get("/events").then((d) => setEvents(d.events.slice(0, 3))).catch(() => {});
  }, []);

  return (
    <div className="space-y-16">
      <section className="pt-8 text-center">
        <p className="eyebrow">Smart campus events & clubs hub</p>
        <h1 className="mx-auto mt-3 max-w-2xl text-4xl font-extrabold leading-tight sm:text-5xl">
          Every event on campus,
          <br />
          <span className="text-violet2">one pass in your pocket.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-ink/60">
          Browse events, register in one tap, walk in with a QR ticket. Coordinators get
          attendance forecasts and scheduling suggestions built from real turnout data.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          {user ? (
            <Link to="/events" className="btn-primary">Browse events</Link>
          ) : (
            <>
              <Link to="/signup" className="btn-primary">Create your account</Link>
              <Link to="/events" className="btn-ghost">Browse events</Link>
            </>
          )}
        </div>
      </section>

      {events.length > 0 && (
        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-2xl font-bold">Happening soon</h2>
            <Link to="/events" className="text-sm font-semibold text-violet2 hover:underline">
              See all events →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => (
              <EventCard key={e._id} event={e} />
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map(([title, body]) => (
          <div key={title} className="card">
            <h3 className="font-display font-bold">{title}</h3>
            <p className="mt-1 text-sm text-ink/60">{body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
