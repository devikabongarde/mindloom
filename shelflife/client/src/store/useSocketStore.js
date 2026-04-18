import { create } from 'zustand';
import { io } from 'socket.io-client';
import { useShelfStore } from './useShelfStore';
import { useAuthStore } from './useAuthStore';

// We import shared events if they are resolvable by Vite, otherwise define locally
// In Vite we can import from outside src if configured, or just copy them.
const EVENTS = {
  CURSOR_MOVE: 'cursor:move',
  CURSOR_UPDATE: 'cursor:update',
  LINK_ENRICHED: 'link:enriched',
  LINK_DIED: 'link:died',
  LINK_REACTED: 'link:reacted',
  SHELF_WEATHER_UPDATE: 'shelf:weather:update',
  LINK_DECAY_UPDATE: 'link:decayUpdate'
};

export const useSocketStore = create((set, get) => ({
  socket: null,
  onlineUsers: [],
  remoteCursors: {},

  connect: () => {
    if (get().socket) return;
    const socket = io('http://localhost:5000', {
       withCredentials: true
    });

    socket.on(EVENTS.CURSOR_UPDATE, (data) => {
      set(state => ({
        remoteCursors: { 
          ...state.remoteCursors, 
          [data.userId]: { x: data.x, y: data.y, username: data.username, color: data.color } 
        }
      }));
    });

    socket.on(EVENTS.LINK_ENRICHED, ({ link }) => {
      useShelfStore.getState().updateLinkEnriched(link);
    });

    socket.on(EVENTS.LINK_DIED, ({ linkId }) => {
      useShelfStore.getState().removeLink(linkId);
    });

    socket.on(EVENTS.LINK_DECAY_UPDATE, ({ linkId, decayPercent, decayStage }) => {
      useShelfStore.getState().updateLinkDecay(linkId, decayPercent, decayStage);
    });

    socket.on(EVENTS.LINK_REACTED, ({ linkId, reactions }) => {
      useShelfStore.getState().updateLinkReaction(linkId, reactions);
    });

    socket.on(EVENTS.SHELF_WEATHER_UPDATE, ({ state, activityScore }) => {
      useShelfStore.getState().updateShelfWeather(state, activityScore);
    });

    set({ socket });
  },

  joinShelf: (shelfId) => {
    const socket = get().socket;
    if (socket) socket.emit('shelf:join', { shelfId });
  },

  emitCursor: (x, y, shelfId) => {
    const socket = get().socket;
    const user = useAuthStore.getState().user;
    if (socket && user) {
      socket.emit(EVENTS.CURSOR_MOVE, { x, y, shelfId, userId: user.id, username: user.username, color: user.avatarColor });
    }
  },

  disconnect: () => {
    const socket = get().socket;
    if (socket) socket.disconnect();
    set({ socket: null });
  }
}));
