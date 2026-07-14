import { useState, useEffect } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { ImageUpload } from "../components/ImageUpload.jsx";
import { PageLoader } from "../components/ui.jsx";

export default function ProfileSettings() {
  const { user, setUser } = useAuth();
  const [formData, setFormData] = useState(null);
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        bio: user.bio || "",
        department: user.department || "",
        academicYear: user.academicYear || "",
        designation: user.designation || "",
        profilePicture: user.profilePicture || "",
      });
    }
  }, [user]);

  if (!formData) return <PageLoader />;

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const saveProfile = async (e) => {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    try {
      const res = await api.put("/auth/me", formData);
      setUser(res.user);
      setMsg({ ok: true, text: "Profile updated successfully." });
    } catch (err) {
      setMsg({ ok: false, text: err.message || "Failed to update profile." });
    } finally {
      setSaving(false);
    }
  };

  const isStudent = user.role === "student";
  const isFacultyOrAdmin = ["faculty", "admin"].includes(user.role);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold">Edit Profile</h1>
        <p className="mt-1 text-sm text-ink/60">Manage your personal information and profile picture.</p>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl text-sm font-medium ${msg.ok ? "bg-leaf/10 text-leaf" : "bg-red-50 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      <form onSubmit={saveProfile} className="card space-y-6">
        <div>
          <label className="label">Profile Picture</label>
          <div className="mt-2 max-w-sm">
            <ImageUpload 
              value={formData.profilePicture} 
              onChange={(url) => setFormData({ ...formData, profilePicture: url })}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Full Name</label>
            <input 
              required
              className="field" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input 
              required
              type="email"
              className="field" 
              name="email" 
              value={formData.email} 
              onChange={handleChange} 
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Phone Number</label>
            <input 
              type="tel"
              className="field" 
              name="phone" 
              value={formData.phone} 
              onChange={handleChange} 
              placeholder="+1 234 567 8900"
            />
          </div>
          <div>
            <label className="label">Department</label>
            <input 
              className="field" 
              name="department" 
              value={formData.department} 
              onChange={handleChange} 
            />
          </div>
        </div>

        {isStudent && (
          <div>
            <label className="label">Academic Year</label>
            <input 
              className="field" 
              name="academicYear" 
              value={formData.academicYear} 
              onChange={handleChange} 
              placeholder="e.g. 3rd Year"
            />
          </div>
        )}

        {isFacultyOrAdmin && (
          <div>
            <label className="label">Designation</label>
            <input 
              className="field" 
              name="designation" 
              value={formData.designation} 
              onChange={handleChange} 
              placeholder="e.g. Associate Professor"
            />
          </div>
        )}

        <div>
          <label className="label">Bio / About Me</label>
          <textarea 
            className="field min-h-[100px]" 
            name="bio" 
            value={formData.bio} 
            onChange={handleChange} 
            placeholder="Tell us a bit about yourself..."
          />
        </div>

        <div className="pt-2">
          <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
