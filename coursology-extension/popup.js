/**
 * Coursology QBank Flashcard Sync - Popup Script
 */

const storage = (typeof browser !== 'undefined' && browser.storage) ? browser.storage.local : chrome.storage.local;
const tabs = (typeof browser !== 'undefined' && browser.tabs) ? browser.tabs : chrome.tabs;
const runtime = (typeof browser !== 'undefined' && browser.runtime) ? browser.runtime : chrome.runtime;

// DOM Elements
const sessionCountEl = document.getElementById('session-count');
const autoModeToggle = document.getElementById('auto-mode-toggle');
const includeImagesToggle = document.getElementById('include-images-toggle');
const targetSideSelect = document.getElementById('target-side-select');
const manualTriggerBtn = document.getElementById('manual-trigger-btn');
const clearDuplicatesBtn = document.getElementById('clear-duplicates-btn');
const savedCountText = document.getElementById('saved-count-text');
const statusText = document.getElementById('status-text');

// Load stored settings and status
async function loadState() {
  storage.get(['autoMode', 'includeImages', 'targetSide', 'sessionCount', 'savedQuestions'], (data) => {
    if (data.autoMode !== undefined) autoModeToggle.checked = data.autoMode;
    if (data.includeImages !== undefined) includeImagesToggle.checked = data.includeImages;
    if (data.targetSide !== undefined) targetSideSelect.value = data.targetSide;
    sessionCountEl.textContent = data.sessionCount || 0;

    const count = Array.isArray(data.savedQuestions) ? data.savedQuestions.length : 0;
    savedCountText.textContent = `${count} question${count === 1 ? '' : 's'} tracked`;
  });

  // Query active tab to check if on coursology-qbank.com
  tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
    if (!activeTabs || !activeTabs[0]) return;
    const tab = activeTabs[0];
    const isTargetPage = tab.url && tab.url.includes('coursology-qbank.com');
    if (!isTargetPage) {
      statusText.textContent = 'Not on QBank';
      statusText.parentElement.style.color = '#71717a';
      statusText.parentElement.style.background = 'rgba(113, 113, 122, 0.1)';
      manualTriggerBtn.disabled = true;
      manualTriggerBtn.style.opacity = '0.5';
    } else {
      // Fetch live status from content script
      tabs.sendMessage(tab.id, { type: 'GET_STATUS' }, (res) => {
        if (runtime.lastError || !res) {
          statusText.textContent = 'Ready (Idle)';
        } else if (res.isAutomating) {
          statusText.textContent = 'Syncing...';
          statusText.parentElement.style.color = '#3b82f6';
        } else {
          statusText.textContent = 'Ready';
        }
      });
    }
  });
}

// Update settings on change
function saveSetting(key, val) {
  const update = {};
  update[key] = val;
  storage.set(update, () => {
    // Notify active tab content script
    tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
      if (activeTabs && activeTabs[0] && activeTabs[0].id) {
        tabs.sendMessage(activeTabs[0].id, {
          type: 'UPDATE_CONFIG',
          config: update
        });
      }
    });
  });
}

autoModeToggle.addEventListener('change', () => {
  saveSetting('autoMode', autoModeToggle.checked);
});

includeImagesToggle.addEventListener('change', () => {
  saveSetting('includeImages', includeImagesToggle.checked);
});

targetSideSelect.addEventListener('change', () => {
  saveSetting('targetSide', targetSideSelect.value);
});

// Manual trigger button
manualTriggerBtn.addEventListener('click', () => {
  manualTriggerBtn.disabled = true;
  const originalText = manualTriggerBtn.innerHTML;
  manualTriggerBtn.innerHTML = '<span>Triggering sync...</span>';

  tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
    if (activeTabs && activeTabs[0] && activeTabs[0].id) {
      tabs.sendMessage(activeTabs[0].id, { type: 'TRIGGER_MANUAL_SAVE' }, () => {
        setTimeout(() => {
          manualTriggerBtn.innerHTML = '<span>Triggered!</span>';
          setTimeout(() => {
            manualTriggerBtn.disabled = false;
            manualTriggerBtn.innerHTML = originalText;
            window.close();
          }, 600);
        }, 300);
      });
    }
  });
});

// Clear duplicates button
clearDuplicatesBtn.addEventListener('click', () => {
  if (confirm('Clear duplicate prevention history? You will be able to re-save previously saved questions.')) {
    storage.set({ savedQuestions: [] }, () => {
      savedCountText.textContent = '0 questions tracked';
      tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
        if (activeTabs && activeTabs[0] && activeTabs[0].id) {
          tabs.sendMessage(activeTabs[0].id, { type: 'CLEAR_SAVED_QUESTIONS' });
        }
      });
    });
  }
});

// Listen for updates from content script
runtime.onMessage.addListener((message) => {
  if (message.type === 'CARD_CREATED') {
    if (message.sessionCount !== undefined) {
      sessionCountEl.textContent = message.sessionCount;
    }
  }
});

document.addEventListener('DOMContentLoaded', loadState);
