import { describe, expect, it } from 'vitest';
import { NPCS } from './npcs';
import { LORE_VOICES } from '@/lib/audioCatalog';
import MANIFEST from './assetManifest.json';

// Wave 64.4 (F-12) · each lore line shows the words its clip speaks. The asset manifest (assetManifest.json, wave 66,
// which took in F-12's loreTranscripts.generated.json) names, per lore audio id, the voice line the local copy script
// (scripts/prepare-assets.mjs) copies it from, and holds that line's transcript out of the original game's pak
// (Windows-1252, verbatim). It is committed because CI cannot read the extraction.

const voices = new Map(MANIFEST.voices.map((v) => [v.id, v]));
/** per lore id: its clip, as challenge<n>/<line>, and that clip's transcript */
const table: Record<string, { source: string; text: string }> = Object.fromEntries(MANIFEST.lore.map((l) => {
  const v = voices.get(l.voice)!;
  return [l.id, { source: v.src.replace(/^pak\/system\/challenges\/sounds\/|\.wav$/g, ''), text: v.text ?? '' }];
}));

/** what the transcripts differ in without saying anything different: curly apostrophes (0x92), doubled spaces,
 *  trailing spaces and line endings */
const normalise = (s: string) => s.replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();

/** the one place a line deliberately leaves out what is spoken: Leo's stutter */
const UNSHOWN: Record<string, [spoken: string, shown: string]> = {
  lore_leo_castle: ['Do do you', 'Do you'],
};

const shownTranscript = (id: string) => {
  const t = normalise(table[id].text);
  return UNSHOWN[id] ? t.replace(UNSHOWN[id][0], UNSHOWN[id][1]) : t;
};

const loreLines = NPCS.flatMap((n) => (n.loreLines ?? []).map((l) => ({ npc: n.id, ...l })));

describe('lore transcripts', () => {
  it('has one transcript for every lore sound, each spoken by exactly one lore line', () => {
    const loreSounds = [...LORE_VOICES].sort();
    expect(Object.keys(table).sort()).toEqual(loreSounds);
    expect(loreLines.map((l) => l.sound).sort()).toEqual(loreSounds);
  });

  it.each(loreLines)('$npc shows what $sound speaks', ({ sound, text }) => {
    expect(normalise(text)).toBe(shownTranscript(sound));
  });

  it("gives King Leo's fourth line the words of its clip, c1s04t1a", () => {
    const leo = NPCS.find((n) => n.id === 'king')!.loreLines!;
    expect(leo[3]).toEqual({ text: "Ignore Cedric! Let me see Richard's new recruit!", sound: 'lore_richard_cedric' });
    expect(table.lore_richard_cedric.source).toBe('challenge1/c1s04t1a');
  });

  it('normalises only quotes and spacing, and the stutter exception is still needed', () => {
    expect(normalise('He’s  here! \r\n')).toBe("He's here!");
    expect(normalise('Did you')).not.toBe(normalise('Do you'));
    for (const [id, [spoken]] of Object.entries(UNSHOWN)) expect(normalise(table[id].text)).toContain(spoken);
  });
});
