import { applyI18n } from './i18n';
import { storage } from './storage';

document.addEventListener('DOMContentLoaded', async () => {
  // Apply internationalization
  applyI18n();

  const toggleSimplifier = document.getElementById('toggle-simplifier') as HTMLInputElement;
  const openSettings = document.getElementById('open-settings') as HTMLButtonElement;

  // Load initial state
  const { enabled } = await storage.get(['enabled']);
  if (toggleSimplifier) {
    toggleSimplifier.checked = enabled;
  }

  // Event listeners
  if (toggleSimplifier) {
    toggleSimplifier.addEventListener('change', async () => {
      await storage.set({ enabled: toggleSimplifier.checked });
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
