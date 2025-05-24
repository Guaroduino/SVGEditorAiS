const MAX_HISTORY_STATES = 50;
let historyStack = [];
let historyIndex = -1; // Points to the current state in the stack

export function initHistory() {
    historyStack = [];
    historyIndex = -1;
    // recordState(); // Optionally record the initial empty state
}

export function recordState() {
    // Debounce or throttle this if actions are very frequent
    // For simplicity, record on significant action completion (e.g., path end, transform end)

    // Clear "redo" history if a new action is performed after an undo
    if (historyIndex < historyStack.length - 1) {
        historyStack = historyStack.slice(0, historyIndex + 1);
    }

    const currentState = paper.project.exportJSON(); // Export project state as JSON
    historyStack.push(currentState);

    // Limit history size
    if (historyStack.length > MAX_HISTORY_STATES) {
        historyStack.shift(); // Remove oldest state
    } else {
        historyIndex++;
    }
    // If only limiting size when it overflows, historyIndex doesn't need to change here
    // but when stack shifts. Simpler: always increment index, then cap stack and adjust index if needed.
    if (historyIndex >= MAX_HISTORY_STATES) {
        historyIndex = MAX_HISTORY_STATES -1;
    }

    console.log(`State recorded. History size: ${historyStack.length}, Index: ${historyIndex}`);
    updateUndoRedoButtons();
}

export function undo() {
    if (historyIndex > 0) { // Cannot undo initial state if it's the only one
        historyIndex--;
        loadState(historyStack[historyIndex]);
        console.log('Undo. Index:', historyIndex);
    } else {
        console.log('Nothing to undo');
    }
    updateUndoRedoButtons();
}

export function redo() {
    if (historyIndex < historyStack.length - 1) {
        historyIndex++;
        loadState(historyStack[historyIndex]);
        console.log('Redo. Index:', historyIndex);
    } else {
        console.log('Nothing to redo');
    }
    updateUndoRedoButtons();
}

function loadState(jsonState) {
    paper.project.clear(); // Clear current project
    paper.project.importJSON(jsonState); // Load state from JSON
    paper.view.draw();
}

function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    if (undoBtn) undoBtn.disabled = historyIndex <= 0;
    if (redoBtn) redoBtn.disabled = historyIndex >= historyStack.length - 1;
}

// Initial button state
// Call this after app.js UI is ready, or from app.js
// setTimeout(updateUndoRedoButtons, 0);