import { storage } from './storage';
import { addFurigana, containsKanji } from './furigana';

let observer: MutationObserver | null = null;

/**
 * Processes a single text node by wrapping it in a span if it contains kanji
 * and replacing it with the furigana-enhanced HTML.
 */
function processTextNode(node: Text) {
  const text = node.nodeValue;
  if (!text || !containsKanji(text)) return;

  const parent = node.parentNode;
  if (!parent) return;

  // Avoid processing already processed nodes or special tags
  const tagName = (parent as HTMLElement).tagName?.toUpperCase();
  if (tagName === 'RUBY' || tagName === 'RT' || tagName === 'RP' || tagName === 'SCRIPT' || tagName === 'STYLE' || tagName === 'TEXTAREA') {
    return;
  }

  const enhancedHtml = addFurigana(text);
  if (enhancedHtml === text) return;

  const span = document.createElement('span');
  span.setAttribute('data-ss-furigana', 'true');
  span.innerHTML = enhancedHtml;
  
  parent.replaceChild(span, node);
}

/**
 * Traverses the DOM starting from a root node.
 */
function walk(root: Node) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  const nodes: Text[] = [];
  
  let node;
  while ((node = walker.nextNode())) {
    nodes.push(node as Text);
  }

  nodes.forEach(processTextNode);
}

/**
 * Starts observing for DOM changes.
 */
function startObserving() {
  if (observer) return;

  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        walk(node);
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

/**
 * Stops observing for DOM changes.
 */
function stopObserving() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}

/**
 * Main initialization function.
 */
async function init() {
  const { enabled, furiganaEnabled } = await storage.get(['enabled', 'furiganaEnabled']);
  
  if (enabled && furiganaEnabled) {
    walk(document.body);
    startObserving();
  }
}

// Watch for storage changes to enable/disable on the fly
chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled || changes.furiganaEnabled) {
    // For simplicity, we just reload the page or re-evaluate. 
    // In a more complex implementation, we might want to "un-apply" the changes.
    // For now, let's just re-init if enabled, but we don't have an easy "undo".
    init();
  }
});

init();
