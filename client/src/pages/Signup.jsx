import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    name: "", email: "", password: "", role: "student", department: "", interests: [],
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/events/categories").then((d) => setCategories(d.categories)).catch(() => {});
  }, []);

  const toggleInterest = (c) =>
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(c)
        ? f.interests.filter((x) => x !== c)
        : [...f.interests, c],
    }));

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      const user = await signup({ ...form, department: form.department || "General" });
      navigate(user.role === "faculty" ? "/faculty" : "/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md pt-8">
      <h1 className="text-3xl font-extrabold">Create your account</h1>
      <p className="mt-1 text-sm text-ink/60">
        Pick a few interests so recommendations work from day one.
      </p>
      <div className="card mt-6 space-y-4">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div>
          <label className="label" htmlFor="name">Full name</label>
          <input id="name" className="field" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className="field" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password (8+ characters)</label>
          <input id="password" type="password" className="field" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="role">I am a</label>
            <select id="role" className="field" value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="student">Student</option>
              <option value="faculty">Faculty / Coordinator</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="department">Department</label>
            <input id="department" className="field" placeholder="e.g. Computer Science"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </div>
        </div>
        <div>
          <span className="label">Interests</span>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button key={c} type="button" onClick={() => toggleInterest(c)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  form.interests.includes(c)
                    ? "bg-violet2 text-white"
                    : "bg-white border border-ink/15 text-ink/70 hover:border-violet2"
                }`}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <button className="btn-primary w-full" onClick={submit} disabled={busy}>
          {busy ? "Creating account…" : "Sign up"}
        </button>
        <p className="text-center text-sm text-ink/60">
          Already registered? <Link to="/login" className="font-semibold text-violet2">Log in</Link>
        </p>
      </div>
    </div>
  );
}
