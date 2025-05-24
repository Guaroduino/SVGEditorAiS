import { recordState } from '../history.js';

export function initShapeTool(options = { shapeType: 'rectangle' }) {
    const tool = new paper.Tool();
    let shapePath;
    let startPoint;
    const shapeType = options.shapeType;

    const resetShapeState = () => {
        if (shapePath) {
            shapePath.remove();
            shapePath = null;
        }
        startPoint = null;
    };

    tool.onPointerDown = function(event) {
        if (window.isGesturing) return;
        if (event.event.pointerType === 'mouse' && event.event.button !== 0) return;
        
        resetShapeState(); // Clear any previous state
        startPoint = event.point;
    }

    tool.onPointerDrag = function(event) {
        if (window.isGesturing || !startPoint) return;

        if (shapePath) {
            shapePath.remove(); // Remove previous iteration of the shape
        }

        const rectBounds = new paper.Rectangle(startPoint, event.point);
        // Prevent zero-size shapes from causing issues
        if (rectBounds.width < 0.1 && rectBounds.height < 0.1) { 
             shapePath = null; // Ensure it's null so pointerUp doesn't try to record it
             return; 
        }

        if (shapeType === 'rectangle') {
            shapePath = new paper.Path.Rectangle({
                rectangle: rectBounds,
                strokeColor: window.strokeColor,
                // fillColor: window.fillColor, // Uncomment if shapes should be filled by default
                strokeWidth: window.strokeWidth
            });
        } else if (shapeType === 'ellipse') {
            shapePath = new paper.Path.Ellipse({
                rectangle: rectBounds,
                strokeColor: window.strokeColor,
                // fillColor: window.fillColor, // Uncomment if shapes should be filled by default
                strokeWidth: window.strokeWidth
            });
        }
    }

    tool.onPointerUp = function(event) {
        if (!shapePath || !startPoint) return; // No shape started or cancelled

        if (shapePath.bounds.width < 2 && shapePath.bounds.height < 2) { // Too small
            shapePath.remove();
        } else {
            recordState();
        }
        shapePath = null; // Reset for next shape
        startPoint = null;
    }

    tool.onPointerCancel = tool.onPointerUp;

    return {
        activate: () => {
            tool.activate();
            resetShapeState();
        },
        deactivate: () => {
            if (shapePath) { // If tool changed mid-draw
                if (shapePath.bounds.width >=2 || shapePath.bounds.height >=2) recordState(); else shapePath.remove();
            }
            resetShapeState();
        },
        updateColor: (newColor) => { /* Global colors are used */ },
        onGestureStart: () => {
            // console.log("ShapeTool: Gesture detected, cancelling current shape.");
            resetShapeState();
        },
        onGestureEnd: () => { /* console.log("ShapeTool: Gesture ended."); */ }
    };
}