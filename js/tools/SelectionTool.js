export function initSelectionTool() {
    const tool = new paper.Tool();
    let selectedItem = null;
    let dragStartPos = null;
    let mode = null; // 'move', 'scale', 'rotate' (optional for now)

    tool.onPointerDown = function(event) {
        if (event.event.pointerType === 'mouse' && event.event.button !== 0) return;

        paper.project.deselectAll();
        selectedItem = null;

        const hitOptions = {
            segments: true, // Allows selecting by clicking near a segment
            stroke: true,
            fill: true,
            tolerance: 5 / paper.view.zoom // Adjust tolerance based on zoom
        };
        const hitResult = paper.project.hitTest(event.point, hitOptions);

        if (hitResult && hitResult.item) {
            selectedItem = hitResult.item;
            selectedItem.selected = true; // Paper.js draws default selection bounds
            dragStartPos = event.point.clone();
            mode = 'move'; // Default to move
            
            // Optional: Check if hit a scale/rotate handle if implemented
            // if (hitResult.type === 'segment' && selectedItem.selectedBounds.contains(hitResult.point)) {
            //    // Logic for specific handle hit for scale/rotate
            // }

        } else {
            // Clicked on empty space, deselect all (already done above)
        }
    }

    tool.onPointerDrag = function(event) {
        if (selectedItem && mode === 'move' && dragStartPos) {
            const delta = event.point.subtract(dragStartPos);
            selectedItem.position = selectedItem.position.add(delta);
            dragStartPos = event.point.clone(); // Update for continuous dragging
        }
        // Add logic for scaling/rotating if handles are implemented
    }

    tool.onPointerUp = function(event) {
        if (selectedItem && mode === 'move') { // Only record state if actual move happened
            // A tiny drag might not be significant enough to record.
            // Could add a threshold check.
            import('./../history.js').then(historyModule => historyModule.recordState());
        }
        dragStartPos = null;
        mode = null;
        // selectedItem remains selected until another action
    }
    
    tool.onPointerCancel = function(event) {
        // Potentially revert move if cancelled, or just finalize
        if (selectedItem && mode === 'move') {
             // For simplicity, finalize current state
            import('./../history.js').then(historyModule => historyModule.recordState());
        }
        dragStartPos = null;
        mode = null;
    };

    return {
        activate: () => {
            tool.activate();
            // Ensure previously selected items are shown as selected if switching back to this tool
            paper.project.getItems({selected: true}).forEach(item => item.selected = true);
        },
        deactivate: () => {
            // Don't deselect here, let other tools or actions handle it.
            // Or, optionally: paper.project.deselectAll();
            dragStartPos = null;
            mode = null;
        },
        updateColor: (newColor) => { // Example: Change color of selected item
            if (selectedItem) {
                if (selectedItem.fillColor) {
                    selectedItem.fillColor = newColor;
                } else if (selectedItem.strokeColor) {
                    selectedItem.strokeColor = newColor;
                }
                paper.view.draw();
                import('./../history.js').then(historyModule => historyModule.recordState());
            }
        }
    };
}