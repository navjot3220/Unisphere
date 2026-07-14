import { useState } from "react";

const COLORS = [
  "bg-violet2",
  "bg-pink-600",
  "bg-leaf",
  "bg-sky-600",
  "bg-amber-500",
  "bg-fuchsia-600",
  "bg-orange-500",
  "bg-indigo-600",
];

function getInitials(name) {
  if (!name) return "?";
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getColorIndex(name) {
  if (!name) return 0;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % COLORS.length;
}

export function Avatar({ src, name, className = "h-10 w-10 text-sm" }) {
  const [imgError, setImgError] = useState(false);

  if (src && !imgError) {
    return (
      <div className={`overflow-hidden rounded-full flex-shrink-0 ${className}`}>
        <img 
          src={src} 
          alt={name} 
          className="h-full w-full object-cover" 
          onError={() => setImgError(true)} 
        />
      </div>
    );
  }

  const colorClass = COLORS[getColorIndex(name)];
  
  return (
    <div className={`flex items-center justify-center rounded-full text-white font-bold flex-shrink-0 ${colorClass} ${className}`}>
      {getInitials(name)}
    </div>
  );
}
