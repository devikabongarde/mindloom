import { useEffect, useState, useRef } from "react";
import { getSocket } from "../utils/socket";

const CURSOR_COLORS = [
  "#F4845F",
  "#4F46E5",
  "#10B981",
  "#D946EF",
  "#F59E0B",
  "#06B6D4",
  "#EF4444",
  "#8B5CF6",
];

function getCursorColor(key = "") {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

export default function LiveCursors({ shelfId, currentUser }) {
  const [cursors, setCursors] = useState({});
  const lastSentRef = useRef(0);
  const socketRef = useRef(null);

  useEffect(() => {
    const s = getSocket();
    if (!s || !shelfId || !currentUser) return; // realtime off or missing data
    socketRef.current = s;

    const handleMouseMove = (e) => {
      const now = Date.now();
      // Emit at most every 80ms (~12.5 times/second)
      if (now - lastSentRef.current < 80) return;
      lastSentRef.current = now;

      const container = document.getElementById("shelf-container");
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
        return;
      }
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      s.emit("cursor-move", {
        shelfId,
        x: Math.round(x),
        y: Math.round(y),
        userName: currentUser?.name || "Unknown",
        userId: currentUser?._id || currentUser?.id || null,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);

    s.on("cursor-update", ({ socketId, userName, userId, x, y }) => {
      setCursors((prev) => ({ ...prev, [socketId]: { userName, userId, x, y } }));
    });

    s.on("presence-update", ({ type, socketId }) => {
      if (type === "leave") {
        setCursors((prev) => {
          const copy = { ...prev };
          delete copy[socketId];
          return copy;
        });
      }
    });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      s.off("cursor-update");
      s.off("presence-update");
      setCursors({});
    };
  }, [shelfId, currentUser]);

  if (!getSocket()) return null; // nothing to render if realtime off

  return (
    <>
      {Object.entries(cursors).map(([id, { userName, userId, x, y }]) => {
        const color = getCursorColor(String(userId || userName || id));
        return (
          <div
            key={id}
            style={{ left: `${x}%`, top: `${y}%` }}
            className="absolute pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-75"
          >
            <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }} />
            <span className="text-[10px] text-white px-1.5 py-0.5 rounded-full whitespace-nowrap ml-1 absolute top-0 left-3" style={{ backgroundColor: "#1A1A2E" }}>
              {userName}
            </span>
          </div>
        );
      })}
    </>
  );
}