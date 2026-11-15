-- ==============================================================================
-- Supabase Schema for Ayuuu / Auris Multi-Media App
-- Compatible with PostgreSQL 15+ and Room v6 Database Schema
-- Run this in your Supabase Project's SQL Editor (Dashboard -> SQL Editor)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. CUSTOM TYPES (IDEMPOTENT)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'media_type') THEN
        CREATE TYPE media_type AS ENUM ('ANIME', 'MANGA', 'MUSIC');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entry_status') THEN
        CREATE TYPE entry_status AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'DROPPED', 'ON_HOLD');
    END IF;
END $$;

-- 3. UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- TABLE: library_entries
-- Main library catalog item (Anime, Manga, Music tracks/albums)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.library_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    media_type media_type NOT NULL,
    source_id TEXT NOT NULL,
    source_key TEXT NOT NULL,
    remote_media_id TEXT,
    kitsu_id TEXT,
    kitsu_slug TEXT,
    kitsu_cover_url TEXT,
    kitsu_original_title TEXT,
    kitsu_rating REAL,
    mal_id BIGINT,
    artwork_url TEXT,
    local_artwork_path TEXT,
    title TEXT NOT NULL,
    subtitle TEXT,
    author TEXT,
    description TEXT,
    genres TEXT[] NOT NULL DEFAULT '{}',
    release_year INTEGER,
    status entry_status NOT NULL DEFAULT 'PLANNED',
    progress REAL NOT NULL DEFAULT 0,
    total_units INTEGER NOT NULL DEFAULT 0,
    current_unit_index INTEGER NOT NULL DEFAULT 0,
    current_unit_title TEXT,
    score INTEGER NOT NULL DEFAULT 0,
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    categories TEXT[] NOT NULL DEFAULT '{}',
    last_position_ms BIGINT NOT NULL DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for fast library queries & conflict-free sync
CREATE UNIQUE INDEX IF NOT EXISTS idx_library_entries_user_source 
    ON public.library_entries (user_id, media_type, source_id, source_key);

