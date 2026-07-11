import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import { CategoryBadge, EventCard, PageLoader, formatWhen } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function EventDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [also, setAlso] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [mine, setMine] = useState(false);
  const [msg, setMsg] = useState(null); // { type, text }

  const isOrganizer =
    user && event && (String(event.organizer?._id) === String(user._id) || user.role === "admin");

  const load = () => {
    api.get(`/events/${id}`).then((d) => setEvent(d.event)).catch(() => {});
    api.get(`/events/${id}/also-attended`).then((d) => setAlso(d.events)).catch(() => {});
    if (user) {
      api.get("/registrations/mine").then((d) =>
        setMine(d.registrations.some((r) => r.event?._id === id))
      ).catch(() => {});
    }
  };

  useEffect(load, [id, user]);

  useEffect(() => {
    if (isOrganizer && ["faculty", "admin"].includes(user.role)) {
      api.get(`/events/${id}/forecast`).then(setForecast).catch(() => {});
    }
  }, [isOrganizer]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!event) return <PageLoader />;

  const spotsLeft = event.capacity - event.registeredCount;

  const register = async () => {
    setMsg(null);
    try {
      await api.post(`/registrations/${id}`);
      setMsg({ type: "ok", text: "You're registered. Your QR pass is in your dashboard." });
      setMine(true);
      load();
    } catch (err) {
      setMsg({ type: "err", text: err.message });
    }
  };

  const cancel = async () => {
    setMsg(null);
    try {
      await api.del(`/registrations/${id}`);
      setMsg({ type: "ok", text: "Registration cancelled." });
      setMine(false);
      load();
    } catch (err) {
      setMsg({ type: "err", text: err.message });
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="card">
        <div className="flex items-center gap-2">
          <CategoryBadge category={event.category} />
          {event.club?.name && <span className="text-xs text-ink/50">{event.club.name}</span>}
        </div>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight">{event.title}</h1>
        <p className="mt-2 text-sm font-medium text-ink/70">
          {formatWhen(event.startsAt)} → {formatWhen(event.endsAt)}
          <br />
          {event.location} · Organized by {event.organizer?.name}
        </p>
        <p className="mt-4 whitespace-pre-line text-ink/80">{event.description}</p>

        {msg && (
          <p className={`mt-4 rounded-lg px-3 py-2 text-sm ${
            msg.type === "ok" ? "bg-leaf/10 text-leaf" : "bg-red-50 text-red-700"
          }`}>
            {msg.text}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {user ? (
            mine ? (
              <>
                <Link to="/dashboard" className="btn-primary">View my pass</Link>
                <button className="btn-danger" onClick={cancel}>Cancel registration</button>
              </>
            ) : (
              <button className="btn-primary" onClick={register} disabled={spotsLeft <= 0}>
                {spotsLeft <= 0 ? "Event full" : "Register"}
              </button>
            )
          ) : (
            <Link to="/login" className="btn-primary">Log in to register</Link>
          )}
          <a href={`/api/events/${id}/ics`} className="btn-ghost" download>
            Add to calendar (.ics)
          </a>
          {isOrganizer && (
            <Link to={`/events/${id}/attendance`} className="btn-ghost">
              Attendance & check-in
            </Link>
          )}
          <span className={`text-sm font-semibold ${spotsLeft <= 5 ? "text-red-600" : "text-ink/50"}`}>
            {event.registeredCount}/{event.capacity} registered
          </span>
        </div>
      </div>

      {forecast && (
        <div className="card border-l-4 border-violet2">
          <p className="eyebrow">Attendance forecast</p>
          <p className="mt-2 text-sm text-ink/80">
            <span className="font-display text-2xl font-extrabold text-ink">
              ~{forecast.expectedAttendance}
            </span>{" "}
            expected of {forecast.registered} registered, based on a{" "}
            {forecast.historicalShowUpRate}% show-up rate across {forecast.basedOnEvents} past{" "}
            {event.category} events.
          </p>
        </div>
      )}

      {also.length > 0 && (
        <section>
          <h2 className="text-xl font-bold">Students also attended</h2>
          <p className="mt-1 text-sm text-ink/60">
            Picked from what attendees of this event registered for.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {also.map((e) => (
              <EventCard key={e._id} event={e} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
