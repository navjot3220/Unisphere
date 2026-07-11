import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      const user = await login(form.email, form.password);
      navigate(user.role === "admin" ? "/admin" : user.role === "faculty" ? "/faculty" : "/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm pt-8">
      <h1 className="text-3xl font-extrabold">Welcome back</h1>
      <p className="mt-1 text-sm text-ink/60">Log in to see your passes and recommendations.</p>
      <div className="card mt-6 space-y-4">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className="field" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && submit()} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" className="field" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && submit()} />
        </div>
        <button className="btn-primary w-full" onClick={submit} disabled={busy}>
          {busy ? "Logging in…" : "Log in"}
        </button>
        <p className="text-center text-sm text-ink/60">
          New here? <Link to="/signup" className="font-semibold text-violet2">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
