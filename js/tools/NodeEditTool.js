import { recordState } from '../history.js';

export function initNodeEditTool() {
    const tool = new paper.Tool();
    let activePath = null; // The path item being edited
    let activeSegment = null; // The specific segment/handle being dragged
    let segmentDragMode = null; // 'segment', 'handleIn', 'handleOut'
    let originalPathData = null; // To revert if drag is cancelled by gesture

    const resetNodeDragState = () => {
        activeSegment = null;
        segmentDragMode = null;
        originalPathData = null;
    };

    const storeOriginalPathData = () => {
        if (activePath) {
            originalPathData = activePath.exportJSON(); // Store full path data
        }
    };

    const revertPathToOriginal = () => {
        if (activePath && originalPathData) {
            const tempLayer = new paper.Layer(); // Import to temp layer to avoid ID conflicts
            tempLayer.importJSON(originalPathData);
            if (tempLayer.children.length > 0) {
                activePath.segments = tempLayer.firstChild.segments; // Copy segments
            }
            tempLayer.remove();
            // activePath.importJSON(originalPathData); // This might cause issues if IDs clash
        }
    };


    tool.onPointerDown = function(event) {
        if (window.isGesturing) return;
        if (event.event.pointerType === 'mouse' && event.event.button !== 0) return;

        resetNodeDragState();

        const hitOptions = {
            segments: true, handles: true,
            tolerance: 8 / paper.view.zoom
        };
        const hitResult = paper.project.hitTest(event.point, hitOptions);

        if (hitResult) {
            if (hitResult.item instanceof paper.Path) {
                if (activePath !== hitResult.item) { // New path selected for node editing
                    if (activePath) activePath.fullySelected = false;
                    activePath = hitResult.item;
                    activePath.fullySelected = true;
                }

                // Now check if a segment or handle on the activePath was hit
                if (hitResult.type === 'segment') {
                    activeSegment = hitResult.segment;
                    segmentDragMode = 'segment';
                } else if (hitResult.type === 'handle-in') {
                    activeSegment = hitResult.segment;
                    segmentDragMode = 'handleIn';
                } else if (hitResult.type === 'handle-out') {
                    activeSegment = hitResult.segment;
                    segmentDragMode = 'handleOut';
                }
                if (activeSegment) storeOriginalPathData(); // Store before drag starts

            }
        } else { // Clicked on empty space
            if (activePath) {
                activePath.fullySelected = false;
                activePath = null;
            }
        }
    }

    tool.onPointerDrag = function(event) {
        if (window.isGesturing || !activePath || !activeSegment || !segmentDragMode) return;

        if (segmentDragMode === 'segment') {
            activeSegment.point = activeSegment.point.add(event.delta);
        } else if (segmentDragMode === 'handleIn') {
            activeSegment.handleIn = activeSegment.handleIn.add(event.delta);
        } else if (segmentDragMode === 'handleOut') {
            activeSegment.handleOut = activeSegment.handleOut.add(event.delta);
        }
        // activePath.smooth(); // Optional: Re-smooth if continuous smoothing is desired
    }

    tool.onPointerUp = function(event) {
        if (!activePath || !activeSegment || !originalPathData) return; // No drag was active

        // Check if path actually changed from originalPathData
        const currentPathData = activePath.exportJSON();
        if (currentPathData !== originalPathData) { // Simple string compare, might need deep compare for robustness
            recordState();
        }
        resetNodeDragState(); // Keep activePath, but reset drag-specific state
    }

    tool.onPointerCancel = function(event) {
        if (activePath && originalPathData) {
            revertPathToOriginal();
        }
        resetNodeDragState();
    };

    return {
        activate: () => {
            tool.activate();
            resetNodeDragState();
            // If an item was selected by SelectionTool, make it ready for node editing
            const currentSelection = paper.project.getItems({ selected: true, class: paper.Path });
            if (currentSelection.length === 1) {
                if (activePath && activePath !== currentSelection[0]) activePath.fullySelected = false;
                activePath = currentSelection[0];
                activePath.fullySelected = true;
            } else if (activePath) { // Reactivating and had an active path
                activePath.fullySelected = true;
            } else { // No path was selected or previously active for node editing
                 paper.project.deselectAll(); // Ensure nothing else shows as 'selected'
            }
        },
        deactivate: () => {
            if (activePath) {
                activePath.fullySelected = false; // Hide handles
            }
            // activePath = null; // Don't nullify, so if reactivated, it remembers.
            // Or nullify if you want a fresh start each time.
            resetNodeDragState();
        },
        onGestureStart: () => {
            // console.log("NodeEditTool: Gesture detected, cancelling current node drag.");
            if (activePath && originalPathData && activeSegment) { // If a drag was in progress
                revertPathToOriginal();
            }
            resetNodeDragState(); // Cancel the drag operation
        },
        onGestureEnd: () => { /* console.log("NodeEditTool: Gesture ended."); */ }
    };
}