import { storage } from './storage';
import { addFurigana, containsKanji } from './furigana';
import { simplifyText, hasSimplifiableWord } from './simplifier';
import { splitLongSentence, needsSplit } from './splitter';
import { calcReadability } from './readability';

let observer: MutationObserver | null = null;
let furiganaActive = false;
let kanjiReplaceActive = false;
let longSplitActive = false;
let longSplitMaxChars = 60;

// Tags whose text content should not be split (preserves layout of headings,
// code, table cells, links, etc).
const NO_SPLIT_TAGS = new Set([
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'CODE', 'PRE', 'KBD', 'SAMP',
  'TD', 'TH',
  'A', 'BUTTON', 'LABEL', 'OPTION',
]);

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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

  // Long-split runs after kanji-replace (so length judgement reflects the
  // simplified text) and before furigana (so each line gets ruby applied
  // independently). Skip when the parent tag would be visually broken by
  // inserting <br>s.
  let splitLines: string[] | null = null;
  if (
    longSplitActive &&
    tagName &&
    !NO_SPLIT_TAGS.has(tagName) &&
    needsSplit(working, { maxChars: longSplitMaxChars })
  ) {
    const lines = splitLongSentence(working, { maxChars: longSplitMaxChars });
    if (lines.length > 1) {
      splitLines = lines;
      changed = true;
    }
  }

  if (furiganaActive) {
    if (splitLines) {
      splitLines = splitLines.map((line) =>
        containsKanji(line) ? addFurigana(line) : escapeHtml(line)
      );
    } else if (containsKanji(working)) {
      const enhanced = addFurigana(working);
      if (enhanced !== working) {
        working = enhanced;
        changed = true;
      }
    }
  } else if (splitLines) {
    splitLines = splitLines.map(escapeHtml);
  }

  if (!changed) return;

  const span = document.createElement('span');
  span.setAttribute('data-ss-processed', 'true');
  if (splitLines) {
    span.innerHTML = splitLines
      .map((line) => `<span class="ss-line">${line}</span>`)
      .join('<br>');
  } else {
    span.innerHTML = working;
  }

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
  const { enabled, furiganaEnabled, kanjiReplaceEnabled, longSplitEnabled } =
    await storage.get([
      'enabled',
      'furiganaEnabled',
      'kanjiReplaceEnabled',
      'longSplitEnabled',
    ]);

  furiganaActive = !!(enabled && furiganaEnabled);
  kanjiReplaceActive = !!(enabled && kanjiReplaceEnabled);
  longSplitActive = !!(enabled && longSplitEnabled);

  if (furiganaActive || kanjiReplaceActive || longSplitActive) {
    walk(document.body);
    startObserving();
  } else {
    stopObserving();
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'getReadability') {
    const text = document.body?.innerText ?? '';
    sendResponse(calcReadability(text));
    return true;
  }
  return false;
});

chrome.storage.onChanged.addListener((changes) => {
  if (
    changes.enabled ||
    changes.furiganaEnabled ||
    changes.kanjiReplaceEnabled ||
    changes.longSplitEnabled
  ) {
    init();
  }
});

init();
