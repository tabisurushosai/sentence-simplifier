import { describe, it, expect } from 'vitest';
import {
  STRIPE_PAYMENT_LINK,
  buildCheckoutUrl,
  isValidLicenseFormat,
  computeChecksum,
  verifyLicenseCode,
} from './upgrade';

describe('upgrade', () => {
  describe('buildCheckoutUrl', () => {
    it('returns the static link when no token given', () => {
      expect(buildCheckoutUrl()).toBe(STRIPE_PAYMENT_LINK);
    });

    it('appends client_reference_id when token given', () => {
      const url = buildCheckoutUrl('abc123');
      expect(url).toContain('client_reference_id=abc123');
    });

    it('uses ? when base has no query, & when it does', () => {
      const base = STRIPE_PAYMENT_LINK;
      const url = buildCheckoutUrl('t');
      const expectedSep = base.includes('?') ? '&' : '?';
      expect(url).toBe(`${base}${expectedSep}client_reference_id=t`);
    });

    it('url-encodes the token', () => {
      const url = buildCheckoutUrl('a b/c');
      expect(url).toContain('client_reference_id=a%20b%2Fc');
    });
  });

  describe('isValidLicenseFormat', () => {
    it('accepts uppercase code with checksum', () => {
      expect(isValidLicenseFormat('SS-ABCD1234-EF')).toBe(true);
    });

    it('accepts lowercase (will be normalized)', () => {
      expect(isValidLicenseFormat('ss-abcd1234-ef')).toBe(true);
    });

    it('trims surrounding whitespace', () => {
      expect(isValidLicenseFormat('  SS-ABCD1234-EF  ')).toBe(true);
    });

    it('rejects wrong prefix', () => {
      expect(isValidLicenseFormat('XX-ABCD1234-EF')).toBe(false);
    });

    it('rejects wrong payload length', () => {
      expect(isValidLicenseFormat('SS-ABCD123-EF')).toBe(false);
      expect(isValidLicenseFormat('SS-ABCD12345-EF')).toBe(false);
    });

    it('rejects wrong checksum length', () => {
      expect(isValidLicenseFormat('SS-ABCD1234-E')).toBe(false);
      expect(isValidLicenseFormat('SS-ABCD1234-EFG')).toBe(false);
    });

    it('rejects non-alphanumeric characters', () => {
      expect(isValidLicenseFormat('SS-ABCD-1234-EF')).toBe(false);
      expect(isValidLicenseFormat('SS-ABCD!234-EF')).toBe(false);
    });

    it('rejects non-string input', () => {
      // @ts-expect-error testing runtime guard
      expect(isValidLicenseFormat(null)).toBe(false);
      // @ts-expect-error testing runtime guard
      expect(isValidLicenseFormat(undefined)).toBe(false);
      // @ts-expect-error testing runtime guard
      expect(isValidLicenseFormat(123)).toBe(false);
    });
  });

  describe('computeChecksum', () => {
    it('is deterministic', () => {
      expect(computeChecksum('ABCD1234')).toBe(computeChecksum('ABCD1234'));
    });

    it('returns two-character checksum', () => {
      expect(computeChecksum('ABCD1234')).toHaveLength(2);
    });

    it('produces different checksums for different inputs', () => {
      expect(computeChecksum('ABCD1234')).not.toBe(computeChecksum('ABCD1235'));
    });

    it('returns 00 for invalid alphabet characters', () => {
      expect(computeChecksum('????????')).toBe('00');
    });
  });

  describe('verifyLicenseCode', () => {
    it('accepts a code whose checksum matches', () => {
      const payload = 'ABCD1234';
      const checksum = computeChecksum(payload);
      expect(verifyLicenseCode(`SS-${payload}-${checksum}`)).toBe(true);
    });

    it('rejects a code whose checksum does not match', () => {
      expect(verifyLicenseCode('SS-ABCD1234-ZZ')).toBe(false);
    });

    it('rejects structurally invalid code', () => {
      expect(verifyLicenseCode('not-a-code')).toBe(false);
    });

    it('normalizes case before verifying', () => {
      const payload = 'XYZW9999';
      const checksum = computeChecksum(payload);
      const code = `ss-${payload.toLowerCase()}-${checksum.toLowerCase()}`;
      expect(verifyLicenseCode(code)).toBe(true);
    });
  });
});
