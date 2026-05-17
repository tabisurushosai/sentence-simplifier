import { applyI18n, t } from './i18n';
import { storage } from './storage';

document.addEventListener('DOMContentLoaded', async () => {
  // Apply internationalization
  applyI18n();

  const furiganaToggle = document.getElementById('feature-furigana') as HTMLInputElement;
  const kanjiToggle = document.getElementById('feature-kanji') as HTMLInputElement;
  const splitToggle = document.getElementById('feature-split') as HTMLInputElement;
  const scoreToggle = document.getElementById('feature-score') as HTMLInputElement;
  const saveButton = document.getElementById('save') as HTMLButtonElement;
  const status = document.getElementById('status') as HTMLDivElement;

  // Load saved settings
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

  // Save settings
  saveButton.addEventListener('click', async () => {
    await storage.set({
      furiganaEnabled: furiganaToggle.checked,
      kanjiReplaceEnabled: kanjiToggle.checked,
      longSplitEnabled: splitToggle.checked,
      readabilityScoreEnabled: scoreToggle.checked,
    });

    // Update status to let user know options were saved.
    status.textContent = t('options_saved_success');
    setTimeout(() => {
      status.textContent = '';
    }, 750);
  });
});
