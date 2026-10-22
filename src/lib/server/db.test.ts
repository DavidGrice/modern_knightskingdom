import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { SaveGame } from '@/game/types';

// db.ts keeps its files under process.cwd()/data, decided when it loads: it is loaded here, after the working
// directory is pointed at a scratch one, so these tests never touch the project's own data/
let dir: string;
let db: typeof import('./db');
beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kk-saves-'));
  vi.spyOn(process, 'cwd').mockReturnValue(dir);
  db = await import('./db');
});
afterAll(() => {
  vi.restoreAllMocks();
  fs.rmSync(dir, { recursive: true, force: true });
});

const save = (day: number) => ({
  version: 1, character: { name: 'Test' }, inventory: {}, unlocks: [], completedQuests: [], questProgress: {}, buildings: [], dayCount: day,
}) as unknown as SaveGame;
const file = (id: string) => path.join(dir, 'data', 'saves', `${id}.json`);
const dayOn = (f: string) => JSON.parse(fs.readFileSync(f, 'utf8')).dayCount;
const dayLoaded = (id: string) => {
  const r = db.loadSave(id);
  return r.status === 'ok' ? r.save.dayCount : r.status;
};

describe("the server's saves", () => {
  it('reads none, then the save written, whole, with nothing left over', () => {
    expect(db.loadSave('a')).toEqual({ status: 'none' });
    db.writeSave('a', save(1));
    expect(db.loadSave('a')).toEqual({ status: 'ok', save: save(1), restored: false });
    expect(fs.existsSync(`${file('a')}.tmp`)).toBe(false);
    expect(fs.existsSync(`${file('a')}.bak`)).toBe(false); // there was nothing before it to keep
  });

  it('keeps the save it replaces as the .bak, and falls back on it when the latest cannot be read', () => {
    db.writeSave('b', save(1));
    db.writeSave('b', save(2));
    expect(dayOn(`${file('b')}.bak`)).toBe(1);
    fs.writeFileSync(file('b'), '{"version":1,"charac'); // torn
    expect(db.loadSave('b')).toEqual({ status: 'ok', save: save(1), restored: true });
  });

  it('never keeps an unreadable save over a good .bak', () => {
    db.writeSave('c', save(1));
    db.writeSave('c', save(2));
    fs.writeFileSync(file('c'), 'not a save');
    db.writeSave('c', save(3));
    expect(dayOn(`${file('c')}.bak`)).toBe(1);
    expect(dayLoaded('c')).toBe(3);
  });

  it('says why a save cannot be read, when the .bak cannot be either', () => {
    db.writeSave('d', save(1));
    fs.writeFileSync(file('d'), '[]');
    expect(db.loadSave('d')).toEqual({ status: 'corrupt', problem: 'it is not a save at all' });
  });

  it('does not fall back past a save from a newer game, and keeps it as the .bak when one is written over it', () => {
    db.writeSave('f', save(1));
    db.writeSave('f', save(2));
    fs.writeFileSync(file('f'), JSON.stringify({ ...save(3), version: 99 }));
    expect(db.loadSave('f')).toEqual({ status: 'corrupt', problem: 'it was made by a newer version of the game (save version 99)', newer: true });
    db.writeSave('f', save(4)); // a new game, started after the menu asked
    expect(JSON.parse(fs.readFileSync(`${file('f')}.bak`, 'utf8')).version).toBe(99);
    expect(dayLoaded('f')).toBe(4);
  });

  it('does not take a save it could not open just now for a damaged one', () => {
    db.writeSave('g', save(1));
    db.writeSave('g', save(2));
    vi.spyOn(fs, 'readFileSync').mockImplementationOnce(() => { throw Object.assign(new Error('busy'), { code: 'EBUSY' }); });
    expect(db.loadSave('g')).toEqual({ status: 'unavailable', problem: 'the save could not be opened just now (EBUSY)' });
    expect(dayLoaded('g')).toBe(2);
  });

  it('writes on through a write that takes only part, and stops at one that takes nothing', () => {
    const real = fs.writeSync;
    vi.spyOn(fs, 'writeSync').mockImplementationOnce(((fd: number, buf: Buffer, at: number) => real(fd, buf, at, 10)) as typeof fs.writeSync);
    db.writeSave('h', save(1));
    expect(db.loadSave('h')).toEqual({ status: 'ok', save: save(1), restored: false });
    vi.spyOn(fs, 'writeSync').mockImplementationOnce(() => 0);
    expect(() => db.writeSave('h', save(2))).toThrow('the save could not be written whole');
    expect(dayLoaded('h')).toBe(1);
  });

  it('leaves the old save whole when a write dies part-way', () => {
    db.writeSave('e', save(1));
    // dies writing the new save out…
    vi.spyOn(fs, 'writeSync').mockImplementationOnce(() => { throw new Error('killed'); });
    expect(() => db.writeSave('e', save(2))).toThrow('killed');
    expect(dayLoaded('e')).toBe(1);
    // …or after, before the new one takes the old one's place
    vi.spyOn(fs, 'renameSync').mockImplementationOnce(() => { throw new Error('killed'); });
    expect(() => db.writeSave('e', save(3))).toThrow('killed');
    expect(dayLoaded('e')).toBe(1);
    db.writeSave('e', save(4));
    expect(dayLoaded('e')).toBe(4);
  });
});
