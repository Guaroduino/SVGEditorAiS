export function exportSVG() {
    // Ensure all items are deselected for cleaner SVG (Paper.js might add selection visuals to SVG)
    const previouslySelected = paper.project.selectedItems.slice();
    paper.project.deselectAll();

    const svgString = paper.project.exportSVG({ asString: true });

    // Restore selection
    previouslySelected.forEach(item => item.selected = true);
    paper.view.draw(); // Redraw if selection changed view

    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'drawing.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('SVG Exported');
}

export function importSVG(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const svgString = e.target.result;
        // Optional: Clear existing project content before import
        // paper.project.clear(); 
        
        paper.project.importSVG(svgString, {
            onLoad: function(item) {
                // Item is the root of the imported SVG
                // item will be a Group or a CompoundPath usually
                console.log('SVG Imported:', item);
                if (item) {
                    // Center the imported item or place it appropriately
                    item.fitBounds(paper.view.bounds.scale(0.8)); // Scale and center roughly
                    item.position = paper.view.center;
                }
                paper.view.draw();
                import('./history.js').then(historyModule => historyModule.recordState());
            },
            onError: function(message) {
                console.error('SVG Import Error:', message);
                alert('Error importing SVG: ' + message);
            }
        });
    };
    reader.onerror = function(e) {
        console.error('File reading error:', e);
        alert('Error reading SVG file.');
    };
    reader.readAsText(file);
}