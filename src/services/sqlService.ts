import initSqlJs, { Database } from 'sql.js';

export interface ColumnMeta {
  name: string;
  type: string;
  notnull: boolean;
  pk: boolean;
}

export interface TableMeta {
  name: string;
  columns: ColumnMeta[];
  rowCount?: number;
}

export interface QueryResult {
  columns: string[];
  values: any[][];
  error?: string;
  executionTimeMs: number;
  rowsAffected?: number;
}

const STORAGE_KEY = 'ayuuu_sqlite_database_v6';

let dbInstance: Database | null = null;
let initPromise: Promise<Database> | null = null;

const SCHEMA_DDL = `
CREATE TABLE IF NOT EXISTS library_entries (
  id TEXT NOT NULL,
  remote_id TEXT NOT NULL,
  user_id TEXT,
  media_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_key TEXT NOT NULL,
  remote_media_id TEXT,
  kitsu_id TEXT,
  kitsu_slug TEXT,
  kitsu_cover_url TEXT,
  kitsu_original_title TEXT,
  kitsu_rating REAL,
  mal_id INTEGER,
  artwork_url TEXT,
  local_artwork_path TEXT,
  title TEXT NOT NULL,
  subtitle TEXT,
  author TEXT,
  description TEXT,
  genres TEXT NOT NULL,
  release_year INTEGER,
  status TEXT NOT NULL,
  progress REAL NOT NULL,
  total_units INTEGER NOT NULL,
  current_unit_index INTEGER NOT NULL,
  current_unit_title TEXT,
  score INTEGER NOT NULL,
  is_favorite INTEGER NOT NULL,
  categories TEXT NOT NULL,
  last_position_ms INTEGER NOT NULL,
  is_deleted INTEGER NOT NULL,
  sync_state TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_activity_at INTEGER NOT NULL,
  remote_updated_at INTEGER,
  PRIMARY KEY(id)
);

CREATE TABLE IF NOT EXISTS library_units (
  entry_id TEXT NOT NULL,
  unit_index INTEGER NOT NULL,
  source_unit_id TEXT,
  title TEXT NOT NULL,
  thumbnail_url TEXT,
  stream_url TEXT,
  duration_ms INTEGER,
  is_watched INTEGER NOT NULL,
  last_position_ms INTEGER NOT NULL,
  bookmark INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(entry_id, unit_index),
  FOREIGN KEY(entry_id) REFERENCES library_entries(id) ON UPDATE NO ACTION ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS playlists (
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  user_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(id)
);

CREATE TABLE IF NOT EXISTS playlist_tracks (
  playlist_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  track_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT,
  artwork_url TEXT,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(playlist_id, position),
  FOREIGN KEY(playlist_id) REFERENCES playlists(id) ON UPDATE NO ACTION ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sync_outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  entity_id TEXT NOT NULL,
  media_type TEXT NOT NULL,
  sync_op TEXT NOT NULL,
  dedupe_key TEXT NOT NULL,
  payload TEXT,
  attempts INTEGER NOT NULL,
  sync_state TEXT NOT NULL,
  last_error TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_sessions (
  user_id TEXT NOT NULL,
  email TEXT,
  access_token TEXT,
  refresh_token TEXT,
  last_pulled_at INTEGER,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(user_id)
);

CREATE TABLE IF NOT EXISTS installed_extensions (
  package_name TEXT NOT NULL,
  label TEXT NOT NULL,
  version_name TEXT NOT NULL,
  version_code INTEGER NOT NULL,
  apk_path TEXT NOT NULL,
  signature_hash TEXT NOT NULL,
  signing_cert_fingerprint TEXT,
  enabled INTEGER NOT NULL,
  repo_url TEXT,
  installed_at INTEGER NOT NULL,
  PRIMARY KEY(package_name)
);

CREATE INDEX IF NOT EXISTS index_library_entries_user_id ON library_entries(user_id);
CREATE INDEX IF NOT EXISTS index_library_entries_media_type ON library_entries(media_type);
CREATE INDEX IF NOT EXISTS index_library_entries_is_favorite ON library_entries(is_favorite);
CREATE INDEX IF NOT EXISTS index_playlists_user_id ON playlists(user_id);
`;

