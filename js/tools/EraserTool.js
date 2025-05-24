export function initEraserTool() {
    const tool = new paper.Tool();
    const eraserSize = 20; // Radius of the eraser area
    let itemsToErase = new Set();

    tool.onPointerDown = function(event) {
        if (event.event.pointerType === 'mouse' && event.event.button !== 0) return;
        itemsToErase.clear();
        eraseAtPoint(event.point);
    }

    tool.onPointerDrag = function(event) {
        eraseAtPoint(event.point);
    }

    tool.onPointerUp = function(event) {
        if (itemsToErase.size > 0) {
            itemsToErase.forEach(item => item.remove());
            import('./../history.js').then(historyModule => historyModule.recordState());
        }
        itemsToErase.clear();
    }
    
    tool.onPointerCancel = tool.onPointerUp;

    function eraseAtPoint(point) {
        // Hit test for items within a circular area
        const hitOptions = {
            segments: true, // Check path segments
            stroke: true,   // Check path strokes
            fill: true,     // Check path fills
            tolerance: eraserSize / 2 // Radius of hit area
        };
        const hitResults = paper.project.hitTestAll(point, hitOptions);

        if (hitResults.length > 0) {
            hitResults.forEach(hitResult => {
                // For simplicity, remove the entire path item.
                // More advanced: break paths or boolean subtract.
                if (hitResult.item && !hitResult.item.guide) { // Don't erase guides (like selection bounds)
                    // Instead of immediate removal, mark for removal on pointerUp
                    // This allows dragging the eraser over multiple parts of the same item
                    // without trying to remove it multiple times or causing issues.
                    // However, for immediate feedback, we can remove parts, but it's complex.
                    // Simplest: remove whole item.
                    if (!itemsToErase.has(hitResult.item)) {
                        // Visually indicate it's being erased (optional)
                        // hitResult.item.opacity = 0.5; 
                        itemsToErase.add(hitResult.item);
                    }
                }
            });
        }
    }
    
    return {
        activate: () => tool.activate(),
        deactivate: () => {
            if (itemsToErase.size > 0) { // If deactivated mid-erase
                itemsToErase.forEach(item => item.remove());
                import('./../history.js').then(historyModule => historyModule.recordState());
            }
            itemsToErase.clear();
        }
    };
}