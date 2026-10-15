/**
 * Coursology QBank Selectors Configuration
 * Target: https://coursology-qbank.com/qbanks/*
 * 
 * All selectors and DOM extraction logic are centralized here.
 * If the website DOM structure changes, update the selectors in this file.
 */

(function (root) {
  'use strict';

  const Selectors = {
    // -------------------------------------------------------------------------
    // 1. Result & Status Indicators
    // -------------------------------------------------------------------------
    
    // The NbmeResultCard rendered after submitting a question
    // Correct: border-lime-500, text-lime-500, text "Correct"
    // Incorrect: border-red-500 / dark:border-red-600, text-red-500, text "Incorrect"
    // Omitted: border-sky-500, text-sky-500, text "Omitted"
    RESULT_CARD: [
      'div.bg-nbme-primary-50',
      'div[class*="border-red-500"]',
      'div[class*="border-lime-500"]',
      'div[class*="border-sky-500"]',
      'div.border-l-4'
    ],

    // Specific signals for Incorrect answer
    INCORRECT_INDICATOR: [
      'div[class*="border-red-500"]',
      'div[class*="dark:border-red-600"]',
      'p[class*="text-red-500"]',
      '.text-red-500'
    ],

    // Specific signals for Correct answer
    CORRECT_INDICATOR: [
      'div[class*="border-lime-500"]',
      'p[class*="text-lime-500"]',
      '.text-lime-500'
    ],

    // -------------------------------------------------------------------------
    // 2. Question & Explanation Containers
    // -------------------------------------------------------------------------
    
    // The primary container for the question stem
    QUESTION_CONTAINER: [
      '#question-text',
      'div[id="question-text"]',
      '.question-text'
    ],

    // The primary container where the explanation is rendered after submission
    EXPLANATION_CONTAINER: [
      '#question-explanation',
      'div[id="question-explanation"]',
      '.question-explanation'
    ],

    // Question navigation & identification
    QUESTION_NAVBAR: [
      'nav.z-\\[900\\]',
      'div.z-\\[900\\]',
      'header'
    ],

    // -------------------------------------------------------------------------
    // 3. Educational Objective & Sections
    // -------------------------------------------------------------------------
    
    // CSS classes occasionally used for explanation blocks
    EDUCATIONAL_OBJECTIVE_CLASSES: [
      '.educational-objective',
      '.educational_objective',
      '.bottom-line',
      '.explanation-block'
    ],

    // -------------------------------------------------------------------------
    // 4. Selection Context Menu ("Add to new card")
    // -------------------------------------------------------------------------
    
    // The floating context menu popup triggered by selectionchange/mouseup
    CONTEXT_MENU_CONTAINER: [
      'div.z-\\[9999999\\]',
      'div[style*="z-index: 9999999"]',
      'div[class*="rounded-primary"][class*="z-\\[9999999\\]"]',
      '[data-radix-popper-content-wrapper]'
    ],

    // The "New Flashcard" button inside the context menu
    // Has font-awesome icon fa-bolt-lightning and does NOT have fa-layer-group (which is "Add to existing")
    // Tooltip is "New Flashcard"
    NEW_FLASHCARD_BUTTON: [
      'button:has(svg[data-icon="bolt-lightning"]):not(:has(svg[data-icon="layer-group"]))',
      'button:has(.fa-bolt-lightning):not(:has(.fa-layer-group))',
      'button[aria-label*="New Flashcard"]',
      'button[title*="New Flashcard"]'
    ],

    // -------------------------------------------------------------------------
    // 5. Card Editor Modal / Floating Window
    // -------------------------------------------------------------------------
    
    // NbmeFloatingWindow or Dialog container for card editor
    CARD_EDITOR_WINDOW: [
      'div[role="dialog"]',
      '.nbme-floating-window',
      'div[class*="z-[100000]"]',
      'div[class*="z-[1000]"]'
    ],

    // The form element inside the editor
    CARD_EDITOR_FORM: [
      'form:has(button[type="submit"])',
      'form'
    ],

    // Overlay button "add content here" rendered over Front / Back when a text snippet is pending
    ADD_CONTENT_HERE_BUTTON: [
      'button:has-text("add content here")',
      'button' // Filtered by textContent === "add content here"
    ],

    // TipTap / ProseMirror rich text editors
    TIPTAP_EDITORS: [
      '.tiptap.ProseMirror',
      '.tiptap',
      'div[contenteditable="true"]'
    ],

    // Submit / Save button in the editor
    SAVE_BUTTON: [
      'button[type="submit"]',
      'button:has-text("Save")'
    ],

    // Deck selection dropdown button in the card editor
    DECK_SELECTOR_TRIGGER: [
      'form button[type="button"]:has(svg[data-icon="chevron-down"])',
      'form button[type="button"]:has(.fa-chevron-down)'
    ],

    // -------------------------------------------------------------------------
    // 6. Content Images
    // -------------------------------------------------------------------------
    
    // Images inside question stem and explanation
    CONTENT_IMAGES: [
      '#question-explanation img',
      '#question-text img',
      '.draggable-image-viewer img'
    ]
  };

  // =========================================================================
  // DOM Helper Methods
  // =========================================================================

  /**
   * Tries an array of selectors and returns the first matching element.
   * @param {string[]} selectorArray 
   * @param {Element|Document} root 
   * @returns {Element|null}
   */
  function queryFirst(selectorArray, root = document) {
    if (!root || !selectorArray) return null;
    const list = Array.isArray(selectorArray) ? selectorArray : [selectorArray];
    for (const sel of list) {
      if (!sel || typeof sel !== 'string') continue;
      try {
        const el = root.querySelector(sel);
        if (el) return el;
      } catch (err) {
        // In case pseudo-classes like :has() are not supported in certain engine versions
        continue;
      }
    }
    return null;
  }

  /**
   * Tries an array of selectors and returns all matching elements as an array.
   * @param {string[]|string} selectorArray 
   * @param {Element|Document} root 
   * @returns {Element[]}
   */
  function queryAll(selectorArray, root = document) {
    if (!root || !selectorArray) return [];
    const list = Array.isArray(selectorArray) ? selectorArray : [selectorArray];
    const results = [];
    const seen = new Set();
    for (const sel of list) {
      if (!sel || typeof sel !== 'string') continue;
      try {
        const els = root.querySelectorAll(sel);
        for (const el of els) {
          if (!seen.has(el)) {
            seen.add(el);
            results.push(el);
          }
        }
      } catch (err) {
        continue;
      }
    }
    return results;
  }

  /**
   * Checks whether the current view indicates a wrong/incorrect answer.
   * Returns { isSubmitted: boolean, isIncorrect: boolean, isCorrect: boolean }
   */
  function checkAnswerStatus() {
    const explanation = queryFirst(Selectors.EXPLANATION_CONTAINER);
    const resultCard = queryFirst(Selectors.RESULT_CARD);
    
    let isSubmitted = false;
    let isIncorrect = false;
    let isCorrect = false;

    // Check explanation presence
    if (explanation && explanation.textContent && explanation.textContent.trim().length > 20) {
      isSubmitted = true;
    }

    // Check result card classes & text
    if (resultCard) {
      isSubmitted = true;
      const text = (resultCard.textContent || '').trim().toLowerCase();
      const className = resultCard.className || '';

      if (className.includes('border-red-500') || className.includes('border-red-600') || text.includes('incorrect')) {
        isIncorrect = true;
      } else if (className.includes('border-lime-500') || className.includes('border-lime-600') || text.includes('correct')) {
        isCorrect = true;
      }
    } else {
      // Fallback: search for red incorrect indicators
      const incorrectEl = queryFirst(Selectors.INCORRECT_INDICATOR);
      if (incorrectEl && incorrectEl.textContent.toLowerCase().includes('incorrect')) {
        isSubmitted = true;
        isIncorrect = true;
      }
      const correctEl = queryFirst(Selectors.CORRECT_INDICATOR);
      if (correctEl && correctEl.textContent.toLowerCase().includes('correct')) {
        isSubmitted = true;
        isCorrect = true;
      }
    }

    return { isSubmitted, isIncorrect, isCorrect };
  }

  /**
  /**
   * Strips "Educational Objective:", "Educational objective:", "Bottom line:", etc.
   * and returns only the text that follows the colon.
   * @param {string} text 
   * @returns {string}
   */
  function stripObjectivePrefix(text) {
    if (!text) return '';
    const match = text.match(/^\s*(?:educational\s+objective|bottom\s+line)\s*[:\-–—]?\s*/i);
    if (match) {
      return text.slice(match[0].length).trim();
    }
    const colonIdx = text.indexOf(':');
    if (colonIdx !== -1 && colonIdx < 40) {
      return text.slice(colonIdx + 1).trim();
    }
    return text.trim();
  }

  /**
   * Creates a DOM Range that starts strictly AFTER the "Educational Objective:" label / colon.
   * Ensures that the selection in window.getSelection() contains ONLY what comes after the colon.
   * @param {Element} containerElement 
   * @returns {Range}
   */
  function createRangeAfterPrefix(containerElement) {
    const range = document.createRange();
    if (!containerElement) return range;

    // Collect all non-empty text nodes inside the container element in order
    const walker = document.createTreeWalker(
      containerElement,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          return (node.textContent && node.textContent.length > 0)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        }
      }
    );

    const textNodes = [];
    let currentNode;
    while ((currentNode = walker.nextNode())) {
      textNodes.push(currentNode);
    }

    if (textNodes.length === 0) {
      range.selectNodeContents(containerElement);
      return range;
    }

    // Build full concatenated text to find the exact character offset after prefix / colon
    let fullText = '';
    for (const node of textNodes) {
      fullText += node.textContent;
    }

    let contentStartIndex = 0;
    const match = fullText.match(/^\s*(?:educational\s+objective|bottom\s+line)\s*[:\-–—]?\s*/i);
    if (match) {
      contentStartIndex = match[0].length;
    } else {
      const colonIdx = fullText.indexOf(':');
      if (colonIdx !== -1 && colonIdx < 40) {
        contentStartIndex = colonIdx + 1;
        while (
          contentStartIndex < fullText.length &&
          (fullText[contentStartIndex] === ' ' ||
           fullText[contentStartIndex] === '\t' ||
           fullText[contentStartIndex] === '\n' ||
           fullText[contentStartIndex] === '\u00A0')
        ) {
          contentStartIndex++;
        }
      }
    }

    // Map contentStartIndex to the specific text node and offset
    let accumulated = 0;
    let startNode = textNodes[0];
    let startOffset = 0;

    for (const node of textNodes) {
      const nodeLen = node.textContent.length;
      if (accumulated + nodeLen > contentStartIndex) {
        startNode = node;
        startOffset = contentStartIndex - accumulated;
        break;
      }
      accumulated += nodeLen;
    }

    const lastNode = textNodes[textNodes.length - 1];

    try {
      range.setStart(startNode, startOffset);
      range.setEnd(lastNode, lastNode.textContent.length);
    } catch (e) {
      range.selectNodeContents(containerElement);
    }

    return range;
  }

  /**
   * Locates the Educational Objective element/node inside the explanation container.
   * Only selects and returns the actual text AFTER the "Educational Objective:" label/colon.
   * @param {Element} explanationContainer 
   * @returns {{ element: Element, text: string, range: Range } | null}
   */
  function findEducationalObjective(explanationContainer) {
    const container = explanationContainer || queryFirst(Selectors.EXPLANATION_CONTAINER);
    if (!container) return null;

    // 1. Try known specific class containers first
    for (const cls of Selectors.EDUCATIONAL_OBJECTIVE_CLASSES) {
      try {
        const found = container.querySelector(cls);
        if (found && found.textContent.trim().length > 10) {
          const rawText = found.textContent || '';
          const text = stripObjectivePrefix(rawText);
          const range = createRangeAfterPrefix(found);
          return { element: found, text, range };
        }
      } catch (e) {}
    }

    // 2. Scan all paragraphs, headers, and strong tags for "Educational Objective" or "Bottom Line"
    const candidates = container.querySelectorAll('p, div, h2, h3, h4, h5, strong, b');
    const regex = /(educational\s+objective|bottom\s+line)/i;

    let targetElement = null;

    for (const el of candidates) {
      const directText = el.textContent || '';
      if (regex.test(directText)) {
        // If it's a strong/b tag, the actual content is usually in its parent paragraph
        if (['STRONG', 'B', 'SPAN'].includes(el.tagName) && el.parentElement) {
          targetElement = el.parentElement;
        } else {
          targetElement = el;
        }
        break;
      }
    }

    // If targetElement is just a short header like "Educational Objective", pick next sibling paragraph
    if (targetElement && targetElement.textContent.trim().length < 35 && targetElement.nextElementSibling) {
      const next = targetElement.nextElementSibling;
      if (next && next.textContent && next.textContent.trim().length > 15) {
        targetElement = next;
      }
    }

    if (targetElement) {
      const rawText = targetElement.textContent || '';
      const text = stripObjectivePrefix(rawText);
      const range = createRangeAfterPrefix(targetElement);
      return {
        element: targetElement,
        text,
        range
      };
    }

    // 3. Fallback: If not explicitly labeled, use the last paragraph or section in the explanation
    const paragraphs = container.querySelectorAll('p');
    if (paragraphs.length > 0) {
      const lastP = paragraphs[paragraphs.length - 1];
      if (lastP.textContent.trim().length > 15) {
        const rawText = lastP.textContent || '';
        const text = stripObjectivePrefix(rawText);
        const range = createRangeAfterPrefix(lastP);
        return { element: lastP, text, range };
      }
    }

    return null;
  }

  /**
   * Simulates a realistic hardware-like mouse/pointer click with coordinates,
   * elementFromPoint hit-testing, and event sequence.
   * @param {Element} element 
   */
  /**
   * Simulates a single, clean hardware-accurate click sequence.
   * @param {Element} element 
   */
  function simulateRealClick(element) {
    if (!element) return false;

    try {
      if (typeof element.focus === 'function') {
        element.focus();
      }

      const rect = element.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      const eventInit = {
        bubbles: true,
        cancelable: true,
        composed: true,
        view: window,
        detail: 1,
        clientX: x,
        clientY: y,
        button: 0,
        buttons: 1
      };

      element.dispatchEvent(new PointerEvent('pointerdown', eventInit));
      element.dispatchEvent(new MouseEvent('mousedown', eventInit));
      element.dispatchEvent(new PointerEvent('pointerup', { ...eventInit, buttons: 0 }));
      element.dispatchEvent(new MouseEvent('mouseup', { ...eventInit, buttons: 0 }));

      if (typeof element.click === 'function') {
        element.click();
      }

      return true;
    } catch (e) {
      if (typeof element.click === 'function') {
        element.click();
      }
      return false;
    }
  }

  /**
   * Reliably triggers a button click across React 18, Radix UI, and native DOM.
   * @param {Element} btn 
   */
  function clickReactButton(btn) {
    if (!btn) return false;
    return simulateRealClick(btn);
  }

  /**
   * Finds the "New Flashcard" button inside the floating selection context menu.
   * NEVER returns unrelated buttons from elsewhere on the page.
   * @returns {HTMLButtonElement|null}
   */
  function findNewFlashcardButton() {
    // 1. Locate the floating selection context menu.
    // In Coursology, NbmeContextMenu has class containing "z-[9999999]" or style "z-index: 9999999"
    // and is portalled near the selection.
    const allHighZElements = Array.from(document.querySelectorAll('[class*="9999999"], [style*="9999999"]'));
    const menuContainer = allHighZElements.find((el) => {
      if (!isElementVisible(el)) return false;
      const cls = (el.className && typeof el.className === 'string') ? el.className : '';
      const style = el.getAttribute('style') || '';
      const isHighZ = cls.includes('9999999') || style.includes('9999999');
      if (!isHighZ) return false;
      // It must contain action buttons (e.g. highlight markers, copy, flashcards)
      return el.querySelectorAll('button').length >= 1;
    });

    // If context menu is not yet rendered, DO NOT search elsewhere!
    // Return null so waitFor keeps polling until the 200ms debounce finishes.
    if (!menuContainer) {
      return null;
    }

    // Inside the context menu container:
    const allButtons = Array.from(menuContainer.querySelectorAll('button'));
    if (allButtons.length === 0) return null;

    // Filter to LEAF buttons (buttons that do not contain another button)
    const leafButtons = allButtons.filter((b) => !b.querySelector('button'));
    const buttons = leafButtons.length > 0 ? leafButtons : allButtons;

    // Filter for buttons containing the bolt-lightning icon
    const boltButtons = buttons.filter((btn) => {
      const svgs = Array.from(btn.querySelectorAll('svg'));
      return svgs.some((svg) => {
        const iconName = svg.getAttribute('data-icon') || '';
        const html = svg.innerHTML || '';
        return iconName === 'bolt-lightning' || html.includes('M0 256L28.5 28');
      });
    });

    if (boltButtons.length === 0) {
      // If svg detection failed for any reason, use tooltip/label or position
      for (const btn of buttons) {
        const fullDesc = `${btn.getAttribute('aria-label') || ''} ${btn.getAttribute('title') || ''} ${btn.textContent || ''}`.toLowerCase();
        if (fullDesc.includes('new') && !fullDesc.includes('exist')) {
          return btn;
        }
      }
      // In the 6-button context menu: 5th button (index 4 or length - 2) is New Flashcard
      if (buttons.length >= 2) {
        return buttons[buttons.length - 2];
      }
      return buttons[0];
    }

    // Among bolt buttons, "New Flashcard" has:
    // - NO layer-group icon
    // - NO badge span (span with class "absolute")
    // - Does NOT contain "exist" in title/aria-label
    // And is ALWAYS the first flashcard button in the list
    const newCardBtn = boltButtons.find((btn) => {
      const svgs = Array.from(btn.querySelectorAll('svg'));
      const hasLayerGroup = svgs.some((svg) => {
        const iconName = svg.getAttribute('data-icon') || '';
        const html = svg.innerHTML || '';
        return iconName === 'layer-group' || html.includes('M288 32c-80.8');
      });
      const hasBadgeSpan = !!btn.querySelector('span[class*="absolute"]');
      const text = `${btn.getAttribute('aria-label') || ''} ${btn.getAttribute('title') || ''}`.toLowerCase();
      if (hasLayerGroup || hasBadgeSpan || text.includes('exist')) {
        return false;
      }
      return true;
    });

    // Return the specific newCardBtn or fallback to the first bolt button (which is always "New Flashcard" in code order)
    return newCardBtn || boltButtons[0];
  }

  /**
   * Specifically detects the FlashcardEditorForm or floating window editor.
   * @returns {HTMLElement|null}
   */
  function findCardEditorForm() {
    // 1. Look for form element that has tiptap or submit button or Front/Back text
    const forms = Array.from(document.querySelectorAll('form'));
    for (const f of forms) {
      if (!isElementVisible(f)) continue;
      if (
        f.querySelector('.tiptap, div[contenteditable="true"]') ||
        f.querySelector('button[type="submit"]') ||
        ((f.textContent || '').includes('Front') && (f.textContent || '').includes('Back'))
      ) {
        return f;
      }
    }

    // 2. Look for Floating Window / Modal container with editors
    const modals = Array.from(document.querySelectorAll('div[role="dialog"], .nbme-floating-window, [class*="rounded-t-xl"], div[style*="z-index: 1100"]'));
    for (const m of modals) {
      if (!isElementVisible(m)) continue;
      if (m.querySelector('.tiptap, div[contenteditable="true"]') || m.querySelector('button[type="submit"]')) {
        return m.querySelector('form') || m;
      }
    }

    return null;
  }

  /**
   * Extracts clean question images and explanation images.
   * Skips icons, badges, UI assets, and tiny SVGs.
   * @returns {string[]} Array of image URLs
   */
  function extractRelevantImages() {
    const urls = new Set();
    const imgs = queryAll(Selectors.CONTENT_IMAGES);

    for (const img of imgs) {
      // Must have valid src
      const src = img.currentSrc || img.src || img.getAttribute('src');
      if (!src || src.startsWith('data:image/svg')) continue;

      // Skip logos, icons, avatars
      const srcLower = src.toLowerCase();
      if (
        srcLower.includes('avatar') ||
        srcLower.includes('favicon') ||
        srcLower.includes('logo') ||
        srcLower.includes('badge') ||
        srcLower.includes('icon')
      ) {
        continue;
      }

      // Check dimensions if rendered
      const rect = img.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        if (rect.width < 60 || rect.height < 60) continue;
      }

      // Skip UI components inside headers/navbars
      if (img.closest('nav') || img.closest('header') || img.closest('[role="dialog"]')) {
        continue;
      }

      urls.add(src);
    }

    return Array.from(urls);
  }

  /**
   * Extracts a unique Question ID from the page to prevent duplicate cards.
   * @returns {string} Unique identifier (e.g., "12450" or test session hash)
   */
  function extractQuestionId() {
    try {
      const navText = (document.body && document.body.innerText) ? document.body.innerText : '';
      const qidMatch = navText.match(/Question\s*Id:\s*([0-9a-zA-Z_-]+)/i);
      if (qidMatch && qidMatch[1]) {
        return qidMatch[1].trim();
      }

      const dataEl = document.querySelector('[data-question-id]');
      if (dataEl) {
        const qid = dataEl.getAttribute('data-question-id');
        if (qid) return qid.trim();
      }

      const itemMatch = navText.match(/Item\s+(\d+)\s+of\s+(\d+)/i);
      const pathname = window.location.pathname;
      if (itemMatch) {
        return `${pathname}#item-${itemMatch[1]}`;
      }

      const explanation = queryFirst(Selectors.EXPLANATION_CONTAINER);
      if (explanation && explanation.textContent) {
        const text = explanation.textContent.slice(0, 150).replace(/\s+/g, ' ').trim();
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
          hash = (hash << 5) - hash + text.charCodeAt(i);
          hash |= 0;
        }
        return `${pathname}#hash-${Math.abs(hash)}`;
      }

      return `${window.location.pathname}#${Date.now()}`;
    } catch (e) {
      return `${window.location.pathname}#${Date.now()}`;
    }
  }

  /**
   * Helper to check if an element is currently visible in DOM.
   * @param {Element} el 
   * @returns {boolean}
   */
  function isElementVisible(el) {
    if (!el || typeof el.getBoundingClientRect !== 'function') return false;
    try {
      const style = window.getComputedStyle(el);
      if (style && (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0')) {
        return false;
      }
      const rect = el.getBoundingClientRect();
      return rect && rect.width > 0 && rect.height > 0;
    } catch (e) {
      return false;
    }
  }

  // Export to global scope with both flattened selectors and grouped selectors
  const api = {
    ...Selectors,
    Selectors,
    queryFirst,
    queryAll,
    checkAnswerStatus,
    findEducationalObjective,
    findNewFlashcardButton,
    findCardEditorForm,
    clickReactButton,
    simulateRealClick,
    stripObjectivePrefix,
    extractRelevantImages,
    extractQuestionId,
    isElementVisible
  };

  root.CoursologySelectors = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
