import { io } from "socket.io-client";

const URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
const REALTIME_ENABLED = import.meta.env.VITE_REALTIME_ENABLED === "true";

let socket = null;

export function getSocket() {
  if (!REALTIME_ENABLED) return null;
  if (!socket) {
    socket = io(URL, {
      autoConnect: false,
    });
  }
  return socket;
}