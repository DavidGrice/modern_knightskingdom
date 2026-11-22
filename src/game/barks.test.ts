import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEATH_BARK, KIND_LABEL } from '@/game/data/enemies';
import { useEnemyStore } from '@/game/combat/enemyStore';
import { playerState } from '@/game/playerState';
import { useGameStore } from '@/game/store/gameStore';
import { NPCS, NPC_BY_ID } from '@/game/data/npcs';
import MANIFEST from '@/game/data/assetManifest.json';
import { audio } from '@/lib/audio';
import { BARK_VOICES, BANK_VOICES, isBark } from '@/lib/audioCatalog';
import {
  BARKS, BARK_LINES, CAMP_HAIL, SPEAKER_GAP, bark, barked, builtUnderRaid, nearCamp, newRaid, raidWatch, resetBarks, wasBarked,
  type BarkEvent,
} from './barks';
import { BUMP, IDLE_FOR, NEAR, courtBarks, resetCourtBarks } from './courtBarks';
import { resolveDuel } from './combat/duel';
import { HOLD, showVoice, subtitleOf, useSubtitle } from './subtitles';

// G-09 · the cast's barks: the table, the gate, the court's and Cedric's camp's triggers, and the subtitles.

const SOUND_IDS = new Set(MANIFEST.sounds.map((s) => s.id));
const VOICE = new Map(MANIFEST.voices.map((v) => [v.id, v]));
/** a line the manifest has: a sound of the bank, or a challenge line */
const inManifest = (id: string) => SOUND_IDS.has(id) || VOICE.has(id);
const EVENTS = Object.keys(BARKS) as BarkEvent[];
const COURT = NPCS.filter((n) => n.randomSound || n.collisionSound);

beforeEach(() => {
  resetBarks();
  resetCourtBarks();
  vi.spyOn(audio, 'playVoice').mockImplementation((() => undefined) as never);
  vi.spyOn(audio, 'playAt').mockImplementation((() => undefined) as never);
  vi.spyOn(audio, 'playOnDemand').mockImplementation((() => undefined) as never);
});
afterEach(() => {
  vi.restoreAllMocks();
  audio.barksMuted = false;
  raidWatch.cedricUp = () => false;
});
const voiced = () => vi.mocked(audio.playVoice).mock.calls.map((c) => c[0]);

// golden, run on the unchanged base (wave 73's merge), then changed on purpose: a bandit borrowed Weezil's voice
// (base: { bandit: 'random_weezil', gilbert: 'random_gilbert', cedric: 'random_cedric' })
describe('golden: the death barks', () => {
  it('the raiders of the rank and file fall with the raiders\' own voice; Gilbert and Cedric with their own', () => {
    expect(DEATH_BARK).toEqual({
      bandit: 'random_raider', mountedRaider: 'random_raider', caster: 'random_raider', shieldedElite: 'random_raider',
      siegeCrew: 'random_raider', gilbert: 'random_gilbert', cedric: 'random_cedric',
    });
  });

  it('no raider borrows a named character\'s voice', () => {
    for (const [kind, line] of Object.entries(DEATH_BARK)) {
      if (kind === 'gilbert' || kind === 'cedric') continue;
      expect(line).not.toMatch(/weezil|cedric|gilbert/);
    }
  });
});

