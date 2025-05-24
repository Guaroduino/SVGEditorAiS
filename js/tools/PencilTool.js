import { clamp, mapRange } from '../utils.js';
import { recordState } from '../history.js';

const MIN_STROKE_WIDTH = 1;
const MAX_STROKE_WIDTH = 15;

function mapPressureToWidth(pressure) {
    const clampedPressure = clamp(pressure, 0, 1);
    if (clampedPressure < 0.01 && pressure < 0.01) return MIN_STROKE_WIDTH; // Very light touch as min
    return mapRange(clampedPressure, 0, 1, MIN_STROKE_WIDTH, MAX_STROKE_WIDTH);
}

export function initPencilTool() {
    const tool = new paper.Tool();
    let currentPathOutline; // The variable-width filled path
    let pointsLeft, pointsRight;
    let lastPointData; // { point: paper.Point, pressure: number, isDot?: boolean, dotPath?: paper.Path }

    const resetStrokeState = () => {
        if (currentPathOutline) {
            currentPathOutline.remove();
            currentPathOutline = null;
        }
        if (lastPointData && lastPointData.dotPath) { // Ensure dotPath is also cleared if it was a dot
            lastPointData.dotPath.remove();
        }
        pointsLeft = [];
        pointsRight = [];
        lastPointData = null;
    };

    const finalizeStroke = (doRecordState = true) => {
        if (lastPointData && lastPointData.isDot && currentPathOutline) { // It was a dot
            if (currentPathOutline.bounds.width < 0.1) { // Dot too small or invalid
                currentPathOutline.remove();
            } else if (doRecordState) {
                recordState();
            }
        } else if (currentPathOutline && pointsLeft && pointsLeft.length > 1) {
            currentPathOutline.simplify(1);
            currentPathOutline.smooth({ type: 'continuous' });
            if (doRecordState) {
                recordState();
            }
        } else if (currentPathOutline) { // Path was too short or invalid
            currentPathOutline.remove();
        }
        // Reset for next stroke AFTER potential history recording
        currentPathOutline = null; // These are reset here
        pointsLeft = [];        // instead of resetStrokeState
        pointsRight = [];       // to allow history to capture them
        lastPointData = null;
    };

    tool.onPointerDown = function(event) {
        if (window.isGesturing) return;
        if (event.event.pointerType === 'mouse' && event.event.button !== 0) return;

        resetStrokeState(); // Clear any previous unfinished state

        let pressure = event.pressure !== undefined && event.pressure > 0 ? event.pressure : 0.5;
        if (event.event.pointerType === 'mouse' && pressure === 0.5) { /* mouse pressure default */ }
        
        const width = mapPressureToWidth(pressure);
        const point = event.point;

        // Heuristic for a tap to create a dot
        // Using a small timeout to differentiate tap from start of a drag is more robust,
        // but for now, very light pressure on touch or just pointerdown for mouse might be a dot.
        // The logic in onPointerDrag will convert dot to line if drag occurs.
        // A very short drag will still result in a line.
        if (event.event.pointerType === 'touch' && pressure < 0.1 || (event.event.pointerType === 'mouse' && !event.event.buttons)) {
             currentPathOutline = new paper.Path.Circle({
                center: point,
                radius: width / 2,
                fillColor: window.fillColor,
            });
            lastPointData = { point: point, pressure: pressure, isDot: true, dotPath: currentPathOutline };
            return; // Await pointerUp or pointerDrag to confirm
        }
        
        currentPathOutline = new paper.Path({
            fillColor: window.fillColor,
        });
        lastPointData = { point: point, pressure: pressure, isDot: false };
    }

    tool.onPointerDrag = function(event) {
        if (window.isGesturing || !lastPointData) return;

        if (lastPointData.isDot) { // Started as a dot, now dragging
            if (currentPathOutline) currentPathOutline.remove(); // Remove the circle dot
            currentPathOutline = new paper.Path({ fillColor: window.fillColor }); // Start new path for line
            lastPointData.isDot = false;
            // The first segment will be built below using the original lastPointData.point
        }

        let pressure = event.pressure !== undefined && event.pressure > 0 ? event.pressure : 0.5;
        const currentWidth = mapPressureToWidth(pressure);
        const currentPoint = event.point;
        
        // Avoid adding points if the cursor hasn't moved significantly
        if (lastPointData.point.getDistance(currentPoint) < 1 && pointsLeft.length > 0) {
            return;
        }

        let vector = currentPoint.subtract(lastPointData.point);
        if (vector.length === 0) vector = new paper.Point(0.1, 0); // Avoid zero vector for normal

        let normal = vector.getNormal().multiply(currentWidth / 2);

        if (pointsLeft.length === 0) { // First segment of a dragged line (or after dot conversion)
            const firstWidth = mapPressureToWidth(lastPointData.pressure);
            const firstNormal = vector.getNormal().multiply(firstWidth / 2);
            pointsLeft.push(lastPointData.point.subtract(firstNormal));
            pointsRight.push(lastPointData.point.add(firstNormal));
        }
        
        pointsLeft.push(currentPoint.subtract(normal));
        pointsRight.push(currentPoint.add(normal));
        
        currentPathOutline.segments = [];
        pointsLeft.forEach(p => currentPathOutline.add(p.clone()));
        pointsRight.slice().reverse().forEach(p => currentPathOutline.add(p.clone()));
        currentPathOutline.closed = true;
        // currentPathOutline.smooth({ type: 'catmull-rom', factor: 0.2 }); // Optional: adaptive smooth

        lastPointData = { point: currentPoint, pressure: pressure, isDot: false }; // Update last point
    }

    tool.onPointerUp = function(event) {
        if (!lastPointData) return; // Already handled by gesture or no down event
        finalizeStroke(true);
    }
    
    tool.onPointerCancel = tool.onPointerUp;

    return {
        activate: () => {
            tool.activate();
            resetStrokeState();
        },
        deactivate: () => {
            finalizeStroke(true); // Finalize if user switches tool mid-stroke
        },
        updateColor: (newColor) => { /* Global fillColor is used */ },
        onGestureStart: () => {
            // console.log("PencilTool: Gesture detected, cancelling current stroke.");
            resetStrokeState();
        },
        onGestureEnd: () => { /* console.log("PencilTool: Gesture ended."); */ }
    };
}