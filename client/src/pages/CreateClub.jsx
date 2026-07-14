import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";

export default function CreateClub() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [club, setClub] = useState({ name: "", description: "", category: "general", coordinatorId: "" });
  const [clubMsg, setClubMsg] = useState(null);

  useEffect(() => {
    api.get("/events/categories").then((d) => setCategories(d.categories)).catch(() => {});
    api.get("/admin/users").then((d) => setUsers(d.users)).catch(() => {});
  }, []);

  const createClub = async () => {
    setClubMsg(null);
    try {
      await api.post("/clubs", club);
      navigate("/clubs");
    } catch (err) {
      setClubMsg({ ok: false, text: err.message });
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-3xl font-extrabold">Start a club</h1>
      <p className="mt-1 text-sm text-ink/60">
        Create a new club.
      </p>

      <div className="card mt-4 space-y-4">
        {clubMsg && (
          <p className={`rounded-lg px-3 py-2 text-sm ${clubMsg.ok ? "bg-leaf/10 text-leaf" : "bg-red-50 text-red-700"}`}>
            {clubMsg.text}
          </p>
        )}
        <div>
          <label className="label">Club name</label>
          <input className="field" placeholder="Club name" value={club.name}
            onChange={(e) => setClub({ ...club, name: e.target.value })} />
        </div>
        <div>
          <label className="label">One-line description</label>
          <input className="field" placeholder="One-line description" value={club.description}
            onChange={(e) => setClub({ ...club, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Category</label>
            <select className="field" value={club.category} onChange={(e) => setClub({ ...club, category: e.target.value })}>
              <option value="general">general</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Coordinator (Optional)</label>
            <select className="field" value={club.coordinatorId} onChange={(e) => setClub({ ...club, coordinatorId: e.target.value })}>
              <option value="">Select Coordinator</option>
              {users.filter(u => u.role === "faculty" || u.role === "admin").map(u => (
                <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>
        </div>
        <button className="btn-primary w-full mt-2" onClick={createClub} disabled={!club.name}>
          Create club
        </button>
      </div>
    </div>
  );
}
