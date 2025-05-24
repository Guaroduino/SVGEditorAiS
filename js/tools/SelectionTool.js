import { recordState } from '../history.js';

export function initSelectionTool() {
    const tool = new paper.Tool();
    let selectedItem = null;
    let dragStartPoint = null; // Paper.js Point for calculations
    let originalPosition = null; // To revert if drag is cancelled by gesture

    const resetSelectionDragState = () => {
        dragStartPoint = null;
        originalPosition = null;
    };

    tool.onPointerDown = function(event) {
        // Gestures take precedence if already active from canvasInteraction
        if (window.isGesturing) return;
        if (event.event.pointerType === 'mouse' && event.event.button !== 0) return;

        resetSelectionDragState();

        // If clicking on an already selected item's bounds (for future scale/rotate handles)
        // this logic would need to be more complex. For now, simple item hit.
        const hitOptions = {
            segments: true, stroke: true, fill: true,
            tolerance: 5 / paper.view.zoom
        };
        const hitResult = paper.project.hitTest(event.point, hitOptions);

        if (hitResult && hitResult.item) {
            if (selectedItem !== hitResult.item) { // Clicked a new item
                paper.project.deselectAll();
                selectedItem = hitResult.item;
                selectedItem.selected = true;
            }
            // If clicked on the *same* selected item, it's now ready for dragging.
            dragStartPoint = event.point.clone();
            originalPosition = selectedItem.position.clone();
        } else {
            // Clicked on empty space
            paper.project.deselectAll();
            selectedItem = null;
        }
    }

    tool.onPointerDrag = function(event) {
        // If a gesture starts MID-DRAG, onGestureStart will be called, cancelling this.
        if (window.isGesturing || !selectedItem || !dragStartPoint) return;

        const delta = event.point.subtract(dragStartPoint);
        selectedItem.position = selectedItem.position.add(delta);
        dragStartPoint = event.point.clone(); // Update for continuous dragging
    }

    tool.onPointerUp = function(event) {
        if (!selectedItem || !originalPosition) return; // No item was being dragged

        // Check if position actually changed to warrant a history record
        if (!selectedItem.position.equals(originalPosition)) {
            recordState();
        }
        resetSelectionDragState();
        // selectedItem remains selected.
    }
    
    tool.onPointerCancel = function(event) { // Revert move if cancelled (e.g. by system)
        if (selectedItem && originalPosition) {
            selectedItem.position = originalPosition;
        }
        resetSelectionDragState();
    };

    return {
        activate: () => {
            tool.activate();
            // Ensure selection visuals are correct if reactivating
            paper.project.getItems({ selected: true }).forEach(item => item.selected = true);
            if (paper.project.selectedItems.length === 1) {
                selectedItem = paper.project.selectedItems[0];
            } else {
                selectedItem = null;
            }
            resetSelectionDragState();
        },
        deactivate: () => {
            // Don't deselect here, let other tools or actions handle it.
            resetSelectionDragState();
        },
        updateColor: (newColor) => {
            if (selectedItem) {
                let changed = false;
                if (selectedItem.fillColor) { selectedItem.fillColor = newColor; changed = true; }
                else if (selectedItem.strokeColor) { selectedItem.strokeColor = newColor; changed = true; }
                
                if (changed) {
                    paper.view.draw();
                    recordState();
                }
            }
        },
        onGestureStart: () => {
            // console.log("SelectionTool: Gesture detected, cancelling current drag.");
            if (selectedItem && originalPosition && dragStartPoint) { // If a drag was in progress
                selectedItem.position = originalPosition; // Revert to position before drag started
            }
            resetSelectionDragState(); // Cancel the drag operation
        },
        onGestureEnd: () => { /* console.log("SelectionTool: Gesture ended."); */ }
    };
}