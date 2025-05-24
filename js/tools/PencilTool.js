let path;
let pressurePoints = []; // To store {point: paper.Point, pressure: float}
const MIN_STROKE_WIDTH = 1;
const MAX_STROKE_WIDTH = 15;
const SMOOTHING_FACTOR = 0.5; // For adaptive smoothing during drawing

function mapPressureToWidth(pressure) {
    // Pressure usually 0 to 1, but can exceed 1 on some devices. Clamp it.
    const clampedPressure = Math.max(0, Math.min(1, pressure));
    if (clampedPressure === 0) return MIN_STROKE_WIDTH; // Stylus hover or light touch
    return MIN_STROKE_WIDTH + (MAX_STROKE_WIDTH - MIN_STROKE_WIDTH) * clampedPressure;
}

// Utility to get perpendicular offset points
function getOffsetPoint(point, normal, offset) {
    return point.add(normal.multiply(offset));
}

export function initPencilTool() {
    const tool = new paper.Tool();
    let currentPathOutline;
    let pointsLeft = [];
    let pointsRight = [];
    let lastPointData = null; // { point: paper.Point, pressure: number }

    tool.onPointerDown = function(event) {
        if (event.event.pointerType === 'mouse' && event.event.button !== 0) return; // Only left mouse button

        // For touch, event.pressure might be 0.5 if not pressure-sensitive, or a value
        // For pen, event.pressure is the actual pressure
        let pressure = event.pressure !== undefined && event.pressure > 0 ? event.pressure : 0.5;
        if (event.event.pointerType === 'mouse' && pressure === 0.5) { // Mouse doesn't have pressure, simulate mid-pressure
           // Keep 0.5 or set to fixed if desired
        }
        
        const width = mapPressureToWidth(pressure);

        pointsLeft = [];
        pointsRight = [];

        // Create a new path for the outline
        currentPathOutline = new paper.Path({
            fillColor: window.fillColor, // Use global fillColor
            // strokeColor: 'rgba(255,0,0,0.3)', // For debugging outline
            // strokeWidth: 1,
        });

        // For a single dot
        if (event.event.pointerType === 'touch' || pressure === 0) { // Handle tap for dot
            // A simple circle for a tap
            const dot = new paper.Path.Circle({
                center: event.point,
                radius: width / 2,
                fillColor: window.fillColor
            });
            // No need to add to history here, will be added onPointerUp if it's just a dot
            lastPointData = { point: event.point, pressure: pressure, isDot: true, dotPath: dot };
            return;
        }
        
        lastPointData = { point: event.point, pressure: pressure, isDot: false };
        // Add initial segments for the outline path based on the first point
        // We need a direction, so we can't fully form the first segment's outline yet.
        // Or, we can make a tiny stub. For simplicity, we'll start forming from the second point.
    }

    tool.onPointerDrag = function(event) {
        if (!lastPointData) return;
        if (lastPointData.isDot) { // If it started as a dot, remove it and start line
            lastPointData.dotPath.remove();
            lastPointData.isDot = false;
        }

        let pressure = event.pressure !== undefined && event.pressure > 0 ? event.pressure : 0.5;
         if (event.event.pointerType === 'mouse' && pressure === 0.5) {
           // Mouse pressure
        }
        const currentWidth = mapPressureToWidth(pressure);
        const currentPoint = event.point;

        let vector = currentPoint.subtract(lastPointData.point);
        let normal = vector.getNormal().multiply(currentWidth / 2); // Perpendicular vector scaled by half-width

        if (pointsLeft.length === 0) { // First segment
            // For the very first point, create initial outline points
            // We can estimate the normal based on the next point or use a default
            // For simplicity, we'll base the first segment on the first two points
            const firstWidth = mapPressureToWidth(lastPointData.pressure);
            const firstNormal = vector.getNormal().multiply(firstWidth / 2);
            pointsLeft.push(lastPointData.point.subtract(firstNormal));
            pointsRight.push(lastPointData.point.add(firstNormal));
        }
        
        pointsLeft.push(currentPoint.subtract(normal));
        pointsRight.push(currentPoint.add(normal));
        
        // Build the path segments
        currentPathOutline.segments = []; // Clear and rebuild
        pointsLeft.forEach(p => currentPathOutline.add(p.clone())); // Add left side
        pointsRight.slice().reverse().forEach(p => currentPathOutline.add(p.clone())); // Add right side in reverse
        currentPathOutline.closed = true;

        // Optional: adaptive smoothing during drawing (can be performance heavy)
        // currentPathOutline.smooth({ type: 'catmull-rom', factor: SMOOTHING_FACTOR });

        lastPointData = { point: currentPoint, pressure: pressure };
    }

    tool.onPointerUp = function(event) {
        if (!lastPointData) return;

        if (lastPointData.isDot) {
            // The dot was already created and is 'currentPathOutline' effectively
            // No further action needed other than history.
            // The dotPath (circle) is already on canvas.
            // We will use that dotPath for history.
            if (lastPointData.dotPath) {
                currentPathOutline = lastPointData.dotPath; // The dot is our final path
            } else { // Should not happen if logic is correct
                return;
            }
            
        } else if (currentPathOutline && pointsLeft.length > 1) {
            // Finalize the path
            currentPathOutline.simplify(1); // Simplify slightly to reduce points
            currentPathOutline.smooth({ type: 'continuous' });
        } else if (currentPathOutline) {
            // Path was too short or invalid, remove it
            currentPathOutline.remove();
            currentPathOutline = null;
        }

        if (currentPathOutline && currentPathOutline.segments.length > 0) {
            import('./../history.js').then(historyModule => historyModule.recordState());
        }
        
        // Reset for next stroke
        pointsLeft = [];
        pointsRight = [];
        currentPathOutline = null;
        lastPointData = null;
    }
    
    tool.onPointerCancel = tool.onPointerUp; // Treat cancel same as up

    // Expose methods for app.js to manage
    return {
        activate: () => tool.activate(),
        deactivate: () => {
             if (currentPathOutline) { // If a path is being drawn, finalize it
                if (currentPathOutline.segments.length > 0) {
                    currentPathOutline.simplify(1);
                    currentPathOutline.smooth({ type: 'continuous' });
                    import('./../history.js').then(historyModule => historyModule.recordState());
                } else {
                    currentPathOutline.remove();
                }
            }
            pointsLeft = [];
            pointsRight = [];
            currentPathOutline = null;
            lastPointData = null;
            // tool.remove(); // Paper.js tools are managed globally, no need to remove unless creating new instances always
        },
        updateColor: (newColor) => {
            // Future strokes will use this color from global.fillColor
            // No need to do anything here unless an active path needs immediate update (not typical for pencil)
        }
    };
}