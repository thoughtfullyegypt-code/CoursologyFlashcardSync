# Coursology Flashcard Sync - Safari Web Extension (macOS)

A high-performance Safari Web Extension (Manifest V3) for macOS that automates flashcard creation from incorrect questions and Educational Objectives on [coursology-qbank.com](https://coursology-qbank.com/qbanks/usmle1).

---

## Features

- **Automated Incorrect Answer Detection**: Reliably monitors question submission via `MutationObserver`. Detects wrong answers via Coursology's result card signals (`border-red-500`, `.text-red-500`, and "Incorrect" indicators).
- **Educational Objective Auto-Highlighting**: Uses the DOM `Selection` and `Range` APIs to programmatically select the Educational Objective paragraph and triggers Coursology's native context menu.
- **Card Creation & Image Attachment**: Clicks "New Flashcard", attaches question/explanation diagrams directly into the TipTap/ProseMirror editor, ensures front content is filled, and clicks Save.
- **Duplicate Prevention**: Keeps track of saved Question IDs in `browser.storage.local` to prevent redundant flashcards.
- **Manual Controls**:
  - Floating on-screen button: **"⚡ Save to card now"** (works for correct questions too).
  - Keyboard shortcut: <kbd>⌘</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd> (or <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd>).
  - Modern popup with Auto-Save toggle, Include Images toggle, Card Placement setting, and Session Stats counter.
- **Centralized Selectors**: All DOM selectors and helper functions live in `selectors.js` for easy maintenance.

---

## Project Structure

```
/Users/shehab/Downloads/Anki/
├── coursology-extension/                # WebExtension Source (Manifest V3)
│   ├── manifest.json                    # Extension metadata and permissions
│   ├── selectors.js                     # Centralized DOM selectors & helpers
│   ├── content.js                       # Automation workflow & UI injection
│   ├── background.js                    # Service worker, badge counter & commands
│   ├── popup.html / popup.js / popup.css# Toolbar popup interface
│   ├── icons/                           # 16x16, 32x32, 48x48, 128x128 icons
│   ├── TEST_CHECKLIST.md                # QA test matrix
│   └── README.md                        # Documentation
└── CoursologyFlashcardApp/              # Xcode macOS Container App
    └── Coursology Flashcard Sync/
        ├── Coursology Flashcard Sync.xcodeproj
        ├── Coursology Flashcard Sync/   # Host macOS app target
        └── Coursology Flashcard Sync Extension/ # Safari Web Extension target
```

---

## Step-by-Step Setup Guide

### 1. Enable Developer Features in Safari
Before running unsigned extensions locally, Safari requires developer permissions:

1. Open **Safari**.
2. In the menu bar, open **Safari > Settings...** (or press <kbd>⌘</kbd> + <kbd>,</kbd>).
3. Switch to the **Advanced** tab.
4. Check **"Show features for web developers"** (or **"Show Develop menu in menu bar"** on older macOS versions).
5. In Safari's menu bar, click the new **Develop** menu.
6. Click **"Allow Unsigned Extensions"**. *(Safari will prompt for your Mac password/Touch ID)*.
   > **Note:** Safari resets this toggle when completely quit. Keep this option checked while developing.

---

### 2. Build and Run in Xcode

The project has already been converted and configured for macOS.

1. Open the project in Xcode:
   ```bash
   open "/Users/shehab/Downloads/Anki/CoursologyFlashcardApp/Coursology Flashcard Sync/Coursology Flashcard Sync.xcodeproj"
   ```
2. In the top toolbar, ensure the active scheme is set to **Coursology Flashcard Sync > My Mac**.
3. Select the root **Coursology Flashcard Sync** project in the left navigator:
   - Under **Signing & Capabilities**:
     - Check **"Automatically manage signing"**.
     - Select your **Personal Team** (or Apple ID).
4. Click the **Run** button (▶) or press <kbd>⌘</kbd> + <kbd>R</kbd>.
5. Xcode will build the project and launch the container app **"Coursology Flashcard Sync"**.
6. A window will appear saying:
   > *"You can turn on Coursology Flashcard Sync's extension in Safari Extensions preferences."*
7. Click **"Quit and Open Safari Settings..."** (or open Safari manually).

---

### 3. Enable the Extension in Safari

1. In Safari, go to **Safari > Settings > Extensions**.
2. In the left sidebar, find **Coursology Flashcard Sync** and check its checkbox to enable it.
3. Under **Permissions**, select **coursology-qbank.com**:
   - Change permission from "Ask" to **"Always Allow"** (or **"Always Allow on All Websites"**).
4. Close Safari Settings.

---

### 4. Verify on Coursology QBank

1. In Safari, open:
   `https://coursology-qbank.com/qbanks/usmle1`
2. Start or resume any practice block.
3. You will see:
   - The **"⚡ Save to card now"** button floating at the bottom-left of the page.
   - The **⚡** toolbar icon in Safari's extension bar.
4. When you submit an incorrect answer:
   - The extension will automatically detect the wrong answer.
   - A green toast notification will report each step.
   - The Educational Objective and explanation images will be saved to your flashcards deck without duplicate creation!

---

## Keyboard Shortcuts & Controls

| Control | Action | Scope |
| :--- | :--- | :--- |
| **Auto-Save on Wrong** | Automatically triggers on incorrect answers | Content Script |
| <kbd>⌘</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd> | Manually triggers card creation for current question | Web Page |
| **"⚡ Save to card now"** | Floating on-screen manual trigger button | Bottom-Left Page |
| **Toolbar Popup** | Toggle Auto-Save, Toggle Images, Select Front/Back layout | Safari Toolbar |
| **Reset Duplicate History** | Clears tracked question IDs so you can re-test | Popup Footer |

---

## Troubleshooting

### Issue 1: "The extension doesn't appear in Safari Settings > Extensions"
- Make sure **Develop > Allow Unsigned Extensions** is checked.
- Build and run the project once from Xcode (<kbd>⌘</kbd> + <kbd>R</kbd>).
- If still not showing, restart Safari:
  ```bash
  killall Safari && open -a Safari
  ```

### Issue 2: "Extension shows 'Not allowed on this website'"
- In Safari, click the extension icon or open **Safari > Settings > Extensions > Coursology Flashcard Sync**.
- Click **"Edit Websites..."** and set `coursology-qbank.com` to **"Allow"**.

### Issue 3: "Timeout waiting for Educational Objective"
- If Coursology updates its explanation layout, open `selectors.js`:
  - Locate `findEducationalObjective()` in `selectors.js`.
  - Add the new class or text pattern.
  - Re-run `xcrun safari-web-extension-converter ...` or update `Coursology Flashcard Sync Extension/Resources/selectors.js`.

---

## Modifying & Updating Extension Code

If you make edits to `content.js`, `selectors.js`, or `popup.*`:
1. Edit the files in `/Users/shehab/Downloads/Anki/coursology-extension/`.
2. Sync them to the Xcode resources directory:
   ```bash
   cp /Users/shehab/Downloads/Anki/coursology-extension/*.js /Users/shehab/Downloads/Anki/coursology-extension/*.html /Users/shehab/Downloads/Anki/coursology-extension/*.css "/Users/shehab/Downloads/Anki/CoursologyFlashcardApp/Coursology Flashcard Sync/Coursology Flashcard Sync Extension/Resources/"
   ```
3. Press <kbd>⌘</kbd> + <kbd>R</kbd> in Xcode to rebuild.
4. In Safari, reload the QBank tab (<kbd>⌘</kbd> + <kbd>R</kbd>).
