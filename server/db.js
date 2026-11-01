import { createRequire } from 'node:module';
import { DB_FILE } from './config.js';

const require = createRequire(import.meta.url);

let dbInstance;

try {
  const Database = require('better-sqlite3');
  dbInstance = new Database(DB_FILE);
  console.log('[db] Moteur SQLite : better-sqlite3');
} catch (err) {
  console.warn(`[db] better-sqlite3 indisponible (${err.message}), bascule sur node:sqlite natif (Node 22)...`);
  try {
    const { DatabaseSync } = require('node:sqlite');
    const rawDb = new DatabaseSync(DB_FILE);
    console.log('[db] Moteur SQLite : node:sqlite natif Node 22 (indépendant de GLIBC)');

    dbInstance = {
      pragma(str) {
        try { rawDb.exec(`PRAGMA ${str}`); } catch {}
      },
      exec(sql) {
        return rawDb.exec(sql);
      },
      prepare(sql) {
        const stmt = rawDb.prepare(sql);
        const paramNames = sql.match(/[@:$][a-zA-Z0-9_]+/g) || [];

        function normalize(args) {
          if (paramNames.length > 0 && args.length === 1 && typeof args[0] === 'object' && args[0] !== null && !Array.isArray(args[0])) {
            const data = args[0];
            const out = {};
            for (const p of paramNames) {
              const clean = p.slice(1);
              if (data[p] !== undefined) out[p] = data[p];
              else if (data[clean] !== undefined) out[p] = data[clean];
              else out[p] = null;
            }
            return [out];
          }
          return args;
        }

        return {
          all(...args) {
            return stmt.all(...normalize(args));
          },
          get(...args) {
            return stmt.get(...normalize(args));
          },
          run(...args) {
            const res = stmt.run(...normalize(args));
            return {
              changes: res?.changes ?? 0,
              lastInsertRowid: typeof res?.lastInsertRowid === 'bigint' ? Number(res.lastInsertRowid) : (res?.lastInsertRowid ?? 0),
            };
          },
        };
      },
      transaction(fn) {
        return (...args) => {
          rawDb.exec('BEGIN IMMEDIATE');
          try {
            const res = fn(...args);
            rawDb.exec('COMMIT');
            return res;
          } catch (e) {
            rawDb.exec('ROLLBACK');
            throw e;
          }
        };
      },
    };
  } catch (err2) {
    console.error('[db] Erreur critique : aucun moteur SQLite n\'a pu être chargé.', err2);
    throw err;
  }
}

try { dbInstance.pragma('journal_mode = WAL'); } catch {}
try { dbInstance.pragma('foreign_keys = ON'); } catch {}

export const db = dbInstance;

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL,              -- image | video | embed
  path TEXT,                       -- chemin relatif sous /uploads (image: fichier le plus grand)
  variants TEXT,                   -- JSON {480:'..',960:'..',1600:'..',2400:'..'}
  width INTEGER, height INTEGER,
  blur TEXT,                       -- data URI minuscule (placeholder)
  color TEXT,                      -- couleur dominante
  mime TEXT, size INTEGER,
  original_name TEXT,
  embed_url TEXT,                  -- YouTube / Vimeo
  poster_id INTEGER REFERENCES media(id) ON DELETE SET NULL,
  alt_fr TEXT, alt_en TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title_fr TEXT NOT NULL, title_en TEXT,
  subtitle_fr TEXT, subtitle_en TEXT,
  excerpt_fr TEXT, excerpt_en TEXT,
  body_fr TEXT, body_en TEXT,
  start_date TEXT, end_date TEXT,
  venue TEXT, city TEXT, address TEXT,
  ticket_url TEXT,
  cover_id INTEGER REFERENCES media(id) ON DELETE SET NULL,
  programme TEXT DEFAULT '[]',     -- JSON [{day,time,title_fr,title_en,desc_fr,desc_en}]
  status TEXT NOT NULL DEFAULT 'draft',  -- draft | published
  featured INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title_fr TEXT NOT NULL, title_en TEXT,
  description_fr TEXT, description_en TEXT,
  category TEXT,                   -- defile | exposition | backstage | portrait | campagne | autre
  year INTEGER,
  event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
  cover_id INTEGER REFERENCES media(id) ON DELETE SET NULL,
  credits TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  sort INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS project_media (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  caption_fr TEXT, caption_en TEXT,
  sort INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS calls (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title_fr TEXT NOT NULL, title_en TEXT,
  role_type TEXT,                  -- mannequin | createur | benevole | photo | beaute | autre
  event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
  location TEXT,
  engagement_fr TEXT, engagement_en TEXT,   -- ex. « Rémunéré », « Bénévole »
  deadline TEXT,
  summary_fr TEXT, summary_en TEXT,
  description_fr TEXT, description_en TEXT,
  missions_fr TEXT, missions_en TEXT,        -- une ligne = un point
  profile_fr TEXT, profile_en TEXT,
  benefits_fr TEXT, benefits_en TEXT,
  require_photos INTEGER DEFAULT 0,
  require_cv INTEGER DEFAULT 0,
  questions TEXT DEFAULT '[]',               -- JSON [{id,label_fr,label_en,type,required,options}]
  cover_id INTEGER REFERENCES media(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft',      -- draft | open | closed
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY,
  call_id INTEGER REFERENCES calls(id) ON DELETE SET NULL,
  call_title TEXT,
  first_name TEXT, last_name TEXT,
  email TEXT, phone TEXT,
  city TEXT, country TEXT,
  birthdate TEXT,
  link TEXT,                       -- Instagram / portfolio
  message TEXT,
  answers TEXT DEFAULT '[]',
  files TEXT DEFAULT '[]',         -- JSON [{name, file, mime, size}]
  status TEXT NOT NULL DEFAULT 'new',  -- new | review | shortlist | accepted | rejected
  rating INTEGER DEFAULT 0,
  notes TEXT,
  lang TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY,
  name TEXT, email TEXT, phone TEXT, subject TEXT, message TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
`);

export function getSetting(key, fallback = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key=?').get(key);
  if (!row) return fallback;
  try { return JSON.parse(row.value); } catch { return fallback; }
}
export function setSetting(key, value) {
  db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
    .run(key, JSON.stringify(value));
}

export function slugify(str = '') {
  return String(str)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item';
}

export function uniqueSlug(table, base, exceptId = null) {
  let slug = slugify(base); let i = 2;
  const q = db.prepare(`SELECT id FROM ${table} WHERE slug=? AND (? IS NULL OR id<>?)`);
  while (q.get(slug, exceptId, exceptId)) slug = `${slugify(base)}-${i++}`;
  return slug;
}
