/**
 * Premium gating: trial period management and premium status checks.
 *
 * Free tier: basic features always available.
 * Trial: first TRIAL_DAYS days from install grants full Premium features.
 * Premium: permanent unlock via Stripe Checkout (premium_unlocked = true).
 */

import { storage } from './storage';

export const TRIAL_DAYS = 7;
export const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;

export interface PremiumStatus {
  isPremium: boolean;
  isTrial: boolean;
  trialDaysRemaining: number;
  hasAccess: boolean;
}

/**
 * Pure helper: compute trial state from timestamps. Exported for testing.
 */
export function computeTrialState(
  trialStartTs: number | undefined,
  nowMs: number,
): { isTrial: boolean; trialDaysRemaining: number } {
  if (trialStartTs === undefined || trialStartTs <= 0) {
    return { isTrial: false, trialDaysRemaining: 0 };
  }
  const elapsedMs = nowMs - trialStartTs;
  if (elapsedMs < 0 || elapsedMs >= TRIAL_MS) {
    return { isTrial: false, trialDaysRemaining: 0 };
  }
  const remainingMs = TRIAL_MS - elapsedMs;
  const trialDaysRemaining = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
  return { isTrial: true, trialDaysRemaining };
}

/**
 * Pure helper: compute full premium status from raw inputs.
 */
export function computePremiumStatus(
  premiumUnlocked: boolean,
  trialStartTs: number | undefined,
  nowMs: number,
): PremiumStatus {
  const trial = computeTrialState(trialStartTs, nowMs);
  const isPremium = premiumUnlocked === true;
  return {
    isPremium,
    isTrial: trial.isTrial,
    trialDaysRemaining: trial.trialDaysRemaining,
    hasAccess: isPremium || trial.isTrial,
  };
}

/**
 * Read storage and return current premium status.
 */
export async function getPremiumStatus(nowMs: number = Date.now()): Promise<PremiumStatus> {
  const data = await storage.get(['premium_unlocked', 'trial_start_ts']);
  return computePremiumStatus(data.premium_unlocked, data.trial_start_ts, nowMs);
}

/**
 * Convenience: true if user has access to Premium features (paid or trial).
 */
export async function hasAccess(nowMs: number = Date.now()): Promise<boolean> {
  return (await getPremiumStatus(nowMs)).hasAccess;
}

/**
 * Convenience: true if user has paid for Premium permanently.
 */
export async function isPremium(): Promise<boolean> {
  const data = await storage.get(['premium_unlocked']);
  return data.premium_unlocked === true;
}

/**
 * Convenience: true if user is in trial window.
 */
export async function isTrial(nowMs: number = Date.now()): Promise<boolean> {
  const data = await storage.get(['trial_start_ts']);
  return computeTrialState(data.trial_start_ts, nowMs).isTrial;
}

/**
 * Initialise trial start timestamp if not already set.
 * Safe to call multiple times — never overwrites an existing value.
 */
export async function ensureTrialStarted(nowMs: number = Date.now()): Promise<number> {
  const data = await storage.get(['trial_start_ts']);
  if (data.trial_start_ts && data.trial_start_ts > 0) {
    return data.trial_start_ts;
  }
  await storage.set({ trial_start_ts: nowMs });
  return nowMs;
}

/**
 * Mark premium as permanently unlocked. Called from upgrade flow after Stripe success.
 */
export async function unlockPremium(): Promise<void> {
  await storage.set({ premium_unlocked: true });
}
