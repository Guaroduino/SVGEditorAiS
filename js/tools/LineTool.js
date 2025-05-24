export function initLineTool() {
    const tool = new paper.Tool();
    let linePath;
    let startPoint;

    tool.onPointerDown = function(event) {
        if (event.event.pointerType === 'mouse' && event.event.button !== 0) return;
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
        if (linePath) {
            linePath.segments[1].point = event.point;
        }
    }

    tool.onPointerUp = function(event) {
        if (linePath) {
            if (linePath.length < 2) { // If it's just a dot (no drag)
                linePath.remove(); // Remove tiny line
            } else {
                import('./../history.js').then(historyModule => historyModule.recordState());
            }
        }
        linePath = null;
        startPoint = null;
    }
    
    tool.onPointerCancel = tool.onPointerUp;

    return {
        activate: () => tool.activate(),
        deactivate: () => {
            if (linePath) linePath.remove(); // Clean up if tool changed mid-draw
            linePath = null;
            startPoint = null;
        },
        updateColor: (newColor) => {
            window.strokeColor = newColor; // Used for next line
        }
    };
}