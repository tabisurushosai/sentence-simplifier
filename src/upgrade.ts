/**
 * Upgrade flow: Stripe Checkout URL generation and license redemption.
 *
 * Architecture note: the extension is fully offline (no host_permissions,
 * no fetch calls). We use Stripe Payment Links — a static URL hosted by
 * Stripe — and open it in a new tab. The user completes payment on
 * Stripe's site, then receives a license code (via Stripe's confirmation
 * email or a success page). They return to the extension's options page
 * and enter the code to unlock Premium locally.
 */

import { storage } from './storage';
import { unlockPremium } from './premium';

/**
 * Static Stripe Payment Link. Replace with the real production URL when
 * the Stripe product is created. Until then this is a placeholder.
 */
export const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/test_PLACEHOLDER';

/**
 * Build the Stripe Checkout URL. Optionally appends a client_reference_id
 * so Stripe webhooks (server-side, out of extension's scope) can match a
 * purchase back to an install. We pass a random install token rather than
 * any personal info.
 */
export function buildCheckoutUrl(installToken?: string): string {
  if (!installToken) return STRIPE_PAYMENT_LINK;
  const sep = STRIPE_PAYMENT_LINK.includes('?') ? '&' : '?';
  return `${STRIPE_PAYMENT_LINK}${sep}client_reference_id=${encodeURIComponent(installToken)}`;
}

/**
 * Get or create a random per-install token used as Stripe client_reference_id.
 * Not personally identifying — just a random opaque string stored locally.
 */
export async function getInstallToken(): Promise<string> {
  const all = await storage.getAll();
  const existing = (all as unknown as Record<string, unknown>).install_token;
  if (typeof existing === 'string' && existing.length > 0) return existing;
  const token = generateInstallToken();
  await chrome.storage.local.set({ install_token: token });
  return token;
}

function generateInstallToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Open Stripe Checkout in a new tab.
 */
export async function openCheckout(): Promise<void> {
  const token = await getInstallToken();
  const url = buildCheckoutUrl(token);
  await chrome.tabs.create({ url });
}

/**
 * License code format: "SS-XXXXXXXX-YY" where XXXXXXXX is 8 alphanumeric
 * characters and YY is a 2-character checksum derived from the prefix.
 *
 * Pure helper, exported for testing. Real production would verify against
 * a server, but the extension is offline-only by design, so we accept
 * structurally valid codes plus a checksum to prevent typos.
 */
export function isValidLicenseFormat(code: string): boolean {
  if (typeof code !== 'string') return false;
  const trimmed = code.trim().toUpperCase();
  return /^SS-[A-Z0-9]{8}-[A-Z0-9]{2}$/.test(trimmed);
}

/**
 * Compute checksum for a license payload. Pure function.
 *
 * Deterministic mod-36 checksum across the 8 payload characters.
 */
export function computeChecksum(payload: string): string {
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let sum = 0;
  for (let i = 0; i < payload.length; i++) {
    const ch = payload.charAt(i);
    const idx = ALPHABET.indexOf(ch);
    if (idx < 0) return '00';
    sum = (sum * 31 + idx) % (36 * 36);
  }
  const first = Math.floor(sum / 36);
  const second = sum % 36;
  return ALPHABET.charAt(first) + ALPHABET.charAt(second);
}

/**
 * Verify a license code structure + checksum. Pure function.
 */
export function verifyLicenseCode(code: string): boolean {
  if (!isValidLicenseFormat(code)) return false;
  const normalized = code.trim().toUpperCase();
  const payload = normalized.slice(3, 11);
  const checksum = normalized.slice(12, 14);
  return computeChecksum(payload) === checksum;
}

/**
 * Redeem a license code. Unlocks Premium permanently if the code passes
 * local structure + checksum verification.
 *
 * Returns true on success, false on invalid code.
 */
export async function redeemLicenseCode(code: string): Promise<boolean> {
  if (!verifyLicenseCode(code)) return false;
  await unlockPremium();
  await chrome.storage.local.set({ license_code: code.trim().toUpperCase() });
  return true;
}
