// This is a simplified pan/zoom. For robust multi-touch, a library or more complex logic is needed.
export function initCanvasInteraction(view) {
    let lastPanPoint = null;
    let lastPinchDist = null;
    const activeTouches = new Map(); // To track multiple touches

    const canvas = view.element;

    canvas.addEventListener('pointerdown', (event) => {
        if (window.currentTool !== null && window.currentTool !== 'select' && window.currentTool !== 'nodeEdit') {
            // If a drawing tool is active, let it handle the event
            // Or, if specific gestures (e.g. two-finger pan) should override tools:
            if (event.pointerType === 'touch' && activeTouches.size >= 1) { // Already one touch, this might be second for gesture
                 // Allow gesture if activeTouches.size becomes 2 here.
            } else {
                return; // Let the active tool handle its own pointerdown
            }
        }
        
        // Prevent default browser actions like scrolling or pinch-zoom on the page
        // event.preventDefault(); // Be careful with this, can break tool interactions if not handled correctly
                                 // `touch-action: none;` in CSS is preferred for global control.

        activeTouches.set(event.pointerId, {x: event.clientX, y: event.clientY });

        if (activeTouches.size === 1 && (window.currentTool === null || window.currentTool === 'select' || window.currentTool === 'nodeEdit')) { // Single touch pan (if no tool or select tool)
            // This condition might be too broad. Only pan if explicitly no tool is active or a "pan tool" is selected.
            // For now, let select tool handle its own drag logic.
            // lastPanPoint = new paper.Point(event.offsetX, event.offsetY);
        } else if (activeTouches.size === 2) { // Two touches for pinch-zoom
            const touches = Array.from(activeTouches.values());
            lastPinchDist = getDistance(touches[0], touches[1]);
            lastPanPoint = getMidpoint(touches[0], touches[1]); // Midpoint for zoom anchor
             // Prevent tools from activating during a pinch
            if (paper.tool) paper.tool. μέχρι(false); // temporary disable current tool's events
        }
    });

    canvas.addEventListener('pointermove', (event) => {
        if (!activeTouches.has(event.pointerId)) return;
        activeTouches.set(event.pointerId, {x: event.clientX, y: event.clientY });

        if (activeTouches.size === 1 && lastPanPoint && (window.currentTool === null /* add pan tool condition here */)) {
            // PAN (single finger, if pan tool active)
            // const currentPanPoint = new paper.Point(event.offsetX, event.offsetY);
            // const delta = currentPanPoint.subtract(lastPanPoint).divide(view.zoom);
            // view.center = view.center.subtract(delta);
            // lastPanPoint = currentPanPoint;
        } else if (activeTouches.size === 2 && lastPinchDist && lastPanPoint) {
            // PINCH-ZOOM (two fingers)
            const touches = Array.from(activeTouches.values());
            if (touches.length < 2) return; // Should not happen if size is 2

            const currentMidpoint = getMidpoint(touches[0], touches[1]);
            const currentPinchDist = getDistance(touches[0], touches[1]);

            if (lastPinchDist > 0 && currentPinchDist > 0) {
                const scale = currentPinchDist / lastPinchDist;
                
                // Calculate view center before zoom for anchoring
                const viewAnchor = view.viewToProject(new paper.Point(lastPanPoint.x, lastPanPoint.y));
                
                view.zoom *= scale;

                // Adjust center to keep anchor point stationary
                const newViewAnchorPos = view.viewToProject(new paper.Point(lastPanPoint.x, lastPanPoint.y));
                view.center = view.center.add(viewAnchor.subtract(newViewAnchorPos));

            }
            lastPinchDist = currentPinchDist;
            lastPanPoint = currentMidpoint; // Update midpoint for continuous zoom anchor
        }
    });

    const onPointerUpOrCancel = (event) => {
        activeTouches.delete(event.pointerId);

        if (activeTouches.size < 2) {
            lastPinchDist = null;
        }
        if (activeTouches.size < 1) {
            lastPanPoint = null;
        }
         if (paper.tool && activeTouches.size < 2) paper.tool.μέχρι(true); // re-enable tool
    };

    canvas.addEventListener('pointerup', onPointerUpOrCancel);
    canvas.addEventListener('pointercancel', onPointerUpOrCancel);
    canvas.addEventListener('pointerleave', onPointerUpOrCancel); // Also handle pointer leaving the canvas

    function getDistance(p1, p2) {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }

    function getMidpoint(p1, p2) {
        return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    }
}

// In app.js, call:
// import { initCanvasInteraction } from './canvasInteraction.js';
// initCanvasInteraction(paper.view);