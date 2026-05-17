import { applyI18n, getMessage } from './i18n';

document.addEventListener('DOMContentLoaded', () => {
  // Apply internationalization
  applyI18n();

  const furiganaToggle = document.getElementById('feature-furigana') as HTMLInputElement;
  const kanjiToggle = document.getElementById('feature-kanji') as HTMLInputElement;
  const splitToggle = document.getElementById('feature-split') as HTMLInputElement;
  const scoreToggle = document.getElementById('feature-score') as HTMLInputElement;
  const saveButton = document.getElementById('save') as HTMLButtonElement;
  const status = document.getElementById('status') as HTMLDivElement;

  // Load saved settings
  chrome.storage.local.get(
    {
      furiganaEnabled: true,
      kanjiReplaceEnabled: true,
      longSplitEnabled: true,
      readabilityScoreEnabled: true,
    },
    (items) => {
      furiganaToggle.checked = items.furiganaEnabled;
      kanjiToggle.checked = items.kanjiReplaceEnabled;
      splitToggle.checked = items.longSplitEnabled;
      scoreToggle.checked = items.readabilityScoreEnabled;
    }
  );

  // Save settings
  saveButton.addEventListener('click', () => {
    chrome.storage.local.set(
      {
        furiganaEnabled: furiganaToggle.checked,
        kanjiReplaceEnabled: kanjiToggle.checked,
        longSplitEnabled: splitToggle.checked,
        readabilityScoreEnabled: scoreToggle.checked,
      },
      () => {
        // Update status to let user know options were saved.
        status.textContent = getMessage('options_saved_success');
        setTimeout(() => {
          status.textContent = '';
        }, 750);
      }
    );
  });
});
