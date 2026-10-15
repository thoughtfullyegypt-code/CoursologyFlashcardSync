# Safari Extension Test Checklist: Coursology Flashcard Sync

Verify each test scenario on https://coursology-qbank.com/qbanks/usmle1 (or any question block).

---

## Pre-Flight Setup
- [ ] Open Safari > Settings > Extensions.
- [ ] Confirm "Coursology Flashcard Sync" is checked (enabled).
- [ ] Under "Permissions", verify access is set to **"Always Allow on coursology-qbank.com"** (or Always Allow on All Websites).
- [ ] In Safari Develop menu, ensure **"Allow Unsigned Extensions"** is checked.
- [ ] Navigate to `https://coursology-qbank.com/qbanks/usmle1` and start or resume a test block.
- [ ] Verify the floating button **"⚡ Save to card now"** is visible in the bottom-left corner.
- [ ] Click the extension toolbar icon in Safari; verify popup displays "Active" and "Ready".

---

## Test 1: Wrong Answer Workflow (Automatic Trigger)
**Objective**: Verify end-to-end automatic sync when an answer is submitted incorrectly.
1. [ ] Answer a question with an incorrect choice and click **Submit Choice**.
2. [ ] Wait for the explanation view (`#question-explanation`) and the result card (`border-red-500` / "Incorrect") to appear.
3. [ ] Observe the notification toast: `"Wrong answer detected! Creating flashcard..."`.
4. [ ] Observe the Educational Objective section being highlighted automatically.
5. [ ] Observe the selection popup appearing and clicking the lightning bolt ("New Flashcard") button.
6. [ ] Observe the card editor opening.
7. [ ] Confirm the Educational Objective text appears on the card.
8. [ ] Confirm the Save button is enabled and clicked automatically.
9. [ ] Confirm the success toast appears: `"Flashcard saved successfully! (Session total: 1)"`.
10. [ ] Check the extension toolbar popup: session counter should now show `1`.

---

## Test 2: Correct Answer Behavior
**Objective**: Verify that correctly answered questions are NOT auto-saved, but can still be manually saved.
1. [ ] Answer a question correctly and submit.
2. [ ] Verify that the result card shows green (`border-lime-500` / "Correct").
3. [ ] Confirm that no automatic flashcard sync triggers.
4. [ ] Press <kbd>⌘</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd> (or click the floating `"⚡ Save to card now"` button).
5. [ ] Confirm the toast `"Triggering card creation..."` appears.
6. [ ] Confirm the Educational Objective and figures are saved to a new flashcard.
7. [ ] Confirm the session counter increments.

---

## Test 3: Question with Images and Diagrams
**Objective**: Verify that medical diagrams and anatomical figures from the explanation are attached to the card.
1. [ ] Find or navigate to an explanation containing diagrams/figures (e.g. Pathology, Anatomy, or Pharmacology flowchart).
2. [ ] Trigger flashcard creation (automatically or via manual button).
3. [ ] Verify that question/explanation figures are inserted into the card's Back editor.
4. [ ] Verify that UI icons, avatar badges, and small buttons are correctly skipped.
5. [ ] Confirm card saves successfully.

---

## Test 4: Question without Images
**Objective**: Verify that text-only explanations save cleanly without hanging or timeout.
1. [ ] Find or navigate to an explanation with no diagrams.
2. [ ] Trigger flashcard creation.
3. [ ] Verify that the workflow proceeds directly from text selection to Save without error.
4. [ ] Confirm the success toast is displayed.

---

## Test 5: Duplicate Prevention
**Objective**: Verify that re-submitting or re-viewing the same incorrect question does not create duplicate cards.
1. [ ] After saving an incorrect question, navigate to another question and return to the saved question, or refresh the page on the same question.
2. [ ] Observe that the extension detects the existing Question ID.
3. [ ] Confirm the toast notification indicates: `"Question (...) already saved to flashcards (duplicate skipped)"`.
4. [ ] Open the extension popup; confirm the tracked questions count matches.
5. [ ] Click `"Reset Duplicate History"` in the popup.
6. [ ] Verify that duplicate prevention history is cleared and the question can now be saved again.
