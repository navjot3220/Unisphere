import { Link, NavLink, useNavigate } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export const CATEGORY_COLORS = {
  tech: "bg-violet2/10 text-violet2",
  cultural: "bg-pink-100 text-pink-700",
  sports: "bg-leaf/10 text-leaf",
  academic: "bg-sky-100 text-sky-700",
  career: "bg-amber-100 text-amber-700",
  arts: "bg-fuchsia-100 text-fuchsia-700",
  social: "bg-orange-100 text-orange-700",
  workshop: "bg-indigo-100 text-indigo-700",
};

export function CategoryBadge({ category }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        CATEGORY_COLORS[category] || "bg-ink/5 text-ink/70"
      }`}
    >
      {category}
    </span>
  );
}

export function formatWhen(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dash =
    user?.role === "admin" ? "/admin" : user?.role === "faculty" ? "/faculty" : "/dashboard";

  return (
    <header className="sticky top-0 z-20 border-b border-ink/10 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="font-display text-xl font-extrabold tracking-tight">
          Uni<span className="text-violet2">Sphere</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium">
          <NavLink to="/events" className="rounded-lg px-3 py-1.5 hover:bg-ink/5">
            Events
          </NavLink>
          <NavLink to="/clubs" className="rounded-lg px-3 py-1.5 hover:bg-ink/5">
            Clubs
          </NavLink>
          {user ? (
            <>
              <NavLink to={dash} className="rounded-lg px-3 py-1.5 hover:bg-ink/5">
                Dashboard
              </NavLink>
              <button
                onClick={() => {
                  logout();
                  navigate("/");
                }}
                className="rounded-lg px-3 py-1.5 text-ink/60 hover:bg-ink/5"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="rounded-lg px-3 py-1.5 hover:bg-ink/5">
                Log in
              </NavLink>
              <Link to="/signup" className="btn-primary !py-1.5">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function Protected({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export function PageLoader() {
  return <div className="py-24 text-center text-ink/50">Loading…</div>;
}

export function EmptyState({ title, hint, action }) {
  return (
    <div className="card text-center py-10">
      <p className="font-display text-lg font-bold">{title}</p>
      {hint && <p className="mt-1 text-sm text-ink/60">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function EventCard({ event, reasons, children }) {
  const spotsLeft = event.capacity - event.registeredCount;
  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <CategoryBadge category={event.category} />
        {event.club?.name && (
          <span className="text-xs font-medium text-ink/50">{event.club.name}</span>
        )}
      </div>
      <div>
        <Link
          to={`/events/${event._id}`}
          className="font-display text-lg font-bold leading-snug hover:text-violet2"
        >
          {event.title}
        </Link>
        <p className="mt-1 text-sm text-ink/60">
          {formatWhen(event.startsAt)} · {event.location}
        </p>
      </div>
      {reasons?.length > 0 && (
        <p className="rounded-lg bg-marigold/15 px-3 py-2 text-xs font-medium text-ink/80">
          🎯 {reasons[0]}
        </p>
      )}
      <div className="mt-auto flex items-center justify-between">
        <span className={`text-xs font-semibold ${spotsLeft <= 5 ? "text-red-600" : "text-ink/50"}`}>
          {spotsLeft <= 0 ? "Full" : `${spotsLeft} spots left`}
        </span>
        {children}
      </div>
    </div>
  );
}

/**
 * Signature element: the digital pass as a perforated event ticket.
 * Left: event details. Right: marigold stub with the QR code.
 */
export function TicketPass({ registration }) {
  const e = registration.event;
  const checkedIn = registration.status === "checked_in";
  return (
    <div className="relative flex overflow-hidden rounded-2xl bg-ink text-white shadow-card">
      <div className="flex-1 p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-marigold">
          UniSphere · Digital Pass
        </p>
        <h3 className="mt-1 font-display text-lg font-bold leading-snug">{e.title}</h3>
        <p className="mt-1 text-xs text-white/70">
          {formatWhen(e.startsAt)}
          <br />
          {e.location}
        </p>
        <p className="mt-3 text-xs">
          {checkedIn ? (
            <span className="rounded-full bg-leaf px-2.5 py-1 font-semibold">✓ Checked in</span>
          ) : (
            <span className="rounded-full bg-white/10 px-2.5 py-1 font-semibold">
              Show QR at entry
            </span>
          )}
        </p>
      </div>
      <div className="relative w-0 self-stretch border-l-2 border-dashed border-white/30">
        <span className="absolute -top-3 -left-3.5 h-6 w-6 rounded-full bg-paper" />
        <span className="absolute -bottom-3 -left-3.5 h-6 w-6 rounded-full bg-paper" />
      </div>
      <div className="flex w-36 flex-col items-center justify-center gap-1 bg-marigold p-3">
        <img
          src={registration.pass.qr}
          alt={`QR pass for ${e.title}`}
          className="w-full rounded-lg"
        />
        <p className="text-[9px] font-bold uppercase tracking-widest text-ink/70">Admit one</p>
      </div>
    </div>
  );
}
