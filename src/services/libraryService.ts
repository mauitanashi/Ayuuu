import { ref } from 'vue';
import { supabase, currentUser } from './supabaseService';

export type MediaType = 'ANIME' | 'MANGA' | 'MUSIC';
export type EntryStatus =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'DROPPED'
  | 'ON_HOLD';

export interface LibraryEntry {
  id: string; // UUID
  user_id?: string;
  media_type: MediaType;
  source_id: string;
  source_key: string;
  remote_media_id?: string;
  kitsu_id?: string;
  kitsu_slug?: string;
  kitsu_cover_url?: string;
  kitsu_original_title?: string;
  kitsu_rating?: number;
  mal_id?: number;
  artwork_url?: string;
  local_artwork_path?: string;
  title: string;
  subtitle?: string;
  author?: string;
  description?: string;
  genres: string[];
  release_year?: number;
  status: EntryStatus;
  progress: number;
  total_units: number;
  current_unit_index: number;
  current_unit_title?: string;
  score: number;
  is_favorite: boolean;
  categories: string[];
  last_position_ms: number;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
}

const LOCAL_STORAGE_KEY = 'ayuuu_library_entries_v1';

// Reactive local state
export const libraryEntries = ref<LibraryEntry[]>([]);
export const isSyncing = ref<boolean>(false);
export const lastSyncTime = ref<Date | null>(null);
export const syncError = ref<string | null>(null);

function loadLocalEntries(): LibraryEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Failed to load local library entries:', e);
    return [];
  }
}

function saveLocalEntries(entries: LibraryEntry[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(entries));
    libraryEntries.value = [...entries];
  } catch (e) {
    console.warn('Failed to save local library entries:', e);
  }
}

// Generate valid UUID
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Format date to ISO
function nowIso(): string {
  return new Date().toISOString();
}

