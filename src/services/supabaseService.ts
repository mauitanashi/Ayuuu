import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { ref } from 'vue';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://qqjoxfnlldujvnovtptx.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_uJ2cMitLfDDTMgVMaYDoXQ_qU2fe-m-';

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

export const currentUser = ref<User | null>(null);
export const currentSession = ref<Session | null>(null);
export const isAuthLoading = ref<boolean>(true);

// Initialize auth state
export async function initAuth() {
  try {
    const { data } = await supabase.auth.getSession();
    currentSession.value = data.session;
    currentUser.value = data.session?.user ?? null;

    supabase.auth.onAuthStateChange((_event, session) => {
      currentSession.value = session;
      currentUser.value = session?.user ?? null;
    });
  } catch (err) {
    console.warn('Supabase auth initialization error:', err);
  } finally {
    isAuthLoading.value = false;
  }
}

// Kick off initialization
initAuth();

export const SupabaseService = {
  client: supabase,

  getUser(): User | null {
    return currentUser.value;
  },

  isAuthenticated(): boolean {
    return currentUser.value !== null;
  },

  async signUp(email: string, password: string):Promise<{ user: User | null; error: Error | null }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      currentUser.value = data.user;
      currentSession.value = data.session;
      return { user: data.user, error: null };
    } catch (err: any) {
      return { user: null, error: err };
    }
  },

  async signIn(email: string, password: string): Promise<{ user: User | null; error: Error | null }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      currentUser.value = data.user;
      currentSession.value = data.session;
      return { user: data.user, error: null };
    } catch (err: any) {
      return { user: null, error: err };
    }
  },

  async signInAnonymously(): Promise<{ user: User | null; error: Error | null }> {
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      currentUser.value = data.user;
      currentSession.value = data.session;
      return { user: data.user, error: null };
    } catch (err: any) {
      return { user: null, error: err };
    }
  },

  async signOut(): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      currentUser.value = null;
      currentSession.value = null;
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  },
};
