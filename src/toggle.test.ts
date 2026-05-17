import { describe, it, expect } from 'vitest';
import {
  isHostDisabled,
  computeActiveFlags,
  addHostToDisabled,
  removeHostFromDisabled,
} from './toggle';

describe('toggle', () => {
  describe('isHostDisabled', () => {
    it('returns false when host is null/undefined/empty', () => {
      expect(isHostDisabled(null, ['a.com'])).toBe(false);
      expect(isHostDisabled(undefined, ['a.com'])).toBe(false);
      expect(isHostDisabled('', ['a.com'])).toBe(false);
    });

    it('returns false when list is not an array', () => {
      expect(isHostDisabled('a.com', undefined)).toBe(false);
      expect(isHostDisabled('a.com', null)).toBe(false);
      expect(isHostDisabled('a.com', 'a.com' as unknown)).toBe(false);
    });

    it('returns false when host not in list', () => {
      expect(isHostDisabled('a.com', ['b.com', 'c.com'])).toBe(false);
    });

    it('returns true when host in list', () => {
      expect(isHostDisabled('a.com', ['a.com'])).toBe(true);
      expect(isHostDisabled('a.com', ['b.com', 'a.com'])).toBe(true);
    });

    it('treats www subdomain as a distinct host (no normalization)', () => {
      expect(isHostDisabled('www.a.com', ['a.com'])).toBe(false);
      expect(isHostDisabled('a.com', ['www.a.com'])).toBe(false);
    });
  });

  describe('computeActiveFlags', () => {
    const allOn = {
      enabled: true,
      furiganaEnabled: true,
      kanjiReplaceEnabled: true,
      longSplitEnabled: true,
      disabledHosts: [] as string[],
    };

    it('all features active when master + per-feature all ON', () => {
      const r = computeActiveFlags(allOn, 'a.com');
      expect(r.masterOn).toBe(true);
      expect(r.furiganaActive).toBe(true);
      expect(r.kanjiReplaceActive).toBe(true);
      expect(r.longSplitActive).toBe(true);
    });

    it('master OFF gates every feature regardless of per-feature flags', () => {
      const r = computeActiveFlags({ ...allOn, enabled: false }, 'a.com');
      expect(r.masterOn).toBe(false);
      expect(r.furiganaActive).toBe(false);
      expect(r.kanjiReplaceActive).toBe(false);
      expect(r.longSplitActive).toBe(false);
    });

    it('site-disabled gates every feature like master OFF', () => {
      const r = computeActiveFlags({ ...allOn, disabledHosts: ['a.com'] }, 'a.com');
      expect(r.masterOn).toBe(false);
      expect(r.furiganaActive).toBe(false);
      expect(r.kanjiReplaceActive).toBe(false);
      expect(r.longSplitActive).toBe(false);
    });

    it('site-disabled for a different host does not affect current tab', () => {
      const r = computeActiveFlags({ ...allOn, disabledHosts: ['b.com'] }, 'a.com');
      expect(r.masterOn).toBe(true);
      expect(r.furiganaActive).toBe(true);
    });

    it('per-feature flag OFF disables only that feature', () => {
      const r = computeActiveFlags({ ...allOn, furiganaEnabled: false }, 'a.com');
      expect(r.masterOn).toBe(true);
      expect(r.furiganaActive).toBe(false);
      expect(r.kanjiReplaceActive).toBe(true);
      expect(r.longSplitActive).toBe(true);
    });

    it('missing fields are treated as falsy (defensive defaults)', () => {
      const r = computeActiveFlags({}, 'a.com');
      expect(r.masterOn).toBe(false);
      expect(r.furiganaActive).toBe(false);
    });

    it('null host with master ON still activates (extension-page edge case)', () => {
      const r = computeActiveFlags(allOn, null);
      expect(r.masterOn).toBe(true);
    });
  });

  describe('addHostToDisabled', () => {
    it('adds a new host', () => {
      expect(addHostToDisabled([], 'a.com')).toEqual(['a.com']);
      expect(addHostToDisabled(['b.com'], 'a.com')).toEqual(['b.com', 'a.com']);
    });

    it('is idempotent for an already-present host', () => {
      expect(addHostToDisabled(['a.com'], 'a.com')).toEqual(['a.com']);
    });

    it('returns a fresh array (does not mutate input)', () => {
      const src = ['a.com'];
      const out = addHostToDisabled(src, 'b.com');
      expect(out).not.toBe(src);
      expect(src).toEqual(['a.com']);
    });

    it('coerces non-array input into an empty list before adding', () => {
      expect(addHostToDisabled(undefined, 'a.com')).toEqual(['a.com']);
      expect(addHostToDisabled(null, 'a.com')).toEqual(['a.com']);
    });

    it('ignores empty host', () => {
      expect(addHostToDisabled(['a.com'], '')).toEqual(['a.com']);
    });
  });

  describe('removeHostFromDisabled', () => {
    it('removes the host when present', () => {
      expect(removeHostFromDisabled(['a.com', 'b.com'], 'a.com')).toEqual(['b.com']);
    });

    it('is a no-op when host not present', () => {
      expect(removeHostFromDisabled(['a.com'], 'b.com')).toEqual(['a.com']);
    });

    it('returns empty list when input is not an array', () => {
      expect(removeHostFromDisabled(undefined, 'a.com')).toEqual([]);
      expect(removeHostFromDisabled(null, 'a.com')).toEqual([]);
    });

    it('does not mutate input', () => {
      const src = ['a.com', 'b.com'];
      const out = removeHostFromDisabled(src, 'a.com');
      expect(out).not.toBe(src);
      expect(src).toEqual(['a.com', 'b.com']);
    });
  });

  describe('round trip: add then remove leaves list unchanged', () => {
    it('preserves the original membership', () => {
      const before = ['a.com'];
      const added = addHostToDisabled(before, 'b.com');
      const after = removeHostFromDisabled(added, 'b.com');
      expect(after).toEqual(before);
    });
  });
});
