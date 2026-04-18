import { create } from 'zustand';
import api from '../lib/api';

export const useShelfStore = create((set, get) => ({
  activeShelf: null,
  shelves: [],
  loading: false,

  fetchShelves: async () => {
    set({ loading: true });
    try {
      const res = await api.get('/shelves');
      set({ shelves: res.data, loading: false });
    } catch (err) {
      console.error(err);
      set({ loading: false });
    }
  },

  fetchShelf: async (id) => {
    set({ loading: true });
    try {
      const res = await api.get(`/shelves/${id}`);
      set({ activeShelf: res.data, loading: false });
    } catch (err) {
      console.error(err);
      set({ loading: false });
    }
  },

  addLinkToShelf: async (url, shelfId) => {
    try {
      // Optimistic or real addition: we wait for initial API return of 'pending' link
      const res = await api.post('/links', { url, shelfId });
      set((state) => {
        if (state.activeShelf && state.activeShelf._id === shelfId) {
          return { activeShelf: { ...state.activeShelf, links: [res.data, ...state.activeShelf.links] } }
        }
        return state;
      });
    } catch (err) {
      console.error(err);
    }
  },

  clickLink: async (linkId) => {
    try {
      const res = await api.post(`/links/${linkId}/click`);
      const clickedAt = res.data?.lastClickedAt ? new Date(res.data.lastClickedAt).toISOString() : new Date().toISOString();
      set((state) => {
        if (!state.activeShelf) return state;
        const newLinks = state.activeShelf.links.map((l) =>
          l._id === linkId
            ? {
                ...l,
                lastClickedAt: clickedAt,
                decayPercent: 0,
                decayStage: 0,
                clickCount: (l.clickCount || 0) + 1,
              }
            : l
        );
        return { activeShelf: { ...state.activeShelf, links: newLinks } };
      });
      return res.data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  },

  reactToLink: async (linkId, emoji) => {
    try {
      const res = await api.post(`/links/${linkId}/react`, { emoji });
      const reactions = res.data?.reactions || [];
      set((state) => {
        if (!state.activeShelf) return state;
        const newLinks = state.activeShelf.links.map((l) =>
          l._id === linkId ? { ...l, reactions } : l
        );
        return { activeShelf: { ...state.activeShelf, links: newLinks } };
      });
      return reactions;
    } catch (err) {
      console.error(err);
      throw err;
    }
  },

  updateLinkEnriched: (enrichedLink) => {
    set((state) => {
      if (!state.activeShelf) return state;
      const newLinks = state.activeShelf.links.map(l => l._id === enrichedLink._id ? enrichedLink : l);
      return { activeShelf: { ...state.activeShelf, links: newLinks } };
    });
  },

  removeLink: (linkId) => {
    set((state) => {
      if (!state.activeShelf) return state;
      const newLinks = state.activeShelf.links.filter(l => l._id !== linkId);
      return { activeShelf: { ...state.activeShelf, links: newLinks } };
    });
  },
  
  updateLinkDecay: (linkId, decayPercent, decayStage) => {
    set((state) => {
      if (!state.activeShelf) return state;
      const newLinks = state.activeShelf.links.map(l => 
        l._id === linkId ? { ...l, decayPercent, decayStage } : l
      );
      return { activeShelf: { ...state.activeShelf, links: newLinks } };
    });
  },
  
  updateLinkReaction: (linkId, reactions) => {
    set((state) => {
      if (!state.activeShelf) return state;
      const newLinks = state.activeShelf.links.map(l => {
        if (l._id === linkId) return { ...l, reactions: reactions || l.reactions || [] };
        return l;
      });
      return { activeShelf: { ...state.activeShelf, links: newLinks } };
    });
  },

  updateShelfWeather: (stateName, activityScore) => {
    set((state) => {
      if (!state.activeShelf) return state;
      return {
        activeShelf: {
          ...state.activeShelf,
          weather: {
            ...(state.activeShelf.weather || {}),
            state: stateName,
            activityScore,
          },
        },
      };
    });
  }

}));
