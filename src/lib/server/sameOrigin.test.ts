import { describe, expect, it } from 'vitest';
import { sameOrigin } from './sameOrigin';

const post = (origin?: string) =>
  new Request('http://localhost:3102/api/save', { method: 'POST', headers: origin === undefined ? {} : { origin } });

describe('sameOrigin', () => {
  it('takes a POST from the game\'s own origin', () => {
    expect(sameOrigin(post('http://localhost:3102'))).toBe(true);
  });
  it('refuses one from another port or another subdomain of the same site', () => {
    expect(sameOrigin(post('http://localhost:3000'))).toBe(false);
    expect(sameOrigin(post('http://evil.localhost:3102'))).toBe(false);
  });
  it('refuses an Origin it cannot read, and "null" (a sandboxed or opaque origin)', () => {
    expect(sameOrigin(post('not a url'))).toBe(false);
    expect(sameOrigin(post('null'))).toBe(false);
  });
  it('lets a request with no Origin through to the route\'s own checks', () => {
    expect(sameOrigin(post())).toBe(true);
  });
});
