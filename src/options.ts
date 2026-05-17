import { applyI18n, t } from './i18n';
import { storage } from './storage';
import { getPremiumStatus } from './premium';
import { redeemLicenseCode } from './upgrade';

async function renderPremiumStatus() {
  const el = document.getElementById('premium-current-status');
  if (!el) return;
  const status = await getPremiumStatus();
  if (status.isPremium) {
    el.textContent = t('premium_status_premium') || 'Premium 有効';
  } else if (status.isTrial) {
    el.textContent =
      t('premium_status_trial', [String(status.trialDaysRemaining)]) ||
      `Trial: ${status.trialDaysRemaining}日`;
  } else {
    el.textContent = t('premium_status_free') || '無料版';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  applyI18n();

  const furiganaToggle = document.getElementById('feature-furigana') as HTMLInputElement;
  const kanjiToggle = document.getElementById('feature-kanji') as HTMLInputElement;
  const splitToggle = document.getElementById('feature-split') as HTMLInputElement;
  const scoreToggle = document.getElementById('feature-score') as HTMLInputElement;
  const saveButton = document.getElementById('save') as HTMLButtonElement;
  const status = document.getElementById('status') as HTMLDivElement;

  const settings = await storage.get([
    'furiganaEnabled',
    'kanjiReplaceEnabled',
    'longSplitEnabled',
    'readabilityScoreEnabled',
  ]);

  furiganaToggle.checked = settings.furiganaEnabled;
  kanjiToggle.checked = settings.kanjiReplaceEnabled;
  splitToggle.checked = settings.longSplitEnabled;
  scoreToggle.checked = settings.readabilityScoreEnabled;

  saveButton.addEventListener('click', async () => {
    await storage.set({
      furiganaEnabled: furiganaToggle.checked,
      kanjiReplaceEnabled: kanjiToggle.checked,
      longSplitEnabled: splitToggle.checked,
      readabilityScoreEnabled: scoreToggle.checked,
    });

    status.textContent = t('options_saved_success');
    setTimeout(() => {
      status.textContent = '';
    }, 750);
  });

  await renderPremiumStatus();

  const upgradeBtn = document.getElementById('upgrade-cta');
  if (upgradeBtn) {
    upgradeBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'openUpgrade' });
    });
  }

  const licenseInput = document.getElementById('license-input') as HTMLInputElement | null;
  const redeemButton = document.getElementById('redeem-button');
  const redeemStatus = document.getElementById('redeem-status');
  if (redeemButton && licenseInput) {
    redeemButton.addEventListener('click', async () => {
      const code = licenseInput.value;
      const ok = await redeemLicenseCode(code);
      if (redeemStatus) {
        redeemStatus.textContent = ok
          ? t('premium_redeem_success') || 'Premium 有効化しました'
          : t('premium_redeem_invalid') || 'ライセンスコードが正しくありません';
      }
      if (ok) await renderPremiumStatus();
    });
  }
});