const SEED_DATA = `
INSERT INTO library_entries (
  id, remote_id, user_id, media_type, source_id, source_key,
  kitsu_id, kitsu_slug, kitsu_cover_url, kitsu_rating,
  artwork_url, title, author, description, genres, release_year,
  status, progress, total_units, current_unit_index, current_unit_title,
  score, is_favorite, categories, last_position_ms, is_deleted, sync_state,
  created_at, updated_at, last_activity_at
) VALUES 
('lib_sl_01', 'rem_sl_01', 'usr_default', 'ANIME', 'hianime', 'solo-leveling-235',
 '235', 'solo-leveling', 'https://cdn.anipixcdn.co/thumbnail/8500cd4427ccbc38d536e34f1014924f.jpg', 87.5,
 'https://cdn.anipixcdn.co/thumbnail/8500cd4427ccbc38d536e34f1014924f.jpg', 'Solo Leveling', 'Chugong',
 'In a world where hunters must battle deadly monsters, Sung Jinwoo is the weakest of them all.', '["Action", "Fantasy", "Supernatural"]',
 2024, 'CURRENT', 0.25, 12, 3, 'It is Like a Game', 10, 1, '["Watching", "Favorites"]', 784000, 0, 'SYNCED',
 1715000000000, 1715004000000, 1715004000000),

('lib_aot_02', 'rem_aot_02', 'usr_default', 'ANIME', 'hianime', 'attack-on-titan-240',
 '240', 'attack-on-titan', 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80', 91.2,
 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80', 'Attack on Titan', 'Hajime Isayama',
 'Centuries ago, mankind was slaughtered to near extinction by monstrous beings called Titans.', '["Action", "Drama", "Mystery"]',
 2013, 'COMPLETED', 1.0, 25, 25, 'Wall', 9, 1, '["Completed", "Top Tier"]', 1420000, 0, 'SYNCED',
 1714000000000, 1714500000000, 1714500000000),

('lib_op_03', 'rem_op_03', 'usr_default', 'MANGA', 'mangadex', 'one-piece-manga',
 '12', 'one-piece', 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&q=80', 92.0,
 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&q=80', 'One Piece', 'Eiichiro Oda',
 'Monkey D. Luffy embarks with his pirate crew to find the legendary treasure known as One Piece.', '["Adventure", "Comedy", "Shounen"]',
 1997, 'CURRENT', 0.98, 1120, 1115, 'Chapter 1115', 10, 1, '["Reading"]', 0, 0, 'SYNCED',
 1712000000000, 1715100000000, 1715100000000);

INSERT INTO library_units (
  entry_id, unit_index, source_unit_id, title, thumbnail_url,
  stream_url, duration_ms, is_watched, last_position_ms, bookmark, updated_at
) VALUES
('lib_sl_01', 1, 'ep_4341', 'Episode 1: Im Used to It', 'https://cdn.anipixcdn.co/thumbnail/8500cd4427ccbc38d536e34f1014924f.jpg',
 'https://megaplay.buzz/stream/s-2/114721/sub?s=tcdn', 1420000, 1, 1420000, 0, 1715001000000),

('lib_sl_01', 2, 'ep_4342', 'Episode 2: If I Had One More Chance', 'https://cdn.anipixcdn.co/thumbnail/8500cd4427ccbc38d536e34f1014924f.jpg',
 'https://megaplay.buzz/stream/s-2/114722/sub?s=tcdn', 1430000, 1, 1430000, 0, 1715002000000),

('lib_sl_01', 3, 'ep_4343', 'Episode 3: Its Like a Game', 'https://cdn.anipixcdn.co/thumbnail/8500cd4427ccbc38d536e34f1014924f.jpg',
 'https://megaplay.buzz/stream/s-2/114723/sub?s=tcdn', 1410000, 0, 784000, 1, 1715004000000);

INSERT INTO playlists (id, name, user_id, created_at, updated_at) VALUES
('pl_chill', 'Late Night Lo-Fi & Synth', 'usr_default', 1715000000000, 1715005000000),
('pl_drive', 'Anime Openings & OST', 'usr_default', 1715001000000, 1715006000000);

INSERT INTO playlist_tracks (playlist_id, position, track_id, title, artist, artwork_url, updated_at) VALUES
('pl_chill', 0, 'trk_01', 'Midnight City', 'M83', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&q=80', 1715000000000),
('pl_chill', 1, 'trk_02', 'Starboy', 'The Weeknd', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&q=80', 1715000000000),
('pl_chill', 2, 'trk_03', 'Resonance', 'HOME', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&q=80', 1715000000000),
('pl_drive', 0, 'trk_04', 'Gurenge', 'LiSA', 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=200&q=80', 1715001000000),
('pl_drive', 1, 'trk_05', 'Kaibutsu', 'YOASOBI', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&q=80', 1715001000000);

INSERT INTO sync_sessions (user_id, email, access_token, refresh_token, last_pulled_at, updated_at) VALUES
('usr_default', 'local.user@ayuuu.app', 'sess_token_mock', 'refresh_token_mock', 1715004000000, 1715004000000);

INSERT INTO installed_extensions (package_name, label, version_name, version_code, apk_path, signature_hash, enabled, repo_url, installed_at) VALUES
('com.ayuuu.ext.hianime', 'HiAnime Stream Provider', '2.4.0', 240, '/data/extensions/hianime.apk', 'sha256_mock_hianime', 1, 'https://github.com/ayuuu-app/extensions', 1714000000000),
('com.ayuuu.ext.mangadex', 'MangaDex Catalog Provider', '1.8.2', 182, '/data/extensions/mangadex.apk', 'sha256_mock_mangadex', 1, 'https://github.com/ayuuu-app/extensions', 1714000000000);

INSERT INTO sync_outbox (entity_id, media_type, sync_op, dedupe_key, payload, attempts, sync_state, created_at) VALUES
('lib_sl_01', 'ANIME', 'UPDATE_PROGRESS', 'progress_sl_ep3', '{"unit": 3, "position_ms": 784000}', 0, 'SYNCED', 1715004000000);
`;

