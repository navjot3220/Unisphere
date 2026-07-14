import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { api } from "../api/client.js";
import { PageLoader } from "../components/ui.jsx";
import { Avatar } from "../components/Avatar.jsx";

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

  const manualCheckIn = async (registrationId) => {
    setScanMsg(null);
    try {
      const d = await api.post(`/registrations/check-in/manual/${registrationId}`);
      setScanMsg({ ok: true, text: `✓ ${d.attendee} checked in.` });
      load();
    } catch (err) {
      setScanMsg({ ok: false, text: err.message });
    }
  };

  const manualCheckOut = async (registrationId) => {
    setScanMsg(null);
    try {
      const d = await api.post(`/registrations/check-out/manual/${registrationId}`);
      setScanMsg({ ok: true, text: `✓ ${d.attendee} checked out.` });
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

      <div className="card !p-0 overflow-hidden">
        <h2 className="px-5 pt-4 pb-2 font-display font-bold">Registered ({registrations.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink/5 text-ink/60 border-b border-ink/10">
              <tr>
                <th className="px-5 py-3 font-semibold">Student</th>
                <th className="px-5 py-3 font-semibold">Department</th>
                <th className="px-5 py-3 font-semibold">Registration</th>
                <th className="px-5 py-3 font-semibold">Attendance</th>
                <th className="px-5 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {registrations.map((r) => (
                <tr key={r._id} className="hover:bg-ink/5 transition-colors">
                  <td className="px-5 py-3 flex items-center gap-3">
                    <Avatar src={r.user?.profilePicture} name={r.user?.name} className="h-8 w-8 text-xs" />
                    <div>
                      <p className="font-medium text-ink">{r.user?.name}</p>
                      <p className="text-[10px] text-ink/50">{r.user?.email}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-ink/70">{r.user?.department}</td>
                  <td className="px-5 py-3 text-ink/70 capitalize">{r.status === "cancelled" ? "Cancelled" : "Registered"}</td>
                  <td className="px-5 py-3">
                    {r.status === "checked_in" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-leaf">
                        Checked In
                      </span>
                    ) : r.status === "checked_out" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink/50">
                        Checked Out
                      </span>
                    ) : (
                      <span className="text-xs text-ink/40">Pending</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {r.status === "registered" ? (
                      <button className="btn-ghost !px-3 !py-1 text-xs" onClick={() => manualCheckIn(r._id)}>
                        Check in
                      </button>
                    ) : (
                      <button 
                        onClick={() => r.status === "checked_in" ? manualCheckOut(r._id) : manualCheckIn(r._id)}
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95 ${r.status === 'checked_in' ? 'bg-leaf text-white' : 'bg-ink/10 text-ink/50'}`}
                        title={r.status === "checked_in" ? "Mark as Checked Out" : "Mark as Checked In"}
                      >
                        ✓
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {registrations.length === 0 && <p className="px-5 py-8 text-center text-ink/50">No registrations yet.</p>}
        </div>
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
