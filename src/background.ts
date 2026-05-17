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

console.log('Background worker loaded');
