import { setupPaper } from './paper-setup.js';
import { initPencilTool } from './tools/PencilTool.js';
import { initLineTool } from './tools/LineTool.js';
import { initShapeTool } from './tools/ShapeTool.js';
import { initEraserTool } from './tools/EraserTool.js';
import { initSelectionTool } from './tools/SelectionTool.js';
import { initNodeEditTool } from './tools/NodeEditTool.js';
import { initHistory, recordState, undo, redo } from './history.js';
import { exportSVG, importSVG } from './io.js';
import { initCanvasInteraction } from './canvasInteraction.js';

// Ensure Paper.js is loaded globally
if (!window.paper) {
    console.error("Paper.js not loaded. Make sure it's included before this script.");
} else {
    // Initialize Paper.js
    const paperScope = setupPaper('paperCanvas');
    if (paperScope) {
        console.log('Paper.js initialized on #paperCanvas');

        // Global state
        window.currentTool = null; // To manage active tool
        window.strokeColor = new paper.Color('black');
        window.fillColor = new paper.Color('black'); // Default for pencil/shapes
        window.strokeWidth = 2; // For simple line/shape strokes

        // --- Tool Activation ---
        const toolButtons = {
            pencil: document.getElementById('pencilToolBtn'),
            line: document.getElementById('lineToolBtn'),
            rect: document.getElementById('rectToolBtn'),
            ellipse: document.getElementById('ellipseToolBtn'),
            eraser: document.getElementById('eraserToolBtn'),
            select: document.getElementById('selectToolBtn'),
            nodeEdit: document.getElementById('nodeEditToolBtn'),
        };

        let activeToolInstance = null;

        function setActiveTool(toolName, toolInitFunction, options = {}) {
            if (activeToolInstance && activeToolInstance.deactivate) {
                activeToolInstance.deactivate();
            }
            if (window.currentTool) {
                toolButtons[window.currentTool]?.classList.remove('active');
                if (window.currentTool === 'select' || window.currentTool === 'nodeEdit') {
                     paper.project.deselectAll(); // Deselect items when switching from select/nodeEdit
                }
            }
            
            window.currentTool = toolName;
            toolButtons[toolName]?.classList.add('active');
            
            activeToolInstance = toolInitFunction(options); // Initialize and get tool instance
            if (activeToolInstance && activeToolInstance.activate) {
                activeToolInstance.activate();
            }
            console.log(`Tool changed to: ${toolName}`);
        }

        toolButtons.pencil.addEventListener('click', () => setActiveTool('pencil', initPencilTool));
        toolButtons.line.addEventListener('click', () => setActiveTool('line', initLineTool));
        toolButtons.rect.addEventListener('click', () => setActiveTool('rect', initShapeTool, { shapeType: 'rectangle' }));
        toolButtons.ellipse.addEventListener('click', () => setActiveTool('ellipse', initShapeTool, { shapeType: 'ellipse' }));
        toolButtons.eraser.addEventListener('click', () => setActiveTool('eraser', initEraserTool));
        toolButtons.select.addEventListener('click', () => setActiveTool('select', initSelectionTool));
        toolButtons.nodeEdit.addEventListener('click', () => setActiveTool('nodeEdit', initNodeEditTool));
        
        // --- Color Picker ---
        const colorPicker = document.getElementById('colorPicker');
        colorPicker.addEventListener('input', (event) => {
            const newColor = new paper.Color(event.target.value);
            window.strokeColor = newColor;
            window.fillColor = newColor; // Pencil uses fill, shapes might use fill or stroke
            if (activeToolInstance && activeToolInstance.updateColor) {
                activeToolInstance.updateColor(newColor);
            }
        });

        // --- History ---
        initHistory();
        document.getElementById('undoBtn').addEventListener('click', undo);
        document.getElementById('redoBtn').addEventListener('click', redo);
        
        // --- IO ---
        document.getElementById('exportSvgBtn').addEventListener('click', exportSVG);
        const importInput = document.getElementById('importSvgInput');
        document.getElementById('importSvgBtn').addEventListener('click', () => importInput.click());
        importInput.addEventListener('change', (event) => {
            if (event.target.files && event.target.files[0]) {
                importSVG(event.target.files[0]);
                event.target.value = null; // Reset input for same file import
            }
        });

        // --- Clear Canvas ---
        document.getElementById('clearCanvasBtn').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear the canvas? This cannot be undone through the history.')) {
                paper.project.clear();
                paper.view.draw();
                initHistory(); // Reset history
            }
        });

        // --- Canvas Interactions (Pan/Zoom) ---
        initCanvasInteraction(paper.view);

        // Set initial tool (e.g., Pencil)
        setActiveTool('pencil', initPencilTool);
        recordState(); // Record initial empty state
    }
}

// In js/app.js, at the end or in a suitable place:
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(error => {
                console.log('ServiceWorker registration failed: ', error);
            });
    });
}