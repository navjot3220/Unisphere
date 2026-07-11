import { Routes, Route } from "react-router-dom";
import { Navbar, Protected } from "./components/ui.jsx";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Events from "./pages/Events.jsx";
import EventDetails from "./pages/EventDetails.jsx";
import Clubs from "./pages/Clubs.jsx";
import StudentDashboard from "./pages/StudentDashboard.jsx";
import FacultyDashboard from "./pages/FacultyDashboard.jsx";
import CreateEvent from "./pages/CreateEvent.jsx";
import Attendance from "./pages/Attendance.jsx";
import AdminPanel from "./pages/AdminPanel.jsx";

export default function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventDetails />} />
          <Route path="/clubs" element={<Clubs />} />
          <Route
            path="/dashboard"
            element={
              <Protected>
                <StudentDashboard />
              </Protected>
            }
          />
          <Route
            path="/faculty"
            element={
              <Protected roles={["faculty", "admin"]}>
                <FacultyDashboard />
              </Protected>
            }
          />
          <Route
            path="/events/new"
            element={
              <Protected>
                <CreateEvent />
              </Protected>
            }
          />
          <Route
            path="/events/:id/attendance"
            element={
              <Protected roles={["student", "faculty", "admin"]}>
                <Attendance />
              </Protected>
            }
          />
          <Route
            path="/admin"
            element={
              <Protected roles={["admin"]}>
                <AdminPanel />
              </Protected>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
