import { useEffect, useState, useRef } from "react";
import { getSocket } from "../utils/socket";

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
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      s.emit("cursor-move", {
        shelfId,
        x: Math.round(x),
        y: Math.round(y),
        userName: currentUser?.name || "Unknown",
      });
    };

    window.addEventListener("mousemove", handleMouseMove);

    s.on("cursor-update", ({ socketId, userName, x, y }) => {
      setCursors((prev) => ({ ...prev, [socketId]: { userName, x, y } }));
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
    };
  }, [shelfId, currentUser]);

  if (!getSocket()) return null; // nothing to render if realtime off

  return (
    <>
      {Object.entries(cursors).map(([id, { userName, x, y }]) => (
        <div
          key={id}
          style={{ left: `${x}%`, top: `${y}%` }}
          className="absolute pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-75"
        >
          <div className="w-3 h-3 rounded-full bg-[#F4845F] shadow-lg shadow-[#F4845F]/50" />
          <span className="text-[10px] bg-[#1A1A2E] text-white px-1.5 py-0.5 rounded-full whitespace-nowrap ml-1 absolute top-0 left-3">
            {userName}
          </span>
        </div>
      ))}
    </>
  );
}