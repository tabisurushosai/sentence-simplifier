/**
 * Pure helpers for the toggle feature (T028-T030).
 *
 * The toggle system has three layers of precedence:
 *   1. master `enabled` flag (popup big switch)
 *   2. per-site `disabledHosts` (this tab's host muted)
 *   3. per-feature flags (furiganaEnabled / kanjiReplaceEnabled / longSplitEnabled)
 *
 * Layer 1 OFF wins over everything. Layer 2 match for the current host is
 * equivalent to layer 1 OFF for that tab. Per-feature flags only matter when
 * the master gate is open.
 */

export interface ToggleInputs {
  enabled?: boolean;
  furiganaEnabled?: boolean;
  kanjiReplaceEnabled?: boolean;
  longSplitEnabled?: boolean;
  disabledHosts?: string[];
}

export interface ActiveFlags {
  masterOn: boolean;
  furiganaActive: boolean;
  kanjiReplaceActive: boolean;
  longSplitActive: boolean;
}

export function isHostDisabled(host: string | null | undefined, disabledHosts: unknown): boolean {
  if (!host) return false;
  return Array.isArray(disabledHosts) && (disabledHosts as unknown[]).includes(host);
}

export function computeActiveFlags(input: ToggleInputs, host: string | null | undefined): ActiveFlags {
  const masterOn = !!input.enabled && !isHostDisabled(host, input.disabledHosts);
  return {
    masterOn,
    furiganaActive: masterOn && !!input.furiganaEnabled,
    kanjiReplaceActive: masterOn && !!input.kanjiReplaceEnabled,
    longSplitActive: masterOn && !!input.longSplitEnabled,
  };
}

export function addHostToDisabled(list: unknown, host: string): string[] {
  const base: string[] = Array.isArray(list) ? [...(list as string[])] : [];
  if (!host) return base;
  if (!base.includes(host)) base.push(host);
  return base;
}

export function removeHostFromDisabled(list: unknown, host: string): string[] {
  const base: string[] = Array.isArray(list) ? [...(list as string[])] : [];
  const i = base.indexOf(host);
  if (i !== -1) base.splice(i, 1);
  return base;
}