function saveDatabase(db: Database) {
  try {
    const data = db.export();
    const binString = Array.from(data, (b) => String.fromCharCode(b)).join('');
    const base64 = btoa(binString);
    localStorage.setItem(STORAGE_KEY, base64);
  } catch (err) {
    console.warn('Failed to save SQLite database to localStorage:', err);
  }
}

export const SqlService = {
  async getDb(): Promise<Database> {
    if (dbInstance) return dbInstance;
    if (initPromise) return initPromise;

    initPromise = (async () => {
      const SQL = await initSqlJs({
        locateFile: (file) => (file.endsWith('.wasm') ? '/sql-wasm.wasm' : file),
      });

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const binStr = atob(saved);
          const bytes = new Uint8Array(binStr.length);
          for (let i = 0; i < binStr.length; i++) {
            bytes[i] = binStr.charCodeAt(i);
          }
          dbInstance = new SQL.Database(bytes);
          return dbInstance;
        } catch (e) {
          console.warn('Failed to restore saved SQLite database, creating new:', e);
        }
      }

      // Create new database and initialize Room v6 schema
      const db = new SQL.Database();
      db.run(SCHEMA_DDL);
      db.run(SEED_DATA);
      saveDatabase(db);
      dbInstance = db;
      return db;
    })();

    return initPromise;
  },

  async execute(sql: string): Promise<QueryResult> {
    const cleanSql = sql.trim();
    if (!cleanSql) {
      return { columns: [], values: [], executionTimeMs: 0 };
    }

    const t0 = performance.now();
    try {
      const db = await this.getDb();
      const results = db.exec(cleanSql);
      const t1 = performance.now();
      const executionTimeMs = Math.round((t1 - t0) * 100) / 100;

      saveDatabase(db);

      if (results.length > 0) {
        const last = results[results.length - 1];
        return {
          columns: last.columns || [],
          values: last.values || [],
          executionTimeMs,
        };
      }

      // If no result set (e.g. INSERT, UPDATE, DELETE, CREATE)
      const rowsAffected = db.getRowsModified();
      return {
        columns: ['Status'],
        values: [[`Query executed successfully. Rows modified: ${rowsAffected}`]],
        executionTimeMs,
        rowsAffected,
      };
    } catch (err: any) {
      const t1 = performance.now();
      return {
        columns: [],
        values: [],
        error: err?.message || String(err),
        executionTimeMs: Math.round((t1 - t0) * 100) / 100,
      };
    }
  },

  async getSchema(): Promise<TableMeta[]> {
    const db = await this.getDb();
    const tablesRes = db.exec(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"
    );

    if (!tablesRes.length || !tablesRes[0].values) return [];

    const tables: TableMeta[] = [];
    for (const row of tablesRes[0].values) {
      const tableName = String(row[0]);
      const colsRes = db.exec(`PRAGMA table_info("${tableName}");`);
      const countRes = db.exec(`SELECT count(*) FROM "${tableName}";`);
      const rowCount = countRes[0]?.values?.[0]?.[0] ? Number(countRes[0].values[0][0]) : 0;

      const columns: ColumnMeta[] = [];
      if (colsRes.length && colsRes[0].values) {
        colsRes[0].values.forEach((c: any) => {
          columns.push({
            name: String(c[1]),
            type: String(c[2] || 'ANY'),
            notnull: Boolean(c[3]),
            pk: Boolean(c[5]),
          });
        });
      }

      tables.push({
        name: tableName,
        columns,
        rowCount,
      });
    }

    return tables;
  },

  async resetDatabase(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY);
    dbInstance = null;
    initPromise = null;
    await this.getDb();
  },

  async exportDatabase(): Promise<Uint8Array> {
    const db = await this.getDb();
    return db.export();
  },
};
