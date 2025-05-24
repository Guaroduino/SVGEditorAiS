import { recordState } from '../history.js';

export function initEraserTool() {
    const tool = new paper.Tool();
    const eraserSize = 20; // Radius of the eraser area
    let itemsToErase = new Set();
    let isErasing = false; // To track if a drag operation is an erase action

    const resetEraserState = () => {
        itemsToErase.clear();
        isErasing = false;
    };

    const eraseAtPoint = (point) => {
        const hitOptions = {
            segments: true, stroke: true, fill: true,
            tolerance: eraserSize / 2
        };
        const hitResults = paper.project.hitTestAll(point, hitOptions);

        let erasedSomethingThisMove = false;
        if (hitResults.length > 0) {
            hitResults.forEach(hitResult => {
                if (hitResult.item && !hitResult.item.guide && !itemsToErase.has(hitResult.item)) {
                    // For immediate feedback and simpler undo, we add to set and remove on up.
                    // For live erasing, you'd need more complex path subtraction or splitting.
                    // Here, we'll make them disappear visually during drag for feedback.
                    hitResult.item.visible = false; // Hide item
                    itemsToErase.add(hitResult.item);
                    erasedSomethingThisMove = true;
                }
            });
        }
        return erasedSomethingThisMove;
    };

    tool.onPointerDown = function(event) {
        if (window.isGesturing) return;
        if (event.event.pointerType === 'mouse' && event.event.button !== 0) return;

        resetEraserState();
        isErasing = true;
        eraseAtPoint(event.point);
    }

    tool.onPointerDrag = function(event) {
        if (window.isGesturing || !isErasing) return;
        eraseAtPoint(event.point);
    }

    tool.onPointerUp = function(event) {
        if (!isErasing) return; // Not in an erase operation or cancelled by gesture

        if (itemsToErase.size > 0) {
            itemsToErase.forEach(item => item.remove()); // Actually remove them
            recordState();
        } else {
            // If nothing was added to itemsToErase, ensure any hidden items are shown again
            // This case shouldn't typically happen if logic is right, but as a safeguard:
            paper.project.getItems({ visible: false }).forEach(item => {
                if (!item.guide) item.visible = true; // Show non-guide items
            });
        }
        resetEraserState();
    }
    
    tool.onPointerCancel = tool.onPointerUp;

    return {
        activate: () => {
            tool.activate();
            resetEraserState();
            // Ensure all items are visible when eraser is activated
            paper.project.getItems({ visible: false }).forEach(item => {
                if (!item.guide) item.visible = true;
            });
        },
        deactivate: () => {
            if (isErasing && itemsToErase.size > 0) { // If deactivated mid-erase
                itemsToErase.forEach(item => item.remove());
                recordState();
            }
            // Ensure all items that might have been hidden are visible
            itemsToErase.forEach(item => item.visible = true); // Show items from current erase set
            paper.project.getItems({ visible: false }).forEach(item => { // General sweep
                if (!item.guide) item.visible = true;
            });
            resetEraserState();
        },
        onGestureStart: () => {
            // console.log("EraserTool: Gesture detected, cancelling current erase.");
            // Make items visible again if they were hidden mid-erase
            itemsToErase.forEach(item => item.visible = true);
            resetEraserState();
        },
        onGestureEnd: () => { /* console.log("EraserTool: Gesture ended."); */ }
    };
}