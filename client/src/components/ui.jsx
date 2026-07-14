import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate, Navigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Avatar } from "./Avatar.jsx";

export const DEFAULT_COVERS = {
  technology: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80",
  business: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80",
  arts: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=800&q=80",
  general: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80"
};

export function getCoverImage(customImage, category) {
  if (customImage) return customImage;
  return DEFAULT_COVERS[category?.toLowerCase()] || DEFAULT_COVERS.general;
}

export const CATEGORY_COLORS = {
  technology: "bg-violet2/10 text-violet2",
  business: "bg-amber-100 text-amber-700",
  arts: "bg-fuchsia-100 text-fuchsia-700",
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

  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    if (user) {
      api.get("/notifications").then(d => setNotifications(d.notifications)).catch(()=>{});
    }
  }, [user]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.put("/notifications/read-all");
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch {}
  };

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
              <div className="relative ml-2 mr-1 flex items-center">
                <button onClick={() => setShowNotifs(!showNotifs)} className="relative p-1.5 text-ink/60 hover:text-ink rounded-lg hover:bg-ink/5">
                  🔔
                  {unreadCount > 0 && <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white border-2 border-white">{unreadCount}</span>}
                </button>
                {showNotifs && (
                  <div className="absolute right-0 top-full mt-2 w-80 max-h-[80vh] overflow-y-auto rounded-2xl bg-white p-4 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-ink/5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-base">Notifications</h3>
                      {unreadCount > 0 && <button onClick={markAllRead} className="text-xs font-semibold text-violet2 hover:underline">Mark all read</button>}
                    </div>
                    {notifications.length === 0 ? (
                      <p className="text-sm text-ink/50 text-center py-6">No notifications yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {notifications.map(n => (
                          <div key={n._id} className={`p-3 rounded-xl text-sm cursor-pointer transition-colors ${n.isRead ? 'bg-ink/5 hover:bg-ink/10' : 'bg-violet2/10 hover:bg-violet2/20'}`} onClick={(e) => { markAsRead(n._id, e); navigate(`/clubs/${n.club?._id || n.club}`); setShowNotifs(false); }}>
                            <p className={`font-medium ${n.isRead ? 'text-ink/80' : 'text-violet2'}`}>{n.message}</p>
                            <p className="mt-1 text-[10px] text-ink/50">{formatWhen(n.createdAt)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
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
              <div className="ml-2 pl-4 border-l border-ink/10 flex items-center">
                <Avatar src={user.profilePicture} name={user.name} className="h-8 w-8 text-xs" />
              </div>
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
    <Link to={`/events/${event._id}`} className="card !p-0 overflow-hidden flex flex-col hover:border-violet2/50 transition-colors cursor-pointer group">
      <div className="h-40 w-full overflow-hidden relative">
        <img 
          src={getCoverImage(event.coverImage, event.category)} 
          alt={event.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
          onError={(e) => { e.target.onerror = null; e.target.src = getCoverImage(null, event.category); }}
        />
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          <CategoryBadge category={event.category} />
          {event.club?.name && (
            <span className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-black/60 text-white backdrop-blur-sm shadow-sm max-w-[150px] truncate">{event.club.name}</span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-3 p-5 flex-1">
        <div>
          <Link
            to={`/events/${event._id}`}
            className="font-display text-lg font-bold leading-snug hover:text-violet2 line-clamp-2"
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
        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className={`text-xs font-semibold ${spotsLeft <= 5 ? "text-red-600" : "text-ink/50"}`}>
            {spotsLeft <= 0 ? "Full" : `${spotsLeft} spots left`}
          </span>
          {children}
        </div>
      </div>
    </Link>
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
        <a 
          href={registration.pass.qr} 
          download={`${e.title.replace(/\s+/g, '-').toLowerCase()}-qr.png`}
          className="w-full relative block group"
          title="Download QR Code"
        >
          <img
            src={registration.pass.qr}
            alt={`QR pass for ${e.title}`}
            className="w-full rounded-lg"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
             <span className="text-white text-xs font-bold">Download</span>
          </div>
        </a>
        <p className="text-[9px] font-bold uppercase tracking-widest text-ink/70 mt-1">Admit one</p>
      </div>
    </div>
  );
}
