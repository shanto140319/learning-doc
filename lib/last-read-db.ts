import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

// The only file that knows the storage is SQLite. To move to Postgres later,
// rewrite these two functions and keep the same signatures.

export type LastRead = {
  url: string;
  title: string;
  scrollY: number;
  savedAt: number; // ms since epoch, set by the server
};

const DB_PATH = path.join(process.cwd(), 'data', 'learning-docs.db');

function openDb(): DatabaseSync {
  mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  // One row only (id = 1): this site has a single reader.
  db.exec(`
    CREATE TABLE IF NOT EXISTS last_read (
      id       INTEGER PRIMARY KEY CHECK (id = 1),
      url      TEXT    NOT NULL,
      title    TEXT    NOT NULL,
      scroll_y INTEGER NOT NULL,
      saved_at INTEGER NOT NULL
    )
  `);
  return db;
}

// Reuse one connection. In dev, hot reload re-runs this module, so keep it on globalThis.
const globalForDb = globalThis as typeof globalThis & { learningDocsDb?: DatabaseSync };
function db(): DatabaseSync {
  globalForDb.learningDocsDb ??= openDb();
  return globalForDb.learningDocsDb;
}

type Row = { url: string; title: string; scroll_y: number; saved_at: number };

export function getLastRead(): LastRead | null {
  const row = db().prepare('SELECT url, title, scroll_y, saved_at FROM last_read WHERE id = 1').get() as
    | Row
    | undefined;
  return row ? { url: row.url, title: row.title, scrollY: row.scroll_y, savedAt: row.saved_at } : null;
}

export function saveLastRead(input: Omit<LastRead, 'savedAt'>): LastRead {
  const saved: LastRead = { ...input, savedAt: Date.now() };
  // Upsert: insert the single row, or replace its values if it exists.
  db()
    .prepare(
      `INSERT INTO last_read (id, url, title, scroll_y, saved_at) VALUES (1, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
         url = excluded.url, title = excluded.title,
         scroll_y = excluded.scroll_y, saved_at = excluded.saved_at`,
    )
    .run(saved.url, saved.title, saved.scrollY, saved.savedAt);
  return saved;
}
