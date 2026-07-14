import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { EmptyState, PageLoader, getCoverImage } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Clubs() {
  const { user, setUser } = useAuth();
  const [clubs, setClubs] = useState(null);
  const [msg, setMsg] = useState("");

  const load = () => api.get("/clubs").then((d) => setClubs(d.clubs)).catch(() => setClubs([]));
  useEffect(() => { load(); }, []);

  const refreshMe = () => api.get("/auth/me").then((d) => setUser(d.user)).catch(() => {});

  const myClubIds = new Set((user?.clubs || []).map((c) => String(c._id || c)));

  const join = async (id) => {
    setMsg("");
    try {
      await api.post(`/clubs/${id}/join`);
      await Promise.all([load(), refreshMe()]);
    } catch (err) { setMsg(err.message); }
  };
  const leave = async (id) => {
    setMsg("");
    try {
      await api.post(`/clubs/${id}/leave`);
      await Promise.all([load(), refreshMe()]);
    } catch (err) { setMsg(err.message); }
  };

  if (!clubs) return <PageLoader />;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Clubs</h1>
          <p className="mt-1 text-sm text-ink/60">
            Join a club and its events start showing up in your recommendations.
          </p>
        </div>
        {user && user.role === "admin" && (
          <Link to="/clubs/new" className="btn-primary">
            + Add club
          </Link>
        )}
      </div>
      {msg && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{msg}</p>}
      {clubs.length === 0 ? (
        <div className="mt-6"><EmptyState title="No clubs yet" hint="Faculty can create the first one." /></div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clubs.map((c) => (
            <Link to={`/clubs/${c._id}`} key={c._id} className="card !p-0 overflow-hidden flex flex-col hover:border-violet2/50 transition-colors cursor-pointer group">
              <div className="h-32 w-full overflow-hidden relative">
                <img 
                  src={getCoverImage(c.banner, c.category)} 
                  alt={c.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  onError={(e) => { e.target.onerror = null; e.target.src = getCoverImage(null, c.category); }}
                />
              </div>
              <div className="flex flex-col gap-2 p-5 flex-1">
                <h3 className="font-display text-lg font-bold group-hover:text-violet2">{c.name}</h3>
                <p className="text-sm text-ink/60 line-clamp-2">{c.description}</p>
                <p className="text-xs text-ink/50 mt-auto pt-2">
                  {c.memberCount} member{c.memberCount === 1 ? "" : "s"} · Coordinator: {c.coordinator?.name}
                </p>
                {user && user.role === "student" && (
                  <div className="mt-2" onClick={(e) => e.preventDefault()}>
                    {myClubIds.has(String(c._id)) ? (
                      <button className="btn-ghost w-full" onClick={(e) => { e.preventDefault(); leave(c._id); }}>Leave club</button>
                    ) : (
                      <button className="btn-primary w-full" onClick={(e) => { e.preventDefault(); join(c._id); }}>Join club</button>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
