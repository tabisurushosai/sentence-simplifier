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

function getActiveTabHost(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url;
      if (!url) {
        resolve(null);
        return;
      }
      try {
        const { hostname, protocol } = new URL(url);
        if (!hostname || !/^https?:$/.test(protocol)) {
          resolve(null);
          return;
        }
        resolve(hostname);
      } catch {
        resolve(null);
      }
    });
  });
}

function applySiteToggleEnabledState(
  siteToggle: HTMLInputElement | null,
  siteLabel: HTMLElement | null,
  masterEnabled: boolean,
  hostAvailable: boolean
) {
  if (!siteToggle) return;
  const enabled = masterEnabled && hostAvailable;
  siteToggle.disabled = !enabled;
  if (siteLabel) {
    siteLabel.classList.toggle('disabled', !enabled);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  applyI18n();

  const toggleSimplifier = document.getElementById('toggle-simplifier') as HTMLInputElement;
  const toggleSiteDisabled = document.getElementById('toggle-site-disabled') as HTMLInputElement | null;
  const siteToggleLabel = document.getElementById('site-toggle-label');
  const openSettings = document.getElementById('open-settings') as HTMLButtonElement;

  const { enabled, premium_unlocked, disabledHosts } = await storage.get([
    'enabled',
    'premium_unlocked',
    'disabledHosts',
  ]);
  const host = await getActiveTabHost();
  const hosts: string[] = Array.isArray(disabledHosts) ? disabledHosts : [];

  if (toggleSimplifier) {
    toggleSimplifier.checked = enabled;
  }
  if (toggleSiteDisabled) {
    toggleSiteDisabled.checked = !!(host && hosts.includes(host));
  }
  applySiteToggleEnabledState(toggleSiteDisabled, siteToggleLabel, enabled, !!host);

  if (toggleSimplifier) {
    toggleSimplifier.addEventListener('change', async () => {
      await storage.set({ enabled: toggleSimplifier.checked });
      applySiteToggleEnabledState(
        toggleSiteDisabled,
        siteToggleLabel,
        toggleSimplifier.checked,
        !!host
      );
    });
  }

  if (toggleSiteDisabled && host) {
    toggleSiteDisabled.addEventListener('change', async () => {
      const current = await storage.get(['disabledHosts']);
      const list: string[] = Array.isArray(current.disabledHosts)
        ? [...current.disabledHosts]
        : [];
      const idx = list.indexOf(host);
      if (toggleSiteDisabled.checked) {
        if (idx === -1) list.push(host);
      } else {
        if (idx !== -1) list.splice(idx, 1);
      }
      await storage.set({ disabledHosts: list });
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
