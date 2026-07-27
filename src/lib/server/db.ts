// Tiny JSON-file persistence layer (users + per-user save games).
// Lives in ./data at the project root; created on demand.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SAVES_DIR = path.join(DATA_DIR, 'saves');

export interface UserRecord {
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

export function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 32).toString('hex');
}

export function findUser(username: string): UserRecord | undefined {
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
export function loadSave(userId: string): unknown | null {
  ensureDirs();
  try {
    return JSON.parse(fs.readFileSync(path.join(SAVES_DIR, `${userId}.json`), 'utf8'));
  } catch {
    return null;
  }
}

export function writeSave(userId: string, save: unknown) {
  ensureDirs();
  fs.writeFileSync(path.join(SAVES_DIR, `${userId}.json`), JSON.stringify(save));
}
