export function initNodeEditTool() {
    const tool = new paper.Tool();
    let selectedItem = null; // The path item being edited
    let selectedSegment = null; // The specific segment/handle being dragged
    let mode = null; // 'segment', 'handleIn', 'handleOut'

    tool.onPointerDown = function(event) {
        if (event.event.pointerType === 'mouse' && event.event.button !== 0) return;

        selectedSegment = null;
        mode = null;

        const hitOptions = {
            segments: true,
            stroke: false, // Usually don't want to select stroke for node editing
            handles: true, // Crucial for hitting Bezier handles
            fill: false,   // Usually don't want to select fill for node editing
            tolerance: 8 / paper.view.zoom
        };
        const hitResult = paper.project.hitTest(event.point, hitOptions);

        if (selectedItem && !hitResult) { // Clicked away from current item's handles
            selectedItem.fullySelected = false;
            selectedItem = null;
        }

        if (hitResult) {
            if (hitResult.item instanceof paper.Path) {
                if (selectedItem !== hitResult.item) {
                    if (selectedItem) selectedItem.fullySelected = false; // Deselect previous
                    selectedItem = hitResult.item;
                    selectedItem.fullySelected = true; // Show segments and handles
                }

                if (hitResult.type === 'segment') {
                    selectedSegment = hitResult.segment;
                    mode = 'segment';
                } else if (hitResult.type === 'handle-in') {
                    selectedSegment = hitResult.segment;
                    mode = 'handleIn';
                } else if (hitResult.type === 'handle-out') {
                    selectedSegment = hitResult.segment;
                    mode = 'handleOut';
                }
            }
        } else {
            // Clicked on empty space, deselect if an item was selected
            if (selectedItem) {
                selectedItem.fullySelected = false;
                selectedItem = null;
            }
        }
    }

    tool.onPointerDrag = function(event) {
        if (selectedSegment && selectedItem) {
            if (mode === 'segment') {
                selectedSegment.point = selectedSegment.point.add(event.delta);
            } else if (mode === 'handleIn') {
                selectedSegment.handleIn = selectedSegment.handleIn.add(event.delta);
                // Optional: Keep handles symmetric (Shift key or an option)
                // selectedSegment.handleOut = selectedSegment.handleIn.multiply(-1);
            } else if (mode === 'handleOut') {
                selectedSegment.handleOut = selectedSegment.handleOut.add(event.delta);
                // Optional: Keep handles symmetric
                // selectedSegment.handleIn = selectedSegment.handleOut.multiply(-1);
            }
            // selectedItem.smooth(); // Optional: re-smooth if needed, or let user control fully
        }
    }

    tool.onPointerUp = function(event) {
        if (selectedItem && (mode === 'segment' || mode === 'handleIn' || mode === 'handleOut')) {
            import('./../history.js').then(historyModule => historyModule.recordState());
        }
        // Don't reset selectedSegment or mode here, allows for multiple drags on same handle/segment
        // Resetting is handled by next pointerDown
    }

    tool.onPointerCancel = tool.onPointerUp;

    return {
        activate: () => {
            tool.activate();
            // If an item was previously fullySelected, re-apply it.
            // This usually happens if user selected an item with SelectionTool then switched.
            const currentSelection = paper.project.getItems({ selected: true });
            if (currentSelection.length === 1 && currentSelection[0] instanceof paper.Path) {
                if (selectedItem && selectedItem !== currentSelection[0]) {
                     selectedItem.fullySelected = false; // deselect old one if any
                }
                selectedItem = currentSelection[0];
                selectedItem.fullySelected = true;
            } else if (selectedItem) { // Restore state if switching back to this tool
                selectedItem.fullySelected = true;
            }
        },
        deactivate: () => {
            if (selectedItem) {
                selectedItem.fullySelected = false; // Hide handles when tool is no longer active
            }
            // selectedItem = null; // Keep selectedItem to restore if tool is reactivated
            selectedSegment = null;
            mode = null;
        }
    };
}