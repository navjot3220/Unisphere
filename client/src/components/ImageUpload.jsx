import { useState, useRef } from "react";
import { api } from "../api/client.js";

export function ImageUpload({ value, onChange, className = "" }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("File must be smaller than 5MB");
      return;
    }
    
    const ext = file.name.split('.').pop().toLowerCase();
    if (!["png", "jpg", "jpeg", "webp"].includes(ext)) {
      setError("Only PNG, JPG, or WEBP allowed");
      return;
    }

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("image", file);

    try {
      // Direct fetch to avoid standard JSON api wrapper constraints for FormData
      const token = localStorage.getItem("unisphere_token");
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

      const res = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      
      // Store the relative path returned from the server (e.g. /uploads/image.png)
      const apiBase =
        import.meta.env.VITE_API_URL || "http://localhost:5000/api";

      const baseUrl = apiBase.replace("/api", "");

      onChange(`${baseUrl}${data.url}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      // Reset input so the same file can be uploaded again if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {value ? (
        <div className="relative overflow-hidden rounded-xl group border border-ink/10 bg-ink/5 flex items-center justify-center min-h-[160px]">
          <img 
            src={value} 
            alt="Uploaded preview" 
            className="w-full h-auto object-cover max-h-64"
            onError={(e) => { e.target.onerror = null; e.target.src = "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?auto=format&fit=crop&w=400&q=80" }}
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-white text-ink text-xs font-bold rounded-lg hover:bg-gray-100"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-ink/20 rounded-xl p-8 text-center cursor-pointer hover:bg-ink/5 transition-colors flex flex-col items-center justify-center min-h-[160px]"
        >
          {loading ? (
            <span className="text-ink/60 font-medium">Uploading...</span>
          ) : (
            <>
              <span className="text-2xl mb-2">📸</span>
              <span className="text-sm font-medium text-violet2">Click to upload image</span>
              <span className="text-xs text-ink/50 mt-1">PNG, JPG, WEBP up to 5MB</span>
            </>
          )}
        </div>
      )}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/png, image/jpeg, image/webp"
        onChange={handleFileChange}
      />
      {error && <p className="text-xs text-red-600 font-medium mt-1">{error}</p>}
    </div>
  );
}
