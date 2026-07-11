import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { api } from "../api/client.js";
import { PageLoader } from "../components/ui.jsx";

export default function Attendance() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [scanMsg, setScanMsg] = useState(null); // { ok, text }
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef(null);
  const busyRef = useRef(false);

  const load = () =>
    api.get(`/events/${id}/attendance`).then(setReport).catch((err) => setReport({ error: err.message }));

  useEffect(() => {
    load();
    return () => stopScan();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToken = async (token) => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const d = await api.post("/registrations/check-in/qr", { token });
      setScanMsg({ ok: true, text: `✓ ${d.attendee} checked in.` });
      load();
    } catch (err) {
      setScanMsg({ ok: false, text: err.message });
    } finally {
      setTimeout(() => (busyRef.current = false), 1500);
    }
  };

  const startScan = async () => {
    setScanMsg(null);
    setScanning(true);
    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 8, qrbox: 220 },
        (decoded) => handleToken(decoded),
        () => {}
      );
    } catch {
      setScanning(false);
      setScanMsg({ ok: false, text: "Camera unavailable. Use manual check-in or paste a pass token below." });
    }
  };

  const stopScan = async () => {
    setScanning(false);
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch { /* already stopped */ }
      scannerRef.current = null;
    }
  };

  const manual = async (registrationId) => {
    setScanMsg(null);
    try {
      const d = await api.post(`/registrations/check-in/manual/${registrationId}`);
      setScanMsg({ ok: true, text: `✓ ${d.attendee} checked in manually.` });
      load();
    } catch (err) {
      setScanMsg({ ok: false, text: err.message });
    }
  };

  if (!report) return <PageLoader />;
  if (report.error) return <p className="card text-red-700">{report.error}</p>;

  const { event, registrations, summary } = report;
  const pct = summary.registered ? Math.round((summary.checkedIn / summary.registered) * 100) : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="eyebrow">Attendance</p>
        <h1 className="mt-1 text-3xl font-extrabold">{event.title}</h1>
        <p className="mt-1 text-sm text-ink/60">
          {summary.checkedIn}/{summary.registered} checked in ({pct}%)
        </p>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink/10">
          <div className="h-full bg-leaf transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold">QR scanner</h2>
          {scanning ? (
            <button className="btn-danger" onClick={stopScan}>Stop camera</button>
          ) : (
            <button className="btn-primary" onClick={startScan}>Start scanning</button>
          )}
        </div>
        <div id="qr-reader" className="mt-3 overflow-hidden rounded-xl" />
        <PasteFallback onSubmit={handleToken} />
        {scanMsg && (
          <p className={`mt-3 rounded-lg px-3 py-2 text-sm font-medium ${
            scanMsg.ok ? "bg-leaf/10 text-leaf" : "bg-red-50 text-red-700"
          }`}>
            {scanMsg.text}
          </p>
        )}
      </div>

      <div className="card !p-0">
        <h2 className="px-5 pt-4 font-display font-bold">Registered ({registrations.length})</h2>
        <ul className="mt-2 divide-y divide-ink/5">
          {registrations.map((r) => (
            <li key={r._id} className="flex items-center justify-between px-5 py-3 text-sm">
              <div>
                <p className="font-medium">{r.user?.name}</p>
                <p className="text-xs text-ink/50">{r.user?.department} · {r.user?.email}</p>
              </div>
              {r.status === "checked_in" ? (
                <span className="font-semibold text-leaf">
                  ✓ {r.checkedInBy === "qr" ? "QR" : "Manual"}
                </span>
              ) : (
                <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => manual(r._id)}>
                  Check in
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PasteFallback({ onSubmit }) {
  const [token, setToken] = useState("");
  return (
    <div className="mt-3 flex gap-2">
      <input
        className="field"
        placeholder="Or paste a pass token"
        value={token}
        onChange={(e) => setToken(e.target.value)}
      />
      <button
        className="btn-ghost"
        onClick={() => {
          if (token.trim()) onSubmit(token.trim());
          setToken("");
        }}
      >
        Verify
      </button>
    </div>
  );
}
