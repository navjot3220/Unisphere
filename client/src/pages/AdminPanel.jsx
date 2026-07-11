import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { CategoryBadge, PageLoader, formatWhen } from "../components/ui.jsx";

export default function AdminPanel() {
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [insights, setInsights] = useState([]);
  const [heatmap, setHeatmap] = useState(null);
  const [users, setUsers] = useState([]);
  const [msg, setMsg] = useState("");

  const load = () => {
    api.get("/admin/stats").then(setStats).catch(() => setStats({}));
    api.get("/admin/pending-events").then((d) => setPending(d.events)).catch(() => {});
    api.get("/admin/insights").then((d) => setInsights(d.insights)).catch(() => {});
    api.get("/admin/heatmap").then(setHeatmap).catch(() => {});
    api.get("/admin/users").then((d) => setUsers(d.users)).catch(() => {});
  };
  useEffect(load, []);

  const approve = (id) =>
    api.post(`/admin/events/${id}/approve`).then(load).catch((e) => setMsg(e.message));
  const reject = (id) => {
    const reason = window.prompt("Reason for rejection (shown to the organizer):") || "";
    api.post(`/admin/events/${id}/reject`, { reason }).then(load).catch((e) => setMsg(e.message));
  };
  const setRole = (id, role) =>
    api.put(`/admin/users/${id}/role`, { role }).then(load).catch((e) => setMsg(e.message));

  if (!stats) return <PageLoader />;

  return (
    <div className="space-y-10">
      <div>
        <p className="eyebrow">Admin panel</p>
        <h1 className="mt-1 text-3xl font-extrabold">Platform overview</h1>
      </div>
      {msg && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{msg}</p>}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          [stats.users, "Users"],
          [stats.events, "Live events"],
          [stats.registrations, "Registrations"],
          [stats.checkIns, "Check-ins"],
        ].map(([v, l]) => (
          <div key={l} className="card text-center">
            <p className="font-display text-3xl font-extrabold">{v ?? "–"}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink/60">{l}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="text-xl font-bold">Approval queue ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="mt-2 text-sm text-ink/50">Queue is clear. New submissions land here.</p>
        ) : (
          <ul className="mt-4 divide-y divide-ink/5 rounded-2xl bg-white shadow-card">
            {pending.map((e) => (
              <li key={e._id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <Link to={`/events/${e._id}`} className="font-semibold hover:text-violet2">{e.title}</Link>
                  <p className="text-xs text-ink/50">
                    {formatWhen(e.startsAt)} · by {e.organizer?.name} ({e.organizer?.role})
                    {e.club?.name && ` · ${e.club.name}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <CategoryBadge category={e.category} />
                  <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={() => approve(e._id)}>Approve</button>
                  <button className="btn-danger !px-3 !py-1.5 text-xs" onClick={() => reject(e._id)}>Reject</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {insights.length > 0 && (
        <section>
          <h2 className="text-xl font-bold">💡 Automated insights</h2>
          <ul className="mt-4 space-y-2">
            {insights.map((i, idx) => (
              <li key={idx} className="card border-l-4 border-marigold py-3 text-sm">
                <span className="mr-2 rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink/60">
                  {i.type}
                </span>
                {i.message}
              </li>
            ))}
          </ul>
        </section>
      )}

      {heatmap && (
        <section>
          <h2 className="text-xl font-bold">Engagement heatmap</h2>
          <p className="mt-1 text-sm text-ink/60">Registrations by department × category.</p>
          <div className="mt-4 overflow-x-auto rounded-2xl bg-white p-4 shadow-card">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="p-2 text-left text-xs font-semibold uppercase text-ink/50">Dept</th>
                  {heatmap.categories.map((c) => (
                    <th key={c} className="p-2 text-xs font-semibold uppercase text-ink/50">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmap.departments.map((d) => {
                  const max = Math.max(1, ...Object.values(heatmap.matrix[d]));
                  return (
                    <tr key={d}>
                      <td className="p-2 font-medium">{d}</td>
                      {heatmap.categories.map((c) => {
                        const v = heatmap.matrix[d][c];
                        const alpha = v / max;
                        return (
                          <td key={c} className="p-1 text-center">
                            <div
                              className="rounded-lg py-1.5 text-xs font-semibold"
                              style={{
                                backgroundColor: `rgba(91,61,245,${0.08 + alpha * 0.8})`,
                                color: alpha > 0.55 ? "white" : "#17153A",
                              }}
                            >
                              {v}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xl font-bold">Users ({users.length})</h2>
        <ul className="mt-4 divide-y divide-ink/5 rounded-2xl bg-white shadow-card">
          {users.map((u) => (
            <li key={u._id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
              <div>
                <p className="font-medium">{u.name}</p>
                <p className="text-xs text-ink/50">{u.email} · {u.department} · engagement {u.engagementScore}</p>
              </div>
              <select className="field !w-auto !py-1.5 text-xs" value={u.role} onChange={(e) => setRole(u._id, e.target.value)}>
                <option value="student">student</option>
                <option value="faculty">faculty</option>
                <option value="admin">admin</option>
              </select>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