describe('the bark table', () => {
  it('each event resolves to a line the manifest has (the court\'s and a fallen kind\'s from their data)', () => {
    for (const e of EVENTS) {
      const lines = BARKS[e].lines.length ? [...BARKS[e].lines]
        : e === 'courtIdle' ? COURT.map((n) => n.randomSound!)
          : COURT.map((n) => n.collisionSound!);
      expect(lines.length, e).toBeGreaterThan(0);
      for (const l of lines) expect(inManifest(l), `${e}: ${l}`).toBe(true);
    }
    for (const line of Object.values(DEATH_BARK)) expect(inManifest(line)).toBe(true);
  });

  it('every court sound and every bank voice the barks name resolves in the manifest', () => {
    expect(COURT.map((n) => n.id).sort()).toEqual(['john', 'king', 'queen', 'richard', 'storm']);
    for (const n of COURT) {
      expect(inManifest(n.randomSound!), n.randomSound).toBe(true);
      expect(inManifest(n.collisionSound!), n.collisionSound).toBe(true);
      expect(n.randomSound).toBe(`random_${n.id}`);
      expect(n.collisionSound).toBe(`collision_${n.id}`);
    }
    for (const id of BANK_VOICES) expect(SOUND_IDS.has(id), id).toBe(true);
  });

  it('uses no campaign line: the table, the subtitles and every play site in src name only the lines given to barks', () => {
    const given = MANIFEST.voices.filter((v) => v.use === 'bark' && v.owner === 'G-09').map((v) => v.id);
    expect([...BARK_VOICES].sort()).toEqual(given.sort());
    expect(Object.keys(BARK_LINES).sort()).toEqual(given.sort());
    for (const e of EVENTS) for (const l of BARKS[e].lines) if (VOICE.has(l)) expect(given, l).toContain(l);
    // every challenge-line id written anywhere in src's code (the manifest and the tests aside)
    const named = new Set<string>();
    const walk = (dir: string) => {
      for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, f.name);
        if (f.isDirectory()) walk(p);
        else if (/\.tsx?$/.test(f.name) && !/\.test\.tsx?$/.test(f.name)) {
          for (const m of fs.readFileSync(p, 'utf8').matchAll(/['"`](c\d+s\d+t\d+[a-z])['"`]/g)) named.add(m[1]);
        }
      }
    };
    walk(path.resolve(__dirname, '..'));
    expect([...named].sort()).toEqual(given.sort());
  });

  it('each bark line\'s words are its manifest transcript, trimmed, and its speaker is Cedric', () => {
    for (const id of BARK_VOICES) {
      expect(BARK_LINES[id].text).toBe(VOICE.get(id)!.text!.trim());
      expect(subtitleOf(id)).toEqual({ speaker: 'Cedric the Bull', text: VOICE.get(id)!.text!.trim() });
    }
  });

  it('every bark is muted by \'mute barks\', and no lore line is', () => {
    for (const e of EVENTS) for (const l of BARKS[e].lines) expect(isBark(l), l).toBe(true);
    for (const n of COURT) expect([isBark(n.randomSound!), isBark(n.collisionSound!), isBark(n.greetSound)]).toEqual([true, true, true]);
    for (const line of Object.values(DEATH_BARK)) expect(isBark(line)).toBe(true);
    for (const n of NPCS) for (const l of n.loreLines ?? []) expect(isBark(l.sound), l.sound).toBe(false);
    // Cedric's war cry sounds with the horn as a raid's alarm: not a bark
    expect(isBark('warcry')).toBe(false);
    // every figure's greeting as a dialogue opens (DialoguePanel's playVoice), the village's `villager` among them
    for (const n of NPCS) expect(isBark(n.greetSound), `${n.id}: ${n.greetSound}`).toBe(true);
  });
});

describe('the gate', () => {
  it('a line keeps its cooldown, and a speaker his gap', () => {
    expect(bark('defenderDown', { at: { x: 0, z: 0 }, now: 100 })).toBe(true);
    expect(bark('defenderDown', { at: { x: 0, z: 0 }, now: 100 + BARKS.defenderDown.cooldown - 0.1 })).toBe(false);
    expect(bark('defenderDown', { at: { x: 0, z: 0 }, now: 100 + BARKS.defenderDown.cooldown })).toBe(true);
    // the defenders' other line, within their gap, then past it
    expect(bark('orderHeard', { now: 100 + BARKS.defenderDown.cooldown + 1 })).toBe(false);
    expect(bark('orderHeard', { now: 100 + BARKS.defenderDown.cooldown + SPEAKER_GAP })).toBe(true);
    expect(vi.mocked(audio.playAt).mock.calls.map((c) => c[0])).toEqual(['collision_villager', 'collision_villager']);
    expect(vi.mocked(audio.playOnDemand).mock.calls.map((c) => c[0])).toEqual(['greeting_villager']);
  });

  it('nothing barks twice in one raid, whatever the cooldown', () => {
    expect(bark('raiderFalls', { at: { x: 0, z: 0 }, raid: true, now: 0 })).toBe(true);
    expect(bark('raiderFalls', { at: { x: 0, z: 0 }, raid: true, now: 1000 })).toBe(false);
    // a bandit out of a raid falls with it, once its cooldown is out
    expect(bark('raiderFalls', { at: { x: 0, z: 0 }, now: 1000 })).toBe(true);
    newRaid();
    expect(bark('raiderFalls', { at: { x: 0, z: 0 }, raid: true, now: 2000 })).toBe(true);
  });

  it('Cedric\'s taunt at a player building under his raid: once a raid, only while he stands in it', () => {
    builtUnderRaid();
    expect(voiced()).toEqual([]);
    raidWatch.cedricUp = () => true;
    builtUnderRaid();
    builtUnderRaid();
    vi.spyOn(performance, 'now').mockReturnValue(1e9); // long after
    builtUnderRaid();
    expect(voiced()).toEqual(['c2s02t4a']);
    newRaid();
    builtUnderRaid();
    expect(voiced()).toEqual(['c2s02t4a', 'c2s02t4a']);
  });

  it('muted, nothing is barked and no cooldown is spent', () => {
    audio.barksMuted = true;
    expect(bark('cedricRaid', { now: 0 })).toBe(false);
    expect(voiced()).toEqual([]);
    audio.barksMuted = false;
    expect(bark('cedricRaid', { now: 0 })).toBe(true);
  });

  it('keeps a session record of every line heard: one on the voice channel once it begins to be spoken', () => {
    vi.mocked(audio.playVoice).mockImplementation(((_n: string, _v: number, _end?: () => void, start?: () => void) => start?.()) as never);
    bark('cedricRaid', { now: 0 });
    bark('raiderStruck', { at: { x: 0, z: 0 }, now: 0 });
    expect([...barked]).toEqual(['c2s01t2a', 'collision_raider']);
    expect([wasBarked('c2s01t2a'), wasBarked('c2s02t4a')]).toEqual([true, false]);
  });

  it('a voice line asked for but never spoken — cut while it loads, or not there — is not in the record', () => {
    expect(bark('cedricRaid', { now: 0 })).toBe(true); // asked for; the stand-in never starts it
    expect(wasBarked('c2s01t2a')).toBe(false);
  });

  it('a bark out of hearing spends nothing: the raid\'s one fall of the rank and file is heard at the next within reach', () => {
    const was = { x: playerState.x, z: playerState.z };
    Object.assign(playerState, { x: 0, z: 0 });
    try {
      expect(bark('raiderFalls', { at: { x: 500, z: 0 }, raid: true, now: 0 })).toBe(false);
      expect(bark('raiderFalls', { at: { x: 5, z: 0 }, raid: true, now: 1 })).toBe(true);
      expect(vi.mocked(audio.playAt).mock.calls.map((c) => c[0])).toEqual(['random_raider']);
    } finally {
      Object.assign(playerState, was);
    }
  });

  it('a last word cuts its speaker\'s own line still being said, and no one else\'s', () => {
    const stop = vi.spyOn(audio, 'stopVoice').mockImplementation(() => undefined);
    const line = vi.spyOn(audio, 'voiceLine', 'get').mockReturnValue('c2s02t4a'); // his taunt, still being said
    expect(bark('raiderFalls', { line: DEATH_BARK.bandit, speaker: KIND_LABEL.bandit, at: { x: 0, z: 26 }, now: 0 })).toBe(true);
    expect(stop).not.toHaveBeenCalled();
    expect(bark('raiderFalls', { line: DEATH_BARK.cedric, speaker: KIND_LABEL.cedric, at: { x: 0, z: 26 }, now: 1 })).toBe(true);
    expect(stop).toHaveBeenCalledTimes(1);
    line.mockReturnValue('lore_leo_castle');
    expect(bark('raiderFalls', { line: DEATH_BARK.gilbert, speaker: KIND_LABEL.gilbert, at: { x: 0, z: 26 }, now: 2 })).toBe(true);
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('a fall is a last word: Cedric falling within his gap after a taunt still says his', () => {
    expect(bark('cedricRaid', { now: 0 })).toBe(true);
    expect(bark('raiderFalls', { line: DEATH_BARK.cedric, speaker: KIND_LABEL.cedric, at: { x: 0, z: 26 }, raid: true, now: 1 })).toBe(true);
    expect(vi.mocked(audio.playAt).mock.calls.map((c) => c[0])).toEqual(['random_cedric']);
  });

  it('with no audio and no file, every event is asked for without a throw', () => {
    vi.restoreAllMocks();
    for (const [i, e] of EVENTS.entries()) {
      expect(() => bark(e, { line: BARKS[e].lines[0] ?? 'random_richard', speaker: 'S' + i, at: { x: 0, z: 0 }, now: i })).not.toThrow();
    }
    expect(() => courtBarks({ destination: 'template-02', completedQuests: ['forge_ahead'] }, 0, 0, 1)).not.toThrow();
  });
});

describe('Cedric at his camp', () => {
  /** the lines asked for, ending each one as spoken to its end (its onEnd) */
  const speakThrough = () => {
    for (let i = 0; i < 5; i++) {
      const last = vi.mocked(audio.playVoice).mock.calls.at(-1);
      const onEnd = last?.[2] as (() => void) | undefined;
      if (!onEnd) break;
      vi.mocked(audio.playVoice).mock.calls.at(-1)![2] = undefined;
      onEnd();
    }
  };

  it('coming up to it: his introduction in order, once, then not again until its long cooldown is out', () => {
    const was = { current: false };
    nearCamp(was, true, 10);
    speakThrough();
    expect(voiced()).toEqual(['c1s03t1a', 'c1s03t1b', 'c1s03t1c']);
    for (let t = 11; t < 20 + BARKS.cedricCamp.cooldown; t += 5) nearCamp(was, true, t); // staying, past the cooldown
    expect(voiced()).toHaveLength(3);
    nearCamp(was, false, 20);
    nearCamp(was, true, 30); // away and back
    expect(voiced()).toHaveLength(3);
    nearCamp(was, false, 30 + BARKS.cedricCamp.cooldown);
    nearCamp(was, true, 30 + BARKS.cedricCamp.cooldown);
    expect(voiced()).toEqual(['c1s03t1a', 'c1s03t1b', 'c1s03t1c', 'c1s03t1a']);
    expect(CAMP_HAIL).toBeGreaterThan(5);
  });

  it('cut short (or not there), the rest is not said: c1s03t1c never plays alone', () => {
    nearCamp({ current: false }, true, 0);
    // no onEnd comes: a later line or a stop cut the first, or it could not be had
    expect(voiced()).toEqual(['c1s03t1a']);
  });

  it('cut after his first line, only that line is in the session\'s record', () => {
    nearCamp({ current: false }, true, 0);
    (vi.mocked(audio.playVoice).mock.calls[0][3] as () => void)(); // the first line begins to be spoken, and is cut
    expect([...barked]).toEqual(['c1s03t1a']);
    expect([wasBarked('c1s03t1b'), wasBarked('c1s03t1c')]).toEqual([false, false]);
  });
});

describe('the court', () => {
  const st = { destination: 'template-02', completedQuests: ['forge_ahead'] };
  const R = NPC_BY_ID.richard;

  it('walking into Richard: his collision line once, until the player steps clear and comes again past its cooldown', () => {
    courtBarks(st, R.x, R.z + 3, 0.016, 0);
    courtBarks(st, R.x, R.z + BUMP - 0.1, 0.016, 0.1);
    // shuffling about in him, for longer than the line's cooldown
    for (let i = 0; i < 40; i++) courtBarks(st, R.x, R.z + 0.5 + (i % 2) * 0.01, 0.016, 0.2 + i * 0.5);
    expect(voiced()).toEqual(['collision_richard']);
    courtBarks(st, R.x, R.z + 3, 0.016, 21); // clear of him
    courtBarks(st, R.x, R.z + 0.5, 0.016, 22); // in again, past the cooldown
    courtBarks(st, R.x, R.z + 3, 0.016, 23);
    courtBarks(st, R.x, R.z + 0.5, 0.016, 24); // and again, within it
    expect(voiced()).toEqual(['collision_richard', 'collision_richard']);
    courtBarks(st, R.x, R.z + 3, 0.016, 25);
    courtBarks(st, R.x, R.z + 0.5, 0.016, 22 + BARKS.courtBump.cooldown);
    expect(voiced()).toEqual(['collision_richard', 'collision_richard', 'collision_richard']);
  });

  it('a figure that walks into a player standing still is not the player walking into him', () => {
    for (let i = 0; i < 3; i++) courtBarks(st, R.x, R.z + 0.5, 0.016, i);
    expect(voiced()).toEqual([]);
  });

  it('standing idle beside him: a line of his now and then, never every frame', () => {
    let t = 0;
    const frame = () => { courtBarks(st, R.x, R.z + NEAR - 1, 0.05, t); t += 0.05; };
    for (let i = 0; i < (IDLE_FOR - 0.2) / 0.05; i++) frame();
    expect(voiced()).toEqual([]);
    for (let i = 0; i < 10; i++) frame();
    expect(voiced()).toEqual(['random_richard']);
    while (t < IDLE_FOR + BARKS.courtIdle.cooldown - 0.5) frame();
    expect(voiced()).toEqual(['random_richard']);
    for (let i = 0; i < 20; i++) frame();
    expect(voiced()).toEqual(['random_richard', 'random_richard']);
  });

  it('a mutter never talks over a line being spoken, or loaded to be spoken', () => {
    vi.spyOn(audio, 'speaking', 'get').mockReturnValue(true);
    let t = 0;
    for (let i = 0; i < (IDLE_FOR + 2) / 0.05; i++) { courtBarks(st, R.x, R.z + NEAR - 1, 0.05, t); t += 0.05; }
    expect(voiced()).toEqual([]);
  });

  it('the court holds its tongue while a fight is on in its world (Storm\'s duel is fought on her own spot)', () => {
    useEnemyStore.setState({ enemies: [{ kind: 'storm', world: 'template-02', mob: { state: 'chase' } }] } as never);
    try {
      courtBarks(st, R.x, R.z + 3, 0.016, 0);
      courtBarks(st, R.x, R.z + 0.5, 0.016, 0.1); // a walk into him
      let t = 1;
      for (let i = 0; i < (IDLE_FOR + 2) / 0.05; i++) { courtBarks(st, R.x, R.z + NEAR - 1, 0.05, t); t += 0.05; }
      expect(voiced()).toEqual([]);
    } finally {
      useEnemyStore.setState({ enemies: [] } as never);
    }
    courtBarks(st, R.x, R.z + 3, 0.016, 20);
    courtBarks(st, R.x, R.z + 0.5, 0.016, 20.1); // the fight over: a walk into him is protested
    expect(voiced()).toEqual(['collision_richard']);
  });

  it('standing his ground through a fight is not standing idle: no mutter as it ends, one only after IDLE_FOR more', () => {
    let t = 0;
    const frame = () => { courtBarks(st, R.x, R.z + NEAR - 1, 0.05, t); t += 0.05; };
    useEnemyStore.setState({ enemies: [{ kind: 'storm', world: 'template-02', mob: { state: 'chase' } }] } as never);
    try {
      for (let i = 0; i < (IDLE_FOR + 3) / 0.05; i++) frame();
    } finally {
      useEnemyStore.setState({ enemies: [] } as never);
    }
    for (let i = 0; i < (IDLE_FOR - 0.5) / 0.05; i++) frame();
    expect(voiced()).toEqual([]);
    for (let i = 0; i < 20; i++) frame();
    expect(voiced()).toEqual(['random_richard']);
  });

  it('the two lines Storm says as her duel ends spend the court\'s cooldowns: neither is said again straight after', () => {
    const S = NPC_BY_ID.storm;
    const sst = { destination: 'template-06', completedQuests: ['squires_errand'] }; // her reveal
    let t = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => t * 1000);
    resolveDuel(true, -1); // won: collision_storm, then random_storm, said straight from duel.ts
    expect(voiced()).toEqual(['collision_storm', 'random_storm']);
    const frame = (z: number) => { courtBarks(sst, S.x, S.z + z, 0.05, t); t += 0.05; };
    for (let i = 0; i < (IDLE_FOR + 2) / 0.05; i++) frame(3); // standing still beside her figure
    frame(BUMP + 2);
    frame(0.5); // and through it, within the line's cooldown
    expect(voiced()).toEqual(['collision_storm', 'random_storm']);
    t += BARKS.courtBump.cooldown;
    frame(BUMP + 2);
    frame(0.5); // past it, a walk into her is protested as ever
    expect(voiced()).toEqual(['collision_storm', 'random_storm', 'collision_storm']);
  });

  it('nobody barks from another world, or before his reveal', () => {
    courtBarks({ destination: null, completedQuests: ['forge_ahead'] }, R.x, R.z + 3, 0.016, 0);
    courtBarks({ destination: null, completedQuests: ['forge_ahead'] }, R.x, R.z + 0.5, 0.016, 1);
    courtBarks({ destination: 'template-02', completedQuests: [] }, R.x, R.z + 3, 0.016, 2);
    courtBarks({ destination: 'template-02', completedQuests: [] }, R.x, R.z + 0.5, 0.016, 3);
    expect(voiced()).toEqual([]);
  });
});

describe('a line where its speaker stands', () => {
  it('going to another place stops the voice channel, so a sequence begun at the camp goes no further', () => {
    const stop = vi.spyOn(audio, 'stopVoice');
    useGameStore.getState().travelTo('template-05');
    expect(stop).toHaveBeenCalledTimes(1);
    useGameStore.getState().returnHome();
    expect(stop).toHaveBeenCalledTimes(2);
  });
});

describe('the subtitles', () => {
  it('a line with words shows its speaker and words while spoken and HOLD seconds more; a stop takes it down', () => {
    vi.useFakeTimers();
    showVoice({ name: 'c2s01t2a', seconds: 3 });
    expect(useSubtitle.getState().line).toEqual(BARK_LINES.c2s01t2a);
    vi.advanceTimersByTime((3 + HOLD) * 1000 - 10);
    expect(useSubtitle.getState().line).not.toBeNull();
    vi.advanceTimersByTime(20);
    expect(useSubtitle.getState().line).toBeNull();
    showVoice({ name: 'lore_leo_castle', seconds: 3 });
    expect(useSubtitle.getState().line?.speaker).toBe('King Leo');
    showVoice(null);
    expect(useSubtitle.getState().line).toBeNull();
    vi.useRealTimers();
  });

  it('a sound with no words shows nothing: no subtitle is made up for a greeting or a grunt', () => {
    for (const id of ['greeting_cedric', 'random_richard', 'collision_raider', 'greeting_villager']) {
      expect(subtitleOf(id)).toBeNull();
      showVoice({ name: id, seconds: 1 });
      expect(useSubtitle.getState().line).toBeNull();
    }
  });

  it('the voice channel drives them', () => {
    expect(audio.voiceListener).toBe(showVoice);
  });
});
