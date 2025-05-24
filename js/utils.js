// At the top of js/canvasInteraction.js
import { getDistance, getMidpoint } from '../utils.js'; // Adjust path if necessary

export function initCanvasInteraction(view) {
    // ... (declarations: lastPanPoint, lastPinchDist, activeTouches)

    const canvas = view.element;

    canvas.addEventListener('pointerdown', (event) => {
        // ...
        if (activeTouches.size === 2) {
            const touches = Array.from(activeTouches.values());
            lastPinchDist = getDistance(touches[0], touches[1]); // Uses imported function
            lastPanPoint = getMidpoint(touches[0], touches[1]);  // Uses imported function
            // ...
        }
    });

    canvas.addEventListener('pointermove', (event) => {
        // ...
        if (activeTouches.size === 2 && lastPinchDist && lastPanPoint) {
            const touches = Array.from(activeTouches.values());
            if (touches.length < 2) return;

            const currentMidpoint = getMidpoint(touches[0], touches[1]); // Uses imported function
            const currentPinchDist = getDistance(touches[0], touches[1]); // Uses imported function
            // ...
            lastPanPoint = currentMidpoint;
        }
    });

    // ... (rest of the onPointerUpOrCancel function and the file)

    // Remove the local getDistance and getMidpoint functions from canvasInteraction.js
    // as they are now imported from utils.js
}