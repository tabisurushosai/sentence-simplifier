import { applyI18n, t } from './i18n';
import { storage } from './storage';
import type { ReadabilityResult, ReadabilityLevel } from './readability';

const LEVEL_I18N: Record<ReadabilityLevel, string> = {
  easy: 'readability_easy',
  normal: 'readability_normal',
  hard: 'readability_hard',
};

function requestReadability(): Promise<ReadabilityResult | null> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) {
        resolve(null);
        return;
      }
      try {
        chrome.tabs.sendMessage(tab.id, { type: 'getReadability' }, (response) => {
          if (chrome.runtime.lastError || !response) {
            resolve(null);
            return;
          }
          resolve(response as ReadabilityResult);
        });
      } catch {
        resolve(null);
      }
    });
  });
}

function renderReadability(result: ReadabilityResult | null, isPremium: boolean) {
  const section = document.getElementById('readability-section');
  const fill = document.getElementById('readability-fill');
  const scoreEl = document.getElementById('readability-score');
  const levelEl = document.getElementById('readability-level');
  const detailsToggle = document.getElementById('readability-details-toggle');
  const details = document.getElementById('readability-details');
  const premiumHint = document.getElementById('readability-premium-hint');

  if (!section || !fill || !scoreEl || !levelEl) return;
  section.hidden = false;

  if (!result) {
    fill.style.width = '0%';
    fill.className = 'readability-bar-fill level-empty';
    scoreEl.textContent = '--';
    levelEl.textContent = t('readability_unavailable') || '計測できません';
    return;
  }

  const { score, level, metrics } = result;
  fill.style.width = `${score}%`;
  fill.className = `readability-bar-fill level-${metrics.charCount === 0 ? 'empty' : level}`;
  scoreEl.textContent = String(score);
  levelEl.textContent = t(LEVEL_I18N[level]) || level;

  if (!detailsToggle || !details) return;

  if (isPremium) {
    detailsToggle.hidden = false;
    if (premiumHint) premiumHint.hidden = true;
    const kanjiEl = document.getElementById('readability-kanji');
    const avgEl = document.getElementById('readability-avg-len');
    const longEl = document.getElementById('readability-long-ratio');
    if (kanjiEl) kanjiEl.textContent = `${Math.round(metrics.kanjiRatio * 100)}%`;
    if (avgEl) avgEl.textContent = String(metrics.avgSentenceLen);
    if (longEl) longEl.textContent = `${Math.round(metrics.longSentenceRatio * 100)}%`;
    detailsToggle.addEventListener('click', () => {
      const open = details.hidden === false;
      details.hidden = open;
      detailsToggle.setAttribute('aria-expanded', String(!open));
    });
  } else {
    detailsToggle.hidden = true;
    if (premiumHint) premiumHint.hidden = false;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  applyI18n();

  const toggleSimplifier = document.getElementById('toggle-simplifier') as HTMLInputElement;
  const openSettings = document.getElementById('open-settings') as HTMLButtonElement;

  const { enabled, premium_unlocked } = await storage.get(['enabled', 'premium_unlocked']);
  if (toggleSimplifier) {
    toggleSimplifier.checked = enabled;
  }

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

  const result = await requestReadability();
  renderReadability(result, !!premium_unlocked);
});
