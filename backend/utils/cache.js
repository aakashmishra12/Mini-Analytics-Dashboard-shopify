import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { config } from '../config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'cache.sqlite'));
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS cache (
    key        TEXT PRIMARY KEY,
    payload    TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

const selectStmt = db.prepare('SELECT payload, updated_at FROM cache WHERE key = ?');
const upsertStmt = db.prepare(`
  INSERT INTO cache (key, payload, updated_at) VALUES (@key, @payload, @updatedAt)
  ON CONFLICT(key) DO UPDATE SET payload = @payload, updated_at = @updatedAt
`);
const clearStmt = db.prepare('DELETE FROM cache');

const ttlMs = () => config.cacheTtlMinutes * 60 * 1000;

export function readCache(key) {
  const row = selectStmt.get(key);
  if (!row) return null;
  return {
    data: JSON.parse(row.payload),
    updatedAt: row.updated_at,
    isFresh: Date.now() - row.updated_at < ttlMs(),
  };
}

export function writeCache(key, data) {
  const updatedAt = Date.now();
  upsertStmt.run({ key, payload: JSON.stringify(data), updatedAt });
  return updatedAt;
}

export function clearCache() {
  clearStmt.run();
}

/**
 * Serves `key` from SQLite when the entry is still within TTL, otherwise runs
 * `producer` and stores the result. `forceRefresh` bypasses the TTL check.
 */
export async function withCache(key, producer, { forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const cached = readCache(key);
    if (cached?.isFresh) {
      return { data: cached.data, cached: true, updatedAt: cached.updatedAt };
    }
  }

  try {
    const data = await producer();
    const updatedAt = writeCache(key, data);
    return { data, cached: false, updatedAt };
  } catch (error) {
    // Serve stale data rather than failing the request outright.
    const stale = readCache(key);
    if (stale) return { data: stale.data, cached: true, updatedAt: stale.updatedAt, stale: true };
    throw error;
  }
}
