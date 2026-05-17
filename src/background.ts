import { openCheckout } from './upgrade';

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    const trialStartTs = Date.now();
    chrome.storage.local.set({
      trial_start_ts: trialStartTs,
      premium_unlocked: false,
    }, () => {
      console.log('Initial storage state set:', { trial_start_ts: trialStartTs, premium_unlocked: false });
    });
  }
  console.log('Extension installed or updated. Reason:', details.reason);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message && message.type === 'openUpgrade') {
    openCheckout()
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }
  return false;
});

console.log('Background worker loaded');
