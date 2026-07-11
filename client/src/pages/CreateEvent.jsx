import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function CreateEvent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [slots, setSlots] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", category: "tech", location: "",
    startsAt: "", endsAt: "", capacity: 100, club: "",
  });

  useEffect(() => {
    api.get("/events/categories").then((d) => setCategories(d.categories)).catch(() => {});
    api.get("/clubs").then((d) => setClubs(d.clubs)).catch(() => {});
  }, []);

  useEffect(() => {
    api.get(`/events/smart-slots/${form.category}`).then(setSlots).catch(() => setSlots(null));
  }, [form.category]);

  const myClubIds = new Set((user.clubs || []).map((c) => String(c._id || c)));
  const clubOptions =
    user.role === "student" ? clubs.filter((c) => myClubIds.has(String(c._id))) : clubs;

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      const payload = { ...form, club: form.club || null };
      const { event } = await api.post("/events", payload);
      navigate(
        event.status === "approved" ? `/events/${event._id}` : user.role === "faculty" || user.role === "admin" ? "/faculty" : "/dashboard",
        { replace: true }
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-3xl font-extrabold">Create an event</h1>
      <p className="mt-1 text-sm text-ink/60">
        {user.role === "student"
          ? "Student events go to admin for approval and must belong to one of your clubs."
          : "Your event goes live once an admin approves it."}
      </p>

      {slots?.slots?.length > 0 && (
        <div className="mt-4 rounded-2xl bg-marigold/20 px-4 py-3 text-sm">
          💡 Best slot for <b>{form.category}</b> events: <b>{slots.slots[0].day} {slots.slots[0].slot}</b>{" "}
          (~{slots.slots[0].avgRegistrations} registrations, {slots.slots[0].showUpRate}% show-up).
        </div>
      )}

      <div className="card mt-4 space-y-4">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div>
          <label className="label">Title</label>
          <input className="field" value={form.title} onChange={set("title")} />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="field min-h-24" value={form.description} onChange={set("description")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Category</label>
            <select className="field" value={form.category} onChange={set("category")}>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Club (optional)</label>
            <select className="field" value={form.club} onChange={set("club")}>
              <option value="">— none —</option>
              {clubOptions.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Location</label>
          <input className="field" value={form.location} onChange={set("location")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Starts</label>
            <input type="datetime-local" className="field" value={form.startsAt} onChange={set("startsAt")} />
          </div>
          <div>
            <label className="label">Ends</label>
            <input type="datetime-local" className="field" value={form.endsAt} onChange={set("endsAt")} />
          </div>
        </div>
        <div>
          <label className="label">Capacity</label>
          <input type="number" min="1" className="field max-w-[140px]" value={form.capacity} onChange={set("capacity")} />
        </div>
        <button className="btn-primary w-full" onClick={submit} disabled={busy}>
          {busy ? "Submitting…" : "Submit for approval"}
        </button>
      </div>
    </div>
  );
}
