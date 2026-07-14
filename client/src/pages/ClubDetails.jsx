import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { PageLoader, EventCard, CategoryBadge, formatWhen, getCoverImage } from "../components/ui.jsx";
import { Avatar } from "../components/Avatar.jsx";
import { ImageUpload } from "../components/ImageUpload.jsx";

export default function ClubDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  
  const [club, setClub] = useState(null);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [notices, setNotices] = useState([]);
  
  const [activeTab, setActiveTab] = useState("info"); // 'info', 'notices', 'members'
  const [memberSearch, setMemberSearch] = useState("");
  
  // Notice Modal State
  const [showModal, setShowModal] = useState(false);
  const [noticeForm, setNoticeForm] = useState({ title: "", description: "", priority: "General", attachment: "" });
  const [editingNoticeId, setEditingNoticeId] = useState(null);
  const [noticeError, setNoticeError] = useState("");

  // Edit Club State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "", category: "", banner: "", logo: "" });
  const [editError, setEditError] = useState("");

  const loadClub = () => {
    api.get(`/clubs/${id}`).then((d) => {
      setClub(d.club);
      setUpcomingEvents(d.upcomingEvents);
    }).catch(() => setClub(null));
  };

  const loadNotices = () => {
    api.get(`/clubs/${id}/notices`).then((d) => setNotices(d.notices)).catch(() => {});
  };

  useEffect(() => {
    loadClub();
    loadNotices();
  }, [id]);

  if (!club) return <PageLoader />;

  const isCoordinator = user && club.coordinator && (String(club.coordinator._id) === String(user._id) || user.role === "admin");

  const filteredMembers = club.members?.filter(m => 
    m.name.toLowerCase().includes(memberSearch.toLowerCase()) || 
    m.department.toLowerCase().includes(memberSearch.toLowerCase())
  ) || [];

  const handlePostNotice = async () => {
    setNoticeError("");
    try {
      if (editingNoticeId) {
        await api.put(`/clubs/${id}/notices/${editingNoticeId}`, noticeForm);
      } else {
        await api.post(`/clubs/${id}/notices`, noticeForm);
      }
      setShowModal(false);
      setNoticeForm({ title: "", description: "", priority: "General", attachment: "" });
      setEditingNoticeId(null);
      loadNotices();
    } catch (err) {
      setNoticeError(err.message);
    }
  };

  const handleDeleteNotice = async (noticeId) => {
    if (!window.confirm("Delete this notice?")) return;
    try {
      await api.del(`/clubs/${id}/notices/${noticeId}`);
      loadNotices();
    } catch (err) {
      alert(err.message);
    }
  };

  const openEditModal = (notice) => {
    setNoticeForm({
      title: notice.title,
      description: notice.description,
      priority: notice.priority,
      attachment: notice.attachment || ""
    });
    setEditingNoticeId(notice._id);
    setShowModal(true);
  };

  const openEditClubModal = () => {
    setEditForm({
      name: club.name,
      description: club.description,
      category: club.category,
      banner: club.banner || "",
      logo: club.logo || "",
    });
    setEditError("");
    setShowEditModal(true);
  };

  const handleUpdateClub = async () => {
    setEditError("");
    try {
      await api.put(`/clubs/${id}`, editForm);
      setShowEditModal(false);
      loadClub();
    } catch (err) {
      setEditError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner & Header */}
      <div className="relative overflow-hidden rounded-3xl bg-white shadow-card">
        <div className="h-48 w-full relative bg-ink/5">
          <img 
            src={getCoverImage(club.banner, club.category)} 
            alt={`${club.name} banner`} 
            className="w-full h-full object-cover" 
            onError={(e) => { e.target.onerror = null; e.target.src = getCoverImage(null, club.category); }}
          />
        </div>
        <div className="relative px-8 pb-8 pt-16 sm:px-10">
          <div className="absolute -top-12 left-8 sm:left-10 h-24 w-24 rounded-2xl border-4 border-white bg-white shadow-md overflow-hidden flex items-center justify-center">
            {club.logo ? (
              <img 
                src={club.logo} 
                alt={club.name} 
                className="w-full h-full object-cover" 
                onError={(e) => { e.target.onerror = null; e.target.src = "https://ui-avatars.com/api/?name=" + encodeURIComponent(club.name) + "&background=random"; }}
              />
            ) : (
              <span className="text-3xl font-bold text-violet2">{club.name[0]}</span>
            )}
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-extrabold">{club.name}</h1>
                {user?.role === "admin" && (
                  <button onClick={openEditClubModal} className="btn-ghost !px-2 !py-1 text-xs">Edit</button>
                )}
              </div>
              <div className="mt-2 flex items-center gap-3">
                <CategoryBadge category={club.category} />
                <span className="text-sm font-medium text-ink/60">
                  Created {new Date(club.createdAt).getFullYear()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-ink/10">
        {["info", "notices", "members"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-semibold capitalize transition-colors ${
              activeTab === tab ? "border-b-2 border-violet2 text-violet2" : "text-ink/60 hover:text-ink"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Info Tab */}
      {activeTab === "info" && (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <div className="card">
              <h2 className="text-xl font-bold">About</h2>
              <p className="mt-3 text-ink/80 whitespace-pre-wrap leading-relaxed">{club.description || "No description provided."}</p>
            </div>
            
            <div>
              <h2 className="text-xl font-bold">Upcoming Events</h2>
              {upcomingEvents.length === 0 ? (
                <p className="mt-3 text-sm text-ink/60">No upcoming events.</p>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {upcomingEvents.map(e => <EventCard key={e._id} event={e} />)}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <div className="card">
              <h3 className="font-bold text-sm uppercase tracking-wider text-ink/50">Coordinator</h3>
              <div className="mt-3 flex items-center gap-3">
                <Avatar src={club.coordinator?.profilePicture} name={club.coordinator?.name} className="h-10 w-10 text-sm" />
                <div>
                  <p className="font-semibold">{club.coordinator?.name}</p>
                  <p className="text-xs text-ink/60">{club.coordinator?.department}</p>
                </div>
              </div>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-extrabold">{club.members?.length || 0}</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">Total Members</p>
            </div>
          </div>
        </div>
      )}

      {/* Notices Tab */}
      {activeTab === "notices" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Notice Board</h2>
            {isCoordinator && (
              <button className="btn-primary" onClick={() => { setEditingNoticeId(null); setNoticeForm({ title: "", description: "", priority: "General", attachment: "" }); setShowModal(true); }}>
                + Post Notice
              </button>
            )}
          </div>
          
          {notices.length === 0 ? (
            <div className="card py-10 text-center"><p className="text-ink/60">No notices posted yet.</p></div>
          ) : (
            <div className="space-y-4">
              {notices.map(notice => (
                <div key={notice._id} className="card relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-1 h-full ${notice.priority === 'Important' ? 'bg-red-500' : notice.priority === 'Event' ? 'bg-marigold' : 'bg-violet2'}`} />
                  <div className="pl-3 flex flex-wrap gap-4 justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${notice.priority === 'Important' ? 'bg-red-100 text-red-700' : notice.priority === 'Event' ? 'bg-amber-100 text-amber-700' : 'bg-violet2/10 text-violet2'}`}>
                          {notice.priority}
                        </span>
                        <span className="text-xs text-ink/50">{formatWhen(notice.createdAt)}</span>
                      </div>
                      <h3 className="text-lg font-bold">{notice.title}</h3>
                      <p className="mt-2 text-ink/80 text-sm whitespace-pre-wrap">{notice.description}</p>
                      
                      {notice.attachment && (
                        <a href={notice.attachment} target="_blank" rel="noreferrer" className="inline-block mt-3 text-sm text-violet2 hover:underline">
                          📎 View Attachment
                        </a>
                      )}
                      
                      <div className="mt-4 flex items-center gap-2 text-xs text-ink/60">
                        <span>Posted by <span className="font-medium text-ink">{notice.author?.name}</span></span>
                      </div>
                    </div>
                    
                    {isCoordinator && (
                      <div className="flex gap-2">
                        <button className="text-xs font-semibold text-ink/60 hover:text-violet2" onClick={() => openEditModal(notice)}>Edit</button>
                        <button className="text-xs font-semibold text-ink/60 hover:text-red-600" onClick={() => handleDeleteNotice(notice._id)}>Delete</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Members Tab */}
      {activeTab === "members" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center flex-wrap gap-3">
            <h2 className="text-xl font-bold">Members ({club.members?.length || 0})</h2>
            <input 
              className="field max-w-xs" 
              placeholder="Search members..." 
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {filteredMembers.map(m => (
              <div key={m._id} className="card flex items-center gap-3">
                <Avatar src={m.profilePicture} name={m.name} className="h-12 w-12 text-sm" />
                <div>
                  <p className="font-semibold text-sm">{m.name}</p>
                  <p className="text-xs text-ink/60">{m.department} {m.academicYear && `· Year ${m.academicYear}`}</p>
                  <p className="text-[10px] mt-1 font-bold uppercase tracking-wider text-violet2">
                    {String(club.coordinator?._id) === String(m._id) ? "Coordinator" : "Member"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notice Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-paper p-6 shadow-2xl">
            <h2 className="font-display text-xl font-bold">{editingNoticeId ? "Edit Notice" : "Post Notice"}</h2>
            {noticeError && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{noticeError}</p>}
            
            <div className="mt-4 space-y-4">
              <div>
                <label className="label">Title</label>
                <input className="field" value={noticeForm.title} onChange={e => setNoticeForm({...noticeForm, title: e.target.value})} />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="field min-h-24" value={noticeForm.description} onChange={e => setNoticeForm({...noticeForm, description: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Priority</label>
                  <select className="field" value={noticeForm.priority} onChange={e => setNoticeForm({...noticeForm, priority: e.target.value})}>
                    <option value="General">General</option>
                    <option value="Important">Important</option>
                    <option value="Event">Event</option>
                  </select>
                </div>
                <div>
                  <label className="label">Attachment URL (optional)</label>
                  <input className="field" value={noticeForm.attachment} onChange={e => setNoticeForm({...noticeForm, attachment: e.target.value})} />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn-primary" onClick={handlePostNotice} disabled={!noticeForm.title || !noticeForm.description}>
                  {editingNoticeId ? "Save Changes" : "Publish Notice"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Club Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-paper p-6 shadow-2xl">
            <h2 className="font-display text-xl font-bold">Edit Club Info</h2>
            {editError && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{editError}</p>}
            
            <div className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto px-1">
              <div>
                <label className="label">Name</label>
                <input className="field" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="field min-h-24" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} />
              </div>
              <div>
                <label className="label">Category</label>
                <select className="field" value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})}>
                  {["technology", "business", "arts"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Banner Cover</label>
                  <ImageUpload value={editForm.banner} onChange={v => setEditForm({...editForm, banner: v})} />
                </div>
                <div>
                  <label className="label">Club Logo</label>
                  <ImageUpload value={editForm.logo} onChange={v => setEditForm({...editForm, logo: v})} />
                </div>
              </div>
              
              <div className="pt-2 flex justify-end gap-3">
                <button className="btn-ghost" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button className="btn-primary" onClick={handleUpdateClub} disabled={!editForm.name}>
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
