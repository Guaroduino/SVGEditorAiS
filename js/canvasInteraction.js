import { getDistance, getMidpoint } from './utils.js'; // Make sure utils.js is correctly imported

export function initCanvasInteraction(view) {
    let lastPanPoint = null;
    let lastPinchDist = null;
    const activeTouches = new Map();
    window.isGesturing = false; // Global flag to indicate if a multi-touch gesture is active

    const canvas = view.element;

    canvas.addEventListener('pointerdown', (event) => {
        const currentAppToolKey = window.currentTool; // Key of the current tool, e.g., 'pencil'
        const activeToolInstance = window.activeToolInstance; // The actual tool instance

        // Determine if the current tool is a type that draws (and shouldn't operate during gestures)
        const toolIsDrawingType = currentAppToolKey &&
                                  currentAppToolKey !== 'select' &&
                                  currentAppToolKey !== 'nodeEdit' &&
                                  currentAppToolKey !== null;

        activeTouches.set(event.pointerId, { x: event.clientX, y: event.clientY, id: event.pointerId });

        if (event.pointerType === 'touch' && activeTouches.size >= 2) {
            // This is the start of a multi-touch gesture (second finger down)
            if (!window.isGesturing) {
                window.isGesturing = true;
                // console.log("Gesture started, attempting to notify active tool.");
                if (activeToolInstance && activeToolInstance.onGestureStart) {
                    activeToolInstance.onGestureStart(); // Notify the tool
                }
            }
            // Update gesture starting points
            const touchesArray = Array.from(activeTouches.values());
            // Ensure we have at least two distinct points for distance/midpoint
            if (touchesArray.length >= 2) {
                lastPinchDist = getDistance(touchesArray[0], touchesArray[1]);
                lastPanPoint = getMidpoint(touchesArray[0], touchesArray[1]);
            }
        } else if (event.pointerType === 'touch' && activeTouches.size === 1 && toolIsDrawingType) {
            // First touch for a drawing tool, let the tool handle it.
            // canvasInteraction should not interfere with the tool's onPointerDown.
            return;
        } else if (event.pointerType === 'mouse' && toolIsDrawingType) {
            // Mouse click for a drawing tool, let the tool handle it.
            return;
        }
        // If code reaches here, it's either:
        // - A gesture is starting/continuing (handled above for >=2 touches).
        // - A non-drawing tool is active (select/nodeEdit), or no tool.
        // - A mouse event for a non-drawing tool.
        // - The first touch for a non-drawing tool.
        // These cases can be handled by canvasInteraction or the respective non-drawing tools.
    });

    canvas.addEventListener('pointermove', (event) => {
        if (!activeTouches.has(event.pointerId) || !window.isGesturing) {
            // If not tracking this pointer, or not in a gesture, tools should handle their own drag
            // Or, if single-finger pan is desired for select/nodeEdit, it could be handled here.
            // This 'return' relies on drawing tools checking `window.isGesturing` in their onPointerDrag.
            return;
        }

        activeTouches.set(event.pointerId, { x: event.clientX, y: event.clientY, id: event.pointerId });

        if (window.isGesturing && activeTouches.size >= 2 && lastPanPoint !== null) {
            const touchesArray = Array.from(activeTouches.values());
            if (touchesArray.length < 2) return; // Need at least two points for gesture

            const currentMidpoint = getMidpoint(touchesArray[0], touchesArray[1]);
            const currentPinchDist = getDistance(touchesArray[0], touchesArray[1]);

            // Pan part (movement of the midpoint)
            const panDelta = {
                x: currentMidpoint.x - lastPanPoint.x,
                y: currentMidpoint.y - lastPanPoint.y
            };
            const projectPanDelta = new paper.Point(panDelta.x / view.zoom, panDelta.y / view.zoom);
            view.center = view.center.subtract(projectPanDelta);

            // Zoom part
            if (lastPinchDist !== null && lastPinchDist > 0 && currentPinchDist > 0 && Math.abs(currentPinchDist - lastPinchDist) > 0.5) {
                const scale = currentPinchDist / lastPinchDist;
                const viewAnchorProject = view.viewToProject(new paper.Point(lastPanPoint.x, lastPanPoint.y));
                view.zoom *= scale;
                const newViewAnchorProject = view.viewToProject(new paper.Point(lastPanPoint.x, lastPanPoint.y));
                view.center = view.center.add(viewAnchorProject.subtract(newViewAnchorProject));
                lastPinchDist = currentPinchDist; // Update only if zoom happened
            }
            
            lastPanPoint = currentMidpoint;
        }
    });

    const onPointerUpOrCancel = (event) => {
        if (!activeTouches.has(event.pointerId)) return;

        activeTouches.delete(event.pointerId);

        if (window.isGesturing && activeTouches.size < 2) {
            // Gesture has ended (less than 2 fingers remain)
            window.isGesturing = false;
            // console.log("Gesture ended.");
            const activeToolInstance = window.activeToolInstance;
            if (activeToolInstance && activeToolInstance.onGestureEnd) {
                activeToolInstance.onGestureEnd(); // Notify the tool
            }
            lastPinchDist = null;
            lastPanPoint = null; // Reset pan anchor as well
        } else if (!window.isGesturing && activeTouches.size === 0) {
            // All pointers up, and not during a gesture
            lastPanPoint = null;
        }
    };

    canvas.addEventListener('pointerup', onPointerUpOrCancel);
    canvas.addEventListener('pointercancel', onPointerUpOrCancel);
    canvas.addEventListener('pointerleave', (event) => {
        if (activeTouches.has(event.pointerId)) {
            onPointerUpOrCancel(event); // Treat leave like up/cancel for gesture state
        }
    });
}