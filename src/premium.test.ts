import { describe, it, expect } from 'vitest';
import { computeTrialState, computePremiumStatus, TRIAL_MS } from './premium';

describe('premium', () => {
  describe('computeTrialState', () => {
    it('returns no trial when trialStartTs is undefined', () => {
      const result = computeTrialState(undefined, 1_000_000);
      expect(result).toEqual({ isTrial: false, trialDaysRemaining: 0 });
    });

    it('returns no trial when trialStartTs is 0 or negative', () => {
      expect(computeTrialState(0, 1_000_000)).toEqual({ isTrial: false, trialDaysRemaining: 0 });
      expect(computeTrialState(-100, 1_000_000)).toEqual({ isTrial: false, trialDaysRemaining: 0 });
    });

    it('returns trial active just after install', () => {
      const start = 1_000_000;
      const now = start + 1000;
      const result = computeTrialState(start, now);
      expect(result.isTrial).toBe(true);
      expect(result.trialDaysRemaining).toBe(7);
    });

    it('returns trial active near end of window', () => {
      const start = 1_000_000;
      const now = start + TRIAL_MS - 1;
      const result = computeTrialState(start, now);
      expect(result.isTrial).toBe(true);
      expect(result.trialDaysRemaining).toBe(1);
    });

    it('returns no trial exactly at end of window', () => {
      const start = 1_000_000;
      const now = start + TRIAL_MS;
      const result = computeTrialState(start, now);
      expect(result.isTrial).toBe(false);
      expect(result.trialDaysRemaining).toBe(0);
    });

    it('returns no trial after end of window', () => {
      const start = 1_000_000;
      const now = start + TRIAL_MS + 1_000_000;
      const result = computeTrialState(start, now);
      expect(result.isTrial).toBe(false);
      expect(result.trialDaysRemaining).toBe(0);
    });

    it('returns no trial when clock has gone backwards', () => {
      const result = computeTrialState(2_000_000, 1_000_000);
      expect(result.isTrial).toBe(false);
      expect(result.trialDaysRemaining).toBe(0);
    });
  });

  describe('computePremiumStatus', () => {
    it('paid premium has access regardless of trial state', () => {
      const status = computePremiumStatus(true, undefined, 1_000_000);
      expect(status.isPremium).toBe(true);
      expect(status.hasAccess).toBe(true);
      expect(status.isTrial).toBe(false);
    });

    it('trial-only user has access during trial window', () => {
      const start = 1_000_000;
      const status = computePremiumStatus(false, start, start + 1000);
      expect(status.isPremium).toBe(false);
      expect(status.isTrial).toBe(true);
      expect(status.hasAccess).toBe(true);
      expect(status.trialDaysRemaining).toBe(7);
    });

    it('expired trial without purchase has no access', () => {
      const start = 1_000_000;
      const status = computePremiumStatus(false, start, start + TRIAL_MS + 1);
      expect(status.isPremium).toBe(false);
      expect(status.isTrial).toBe(false);
      expect(status.hasAccess).toBe(false);
    });

    it('no trial start and no purchase has no access', () => {
      const status = computePremiumStatus(false, undefined, 1_000_000);
      expect(status.hasAccess).toBe(false);
    });

    it('paid premium with expired trial still has access', () => {
      const start = 1_000_000;
      const status = computePremiumStatus(true, start, start + TRIAL_MS + 1);
      expect(status.hasAccess).toBe(true);
      expect(status.isPremium).toBe(true);
      expect(status.isTrial).toBe(false);
    });
  });
});
