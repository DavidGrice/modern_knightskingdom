// TEMPORARY (wave 63.1, F-07): fails on purpose, to show that CI's required job now holds the merge on a failing unit
// test. The next commit of the same PR removes this file.
import { expect, it } from 'vitest';

it('fails on purpose, so the CI gate can be seen to hold the merge', () => {
  expect(1).toBe(2);
});
