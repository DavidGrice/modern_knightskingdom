// Tiny JSON-file persistence layer (users + per-user save games).
// Lives in ./data at the project root; created on demand.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { SaveGame } from '@/game/types';
import { parseSave } from '@/lib/saveSchema';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SAVES_DIR = path.join(DATA_DIR, 'saves');

interface UserRecord {
  id: string;
  username: string;
  salt: string;
  hash: string;
  createdAt: string;
}

function ensureDirs() {
  fs.mkdirSync(SAVES_DIR, { recursive: true });
}

function loadUsers(): UserRecord[] {
  ensureDirs();
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveUsers(users: UserRecord[]) {
  ensureDirs();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 32).toString('hex');
}

function findUser(username: string): UserRecord | undefined {
  return loadUsers().find((u) => u.username.toLowerCase() === username.toLowerCase());
}

export function getUserById(id: string): UserRecord | undefined {
  return loadUsers().find((u) => u.id === id);
}

export function createUser(username: string, password: string): UserRecord | { error: string } {
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return { error: 'Username must be 3-20 letters, numbers or underscores.' };
  }
  if (password.length < 4) return { error: 'Password must be at least 4 characters.' };
  const users = loadUsers();
  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    return { error: 'That name is already taken.' };
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const user: UserRecord = {
    id: crypto.randomUUID(),
    username,
    salt,
    hash: hashPassword(password, salt),
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  saveUsers(users);
  return user;
}

export function verifyUser(username: string, password: string): UserRecord | null {
  const user = findUser(username);
  if (!user) return null;
  const hash = hashPassword(password, user.salt);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(user.hash)) ? user : null;
}

// ---- save games ----
// CLN-09 · a save is written so that no crash part-way can leave it torn, and the one it replaces is kept beside it
// (`<id>.json.bak`) for a load to fall back on when the latest is damaged.

/** What is on disk for a player: a save to load (`restored` when it is the `.bak`), none, one that cannot be read
 *  (`newer` when it is whole but from a newer game), or one that could not be opened just now. */
export type StoredSave =
  | { status: 'ok'; save: SaveGame; restored: boolean }
  | { status: 'none' }
  | { status: 'corrupt'; problem: string; newer?: true }
  | { status: 'unavailable'; problem: string };

const saveFile = (userId: string) => path.join(SAVES_DIR, `${userId}.json`);

function readSaveFile(file: string): StoredSave {
  let text: string;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    // anything but "not there" — locked by another program, refused, out of handles — keeps the file from us for now;
    // it says nothing of what is in it
    return code === 'ENOENT' ? { status: 'none' } : { status: 'unavailable', problem: `the save could not be opened just now (${code})` };
  }
  const r = parseSave(text);
  return r.ok ? { status: 'ok', save: r.save, restored: false } : { status: 'corrupt', problem: r.problem, newer: r.newer };
}

/** The player's save — or, when the latest is damaged, the one before it, marked `restored`. Never the one before a
 *  latest that is only out of reach just now, or only from a newer game: loading the older one there would see it
 *  written back over the latest at the first autosave. */
export function loadSave(userId: string): StoredSave {
  ensureDirs();
  const file = saveFile(userId);
  const latest = readSaveFile(file);
  if (latest.status !== 'corrupt' || latest.newer) return latest;
  const before = readSaveFile(`${file}.bak`);
  return before.status === 'ok' ? { ...before, restored: true } : latest;
}

/** The new save goes to a temporary file, flushed to disk, and replaces the old one in a single rename — a crash at any
 *  point leaves either the old save or the new, whole. The old one becomes the `.bak` first if it is whole (one this
 *  game can load, or one a newer game wrote); a damaged one is never kept over a good `.bak`. */
export function writeSave(userId: string, save: SaveGame) {
  ensureDirs();
  const file = saveFile(userId);
  const tmp = `${file}.tmp`;
  const data = Buffer.from(JSON.stringify(save));
  const fd = fs.openSync(tmp, 'w');
  try {
    // a write may take only part of what it is handed (on some systems that is all a filling disk says): write on
    // until all of it is down, and stop rather than spin on a write that takes nothing
    for (let at = 0; at < data.length;) {
      const n = fs.writeSync(fd, data, at, data.length - at);
      if (n <= 0) throw new Error('the save could not be written whole');
      at += n;
    }
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  const old = readSaveFile(file);
  if (old.status === 'ok' || (old.status === 'corrupt' && old.newer)) fs.copyFileSync(file, `${file}.bak`);
  fs.renameSync(tmp, file);
}
