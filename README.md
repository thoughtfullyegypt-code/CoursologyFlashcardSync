# Coursology Flashcard Sync

A macOS Safari Web Extension (Manifest V3) and companion macOS host application that automates flashcard creation on [Coursology QBank](https://coursology-qbank.com/qbanks/usmle1).

## Features
- **Automatic Incorrect Answer Detection**: Observes question state and triggers flashcard workflow when an explanation view appears for an incorrect answer.
- **Precision Text Selection**: Programmatically locates the "Educational Objective" section, strips prefixes like `"Educational Objective:"`, and captures only the core objective text.
- **Main-World React Bridge**: Interacts directly with Coursology's React 18 / Radix UI context menu (`z-[9999999]`), invoking the New Flashcard (`⚡`) action without being blocked by tooltip triggers.
- **Single-Click Automation**: Clean, idempotent event dispatching that prevents duplicate card creation or duplicate text appending.
- **Image Extraction**: Automatically attaches explanation and question diagrams to the Front of the flashcard while filtering out UI icons and badges.
- **Duplicate Prevention**: Tracks question IDs in `browser.storage.local` to skip questions that have already been converted to flashcards.
- **Manual Trigger**: Floating on-screen button (`⚡ Save to card now`) and keyboard shortcut (<kbd>⌘</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd>).
- **Popup Toolbar Controls**: Quick toggle for auto mode, image inclusion, and session card counter.

## Directory Structure
- `coursology-extension/`: Pure Manifest V3 web extension source (`manifest.json`, `content.js`, `selectors.js`, `background.js`, `popup.html/js/css`, `icons/`).
- `CoursologyFlashcardApp/`: Complete Xcode project (`Coursology Flashcard Sync.xcodeproj`) bundling the macOS host container and the Safari Web Extension target (`.appex`).

## Installation & Setup
1. Open `CoursologyFlashcardApp/Coursology Flashcard Sync/Coursology Flashcard Sync.xcodeproj` in Xcode.
2. Select target **Coursology Flashcard Sync** and build/run (<kbd>⌘</kbd> + <kbd>R</kbd>).
3. In Safari:
   - Open **Settings** (<kbd>⌘</kbd> + <kbd>,</kbd>) > **Extensions**.
   - Check the box next to **Coursology Flashcard Sync Extension**.
   - Ensure permissions for `coursology-qbank.com` are set to **Always Allow on Every Website**.
   - If developing with an ad-hoc or unsigned certificate: enable **Develop > Allow Unsigned Extensions** in Safari's menu bar.
