export function setupPaper(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error(`Canvas with id "${canvasId}" not found.`);
        return null;
    }
    paper.setup(canvas);

    // Handle view resizing gracefully
    paper.view.onResize = function(event) {
        // paper.js handles canvas resize attribute automatically
        // You might add custom logic here if needed
        console.log('Paper.js view resized:', event.size);
    };

    // Ensure the view is drawn initially
    paper.view.draw();
    
    return paper; // Return the paper scope
}