CREATE INDEX IF NOT EXISTS idx_library_entries_user_updated 
    ON public.library_entries (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_library_entries_user_media 
    ON public.library_entries (user_id, media_type);

CREATE INDEX IF NOT EXISTS idx_library_entries_user_favorite 
    ON public.library_entries (user_id, is_favorite) WHERE is_favorite = TRUE;

CREATE INDEX IF NOT EXISTS idx_library_entries_kitsu_id 
    ON public.library_entries (kitsu_id);

-- Auto-update updated_at trigger
DROP TRIGGER IF EXISTS trigger_library_entries_updated_at ON public.library_entries;
CREATE TRIGGER trigger_library_entries_updated_at
    BEFORE UPDATE ON public.library_entries
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- TABLE: library_units
-- Sub-items / episodes / chapters / tracks belonging to a library entry
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.library_units (
    entry_id UUID NOT NULL REFERENCES public.library_entries(id) ON DELETE CASCADE,
    unit_index INTEGER NOT NULL,
    source_unit_id TEXT,
    title TEXT NOT NULL,
    thumbnail_url TEXT,
    stream_url TEXT,
    duration_ms BIGINT,
    is_watched BOOLEAN NOT NULL DEFAULT FALSE,
    last_position_ms BIGINT NOT NULL DEFAULT 0,
    bookmark BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (entry_id, unit_index)
);

CREATE INDEX IF NOT EXISTS idx_library_units_entry_id 
    ON public.library_units (entry_id);

DROP TRIGGER IF EXISTS trigger_library_units_updated_at ON public.library_units;
CREATE TRIGGER trigger_library_units_updated_at
    BEFORE UPDATE ON public.library_units
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- TABLE: playlists
-- User custom playlists (music, anime queues, manga lists)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_playlists_user_id 
    ON public.playlists (user_id);

CREATE INDEX IF NOT EXISTS idx_playlists_updated_at 
    ON public.playlists (updated_at DESC);

DROP TRIGGER IF EXISTS trigger_playlists_updated_at ON public.playlists;
CREATE TRIGGER trigger_playlists_updated_at
    BEFORE UPDATE ON public.playlists
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- TABLE: playlist_tracks
-- Tracks within a playlist ordered by position
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.playlist_tracks (
    playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    track_id TEXT NOT NULL,
    title TEXT NOT NULL,
    artist TEXT,
    artwork_url TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (playlist_id, position)
);

CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist 
    ON public.playlist_tracks (playlist_id);

DROP TRIGGER IF EXISTS trigger_playlist_tracks_updated_at ON public.playlist_tracks;
CREATE TRIGGER trigger_playlist_tracks_updated_at
    BEFORE UPDATE ON public.playlist_tracks
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict Isolation: Each authenticated user can only access their own data.
-- ==============================================================================

-- 1. Enable RLS on all tables
ALTER TABLE public.library_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_entries FORCE ROW LEVEL SECURITY;

ALTER TABLE public.library_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_units FORCE ROW LEVEL SECURITY;

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists FORCE ROW LEVEL SECURITY;

ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_tracks FORCE ROW LEVEL SECURITY;

-- 2. Drop legacy policies if any
DROP POLICY IF EXISTS "Users can read own library entries" ON public.library_entries;
DROP POLICY IF EXISTS "Users can insert own library entries" ON public.library_entries;
DROP POLICY IF EXISTS "Users can update own library entries" ON public.library_entries;
DROP POLICY IF EXISTS "Users can delete own library entries" ON public.library_entries;

DROP POLICY IF EXISTS "Users can read own library units" ON public.library_units;
DROP POLICY IF EXISTS "Users can insert own library units" ON public.library_units;
DROP POLICY IF EXISTS "Users can update own library units" ON public.library_units;
DROP POLICY IF EXISTS "Users can delete own library units" ON public.library_units;

DROP POLICY IF EXISTS "Users can read own playlists" ON public.playlists;
DROP POLICY IF EXISTS "Users can insert own playlists" ON public.playlists;
DROP POLICY IF EXISTS "Users can update own playlists" ON public.playlists;
DROP POLICY IF EXISTS "Users can delete own playlists" ON public.playlists;

DROP POLICY IF EXISTS "Users can read own playlist tracks" ON public.playlist_tracks;
DROP POLICY IF EXISTS "Users can insert own playlist tracks" ON public.playlist_tracks;
DROP POLICY IF EXISTS "Users can update own playlist tracks" ON public.playlist_tracks;
DROP POLICY IF EXISTS "Users can delete own playlist tracks" ON public.playlist_tracks;

-- 3. library_entries Policies
CREATE POLICY "Users can read own library entries"
    ON public.library_entries FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own library entries"
    ON public.library_entries FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own library entries"
    ON public.library_entries FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own library entries"
    ON public.library_entries FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 4. library_units Policies (Inherit ownership from parent library_entries)
CREATE POLICY "Users can read own library units"
    ON public.library_units FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.library_entries
            WHERE public.library_entries.id = public.library_units.entry_id
              AND public.library_entries.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own library units"
    ON public.library_units FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.library_entries
            WHERE public.library_entries.id = public.library_units.entry_id
              AND public.library_entries.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own library units"
    ON public.library_units FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.library_entries
            WHERE public.library_entries.id = public.library_units.entry_id
              AND public.library_entries.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.library_entries
            WHERE public.library_entries.id = public.library_units.entry_id
              AND public.library_entries.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own library units"
    ON public.library_units FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.library_entries
            WHERE public.library_entries.id = public.library_units.entry_id
              AND public.library_entries.user_id = auth.uid()
        )
    );

-- 5. playlists Policies
CREATE POLICY "Users can read own playlists"
    ON public.playlists FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own playlists"
    ON public.playlists FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own playlists"
    ON public.playlists FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own playlists"
    ON public.playlists FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 6. playlist_tracks Policies (Inherit ownership from parent playlists)
CREATE POLICY "Users can read own playlist tracks"
    ON public.playlist_tracks FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.playlists
            WHERE public.playlists.id = public.playlist_tracks.playlist_id
              AND public.playlists.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own playlist tracks"
    ON public.playlist_tracks FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.playlists
            WHERE public.playlists.id = public.playlist_tracks.playlist_id
              AND public.playlists.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own playlist tracks"
    ON public.playlist_tracks FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.playlists
            WHERE public.playlists.id = public.playlist_tracks.playlist_id
              AND public.playlists.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.playlists
            WHERE public.playlists.id = public.playlist_tracks.playlist_id
              AND public.playlists.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own playlist tracks"
    ON public.playlist_tracks FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.playlists
            WHERE public.playlists.id = public.playlist_tracks.playlist_id
              AND public.playlists.user_id = auth.uid()
        )
    );

-- ==============================================================================
-- REALTIME REPLICATION (Optional)
-- Enable realtime updates on library_entries and playlists
-- ==============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.library_entries;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.playlists;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
