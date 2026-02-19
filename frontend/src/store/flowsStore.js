import { create } from 'zustand';
import api from '../services/api';

const useFlowsStore = create((set, get) => ({
  flows: [],
  currentFlow: null,
  bots: [],
  loading: false,
  error: null,

  fetchFlows: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/flows');
      set({ flows: data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  fetchFlow: async (id) => {
    set({ loading: true });
    try {
      const { data } = await api.get(`/flows/${id}`);
      set({ currentFlow: data, loading: false });
      return data;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  createFlow: async (name, type = 'raffle') => {
    try {
      const { data } = await api.post('/flows', { name, type });
      set((state) => ({ flows: [...state.flows, data] }));
      return data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  updateFlow: async (id, updates) => {
    try {
      const { data } = await api.put(`/flows/${id}`, updates);
      set((state) => ({
        flows: state.flows.map((f) => (f.id === id ? data : f)),
        currentFlow: state.currentFlow?.id === id ? data : state.currentFlow,
      }));
      return data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  saveCanvas: async (id, nodes, edges) => {
    try {
      await api.post(`/flows/${id}/canvas`, { nodes, edges });
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  deleteFlow: async (id) => {
    try {
      await api.delete(`/flows/${id}`);
      set((state) => ({
        flows: state.flows.filter((f) => f.id !== id),
        currentFlow: state.currentFlow?.id === id ? null : state.currentFlow,
      }));
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  fetchBots: async () => {
    try {
      const { data } = await api.get('/bots');
      set({ bots: data });
    } catch (error) {
      console.error('Failed to fetch bots:', error);
    }
  },

  clearCurrentFlow: () => set({ currentFlow: null }),
}));

export default useFlowsStore;
