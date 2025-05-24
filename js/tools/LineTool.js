import { recordState } from '../history.js';

export function initLineTool() {
    const tool = new paper.Tool();
    let linePath;
    let startPoint;

    const resetLineState = () => {
        if (linePath) {
            linePath.remove();
            linePath = null;
        }
        startPoint = null;
    };

    tool.onPointerDown = function(event) {
        if (window.isGesturing) return;
        if (event.event.pointerType === 'mouse' && event.event.button !== 0) return;

        resetLineState(); // Clear any previous state

        startPoint = event.point;
        linePath = new paper.Path.Line({
            from: startPoint,
            to: startPoint,
            strokeColor: window.strokeColor,
            strokeWidth: window.strokeWidth,
            strokeCap: 'round'
        });
    }

    tool.onPointerDrag = function(event) {
        if (window.isGesturing || !linePath) return;
        linePath.segments[1].point = event.point;
    }

    tool.onPointerUp = function(event) {
        if (!linePath) return; // No line started or cancelled by gesture

        if (linePath.length < 2) { // If it's just a dot (no drag or very short)
            linePath.remove();
        } else {
            recordState();
        }
        linePath = null; // Reset for next line
        startPoint = null;
    }
    
    tool.onPointerCancel = tool.onPointerUp;

    return {
        activate: () => {
            tool.activate();
            resetLineState();
        },
        deactivate: () => {
            if (linePath) { // If tool changed mid-draw, finalize (or just remove)
                 if (linePath.length >= 2) recordState(); else linePath.remove();
            }
            resetLineState();
        },
        updateColor: (newColor) => { /* Global strokeColor is used */ },
        onGestureStart: () => {
            // console.log("LineTool: Gesture detected, cancelling current line.");
            resetLineState();
        },
        onGestureEnd: () => { /* console.log("LineTool: Gesture ended."); */ }
    };
}