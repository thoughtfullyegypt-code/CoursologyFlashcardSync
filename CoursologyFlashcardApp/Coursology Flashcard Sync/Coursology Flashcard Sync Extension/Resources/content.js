/**
 * Coursology QBank Flashcard Sync - Content Script
 * Automates flashcard creation on https://coursology-qbank.com/qbanks/*
 */

(function () {
  'use strict';

  // Use the selectors API defined in selectors.js
  const Selectors = window.CoursologySelectors;
  if (!Selectors) {
    console.error('[CoursologySync] selectors.js must be loaded before content.js');
    return;
  }

  // Cross-browser storage API wrapper (Safari & Chrome compatible)
  const storage = {
    get: function (keys) {
      return new Promise((resolve) => {
        if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
          browser.storage.local.get(keys).then(resolve).catch(() => resolve({}));
        } else if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(keys, resolve);
        } else {
          resolve({});
        }
      });
    },
    set: function (items) {
      return new Promise((resolve) => {
        if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
          browser.storage.local.set(items).then(resolve).catch(resolve);
        } else if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set(items, resolve);
        } else {
          resolve();
        }
      });
    }
  };

  // State
  let config = {
    autoMode: true,
    includeImages: true,
    targetSide: 'all-front', // 'all-front' (everything in Front), 'front-back', 'all-back'
    sessionCount: 0
  };

  let savedQuestionIds = new Set();
  let isAutomating = false;
  let lastCheckedQuestionId = null;

  // ---------------------------------------------------------------------------
  // 1. Sleek Toast Notification UI
  // ---------------------------------------------------------------------------

  function showToast(message, type = 'info', duration = 3500) {
    let container = document.getElementById('coursology-sync-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'coursology-sync-toast-container';
      container.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 10000000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      `;
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'coursology-sync-toast';

    const colors = {
      success: { bg: '#059669', icon: '✓', border: '#10b981' },
      info: { bg: '#2563eb', icon: 'ℹ', border: '#3b82f6' },
      warning: { bg: '#d97706', icon: '⚠', border: '#f59e0b' },
      error: { bg: '#dc2626', icon: '✕', border: '#ef4444' }
    };
    const c = colors[type] || colors.info;

    toast.style.cssText = `
      pointer-events: auto;
      background: #18181b;
      color: #fafafa;
      border-left: 4px solid ${c.border};
      border-radius: 8px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
      padding: 12px 16px;
      font-size: 13px;
      line-height: 1.4;
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 260px;
      max-width: 420px;
      transform: translateY(20px);
      opacity: 0;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    `;

    toast.innerHTML = `
      <span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:${c.bg};color:white;font-size:11px;font-weight:bold;flex-shrink:0;">${c.icon}</span>
      <span style="flex:1;">${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(() => {
      toast.style.transform = 'translateY(0)';
      toast.style.opacity = '1';
    });

    // Auto dismiss
    setTimeout(() => {
      toast.style.transform = 'translateY(10px)';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------------------------------------------------------------------------
  // 2. Floating Action Button ("⚡ Save to card now")
  // ---------------------------------------------------------------------------

  function injectFloatingButton() {
    if (document.getElementById('coursology-sync-fab')) return;

    const fab = document.createElement('button');
    fab.id = 'coursology-sync-fab';
    fab.type = 'button';
    fab.title = 'Manual trigger: Save Educational Objective & Images to Flashcard (Ctrl+Shift+S / ⌘+Shift+S)';
    fab.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 24px;
      z-index: 999999;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 9999px;
      padding: 10px 18px;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    fab.innerHTML = `
      <svg style="width:14px;height:14px;fill:currentColor;" viewBox="0 0 384 512">
        <path d="M0 256L28.5 28c2-16 15.6-28 31.8-28H228.9c15 0 27.1 12.1 27.1 27.1c0 3.2-.6 6.5-1.7 9.5L208 160H347.3c20.2 0 36.7 16.4 36.7 36.7c0 7.4-2.2 14.6-6.4 20.7l-192.2 281c-5.9 8.6-15.6 13.7-25.9 13.7h-2.9c-15.7 0-28.5-12.8-28.5-28.5c0-2.3 .3-4.6 .9-6.9L176 288H32c-17.7 0-32-14.3-32-32z"/>
      </svg>
      <span>Save to card now</span>
    `;

    fab.addEventListener('mouseenter', () => {
      fab.style.transform = 'translateY(-2px) scale(1.02)';
      fab.style.boxShadow = '0 6px 20px rgba(37, 99, 235, 0.5)';
    });

    fab.addEventListener('mouseleave', () => {
      fab.style.transform = 'translateY(0) scale(1)';
      fab.style.boxShadow = '0 4px 14px rgba(37, 99, 235, 0.4)';
    });

    fab.addEventListener('click', () => {
      runWorkflow(true); // manual trigger
    });

    document.body.appendChild(fab);
  }

  // ---------------------------------------------------------------------------
  // 3. Timing & Async DOM Helpers
  // ---------------------------------------------------------------------------

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Waits for a condition to be satisfied using MutationObserver + interval fallback.
   * @param {() => any} checkFn 
   * @param {string} stepName Description of what we are waiting for
   * @param {number} timeout Timeout in ms (default 8000ms)
   * @returns {Promise<any>}
   */
  function waitFor(checkFn, stepName = 'element', timeout = 8000) {
    return new Promise((resolve, reject) => {
      const initial = checkFn();
      if (initial) return resolve(initial);

      let timer = null;
      let observer = null;

      const cleanup = () => {
        if (timer) clearInterval(timer);
        if (observer) observer.disconnect();
      };

      const check = () => {
        try {
          const res = checkFn();
          if (res) {
            cleanup();
            resolve(res);
          }
        } catch (e) {
          cleanup();
          reject(e);
        }
      };

      observer = new MutationObserver(check);
      observer.observe(document.body, { childList: true, subtree: true, attributes: true });

      timer = setInterval(check, 100);

      setTimeout(() => {
        cleanup();
        reject(new Error(`Timeout (${timeout}ms) waiting for: ${stepName}`));
      }, timeout);
    });
  }

  // ---------------------------------------------------------------------------
  // 3b. Main-World Script Injection Helpers (Bypasses Safari Isolated World)
  // ---------------------------------------------------------------------------

  /**
   * Executes a piece of JavaScript code in the MAIN WORLD (page context) via a temporary <script>.
   * In Safari Web Extensions, content scripts run in an isolated world and cannot see
   * React internal properties (__reactProps, __reactFiber) attached to DOM nodes.
   * Injecting a temporary <script> tag executes directly in the main world where React lives.
   */
  function runInPage(codeStr) {
    try {
      const script = document.createElement('script');
      script.textContent = `(function() {
        try {
          ${codeStr}
        } catch (e) {
          console.warn('[CoursologySync-Page] Error executing script in main world:', e);
        }
      })();`;
      (document.head || document.documentElement).appendChild(script);
      script.remove();
      return true;
    } catch (err) {
      console.warn('[CoursologySync] runInPage script injection failed:', err);
      return false;
    }
  }

  /**
   * Clicks the "New Flashcard" button by executing directly inside the main world.
   * In the main world, it locates the 5th button in the context menu (or the button with
   * the single bolt-lightning icon) and directly calls its React __reactProps.onClick handler,
   * while also simulating pointerdown, mousedown, pointerup, mouseup, and click events.
   */
  function clickNewFlashcardInPage() {
    const pageScript = `
      (function() {
        // 1. Locate the context menu container (high-z motion.div)
        const allHighZ = Array.from(document.querySelectorAll('[class*="9999999"], [style*="9999999"]'));
        const menuContainer = allHighZ.find((el) => {
          const style = window.getComputedStyle(el);
          return (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') &&
                 el.querySelectorAll('button').length >= 1;
        });

        if (!menuContainer) {
          console.warn('[CoursologySync-Page] Context menu container not found in main world.');
          return false;
        }

        // 2. Locate leaf buttons inside context menu
        const allButtons = Array.from(menuContainer.querySelectorAll('button'));
        const leafButtons = allButtons.filter((b) => !b.querySelector('button'));
        const buttons = leafButtons.length > 0 ? leafButtons : allButtons;

        // 3. Find the New Flashcard button:
        // NbmeContextMenuNewFlashcard has single bolt-lightning, NO layer-group icon, NO badge span.
        let targetBtn = null;
        const boltButtons = buttons.filter((btn) => {
          const svgs = Array.from(btn.querySelectorAll('svg'));
          return svgs.some((s) => {
            const name = s.getAttribute('data-icon') || '';
            const html = s.innerHTML || '';
            return name === 'bolt-lightning' || html.includes('M0 256L28.5 28');
          });
        });

        if (boltButtons.length > 0) {
          targetBtn = boltButtons.find((btn) => {
            const svgs = Array.from(btn.querySelectorAll('svg'));
            const hasLayer = svgs.some((s) => (s.getAttribute('data-icon') || '').includes('layer') || s.innerHTML.includes('M288 32c-80.8'));
            const hasBadge = !!btn.querySelector('span[class*="absolute"]');
            const desc = ((btn.getAttribute('aria-label') || '') + ' ' + (btn.getAttribute('title') || '')).toLowerCase();
            return !hasLayer && !hasBadge && !desc.includes('exist');
          }) || boltButtons[0];
        }

        // Fallback: 5th button in 6-button context menu (index 4 or length - 2)
        if (!targetBtn && buttons.length >= 2) {
          targetBtn = buttons[buttons.length - 2];
        }
        if (!targetBtn && buttons.length > 0) {
          targetBtn = buttons[0];
        }

        if (!targetBtn) {
          console.warn('[CoursologySync-Page] New Flashcard target button not found.');
          return false;
        }

        console.log('[CoursologySync-Page] Found target New Flashcard button:', targetBtn);

        // 4. In the MAIN WORLD, directly invoke React __reactProps.onClick!
        const searchList = [targetBtn, targetBtn.parentElement, ...targetBtn.querySelectorAll('*')].filter(Boolean);
        let reactInvoked = false;

        for (const el of searchList) {
          const propKey = Object.keys(el).find((k) => k.startsWith('__reactProps'));
          if (propKey && el[propKey] && typeof el[propKey].onClick === 'function') {
            try {
              console.log('[CoursologySync-Page] Invoking __reactProps.onClick on:', el);
              el[propKey].onClick({
                preventDefault: () => {},
                stopPropagation: () => {},
                nativeEvent: new MouseEvent('click', { bubbles: true, cancelable: true })
              });
              reactInvoked = true;
              break;
            } catch (e) {
              console.warn('[CoursologySync-Page] Error executing __reactProps.onClick:', e);
            }
          }
        }

        // 5. If __reactProps was on fiber memoizedProps:
        if (!reactInvoked) {
          for (const el of searchList) {
            const fiberKey = Object.keys(el).find((k) => k.startsWith('__reactFiber'));
            if (fiberKey && el[fiberKey]) {
              let curr = el[fiberKey];
              while (curr) {
                if (curr.memoizedProps && typeof curr.memoizedProps.onClick === 'function') {
                  try {
                    console.log('[CoursologySync-Page] Invoking fiber memoizedProps.onClick on:', curr);
                    curr.memoizedProps.onClick({
                      preventDefault: () => {},
                      stopPropagation: () => {},
                      nativeEvent: new MouseEvent('click', { bubbles: true, cancelable: true })
                    });
                    reactInvoked = true;
                    break;
                  } catch (e) {}
                }
                curr = curr.return;
              }
              if (reactInvoked) break;
            }
          }
        }

        if (reactInvoked) {
          document.documentElement.setAttribute('data-coursology-clicked', 'true');
          return true;
        }

        // 6. Fallback: single standard click if React props were not directly invoked
        try {
          if (typeof targetBtn.click === 'function') {
            targetBtn.click();
          }
        } catch (e) {
          console.warn('[CoursologySync-Page] Click error:', e);
        }

        document.documentElement.setAttribute('data-coursology-clicked', 'true');
        return true;
      })();
    `;

    return runInPage(pageScript);
  }

  // ---------------------------------------------------------------------------
  // 4. Editor Interaction Helpers
  // ---------------------------------------------------------------------------

  /**
   * Multi-strategy image insertion into TipTap / ProseMirror editor.
   * @param {Element} editorElement 
   * @param {string} imageUrl 
   */
  function insertImageIntoTipTap(editorElement, imageUrl) {
    if (!editorElement || !imageUrl) return false;

    // Strategy 0: TipTap editor instance direct insertion
    try {
      const editor = editorElement.editor || editorElement._tiptap?.editor || editorElement.pmViewDesc?.view?.editor;
      if (editor && typeof editor.chain === 'function') {
        editor.chain().focus().insertContent(`<p><img src="${imageUrl}" alt="Diagram" /></p>`).run();
        return true;
      }
    } catch (e) {
      console.warn('[CoursologySync] TipTap instance insert fallback', e);
    }

    // Strategy A: Direct ProseMirror View dispatch
    try {
      const view = editorElement.pmViewDesc?.view || editorElement._tiptap?.view;
      if (view && view.state && view.state.schema) {
        const imageType = view.state.schema.nodes.image;
        if (imageType) {
          const node = imageType.create({ src: imageUrl, alt: 'Explanation diagram' });
          const tr = view.state.tr.replaceSelectionWith(node);
          view.dispatch(tr);
          return true;
        }
      }
    } catch (e) {
      console.warn('[CoursologySync] ProseMirror dispatch fallback', e);
    }

    // Strategy B: ClipboardEvent simulated paste with text/html
    try {
      editorElement.focus();
      const dt = new DataTransfer();
      const htmlSnippet = `<p><img src="${imageUrl}" alt="Diagram" /></p>`;
      dt.setData('text/html', htmlSnippet);
      dt.setData('text/plain', '');
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: dt,
        bubbles: true,
        cancelable: true
      });
      editorElement.dispatchEvent(pasteEvent);
      return true;
    } catch (e) {
      console.warn('[CoursologySync] Paste event fallback', e);
    }

    // Strategy C: document.execCommand insertHTML
    try {
      editorElement.focus();
      document.execCommand('insertHTML', false, `<p><img src="${imageUrl}" alt="Diagram" /></p>`);
      return true;
    } catch (e) {
      console.warn('[CoursologySync] execCommand fallback', e);
    }

    return false;
  }

  /**
   * Sets text content in TipTap editor and dispatches events so React state syncs.
   * @param {Element} editorElement 
   * @param {string} text 
   */
  function setTextInTipTap(editorElement, text) {
    if (!editorElement || !text) return;
    try {
      const editor = editorElement.editor || editorElement._tiptap?.editor || editorElement.pmViewDesc?.view?.editor;
      if (editor && typeof editor.commands?.setContent === 'function') {
        editor.commands.setContent(`<p>${escapeHtml(text)}</p>`);
        return;
      }
      const view = editorElement.pmViewDesc?.view || editorElement._tiptap?.view;
      if (view && view.state && view.state.schema) {
        const tr = view.state.tr.replaceWith(0, view.state.doc.content.size, view.state.schema.text(text));
        view.dispatch(tr);
        return;
      }
    } catch (e) {}

    // Fallback: execCommand with selectAll
    editorElement.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, text);
    editorElement.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // ---------------------------------------------------------------------------
  // 5. Flashcard Creation Automation Workflow
  // ---------------------------------------------------------------------------

  async function runWorkflow(isManual = false) {
    if (isAutomating) {
      console.log('[CoursologySync] Card creation already in progress, skipping.');
      return;
    }

    const questionId = Selectors.extractQuestionId();

    // Check duplicate
    if (!isManual && savedQuestionIds.has(questionId)) {
      showToast(`Question (${questionId}) already saved to flashcards (duplicate skipped).`, 'info');
      return;
    }

    isAutomating = true;
    savedQuestionIds.add(questionId); // Immediately lock this question to prevent duplicate triggers
    lastCheckedQuestionId = questionId;
    showToast(isManual ? 'Triggering card creation...' : 'Wrong answer detected! Creating flashcard...', 'info');

    try {
      // Step A: Locate the Educational Objective
      const explanation = Selectors.queryFirst(Selectors.EXPLANATION_CONTAINER);
      if (!explanation) {
        throw new Error('Explanation container (#question-explanation) is not visible.');
      }

      const eoData = Selectors.findEducationalObjective(explanation);
      if (!eoData) {
        throw new Error('Educational Objective section could not be found in explanation.');
      }

      // Scroll into view so getClientRects() returns valid coordinates for context menu
      if (eoData && eoData.element && typeof eoData.element.scrollIntoView === 'function') {
        eoData.element.scrollIntoView({ behavior: 'auto', block: 'center' });
      }
      await sleep(150);

      // Programmatically select Educational Objective text
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        if (eoData && eoData.range) {
          sel.addRange(eoData.range);
        }
      }

      // Dispatch events expected by Coursology
      document.dispatchEvent(new Event('selectionchange'));
      explanation.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));

      // Wait 300ms so Coursology's 200ms debounce completes before searching for context menu
      await sleep(300);

      // Step B: Wait for the selection menu/popup and click "New Flashcard"
      const newCardBtn = await waitFor(
        () => Selectors.findNewFlashcardButton(),
        'Context menu "New Flashcard" button',
        6000
      );

      console.log('[CoursologySync] Found New Flashcard button, clicking once via page bridge...');
      clickNewFlashcardInPage();
      await sleep(350);

      // Step C: Wait for the Card Editor form/window to appear
      const editorForm = await waitFor(
        () => Selectors.findCardEditorForm(),
        'Card editor form',
        8000
      );

      await sleep(350);

      // In Coursology, when a snippet is pending, both Front and Back have "add content here" buttons.
      const allButtons = editorForm ? Array.from(editorForm.querySelectorAll('button')) : [];
      const addContentBtns = allButtons.filter((b) =>
        (b.textContent || '').trim().toLowerCase().includes('add content here')
      );

      const tiptapEditors = editorForm ? Array.from(editorForm.querySelectorAll('.tiptap.ProseMirror, .tiptap, div[contenteditable="true"]')) : [];
      const frontEditor = tiptapEditors.length > 0 ? tiptapEditors[0] : null;
      const backEditor = tiptapEditors.length > 1 ? tiptapEditors[1] : null;

      if (addContentBtns.length > 0) {
        // Place Educational Objective snippet by clicking once
        const targetBtn = (config.targetSide === 'all-back' && addContentBtns.length > 1)
          ? addContentBtns[1]
          : addContentBtns[0];
        targetBtn.click();
      } else {
        // If "add content here" was not rendered, directly insert text into target editor
        const targetEditor = config.targetSide === 'all-back' ? backEditor : frontEditor;
        if (targetEditor && eoData && eoData.text) {
          setTextInTipTap(targetEditor, eoData.text);
        }
      }

      await sleep(350);

      // Step D: Attach relevant images (if enabled)
      if (config.includeImages) {
        const imageUrls = Selectors.extractRelevantImages();
        if (imageUrls && imageUrls.length > 0) {
          // Re-query editors after React re-renders from addContentBtns click
          const currentEditors = editorForm ? Array.from(editorForm.querySelectorAll('.tiptap.ProseMirror, .tiptap, div[contenteditable="true"]')) : [];
          const currentFront = currentEditors[0] || frontEditor;
          const currentBack = currentEditors[1] || backEditor;

          // By default (all-front), images go directly into FRONT right after the Educational Objective!
          const destEditor = (config.targetSide === 'all-back' || config.targetSide === 'front-back')
            ? (currentBack || currentEditors[currentEditors.length - 1])
            : (currentFront || currentEditors[0]);

          if (destEditor) {
            destEditor.focus();
            try {
              const sel = window.getSelection();
              if (sel) {
                const range = document.createRange();
                range.selectNodeContents(destEditor);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
              }
            } catch (e) {}

            for (const url of imageUrls) {
              insertImageIntoTipTap(destEditor, url);
              await sleep(150);
            }
          }
        }
      }

      await sleep(300);

      // Step E: Ensure Front has clean content (strip "Educational Objective:" label if present)
      const finalEditors = editorForm ? Array.from(editorForm.querySelectorAll('.tiptap.ProseMirror, .tiptap, div[contenteditable="true"]')) : [];
      const finalFront = finalEditors[0] || frontEditor;
      if (finalFront) {
        const currentFrontText = (finalFront.textContent || '').trim();
        if (/^(educational\s+objective|bottom\s+line)\s*[:\-–—]?/i.test(currentFrontText)) {
          const cleanText = Selectors.stripObjectivePrefix(currentFrontText);
          setTextInTipTap(finalFront, cleanText);
          await sleep(150);
        } else if (currentFrontText.length === 0 && eoData && eoData.text) {
          setTextInTipTap(finalFront, eoData.text);
          await sleep(150);
        }
      }

      // Step F: Locate and click Save button
      const saveBtn = await waitFor(() => {
        if (!editorForm) return null;
        const btn = editorForm.querySelector('button[type="submit"]') ||
          Array.from(editorForm.querySelectorAll('button')).find((b) =>
            (b.textContent || '').trim().toLowerCase() === 'save'
          );
        if (btn && !btn.disabled) return btn;
        return null;
      }, 'Enabled Save button in card editor', 5000);

      await sleep(250);
      saveBtn.click();

      // Step G: Wait for editor window to close
      await waitFor(() => {
        const form = Selectors.findCardEditorForm();
        return !form || !Selectors.isElementVisible(form);
      }, 'Editor window to close after saving', 4000);

      // Record question ID to prevent duplicates
      savedQuestionIds.add(questionId);
      const savedList = Array.from(savedQuestionIds);
      config.sessionCount = (config.sessionCount || 0) + 1;

      await storage.set({
        savedQuestions: savedList,
        sessionCount: config.sessionCount
      });

      // Notify background / popup if messaging is available
      try {
        if (typeof browser !== 'undefined' && browser.runtime) {
          browser.runtime.sendMessage({
            type: 'CARD_CREATED',
            questionId,
            sessionCount: config.sessionCount
          });
        } else if (typeof chrome !== 'undefined' && chrome.runtime) {
          chrome.runtime.sendMessage({
            type: 'CARD_CREATED',
            questionId,
            sessionCount: config.sessionCount
          });
        }
      } catch (e) {}

      showToast(`Flashcard saved successfully! (Session total: ${config.sessionCount})`, 'success', 4000);
    } catch (err) {
      console.error('[CoursologySync] Error in workflow:', err);
      showToast(`Sync failed: ${err.message}`, 'error', 5000);
    } finally {
      isAutomating = false;
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Question Observer (Auto-detect Wrong Answers)
  // ---------------------------------------------------------------------------

  let debounceTimer = null;

  function evaluatePage() {
    if (isAutomating) return;

    const currentQid = Selectors.extractQuestionId();
    if (!currentQid) return;
    if (savedQuestionIds.has(currentQid) || currentQid === lastCheckedQuestionId) {
      return;
    }

    const status = Selectors.checkAnswerStatus();
    if (status.isSubmitted && status.isIncorrect) {
      lastCheckedQuestionId = currentQid;
      savedQuestionIds.add(currentQid);
      if (config.autoMode) {
        runWorkflow(false); // auto trigger
      }
    }
  }

  function startObserver() {
    const observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(evaluatePage, 500);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    // Also run an initial check
    evaluatePage();
  }

  // ---------------------------------------------------------------------------
  // 7. Keyboard Shortcut (Ctrl+Shift+S / ⌘+Shift+S)
  // ---------------------------------------------------------------------------

  function setupKeyboardShortcut() {
    window.addEventListener('keydown', (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (cmdOrCtrl && e.shiftKey && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        e.stopPropagation();
        runWorkflow(true);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // 8. Runtime Message Listener (Popup & Background communication)
  // ---------------------------------------------------------------------------

  function setupMessageListener() {
    const handler = (msg, sender, sendResponse) => {
      if (!msg || !msg.type) return;

      switch (msg.type) {
        case 'TRIGGER_MANUAL_SAVE':
          runWorkflow(true);
          sendResponse({ status: 'started' });
          break;

        case 'UPDATE_CONFIG':
          if (msg.config) {
            config = { ...config, ...msg.config };
          }
          sendResponse({ status: 'ok', config });
          break;

        case 'GET_STATUS':
          sendResponse({
            status: 'ok',
            config,
            isAutomating,
            questionId: Selectors.extractQuestionId(),
            answerStatus: Selectors.checkAnswerStatus()
          });
          break;

        case 'CLEAR_SAVED_QUESTIONS':
          savedQuestionIds.clear();
          storage.set({ savedQuestions: [] }).then(() => {
            showToast('Saved questions history cleared.', 'info');
            sendResponse({ status: 'cleared' });
          });
          return true; // async response
      }
    };

    if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.onMessage) {
      browser.runtime.onMessage.addListener(handler);
    } else if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener(handler);
    }
  }

  // ---------------------------------------------------------------------------
  // 9. Initialization
  // ---------------------------------------------------------------------------

  async function init() {
    // Load persisted settings & history
    const stored = await storage.get(['autoMode', 'includeImages', 'targetSide', 'sessionCount', 'savedQuestions']);
    if (stored.autoMode !== undefined) config.autoMode = stored.autoMode;
    if (stored.includeImages !== undefined) config.includeImages = stored.includeImages;
    if (stored.targetSide !== undefined) config.targetSide = stored.targetSide;
    if (stored.sessionCount !== undefined) config.sessionCount = stored.sessionCount;
    if (Array.isArray(stored.savedQuestions)) {
      savedQuestionIds = new Set(stored.savedQuestions);
    }

    injectFloatingButton();
    setupKeyboardShortcut();
    setupMessageListener();
    startObserver();

    console.log('[CoursologySync] Initialized successfully with config:', config);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
