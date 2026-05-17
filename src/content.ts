import { storage } from './storage';
import { addFurigana, containsKanji } from './furigana';
import { simplifyText, hasSimplifiableWord } from './simplifier';

let observer: MutationObserver | null = null;
let furiganaActive = false;
let kanjiReplaceActive = false;

/**
 * Processes a single text node, applying kanji-replace and/or furigana-auto
 * based on the active feature flags. Replacement runs before furigana so that
 * any remaining kanji in the substituted phrase still gets ruby annotations.
 */
function processTextNode(node: Text) {
  const text = node.nodeValue;
  if (!text) return;

  const parent = node.parentNode;
  if (!parent) return;

  const tagName = (parent as HTMLElement).tagName?.toUpperCase();
  if (tagName === 'RUBY' || tagName === 'RT' || tagName === 'RP' || tagName === 'SCRIPT' || tagName === 'STYLE' || tagName === 'TEXTAREA') {
    return;
  }

  let working = text;
  let changed = false;

  if (kanjiReplaceActive && hasSimplifiableWord(working)) {
    const simplified = simplifyText(working);
    if (simplified !== working) {
      working = simplified;
      changed = true;
    }
  }

  if (furiganaActive && containsKanji(working)) {
    const enhanced = addFurigana(working);
    if (enhanced !== working) {
      working = enhanced;
      changed = true;
    }
  }

  if (!changed) return;

  const span = document.createElement('span');
  span.setAttribute('data-ss-processed', 'true');
  span.innerHTML = working;

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
  const { enabled, furiganaEnabled, kanjiReplaceEnabled } = await storage.get([
    'enabled',
    'furiganaEnabled',
    'kanjiReplaceEnabled',
  ]);

  furiganaActive = !!(enabled && furiganaEnabled);
  kanjiReplaceActive = !!(enabled && kanjiReplaceEnabled);

  if (furiganaActive || kanjiReplaceActive) {
    walk(document.body);
    startObserving();
  } else {
    stopObserving();
  }
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled || changes.furiganaEnabled || changes.kanjiReplaceEnabled) {
    init();
  }
});

init();
