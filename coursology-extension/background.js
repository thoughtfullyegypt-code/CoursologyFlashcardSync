/**
 * Coursology QBank Flashcard Sync - Background Service Worker
 * Handles commands, badge updates, and message routing.
 */

const storage = (typeof browser !== 'undefined' && browser.storage) ? browser.storage.local : chrome.storage.local;

// Initialize defaults on install
const runtime = (typeof browser !== 'undefined' && browser.runtime) ? browser.runtime : chrome.runtime;
const action = (typeof browser !== 'undefined' && browser.action) ? browser.action : chrome.action;
const commands = (typeof browser !== 'undefined' && browser.commands) ? browser.commands : chrome.commands;
const tabs = (typeof browser !== 'undefined' && browser.tabs) ? browser.tabs : chrome.tabs;

runtime.onInstalled.addListener(() => {
  storage.get(['autoMode', 'includeImages', 'targetSide', 'sessionCount', 'savedQuestions'], (data) => {
    const defaults = {
      autoMode: data.autoMode !== undefined ? data.autoMode : true,
      includeImages: data.includeImages !== undefined ? data.includeImages : true,
      targetSide: data.targetSide !== undefined ? data.targetSide : 'all-front',
      sessionCount: 0, // Reset session count on browser/extension reload
      savedQuestions: Array.isArray(data.savedQuestions) ? data.savedQuestions : []
    };
    storage.set(defaults);
    updateBadge(0);
  });
});

// Update badge count on extension icon
function updateBadge(count) {
  if (!action) return;
  const countStr = count > 0 ? String(count) : '';
  action.setBadgeText({ text: countStr });
  action.setBadgeBackgroundColor({ color: '#2563eb' });
}

// Handle keyboard shortcut command defined in manifest.json
if (commands && commands.onCommand) {
  commands.onCommand.addListener((command) => {
    if (command === 'save-to-card-now') {
      tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
        if (activeTabs && activeTabs[0] && activeTabs[0].id) {
          tabs.sendMessage(activeTabs[0].id, { type: 'TRIGGER_MANUAL_SAVE' });
        }
      });
    }
  });
}

// Listen for messages from content script or popup
runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return;

  if (message.type === 'CARD_CREATED') {
    if (message.sessionCount !== undefined) {
      updateBadge(message.sessionCount);
    }
  }
});
