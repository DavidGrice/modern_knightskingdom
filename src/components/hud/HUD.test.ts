import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import HUD from './HUD';

/** the markup of the first element whose class list starts with `cls`, open tag to its own close */
function elementOf(markup: string, cls: string): string | null {
  const start = markup.indexOf(`<div class="${cls}`);
  if (start < 0) return null;
  const tags = /<(\/?)div\b/g;
  tags.lastIndex = start;
  let depth = 0;
  for (let m = tags.exec(markup); m; m = tags.exec(markup)) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return markup.slice(start, markup.indexOf('>', m.index) + 1);
  }
  return null;
}

describe('the HUD save chip (F-08a)', () => {
  it('sits above the tracked-quest card in one column, not under a card pinned over it', () => {
    const markup = renderToStaticMarkup(createElement(HUD, { saveProblem: 'the server answered 500' }));
    const column = elementOf(markup, 'kk-topright');
    expect(column).not.toBeNull();
    const chip = column!.indexOf('kk-save-chip');
    const card = column!.indexOf('kk-objective kk-glass');
    expect(chip).toBeGreaterThan(-1);
    expect(card).toBeGreaterThan(chip); // the card follows the chip down the column
    expect(markup.split('kk-objective kk-glass').length).toBe(2); // and is drawn once, there

    // a card absolutely positioned would leave the column's flow and land over the chip again
    const css = readFileSync(fileURLToPath(new URL('../../styles/kk-hud-field.css', import.meta.url)), 'utf8');
    const rule = css.match(/\n\.kk-objective \{[^}]*\}/)?.[0];
    expect(rule).toBeDefined();
    expect(rule).not.toMatch(/position:\s*absolute/);
  });
});
