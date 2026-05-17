import { applyI18n } from './i18n';

document.addEventListener('DOMContentLoaded', () => {
  // Apply internationalization
  applyI18n();

  const toggleSimplifier = document.getElementById('toggle-simplifier') as HTMLInputElement;
  const openSettings = document.getElementById('open-settings') as HTMLButtonElement;

  // Load initial state
  chrome.storage.local.get(['enabled'], (result) => {
    if (toggleSimplifier) {
      toggleSimplifier.checked = result.enabled ?? true;
    }
  });

  // Event listeners
  if (toggleSimplifier) {
    toggleSimplifier.addEventListener('change', () => {
      chrome.storage.local.set({ enabled: toggleSimplifier.checked });
    });
  }

  if (openSettings) {
    openSettings.addEventListener('click', () => {
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open(chrome.runtime.getURL('options.html'));
      }
    });
  }
});
