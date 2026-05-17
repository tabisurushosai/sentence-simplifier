/**
 * Helper to get localized messages.
 * @param messageName The name of the message, as specified in the messages.json file.
 * @param substitutions Up to 9 substitutions for the message.
 * @returns The localized message.
 */
export function t(messageName: string, substitutions?: string | string[]): string {
  return chrome.i18n.getMessage(messageName, substitutions);
}

/**
 * Applies i18n to all elements with data-i18n attribute.
 * It will set the textContent of the element to the localized message.
 */
export function applyI18n(): void {
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach((element) => {
    const messageName = element.getAttribute('data-i18n');
    if (messageName) {
      const message = t(messageName);
      if (message) {
        element.textContent = message;
      }
    }
  });

  const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
  placeholders.forEach((element) => {
    const messageName = element.getAttribute('data-i18n-placeholder');
    if (messageName && element instanceof HTMLInputElement) {
      const message = t(messageName);
      if (message) {
        element.placeholder = message;
      }
    }
  });
}
