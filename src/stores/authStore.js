import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

export const useAuthStore = create((set, get) => ({
  session: null,
  user: null,
  authLoading: true,
  authError: null,

  init: async () => {
    set({ authLoading: true, authError: null });

    const { data, error } = await supabase.auth.getSession();
    if (error) {
      set({ authLoading: false, authError: error.message, session: null, user: null });
      return;
    }

    set({
      authLoading: false,
      session: data.session,
      user: data.session?.user ?? null,
      authError: null
    });

    supabase.auth.onAuthStateChange((_event, newSession) => {
      set({
        session: newSession,
        user: newSession?.user ?? null,
        authLoading: false,
        authError: null
      });
    });
  },

  signOut: async () => {
    set({ authError: null });
    const { error } = await supabase.auth.signOut();
    if (error) set({ authError: error.message });
  }
}));