export const LibraryService = {
  /**
   * Initializes library data from local cache and syncs with Supabase if online.
   */
  async init() {
    libraryEntries.value = loadLocalEntries();
    if (currentUser.value) {
      await this.syncWithSupabase();
    }
  },

  /**
   * Returns all entries filtered by optional media type.
   */
  getEntries(mediaType?: MediaType): LibraryEntry[] {
    if (!mediaType) return libraryEntries.value;
    return libraryEntries.value.filter((e) => e.media_type === mediaType);
  },

  /**
   * Finds an entry by its source key (e.g. anime ID, manga slug, track ID).
   */
  findEntryBySource(mediaType: MediaType, sourceId: string, sourceKey: string): LibraryEntry | undefined {
    return libraryEntries.value.find(
      (e) =>
        e.media_type === mediaType &&
        e.source_id === sourceId &&
        e.source_key === sourceKey
    );
  },

  /**
   * Adds or updates a library entry locally and to Supabase.
   */
  async upsertEntry(entryData: Partial<LibraryEntry> & { title: string; media_type: MediaType; source_id: string; source_key: string }): Promise<LibraryEntry> {
    const entries = loadLocalEntries();
    const existingIndex = entries.findIndex(
      (e) =>
        (entryData.id && e.id === entryData.id) ||
        (e.media_type === entryData.media_type &&
          e.source_id === entryData.source_id &&
          e.source_key === entryData.source_key)
    );

    const now = nowIso();
    const user = currentUser.value;

    let target: LibraryEntry;

    if (existingIndex >= 0) {
      target = {
        ...entries[existingIndex],
        ...entryData,
        updated_at: now,
        last_activity_at: now,
      };
      if (user) target.user_id = user.id;
      entries[existingIndex] = target;
    } else {
      target = {
        id: entryData.id || generateUUID(),
        user_id: user ? user.id : undefined,
        media_type: entryData.media_type,
        source_id: entryData.source_id,
        source_key: entryData.source_key,
        remote_media_id: entryData.remote_media_id,
        kitsu_id: entryData.kitsu_id,
        kitsu_slug: entryData.kitsu_slug,
        kitsu_cover_url: entryData.kitsu_cover_url,
        kitsu_original_title: entryData.kitsu_original_title,
        kitsu_rating: entryData.kitsu_rating,
        mal_id: entryData.mal_id,
        artwork_url: entryData.artwork_url,
        local_artwork_path: entryData.local_artwork_path,
        title: entryData.title,
        subtitle: entryData.subtitle,
        author: entryData.author,
        description: entryData.description,
        genres: entryData.genres || [],
        release_year: entryData.release_year,
        status: entryData.status || 'IN_PROGRESS',
        progress: entryData.progress ?? 0,
        total_units: entryData.total_units ?? 0,
        current_unit_index: entryData.current_unit_index ?? 0,
        current_unit_title: entryData.current_unit_title,
        score: entryData.score ?? 0,
        is_favorite: entryData.is_favorite ?? false,
        categories: entryData.categories || [],
        last_position_ms: entryData.last_position_ms ?? 0,
        is_deleted: false,
        created_at: now,
        updated_at: now,
        last_activity_at: now,
      };
      entries.unshift(target);
    }

    saveLocalEntries(entries);

    // If authenticated, push immediately to Supabase
    if (user) {
      try {
        const payload = {
          ...target,
          user_id: user.id,
        };
        const { error } = await supabase.from('library_entries').upsert(payload);
        if (error) {
          console.warn('Supabase upsert entry warning:', error.message);
          syncError.value = error.message;
        } else {
          syncError.value = null;
          lastSyncTime.value = new Date();
        }
      } catch (err: any) {
        console.warn('Failed to sync entry to Supabase:', err);
      }
    }

    return target;
  },

  /**
   * Removes an entry from local library and Supabase.
   */
  async deleteEntry(id: string): Promise<void> {
    const entries = loadLocalEntries().filter((e) => e.id !== id);
    saveLocalEntries(entries);

    const user = currentUser.value;
    if (user) {
      try {
        await supabase
          .from('library_entries')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);
      } catch (err) {
        console.warn('Failed to delete entry from Supabase:', err);
      }
    }
  },

  /**
   * Toggles favorite status.
   */
  async toggleFavorite(id: string): Promise<boolean> {
    const entries = loadLocalEntries();
    const entry = entries.find((e) => e.id === id);
    if (!entry) return false;

    entry.is_favorite = !entry.is_favorite;
    entry.updated_at = nowIso();
    saveLocalEntries(entries);

    const user = currentUser.value;
    if (user) {
      try {
        await supabase
          .from('library_entries')
          .update({ is_favorite: entry.is_favorite, updated_at: entry.updated_at })
          .eq('id', id)
          .eq('user_id', user.id);
      } catch (err) {
        console.warn('Failed to update favorite in Supabase:', err);
      }
    }

    return entry.is_favorite;
  },

  /**
   * Updates playback / reading progress.
   */
  async updateProgress(id: string, unitIndex: number, unitTitle?: string, positionMs = 0): Promise<void> {
    const entries = loadLocalEntries();
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;

    entry.current_unit_index = unitIndex;
    if (unitTitle) entry.current_unit_title = unitTitle;
    entry.last_position_ms = positionMs;
    entry.last_activity_at = nowIso();
    entry.updated_at = nowIso();

    if (entry.total_units > 0) {
      entry.progress = Math.min(1, Math.max(0, unitIndex / entry.total_units));
      if (entry.progress >= 1) {
        entry.status = 'COMPLETED';
      }
    }

    saveLocalEntries(entries);

    const user = currentUser.value;
    if (user) {
      try {
        await supabase
          .from('library_entries')
          .update({
            current_unit_index: entry.current_unit_index,
            current_unit_title: entry.current_unit_title,
            last_position_ms: entry.last_position_ms,
            progress: entry.progress,
            status: entry.status,
            updated_at: entry.updated_at,
            last_activity_at: entry.last_activity_at,
          })
          .eq('id', id)
          .eq('user_id', user.id);
      } catch (e) {
        console.warn('Failed to sync progress to Supabase:', e);
      }
    }
  },

  /**
   * Updates status (PLANNED, IN_PROGRESS, COMPLETED, DROPPED, ON_HOLD).
   */
  async updateStatus(id: string, status: EntryStatus): Promise<void> {
    const entries = loadLocalEntries();
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;

    entry.status = status;
    entry.updated_at = nowIso();
    saveLocalEntries(entries);

    const user = currentUser.value;
    if (user) {
      try {
        await supabase
          .from('library_entries')
          .update({ status: entry.status, updated_at: entry.updated_at })
          .eq('id', id)
          .eq('user_id', user.id);
      } catch (e) {
        console.warn('Failed to update status in Supabase:', e);
      }
    }
  },

  /**
   * Full bidirectional sync with Supabase.
   */
  async syncWithSupabase(): Promise<void> {
    const user = currentUser.value;
    if (!user) {
      syncError.value = 'Sign in to sync your library with Supabase cloud.';
      return;
    }

    isSyncing.value = true;
    syncError.value = null;

    try {
      // 1. Pull entries from Supabase
      const { data: remoteEntries, error } = await supabase
        .from('library_entries')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      const local = loadLocalEntries();
      const mergedMap = new Map<string, LibraryEntry>();

      // Put remote entries into map
      if (remoteEntries && remoteEntries.length > 0) {
        for (const r of remoteEntries) {
          mergedMap.set(r.id, r as LibraryEntry);
        }
      }

      // Check local entries: if not in remote or local is newer, push to Supabase
      const toUpload: LibraryEntry[] = [];
      for (const loc of local) {
        loc.user_id = user.id;
        const remote = mergedMap.get(loc.id);
        if (!remote) {
          mergedMap.set(loc.id, loc);
          toUpload.push(loc);
        } else {
          // Compare updated_at
          const locTime = new Date(loc.updated_at || 0).getTime();
          const remTime = new Date(remote.updated_at || 0).getTime();
          if (locTime > remTime) {
            mergedMap.set(loc.id, loc);
            toUpload.push(loc);
          }
        }
      }

      // Upload newer local entries to Supabase
      if (toUpload.length > 0) {
        const { error: uploadError } = await supabase
          .from('library_entries')
          .upsert(toUpload);
        if (uploadError) console.warn('Sync upload warning:', uploadError.message);
      }

      const mergedList = Array.from(mergedMap.values()).sort(
        (a, b) =>
          new Date(b.updated_at || 0).getTime() -
          new Date(a.updated_at || 0).getTime()
      );

      saveLocalEntries(mergedList);
      lastSyncTime.value = new Date();
    } catch (err: any) {
      console.error('Supabase sync error:', err);
      syncError.value = err.message || 'Sync failed';
    } finally {
      isSyncing.value = false;
    }
  },

  /**
   * Seeds realistic demo data into the library and Supabase so the user can immediately test!
   */
  async seedDemoLibrary(): Promise<void> {
    const demoItems: Array<Partial<LibraryEntry> & { title: string; media_type: MediaType; source_id: string; source_key: string }> = [
      {
        title: 'Solo Leveling',
        media_type: 'ANIME',
        source_id: 'hianime',
        source_key: 'solo-leveling-season-2-19413',
        artwork_url: 'https://cdn.anipixcdn.co/thumbnail/8500cd4427ccbc38d536e34f1014924f.jpg',
        subtitle: 'Ore dake Level Up na Ken',
        author: 'Chugong',
        description: 'In a world where hunters battle deadly monsters, Sung Jinwoo is the weakest of them all.',
        genres: ['Action', 'Fantasy', 'Supernatural'],
        status: 'IN_PROGRESS',
        progress: 0.33,
        total_units: 12,
        current_unit_index: 4,
        current_unit_title: 'Episode 4: I Have to Get Stronger',
        score: 10,
        is_favorite: true,
        categories: ['Watching', 'Favorites'],
        last_position_ms: 784000,
      },
      {
        title: 'Attack on Titan',
        media_type: 'ANIME',
        source_id: 'hianime',
        source_key: 'attack-on-titan-112',
        artwork_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80',
        subtitle: 'Shingeki no Kyojin',
        author: 'Hajime Isayama',
        description: 'Centuries ago, mankind was slaughtered to near extinction by monstrous beings called Titans.',
        genres: ['Action', 'Drama', 'Mystery'],
        status: 'COMPLETED',
        progress: 1.0,
        total_units: 25,
        current_unit_index: 25,
        current_unit_title: 'Wall',
        score: 9,
        is_favorite: true,
        categories: ['Completed'],
        last_position_ms: 1420000,
      },
      {
        title: 'One Piece',
        media_type: 'MANGA',
        source_id: 'mangadex',
        source_key: 'a1c7c817-4e59-42b5-bd0b-652bb7336914',
        artwork_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&q=80',
        subtitle: 'Eiichiro Oda',
        author: 'Eiichiro Oda',
        description: 'Monkey D. Luffy embarks with his pirate crew to find the legendary treasure known as One Piece.',
        genres: ['Adventure', 'Comedy', 'Shounen'],
        status: 'IN_PROGRESS',
        progress: 0.98,
        total_units: 1125,
        current_unit_index: 1115,
        current_unit_title: 'Chapter 1115: The Continents',
        score: 10,
        is_favorite: true,
        categories: ['Reading'],
        last_position_ms: 0,
      },
      {
        title: 'Dilaw',
        media_type: 'MUSIC',
        source_id: 'itunes',
        source_key: 'maki_dilaw',
        artwork_url: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&q=80',
        subtitle: 'Maki',
        author: 'Maki',
        description: 'Top Philippine Hit single by Maki.',
        genres: ['OPM', 'Pop'],
        status: 'IN_PROGRESS',
        progress: 0.8,
        total_units: 1,
        current_unit_index: 1,
        current_unit_title: 'Dilaw',
        score: 10,
        is_favorite: true,
        categories: ['On Repeat'],
        last_position_ms: 120000,
      },
      {
        title: 'Pantropiko',
        media_type: 'MUSIC',
        source_id: 'itunes',
        source_key: 'bini_pantropiko',
        artwork_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80',
        subtitle: 'BINI',
        author: 'BINI',
        description: 'Nation’s Girl Group hit single.',
        genres: ['P-Pop', 'Dance'],
        status: 'COMPLETED',
        progress: 1.0,
        total_units: 1,
        current_unit_index: 1,
        current_unit_title: 'Pantropiko',
        score: 10,
        is_favorite: true,
        categories: ['Favorites'],
        last_position_ms: 210000,
      },
    ];

    for (const item of demoItems) {
      await this.upsertEntry(item);
    }
  },
};

// Initialize immediately
LibraryService.init();
