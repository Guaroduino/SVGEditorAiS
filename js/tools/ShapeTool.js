export function initShapeTool(options = { shapeType: 'rectangle' }) {
    const tool = new paper.Tool();
    let shapePath;
    let startPoint;
    const shapeType = options.shapeType; // 'rectangle' or 'ellipse'

    tool.onPointerDown = function(event) {
        if (event.event.pointerType === 'mouse' && event.event.button !== 0) return;
        startPoint = event.point;
        // Placeholder for shape, actual shape drawn on drag
    }

    tool.onPointerDrag = function(event) {
        if (shapePath) {
            shapePath.remove(); // Remove previous iteration of the shape
        }

        const rect = new paper.Rectangle(startPoint, event.point);
        if (rect.width === 0 || rect.height === 0) return; // Avoid zero-size shapes

        if (shapeType === 'rectangle') {
            shapePath = new paper.Path.Rectangle({
                rectangle: rect,
                strokeColor: window.strokeColor,
                fillColor: null, // Or window.fillColor if you want filled rectangles by default
                strokeWidth: window.strokeWidth
            });
        } else if (shapeType === 'ellipse') {
            shapePath = new paper.Path.Ellipse({
                rectangle: rect, // Ellipse defined by a bounding box
                strokeColor: window.strokeColor,
                fillColor: null, // Or window.fillColor
                strokeWidth: window.strokeWidth
            });
        }
         // For filled shapes:
         // shapePath.fillColor = window.fillColor;
         // shapePath.strokeColor = null; // Or a border color
    }

    tool.onPointerUp = function(event) {
        if (shapePath) {
            if (shapePath.bounds.width < 2 && shapePath.bounds.height < 2) {
                shapePath.remove(); // Remove tiny shape
            } else {
                import('./../history.js').then(historyModule => historyModule.recordState());
            }
        }
        shapePath = null;
        startPoint = null;
    }

    tool.onPointerCancel = tool.onPointerUp;

    return {
        activate: () => tool.activate(),
        deactivate: () => {
            if (shapePath) shapePath.remove();
            shapePath = null;
            startPoint = null;
        },
        updateColor: (newColor) => {
            // Global colors will be used for next shape.
            // If you want to change fill/stroke behavior, update here.
            window.strokeColor = newColor;
            // window.fillColor = newColor; // If shapes are filled
        }
    };
}