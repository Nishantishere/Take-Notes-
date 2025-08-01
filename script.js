
        class WhiteboardApp {
            constructor() {
                this.canvas = document.getElementById('canvas');
                this.ctx = this.canvas.getContext('2d');
                this.canvasContainer = document.getElementById('canvasContainer');
                this.saveBtn = document.getElementById('saveBtn');
                
                // Enhanced canvas state
                this.zoom = 1;
                this.panX = 0;
                this.panY = 0;
                this.isPanning = false;
                this.isSpacePanning = false;
                this.spacePressed = false;
                
                // Enhanced drawing state
                this.isDrawing = false;
                this.isSelecting = false;
                this.isDragging = false;
                this.startX = 0;
                this.startY = 0;
                this.currentX = 0;
                this.currentY = 0;
                this.lastX = 0;
                this.lastY = 0;
                
                // Smooth drawing
                this.smoothing = true;
                this.smoothingFactor = 0.3;
                
                // Tools and settings
                this.currentTool = 'pen';
                this.strokeColor = '#000000';
                this.backgroundColor = '#ffffff';
                this.strokeWidth = 2;
                this.isDarkTheme = false;
                this.selectedFont = 'Arial';
                this.fontSize = 16;
                
                // Data storage
                this.shapes = [];
                this.undoStack = [];
                this.redoStack = [];
                this.currentPath = [];
                this.hasUnsavedChanges = false;
                
                // Selection system
                this.selectedShapes = [];
                this.selectionBox = null;
                this.isResizing = false;
                this.resizeHandle = null;
                
                // Text input
                this.activeTextInput = null;
                
                // Enhanced pointer tracking
                this.pointerCache = [];
                this.lastPointerTime = 0;
                
                this.init();
            }
            
            init() {
                this.resizeCanvas();
                this.setupEventListeners();
                this.setupToolbar();
                this.updateCanvasBackground();
                this.saveState();
                this.redraw();
                
                // Enhanced canvas settings for smooth rendering
                this.ctx.lineCap = 'round';
                this.ctx.lineJoin = 'round';
                this.ctx.imageSmoothingEnabled = true;
                this.ctx.imageSmoothingQuality = 'high';
            }
            
            resizeCanvas() {
                const rect = this.canvasContainer.getBoundingClientRect();
                const dpr = window.devicePixelRatio || 1;
                
                this.canvas.width = rect.width * dpr;
                this.canvas.height = rect.height * dpr;
                this.canvas.style.width = rect.width + 'px';
                this.canvas.style.height = rect.height + 'px';
                
                this.ctx.scale(dpr, dpr);
                this.redraw();
            }
            
            setupEventListeners() {
                // Resize
                window.addEventListener('resize', () => this.resizeCanvas());
                
                // Enhanced pointer events with better tracking
                this.canvas.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
                this.canvas.addEventListener('pointermove', (e) => this.handlePointerMove(e));
                this.canvas.addEventListener('pointerup', (e) => this.handlePointerUp(e));
                this.canvas.addEventListener('pointerout', (e) => this.handlePointerUp(e));
                this.canvas.addEventListener('pointercancel', (e) => this.handlePointerUp(e));
                
                // Prevent default touch behaviors
                this.canvas.addEventListener('touchstart', (e) => e.preventDefault());
                this.canvas.addEventListener('touchmove', (e) => e.preventDefault());
                this.canvas.addEventListener('touchend', (e) => e.preventDefault());
                
                // Enhanced wheel handling
                this.canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
                
                // Double click for text
                this.canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
                
                // Enhanced keyboard shortcuts
                document.addEventListener('keydown', (e) => this.handleKeyDown(e));
                document.addEventListener('keyup', (e) => this.handleKeyUp(e));
                
                // Zoom and save controls
                document.getElementById('zoomInBtn').addEventListener('click', () => this.zoomIn());
                document.getElementById('zoomOutBtn').addEventListener('click', () => this.zoomOut());
                this.saveBtn.addEventListener('click', () => this.exportImage());
                
                // Prevent context menu and text selection during drawing
                this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
                this.canvas.addEventListener('selectstart', (e) => e.preventDefault());
                
                // Enhanced window focus handling
                window.addEventListener('blur', () => {
                    this.spacePressed = false;
                    this.isSpacePanning = false;
                    this.isPanning = false;
                    this.isDrawing = false;
                });
                
                // Global pointer tracking to handle cursor leaving canvas
                document.addEventListener('pointermove', (e) => {
                    if (this.isDrawing || this.isPanning || this.isSpacePanning) {
                        this.handleGlobalPointerMove(e);
                    }
                });
                
                document.addEventListener('pointerup', (e) => {
                    if (this.isDrawing || this.isPanning || this.isSpacePanning) {
                        this.handlePointerUp(e);
                    }
                });
            }
            
            handleGlobalPointerMove(e) {
                // Continue drawing/panning even when cursor leaves canvas
                const rect = this.canvas.getBoundingClientRect();
                const isOverCanvas = (
                    e.clientX >= rect.left && 
                    e.clientX <= rect.right && 
                    e.clientY >= rect.top && 
                    e.clientY <= rect.bottom
                );
                
                if (!isOverCanvas) {
                    // Clamp coordinates to canvas bounds
                    const clampedX = Math.max(rect.left, Math.min(rect.right, e.clientX));
                    const clampedY = Math.max(rect.top, Math.min(rect.bottom, e.clientY));
                    
                    const clampedEvent = {
                        ...e,
                        clientX: clampedX,
                        clientY: clampedY
                    };
                    
                    this.handlePointerMove(clampedEvent);
                }
            }
            
            setupToolbar() {
                // Tool buttons
                document.querySelectorAll('.tool-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const tool = e.target.dataset.tool;
                        this.setTool(tool);
                    });
                });
                
                // Theme buttons
                document.querySelectorAll('.theme-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const theme = e.target.dataset.theme;
                        this.setTheme(theme);
                    });
                });
                
                // Color pickers
                document.getElementById('colorPicker').addEventListener('change', (e) => {
                    this.strokeColor = e.target.value;
                    this.updateSelectedShapesColor();
                });
                
                document.getElementById('bgPicker').addEventListener('change', (e) => {
                    this.backgroundColor = e.target.value;
                    this.updateCanvasBackground();
                    this.updateToolbarTheme();
                });
                
                // Stroke width slider
                document.getElementById('strokeWidth').addEventListener('input', (e) => {
                    this.strokeWidth = parseInt(e.target.value);
                    document.getElementById('widthValue').textContent = this.strokeWidth;
                    this.updateSelectedShapesWidth();
                });
                
                // Font controls
                document.getElementById('fontSelector').addEventListener('change', (e) => {
                    this.selectedFont = e.target.value;
                });
                
                document.getElementById('fontSizeInput').addEventListener('change', (e) => {
                    this.fontSize = parseInt(e.target.value);
                });
            }
            
            updateToolbarTheme() {
                const toolbar = document.querySelector('.toolbar');
                const brightness = this.getBrightness(this.backgroundColor);
                
                if (brightness < 128) {
                    toolbar.style.background = 'rgba(255, 255, 255, 0.95)';
                    toolbar.style.color = '#000';
                } else {
                    toolbar.style.background = 'rgba(30, 30, 50, 0.95)';
                    toolbar.style.color = '#fff';
                }
            }
            
            getBrightness(color) {
                const hex = color.replace('#', '');
                const r = parseInt(hex.substr(0, 2), 16);
                const g = parseInt(hex.substr(2, 2), 16);
                const b = parseInt(hex.substr(4, 2), 16);
                return (r * 299 + g * 587 + b * 114) / 1000;
            }
            
            setTool(tool) {
                this.currentTool = tool;
                this.clearSelection();
                
                document.querySelectorAll('.tool-btn').forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.dataset.tool === tool) {
                        btn.classList.add('active');
                    }
                });
                
                // Show/hide text controls
                const textControls = document.getElementById('textControls');
                if (textControls) {
                    textControls.style.display = tool === 'text' ? 'flex' : 'none';
                }
                
                // Update cursor
                this.canvas.style.cursor = this.getCursorForTool();
                
                // Clear text input if switching tools
                if (tool !== 'text' && this.activeTextInput) {
                    this.finalizeTextInput();
                }
                
                this.redraw();
            }
            
            getCursorForTool() {
                if (this.spacePressed) return 'grab';
                
                const cursors = {
                    pen: 'crosshair',
                    eraser: 'crosshair',
                    select: 'default',
                    rectangle: 'crosshair',
                    circle: 'crosshair',
                    line: 'crosshair',
                    arrow: 'crosshair',
                    text: 'text'
                };
                return cursors[this.currentTool] || 'default';
            }
            
            setTheme(theme) {
                this.isDarkTheme = theme === 'dark';
                document.body.className = this.isDarkTheme ? 'dark-theme' : '';
                
                document.querySelectorAll('.theme-btn').forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.dataset.theme === theme) {
                        btn.classList.add('active');
                    }
                });
                
                this.updateCanvasBackground();
            }
            
            updateCanvasBackground() {
                this.canvasContainer.style.backgroundColor = this.backgroundColor;
            }
            
            showSaveButton() {
                this.saveBtn.classList.add('visible');
                this.hasUnsavedChanges = true;
            }
            
            hideSaveButton() {
                this.saveBtn.classList.remove('visible');
                this.hasUnsavedChanges = false;
            }
            
            handleKeyDown(e) {
                // Space for panning
                if (e.code === 'Space' && !this.spacePressed && !this.activeTextInput) {
                    e.preventDefault();
                    this.spacePressed = true;
                    this.canvas.style.cursor = 'grab';
                    return;
                }
                
                if (e.ctrlKey || e.metaKey) {
                    switch (e.key.toLowerCase()) {
                        case 'z':
                            e.preventDefault();
                            if (e.shiftKey) {
                                this.redo();
                            } else {
                                this.undo();
                            }
                            break;
                        case 'y':
                            e.preventDefault();
                            this.redo();
                            break;
                        case 's':
                            e.preventDefault();
                            this.exportImage();
                            break;
                        case 'a':
                            e.preventDefault();
                            this.selectAll();
                            break;
                        case 'd':
                            e.preventDefault();
                            this.duplicateSelected();
                            break;
                    }
                } else {
                    // Delete selected shapes
                    if ((e.key === 'Delete' || e.key === 'Backspace') && !this.activeTextInput) {
                        e.preventDefault();
                        this.deleteSelected();
                    }
                    
                    // Tool shortcuts (only if not typing)
                    if (!this.activeTextInput) {
                        const toolMap = {
                            'p': 'pen',
                            'e': 'eraser',
                            'v': 'select',
                            'r': 'rectangle',
                            'c': 'circle',
                            'l': 'line',
                            'a': 'arrow',
                            't': 'text'
                        };
                        
                        if (toolMap[e.key.toLowerCase()]) {
                            this.setTool(toolMap[e.key.toLowerCase()]);
                        }
                    }
                }
            }
            
            handleKeyUp(e) {
                if (e.code === 'Space') {
                    this.spacePressed = false;
                    this.isSpacePanning = false;
                    this.canvas.style.cursor = this.getCursorForTool();
                }
            }
            
            handlePointerDown(e) {
                e.preventDefault();
                this.canvas.setPointerCapture(e.pointerId);
                
                // Add drawing mode class to prevent text selection
                document.body.classList.add('drawing-mode');
                
                // Space panning
                if (this.spacePressed) {
                    this.isSpacePanning = true;
                    this.lastPanX = e.clientX;
                    this.lastPanY = e.clientY;
                    this.canvas.style.cursor = 'grabbing';
                    return;
                }
                
                // Middle mouse or Ctrl+click for panning
                if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
                    this.isPanning = true;
                    this.lastPanX = e.clientX;
                    this.lastPanY = e.clientY;
                    this.canvas.style.cursor = 'grabbing';
                    return;
                }
                
                const pos = this.getCanvasCoords(e.clientX, e.clientY);
                
                // Check for resize handles first
                if (this.currentTool === 'select' && this.selectedShapes.length > 0) {
                    const handle = this.getResizeHandle(pos.x, pos.y);
                    if (handle) {
                        this.isResizing = true;
                        this.resizeHandle = handle;
                        this.startX = pos.x;
                        this.startY = pos.y;
                        this.originalBounds = this.getSelectionBounds();
                        return;
                    }
                }
                
                this.isDrawing = true;
                this.startX = pos.x;
                this.startY = pos.y;
                this.currentX = pos.x;
                this.currentY = pos.y;
                this.lastX = pos.x;
                this.lastY = pos.y;
                
                if (this.currentTool === 'pen') {
                    this.currentPath = [{x: pos.x, y: pos.y, pressure: e.pressure || 0.5}];
                } else if (this.currentTool === 'eraser') {
                    this.eraseAt(pos.x, pos.y);
                } else if (this.currentTool === 'select') {
                    // Check if clicking on existing shape
                    const clicked = this.getShapeAt(pos.x, pos.y);
                    if (clicked && !e.shiftKey) {
                        if (!this.selectedShapes.includes(clicked)) {
                            this.selectedShapes = [clicked];
                        }
                        this.isDragging = true;
                        this.dragStartX = pos.x;
                        this.dragStartY = pos.y;
                    } else if (clicked && e.shiftKey) {
                        // Add to selection
                        if (this.selectedShapes.includes(clicked)) {
                            this.selectedShapes = this.selectedShapes.filter(s => s !== clicked);
                        } else {
                            this.selectedShapes.push(clicked);
                        }
                    } else {
                        // Start selection box
                        this.clearSelection();
                        this.startSelection(pos.x, pos.y);
                        this.isSelecting = true;
                    }
                }
                
                this.lastPointerTime = performance.now();
            }
            
            handlePointerMove(e) {
                e.preventDefault();
                
                const currentTime = performance.now();
                const deltaTime = currentTime - this.lastPointerTime;
                
                // Space panning
                if (this.isSpacePanning) {
                    const deltaX = e.clientX - this.lastPanX;
                    const deltaY = e.clientY - this.lastPanY;
                    this.panX += deltaX / this.zoom;
                    this.panY += deltaY / this.zoom;
                    this.lastPanX = e.clientX;
                    this.lastPanY = e.clientY;
                    this.redraw();
                    return;
                }
                
                // Regular panning
                if (this.isPanning) {
                    const deltaX = e.clientX - this.lastPanX;
                    const deltaY = e.clientY - this.lastPanY;
                    this.panX += deltaX / this.zoom;
                    this.panY += deltaY / this.zoom;
                    this.lastPanX = e.clientX;
                    this.lastPanY = e.clientY;
                    this.redraw();
                    return;
                }
                
                const pos = this.getCanvasCoords(e.clientX, e.clientY);
                
                // Handle resize
                if (this.isResizing && this.resizeHandle) {
                    this.handleResize(pos.x, pos.y);
                    return;
                }
                
                // Update cursor for resize handles
                if (this.currentTool === 'select' && this.selectedShapes.length > 0 && !this.isDrawing) {
                    const handle = this.getResizeHandle(pos.x, pos.y);
                    if (handle) {
                        this.canvas.style.cursor = this.getResizeCursor(handle);
                    } else {
                        this.canvas.style.cursor = 'default';
                    }
                }
                
                if (!this.isDrawing) return;
                
                this.currentX = pos.x;
                this.currentY = pos.y;
                
                if (this.currentTool === 'select') {
                    if (this.isDragging) {
                        // Drag selected shapes
                        const deltaX = pos.x - this.dragStartX;
                        const deltaY = pos.y - this.dragStartY;
                        this.moveSelectedShapes(deltaX, deltaY);
                        this.dragStartX = pos.x;
                        this.dragStartY = pos.y;
                    } else if (this.isSelecting) {
                        this.updateSelection();
                    }
                } else if (this.currentTool === 'pen') {
                    // Enhanced smooth drawing
                    if (deltaTime > 16) { // Throttle to ~60fps
                        const distance = Math.sqrt(
                            Math.pow(pos.x - this.lastX, 2) + Math.pow(pos.y - this.lastY, 2)
                        );
                        
                        if (distance > 1) {
                            // Add interpolated points for smoother curves
                            if (this.smoothing && distance > 3) {
                                const steps = Math.ceil(distance / 2);
                                for (let i = 1; i <= steps; i++) {
                                    const t = i / steps;
                                    const smoothX = this.lastX + (pos.x - this.lastX) * t;
                                    const smoothY = this.lastY + (pos.y - this.lastY) * t;
                                    this.currentPath.push({
                                        x: smoothX, 
                                        y: smoothY, 
                                        pressure: e.pressure || 0.5
                                    });
                                }
                            } else {
                                this.currentPath.push({
                                    x: pos.x, 
                                    y: pos.y, 
                                    pressure: e.pressure || 0.5
                                });
                            }
                            
                            this.lastX = pos.x;
                            this.lastY = pos.y;
                            this.redrawWithPreview();
                        }
                        this.lastPointerTime = currentTime;
                    }
                } else if (this.currentTool === 'eraser') {
                    this.eraseAt(pos.x, pos.y);
                } else if (['rectangle', 'circle', 'line', 'arrow'].includes(this.currentTool)) {
                    this.redrawWithPreview();
                }
            }
            
            handlePointerUp(e) {
                e.preventDefault();
                
                // Remove drawing mode class
                document.body.classList.remove('drawing-mode');
                
                if (this.canvas.hasPointerCapture && e.pointerId) {
                    this.canvas.releasePointerCapture(e.pointerId);
                }
                
                if (this.isSpacePanning) {
                    this.isSpacePanning = false;
                    this.canvas.style.cursor = this.spacePressed ? 'grab' : this.getCursorForTool();
                    return;
                }
                
                if (this.isPanning) {
                    this.isPanning = false;
                    this.canvas.style.cursor = this.getCursorForTool();
                    return;
                }
                
                if (this.isResizing) {
                    this.isResizing = false;
                    this.resizeHandle = null;
                    this.saveState();
                    this.showSaveButton();
                    this.redraw();
                    return;
                }
                
                if (!this.isDrawing) return;
                
                this.isDrawing = false;
                this.isDragging = false;
                this.isSelecting = false;
                
                const pos = this.getCanvasCoords(e.clientX, e.clientY);
                
                switch (this.currentTool) {
                    case 'pen':
                        if (this.currentPath.length > 1) {
                            this.shapes.push({
                                type: 'path',
                                points: [...this.currentPath],
                                color: this.strokeColor,
                                width: this.strokeWidth,
                                id: this.generateId(),
                                smooth: this.smoothing
                            });
                            this.saveState();
                            this.showSaveButton();
                        }
                        break;
                        
                    case 'rectangle':
                        if (Math.abs(pos.x - this.startX) > 5 && Math.abs(pos.y - this.startY) > 5) {
                            this.shapes.push({
                                type: 'rectangle',
                                x: Math.min(this.startX, pos.x),
                                y: Math.min(this.startY, pos.y),
                                width: Math.abs(pos.x - this.startX),
                                height: Math.abs(pos.y - this.startY),
                                color: this.strokeColor,
                                strokeWidth: this.strokeWidth,
                                filled: false,
                                id: this.generateId()
                            });
                            this.saveState();
                            this.showSaveButton();
                        }
                        break;
                        
                    case 'circle':
                        const radius = Math.sqrt(Math.pow(pos.x - this.startX, 2) + Math.pow(pos.y - this.startY, 2));
                        if (radius > 5) {
                            this.shapes.push({
                                type: 'circle',
                                x: this.startX,
                                y: this.startY,
                                radius: radius,
                                color: this.strokeColor,
                                strokeWidth: this.strokeWidth,
                                filled: false,
                                id: this.generateId()
                            });
                            this.saveState();
                            this.showSaveButton();
                        }
                        break;
                        
                    case 'line':
                        if (Math.abs(pos.x - this.startX) > 5 || Math.abs(pos.y - this.startY) > 5) {
                            this.shapes.push({
                                type: 'line',
                                startX: this.startX,
                                startY: this.startY,
                                endX: pos.x,
                                endY: pos.y,
                                color: this.strokeColor,
                                strokeWidth: this.strokeWidth,
                                id: this.generateId()
                            });
                            this.saveState();
                            this.showSaveButton();
                        }
                        break;
                        
                    case 'arrow':
                        if (Math.abs(pos.x - this.startX) > 5 || Math.abs(pos.y - this.startY) > 5) {
                            this.shapes.push({
                                type: 'arrow',
                                startX: this.startX,
                                startY: this.startY,
                                endX: pos.x,
                                endY: pos.y,
                                color: this.strokeColor,
                                strokeWidth: this.strokeWidth,
                                id: this.generateId()
                            });
                            this.saveState();
                            this.showSaveButton();
                        }
                        break;
                        
                    case 'select':
                        if (this.selectionBox) {
                            this.finishSelection();
                        }
                        break;
                }
                
                this.redraw();
            }
            
            handleDoubleClick(e) {
                if (this.currentTool === 'text' || this.currentTool === 'select') {
                    const pos = this.getCanvasCoords(e.clientX, e.clientY);
                    this.createTextInput(pos.x, pos.y);
                }
            }
            
            handleWheel(e) {
                e.preventDefault();
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                
                const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
                const newZoom = Math.min(Math.max(this.zoom * zoomFactor, 0.1), 5);
                
                if (newZoom !== this.zoom) {
                    const worldCoords = this.getCanvasCoords(e.clientX, e.clientY);
                    
                    this.zoom = newZoom;
                    
                    const newWorldCoords = this.getCanvasCoords(e.clientX, e.clientY);
                    this.panX += (worldCoords.x - newWorldCoords.x);
                    this.panY += (worldCoords.y - newWorldCoords.y);
                    
                    this.updateZoomInfo();
                    this.redraw();
                }
            }
            
            getCanvasCoords(clientX, clientY) {
                const rect = this.canvas.getBoundingClientRect();
                const x = (clientX - rect.left) / this.zoom - this.panX;
                const y = (clientY - rect.top) / this.zoom - this.panY;
                return { x, y };
            }
            
            // Selection system
            startSelection(x, y) {
                this.selectionBox = { 
                    startX: x, 
                    startY: y, 
                    endX: x, 
                    endY: y 
                };
            }
            
            updateSelection() {
                if (this.selectionBox) {
                    this.selectionBox.endX = this.currentX;
                    this.selectionBox.endY = this.currentY;
                    this.redraw();
                }
            }
            
            finishSelection() {
                if (!this.selectionBox) return;
                
                const box = this.selectionBox;
                const minX = Math.min(box.startX, box.endX);
                const maxX = Math.max(box.startX, box.endX);
                const minY = Math.min(box.startY, box.endY);
                const maxY = Math.max(box.startY, box.endY);
                
                this.selectedShapes = this.shapes.filter(shape => 
                    this.isShapeInBounds(shape, minX, minY, maxX, maxY)
                );
                
                this.selectionBox = null;
            }
            
            isShapeInBounds(shape, minX, minY, maxX, maxY) {
                switch (shape.type) {
                    case 'path':
                        return shape.points.some(point => 
                            point.x >= minX && point.x <= maxX && 
                            point.y >= minY && point.y <= maxY
                        );
                    case 'rectangle':
                        return !(shape.x > maxX || shape.x + shape.width < minX || 
                                shape.y > maxY || shape.y + shape.height < minY);
                    case 'circle':
                        return shape.x >= minX - shape.radius && shape.x <= maxX + shape.radius &&
                               shape.y >= minY - shape.radius && shape.y <= maxY + shape.radius;
                    case 'line':
                    case 'arrow':
                        return (shape.startX >= minX && shape.startX <= maxX && 
                               shape.startY >= minY && shape.startY <= maxY) ||
                               (shape.endX >= minX && shape.endX <= maxX && 
                               shape.endY >= minY && shape.endY <= maxY);
                    case 'text':
                        return shape.x >= minX && shape.x <= maxX && 
                               shape.y >= minY && shape.y <= maxY;
                    default:
                        return false;
                }
            }
            
            getShapeAt(x, y) {
                // Check in reverse order (top to bottom)
                for (let i = this.shapes.length - 1; i >= 0; i--) {
                    if (this.isPointInShape(this.shapes[i], x, y)) {
                        return this.shapes[i];
                    }
                }
                return null;
            }
            
            isPointInShape(shape, x, y) {
                const tolerance = 10 / this.zoom;
                
                switch (shape.type) {
                    case 'path':
                        return shape.points.some(point => 
                            Math.abs(point.x - x) < tolerance && Math.abs(point.y - y) < tolerance
                        );
                    case 'rectangle':
                        return x >= shape.x - tolerance && x <= shape.x + shape.width + tolerance &&
                               y >= shape.y - tolerance && y <= shape.y + shape.height + tolerance;
                    case 'circle':
                        const dist = Math.sqrt(Math.pow(shape.x - x, 2) + Math.pow(shape.y - y, 2));
                        return Math.abs(dist - shape.radius) <= tolerance;
                    case 'line':
                    case 'arrow':
                        return this.distanceToLine(x, y, shape.startX, shape.startY, shape.endX, shape.endY) <= tolerance;
                    case 'text':
                        const textWidth = this.ctx.measureText(shape.text).width;
                        return x >= shape.x - tolerance && x <= shape.x + textWidth + tolerance && 
                               y >= shape.y - shape.fontSize && y <= shape.y + tolerance;
                    default:
                        return false;
                }
            }
            
            distanceToLine(x, y, x1, y1, x2, y2) {
                const A = x - x1;
                const B = y - y1;
                const C = x2 - x1;
                const D = y2 - y1;
                
                const dot = A * C + B * D;
                const lenSq = C * C + D * D;
                let param = -1;
                
                if (lenSq !== 0) {
                    param = dot / lenSq;
                }
                
                let xx, yy;
                
                if (param < 0) {
                    xx = x1;
                    yy = y1;
                } else if (param > 1) {
                    xx = x2;
                    yy = y2;
                } else {
                    xx = x1 + param * C;
                    yy = y1 + param * D;
                }
                
                const dx = x - xx;
                const dy = y - yy;
                return Math.sqrt(dx * dx + dy * dy);
            }
            
            clearSelection() {
                this.selectedShapes = [];
                this.selectionBox = null;
            }
            
            moveSelectedShapes(deltaX, deltaY) {
                this.selectedShapes.forEach(shape => {
                    this.moveShape(shape, deltaX, deltaY);
                });
                this.redraw();
            }
            
            moveShape(shape, deltaX, deltaY) {
                switch (shape.type) {
                    case 'path':
                        shape.points.forEach(point => {
                            point.x += deltaX;
                            point.y += deltaY;
                        });
                        break;
                    case 'rectangle':
                    case 'circle':
                    case 'text':
                        shape.x += deltaX;
                        shape.y += deltaY;
                        break;
                    case 'line':
                    case 'arrow':
                        shape.startX += deltaX;
                        shape.startY += deltaY;
                        shape.endX += deltaX;
                        shape.endY += deltaY;
                        break;
                }
            }
            
            // Resize functionality
            getResizeHandle(x, y) {
                if (this.selectedShapes.length !== 1) return null;
                
                const bounds = this.getSelectionBounds();
                const handleSize = 8 / this.zoom;
                
                const handles = [
                    { name: 'nw', x: bounds.minX, y: bounds.minY },
                    { name: 'ne', x: bounds.maxX, y: bounds.minY },
                    { name: 'sw', x: bounds.minX, y: bounds.maxY },
                    { name: 'se', x: bounds.maxX, y: bounds.maxY },
                    { name: 'n', x: (bounds.minX + bounds.maxX) / 2, y: bounds.minY },
                    { name: 's', x: (bounds.minX + bounds.maxX) / 2, y: bounds.maxY },
                    { name: 'w', x: bounds.minX, y: (bounds.minY + bounds.maxY) / 2 },
                    { name: 'e', x: bounds.maxX, y: (bounds.minY + bounds.maxY) / 2 }
                ];
                
                return handles.find(handle => 
                    Math.abs(handle.x - x) <= handleSize && Math.abs(handle.y - y) <= handleSize
                );
            }
            
            getSelectionBounds() {
                if (this.selectedShapes.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
                
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                
                this.selectedShapes.forEach(shape => {
                    const bounds = this.getShapeBounds(shape);
                    minX = Math.min(minX, bounds.minX);
                    minY = Math.min(minY, bounds.minY);
                    maxX = Math.max(maxX, bounds.maxX);
                    maxY = Math.max(maxY, bounds.maxY);
                });
                
                return { minX, minY, maxX, maxY };
            }
            
            getShapeBounds(shape) {
                switch (shape.type) {
                    case 'rectangle':
                        return {
                            minX: shape.x,
                            minY: shape.y,
                            maxX: shape.x + shape.width,
                            maxY: shape.y + shape.height
                        };
                    case 'circle':
                        return {
                            minX: shape.x - shape.radius,
                            minY: shape.y - shape.radius,
                            maxX: shape.x + shape.radius,
                            maxY: shape.y + shape.radius
                        };
                    case 'line':
                    case 'arrow':
                        return {
                            minX: Math.min(shape.startX, shape.endX),
                            minY: Math.min(shape.startY, shape.endY),
                            maxX: Math.max(shape.startX, shape.endX),
                            maxY: Math.max(shape.startY, shape.endY)
                        };
                    case 'text':
                        const textWidth = shape.text ? shape.text.length * shape.fontSize * 0.6 : 100;
                        return {
                            minX: shape.x,
                            minY: shape.y - shape.fontSize,
                            maxX: shape.x + textWidth,
                            maxY: shape.y + 5
                        };
                    case 'path':
                        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                        shape.points.forEach(point => {
                            minX = Math.min(minX, point.x);
                            minY = Math.min(minY, point.y);
                            maxX = Math.max(maxX, point.x);
                            maxY = Math.max(maxY, point.y);
                        });
                        return { minX, minY, maxX, maxY };
                    default:
                        return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
                }
            }
            
            getResizeCursor(handle) {
                const cursors = {
                    'nw': 'nw-resize',
                    'ne': 'ne-resize',
                    'sw': 'sw-resize',
                    'se': 'se-resize',
                    'n': 'n-resize',
                    's': 's-resize',
                    'w': 'w-resize',
                    'e': 'e-resize'
                };
                return cursors[handle.name] || 'default';
            }
            
            handleResize(x, y) {
                if (!this.resizeHandle || this.selectedShapes.length !== 1) return;
                
                const shape = this.selectedShapes[0];
                const handle = this.resizeHandle.name;
                const deltaX = x - this.startX;
                const deltaY = y - this.startY;
                
                switch (shape.type) {
                    case 'rectangle':
                        this.resizeRectangle(shape, handle, deltaX, deltaY);
                        break;
                    case 'circle':
                        this.resizeCircle(shape, handle, deltaX, deltaY);
                        break;
                    case 'line':
                    case 'arrow':
                        this.resizeLine(shape, handle, deltaX, deltaY);
                        break;
                }
                
                this.redraw();
            }
            
            resizeRectangle(rect, handle, deltaX, deltaY) {
                const originalBounds = this.originalBounds;
                
                switch (handle) {
                    case 'se':
                        rect.width = Math.max(5, originalBounds.maxX - originalBounds.minX + deltaX);
                        rect.height = Math.max(5, originalBounds.maxY - originalBounds.minY + deltaY);
                        break;
                    case 'nw':
                        rect.x = originalBounds.minX + deltaX;
                        rect.y = originalBounds.minY + deltaY;
                        rect.width = Math.max(5, originalBounds.maxX - originalBounds.minX - deltaX);
                        rect.height = Math.max(5, originalBounds.maxY - originalBounds.minY - deltaY);
                        break;
                    case 'ne':
                        rect.y = originalBounds.minY + deltaY;
                        rect.width = Math.max(5, originalBounds.maxX - originalBounds.minX + deltaX);
                        rect.height = Math.max(5, originalBounds.maxY - originalBounds.minY - deltaY);
                        break;
                    case 'sw':
                        rect.x = originalBounds.minX + deltaX;
                        rect.width = Math.max(5, originalBounds.maxX - originalBounds.minX - deltaX);
                        rect.height = Math.max(5, originalBounds.maxY - originalBounds.minY + deltaY);
                        break;
                    case 'n':
                        rect.y = originalBounds.minY + deltaY;
                        rect.height = Math.max(5, originalBounds.maxY - originalBounds.minY - deltaY);
                        break;
                    case 's':
                        rect.height = Math.max(5, originalBounds.maxY - originalBounds.minY + deltaY);
                        break;
                    case 'w':
                        rect.x = originalBounds.minX + deltaX;
                        rect.width = Math.max(5, originalBounds.maxX - originalBounds.minX - deltaX);
                        break;
                    case 'e':
                        rect.width = Math.max(5, originalBounds.maxX - originalBounds.minX + deltaX);
                        break;
                }
            }
            
            resizeCircle(circle, handle, deltaX, deltaY) {
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                const direction = handle.includes('n') || handle.includes('w') ? -1 : 1;
                circle.radius = Math.max(5, circle.radius + (distance * direction * 0.5));
            }
            
            resizeLine(line, handle, deltaX, deltaY) {
                if (handle.includes('n') || handle.includes('w')) {
                    line.startX = this.startX + deltaX;
                    line.startY = this.startY + deltaY;
                } else {
                    line.endX = this.startX + deltaX;
                    line.endY = this.startY + deltaY;
                }
            }
            
            // Text input functionality
            createTextInput(x, y) {
                this.finalizeTextInput(); // Close any existing text input
                
                const rect = this.canvas.getBoundingClientRect();
                const screenX = (x + this.panX) * this.zoom + rect.left;
                const screenY = (y + this.panY) * this.zoom + rect.top;
                
                const input = document.createElement('textarea');
                input.className = 'text-input';
                input.style.left = screenX + 'px';
                input.style.top = screenY + 'px';
                input.style.fontSize = this.fontSize + 'px';
                input.style.fontFamily = this.selectedFont;
                input.style.color = this.strokeColor;
                input.placeholder = 'Type here...';
                
                document.body.appendChild(input);
                input.focus();
                
                this.activeTextInput = {
                    element: input,
                    x: x,
                    y: y
                };
                
                // Auto-resize textarea
                input.addEventListener('input', () => {
                    input.style.height = 'auto';
                    input.style.height = input.scrollHeight + 'px';
                    input.style.width = Math.max(100, input.value.length * this.fontSize * 0.6) + 'px';
                });
                
                // Finalize on blur or Enter
                input.addEventListener('blur', () => this.finalizeTextInput());
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        this.cancelTextInput();
                    }
                });
            }
            
            finalizeTextInput() {
                if (!this.activeTextInput) return;
                
                const text = this.activeTextInput.element.value.trim();
                if (text) {
                    this.shapes.push({
                        type: 'text',
                        text: text,
                        x: this.activeTextInput.x,
                        y: this.activeTextInput.y,
                        fontSize: this.fontSize,
                        fontFamily: this.selectedFont,
                        color: this.strokeColor,
                        id: this.generateId()
                    });
                    this.saveState();
                    this.showSaveButton();
                }
                
                document.body.removeChild(this.activeTextInput.element);
                this.activeTextInput = null;
                this.redraw();
            }
            
            cancelTextInput() {
                if (!this.activeTextInput) return;
                
                document.body.removeChild(this.activeTextInput.element);
                this.activeTextInput = null;
            }
            
            // Enhanced erase functionality
            eraseAt(x, y) {
                const eraseRadius = this.strokeWidth * 3; // Bigger erase radius
                const shapesToRemove = [];
                
                this.shapes.forEach(shape => {
                    if (this.isShapeInEraseRadius(shape, x, y, eraseRadius)) {
                        shapesToRemove.push(shape);
                    }
                });
                
                if (shapesToRemove.length > 0) {
                    this.shapes = this.shapes.filter(shape => !shapesToRemove.includes(shape));
                    this.showSaveButton();
                    this.redraw();
                }
            }
            
            isShapeInEraseRadius(shape, x, y, radius) {
                switch (shape.type) {
                    case 'path':
                        return shape.points.some(point => {
                            const dist = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));
                            return dist <= radius;
                        });
                    case 'rectangle':
                        return x >= shape.x - radius && x <= shape.x + shape.width + radius &&
                               y >= shape.y - radius && y <= shape.y + shape.height + radius;
                    case 'circle':
                        const dist = Math.sqrt(Math.pow(shape.x - x, 2) + Math.pow(shape.y - y, 2));
                        return Math.abs(dist - shape.radius) <= radius;
                    case 'line':
                    case 'arrow':
                        return this.distanceToLine(x, y, shape.startX, shape.startY, shape.endX, shape.endY) <= radius;
                    case 'text':
                        const textWidth = shape.text.length * shape.fontSize * 0.6;
                        return x >= shape.x - radius && x <= shape.x + textWidth + radius &&
                               y >= shape.y - shape.fontSize - radius && y <= shape.y + radius;
                    default:
                        return false;
                }
            }
            
            // Zoom functionality
            zoomIn() {
                const centerX = this.canvas.width / 2;
                const centerY = this.canvas.height / 2;
                const worldCoords = this.getCanvasCoords(centerX, centerY);
                
                this.zoom = Math.min(this.zoom * 1.2, 5);
                
                const newWorldCoords = this.getCanvasCoords(centerX, centerY);
                this.panX += (worldCoords.x - newWorldCoords.x);
                this.panY += (worldCoords.y - newWorldCoords.y);
                
                this.updateZoomInfo();
                this.redraw();
            }
            
            zoomOut() {
                const centerX = this.canvas.width / 2;
                const centerY = this.canvas.height / 2;
                const worldCoords = this.getCanvasCoords(centerX, centerY);
                
                this.zoom = Math.max(this.zoom / 1.2, 0.1);
                
                const newWorldCoords = this.getCanvasCoords(centerX, centerY);
                this.panX += (worldCoords.x - newWorldCoords.x);
                this.panY += (worldCoords.y - newWorldCoords.y);
                
                this.updateZoomInfo();
                this.redraw();
            }
            
            updateZoomInfo() {
                document.getElementById('zoomInfo').textContent = Math.round(this.zoom * 100) + '%';
            }
            
            // Selection operations
            selectAll() {
                this.selectedShapes = [...this.shapes];
                this.redraw();
            }
            
            deleteSelected() {
                if (this.selectedShapes.length === 0) return;
                
                this.shapes = this.shapes.filter(shape => !this.selectedShapes.includes(shape));
                this.selectedShapes = [];
                this.saveState();
                this.showSaveButton();
                this.redraw();
            }
            
            duplicateSelected() {
                if (this.selectedShapes.length === 0) return;
                
                const duplicates = this.selectedShapes.map(shape => {
                    const duplicate = JSON.parse(JSON.stringify(shape));
                    duplicate.id = this.generateId();
                    
                    // Offset the duplicate
                    this.moveShape(duplicate, 20, 20);
                    
                    return duplicate;
                });
                
                this.shapes.push(...duplicates);
                this.selectedShapes = duplicates;
                this.saveState();
                this.showSaveButton();
                this.redraw();
            }
            
            updateSelectedShapesColor() {
                this.selectedShapes.forEach(shape => {
                    shape.color = this.strokeColor;
                });
                this.redraw();
            }
            
            updateSelectedShapesWidth() {
                this.selectedShapes.forEach(shape => {
                    if (shape.strokeWidth !== undefined) {
                        shape.strokeWidth = this.strokeWidth;
                    } else if (shape.width !== undefined) {
                        shape.width = this.strokeWidth;
                    }
                });
                this.redraw();
            }
            
            // Undo/Redo functionality
            saveState() {
                this.undoStack.push(JSON.stringify(this.shapes));
                if (this.undoStack.length > 50) {
                    this.undoStack.shift();
                }
                this.redoStack = [];
            }
            
            undo() {
                if (this.undoStack.length <= 1) return;
                
                this.redoStack.push(this.undoStack.pop());
                const previousState = this.undoStack[this.undoStack.length - 1];
                this.shapes = JSON.parse(previousState);
                this.clearSelection();
                this.redraw();
                
                if (this.shapes.length === 0) {
                    this.hideSaveButton();
                }
            }
            
            redo() {
                if (this.redoStack.length === 0) return;
                
                const nextState = this.redoStack.pop();
                this.undoStack.push(nextState);
                this.shapes = JSON.parse(nextState);
                this.clearSelection();
                this.showSaveButton();
                this.redraw();
            }
            
            // Enhanced drawing functions
            redraw() {
                this.ctx.save();
                
                // Clear canvas
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                
                // Apply transformations
                this.ctx.scale(this.zoom, this.zoom);
                this.ctx.translate(this.panX, this.panY);
                
                // Draw grid
                this.drawGrid();
                
                // Draw all shapes
                this.shapes.forEach(shape => this.drawShape(shape));
                
                // Draw selection
                this.drawSelection();
                
                this.ctx.restore();
            }
            
            redrawWithPreview() {
                this.redraw();
                
                this.ctx.save();
                this.ctx.scale(this.zoom, this.zoom);
                this.ctx.translate(this.panX, this.panY);
                
                // Draw preview
                if (this.currentTool === 'pen' && this.currentPath.length > 0) {
                    this.drawPath(this.currentPath, this.strokeColor, this.strokeWidth, true);
                } else if (this.currentTool === 'rectangle') {
                    this.drawPreviewRectangle();
                } else if (this.currentTool === 'circle') {
                    this.drawPreviewCircle();
                } else if (this.currentTool === 'line') {
                    this.drawPreviewLine();
                } else if (this.currentTool === 'arrow') {
                    this.drawPreviewArrow();
                }
                
                this.ctx.restore();
            }
            
            drawGrid() {
                const gridSize = 20;
                const startX = Math.floor(-this.panX / gridSize) * gridSize;
                const startY = Math.floor(-this.panY / gridSize) * gridSize;
                const endX = startX + (this.canvas.width / this.zoom) + gridSize;
                const endY = startY + (this.canvas.height / this.zoom) + gridSize;

                // Enhanced grid appearance
                this.ctx.strokeStyle = this.isDarkTheme 
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(0, 0, 0, 0.05)';

                this.ctx.lineWidth = 1 / this.zoom;
                this.ctx.beginPath();

                // Vertical lines
                for (let x = startX; x <= endX; x += gridSize) {
                    this.ctx.moveTo(x, startY);
                    this.ctx.lineTo(x, endY);
                }

                // Horizontal lines
                for (let y = startY; y <= endY; y += gridSize) {
                    this.ctx.moveTo(startX, y);
                    this.ctx.lineTo(endX, y);
                }

                this.ctx.stroke();
            }
            
            drawShape(shape) {
                switch (shape.type) {
                    case 'path':
                        this.drawPath(shape.points, shape.color, shape.width, shape.smooth);
                        break;
                    case 'rectangle':
                        this.drawRectangle(shape);
                        break;
                    case 'circle':
                        this.drawCircle(shape);
                        break;
                    case 'line':
                        this.drawLine(shape);
                        break;
                    case 'arrow':
                        this.drawArrow(shape);
                        break;
                    case 'text':
                        this.drawText(shape);
                        break;
                }
            }
            
            // Enhanced path drawing with smoothing
            drawPath(points, color, width, smooth = false) {
                if (points.length < 2) return;
                
                this.ctx.strokeStyle = color;
                this.ctx.lineWidth = width;
                this.ctx.lineCap = 'round';
                this.ctx.lineJoin = 'round';
                this.ctx.beginPath();
                
                if (smooth && points.length > 2) {
                    // Smooth curve using quadratic curves
                    this.ctx.moveTo(points[0].x, points[0].y);
                    
                    for (let i = 1; i < points.length - 1; i++) {
                        const cpx = (points[i].x + points[i + 1].x) / 2;
                        const cpy = (points[i].y + points[i + 1].y) / 2;
                        this.ctx.quadraticCurveTo(points[i].x, points[i].y, cpx, cpy);
                    }
                    
                    // Draw the last segment
                    const lastPoint = points[points.length - 1];
                    const secondLastPoint = points[points.length - 2];
                    this.ctx.quadraticCurveTo(secondLastPoint.x, secondLastPoint.y, lastPoint.x, lastPoint.y);
                } else {
                    // Regular line drawing
                    this.ctx.moveTo(points[0].x, points[0].y);
                    for (let i = 1; i < points.length; i++) {
                        this.ctx.lineTo(points[i].x, points[i].y);
                    }
                }
                
                this.ctx.stroke();
            }
            
            drawRectangle(rect) {
                this.ctx.strokeStyle = rect.color;
                this.ctx.lineWidth = rect.strokeWidth;
                this.ctx.lineCap = 'round';
                this.ctx.lineJoin = 'round';
                
                if (rect.filled) {
                    this.ctx.fillStyle = rect.color;
                    this.ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
                } else {
                    this.ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
                }
            }
            
            drawCircle(circle) {
                this.ctx.strokeStyle = circle.color;
                this.ctx.lineWidth = circle.strokeWidth;
                this.ctx.lineCap = 'round';
                this.ctx.beginPath();
                this.ctx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
                
                if (circle.filled) {
                    this.ctx.fillStyle = circle.color;
                    this.ctx.fill();
                } else {
                    this.ctx.stroke();
                }
            }
            
            drawLine(line) {
                this.ctx.strokeStyle = line.color;
                this.ctx.lineWidth = line.strokeWidth;
                this.ctx.lineCap = 'round';
                this.ctx.beginPath();
                this.ctx.moveTo(line.startX, line.startY);
                this.ctx.lineTo(line.endX, line.endY);
                this.ctx.stroke();
            }
            
            drawArrow(arrow) {
                this.ctx.strokeStyle = arrow.color;
                this.ctx.lineWidth = arrow.strokeWidth;
                this.ctx.lineCap = 'round';
                this.ctx.lineJoin = 'round';
                
                // Draw line
                this.ctx.beginPath();
                this.ctx.moveTo(arrow.startX, arrow.startY);
                this.ctx.lineTo(arrow.endX, arrow.endY);
                this.ctx.stroke();
                
                // Draw arrowhead
                const angle = Math.atan2(arrow.endY - arrow.startY, arrow.endX - arrow.startX);
                const arrowLength = Math.max(15, arrow.strokeWidth * 3);
                const arrowAngle = Math.PI / 6;
                
                this.ctx.beginPath();
                this.ctx.moveTo(arrow.endX, arrow.endY);
                this.ctx.lineTo(
                    arrow.endX - arrowLength * Math.cos(angle - arrowAngle),
                    arrow.endY - arrowLength * Math.sin(angle - arrowAngle)
                );
                this.ctx.moveTo(arrow.endX, arrow.endY);
                this.ctx.lineTo(
                    arrow.endX - arrowLength * Math.cos(angle + arrowAngle),
                    arrow.endY - arrowLength * Math.sin(angle + arrowAngle)
                );
                this.ctx.stroke();
            }
            
            drawText(text) {
                this.ctx.fillStyle = text.color;
                this.ctx.font = `${text.fontSize}px ${text.fontFamily}`;
                this.ctx.textBaseline = 'top';
                this.ctx.fillText(text.text, text.x, text.y);
            }
            
            // Enhanced preview drawing functions
            drawPreviewRectangle() {
                const width = this.currentX - this.startX;
                const height = this.currentY - this.startY;
                
                this.ctx.strokeStyle = this.strokeColor;
                this.ctx.lineWidth = this.strokeWidth;
                this.ctx.lineCap = 'round';
                this.ctx.lineJoin = 'round';
                this.ctx.setLineDash([5, 5]);
                this.ctx.strokeRect(
                    Math.min(this.startX, this.currentX),
                    Math.min(this.startY, this.currentY),
                    Math.abs(width),
                    Math.abs(height)
                );
                this.ctx.setLineDash([]);
            }
            
            drawPreviewCircle() {
                const radius = Math.sqrt(
                    Math.pow(this.currentX - this.startX, 2) + 
                    Math.pow(this.currentY - this.startY, 2)
                );
                
                this.ctx.strokeStyle = this.strokeColor;
                this.ctx.lineWidth = this.strokeWidth;
                this.ctx.lineCap = 'round';
                this.ctx.setLineDash([5, 5]);
                this.ctx.beginPath();
                this.ctx.arc(this.startX, this.startY, radius, 0, 2 * Math.PI);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
            
            drawPreviewLine() {
                this.ctx.strokeStyle = this.strokeColor;
                this.ctx.lineWidth = this.strokeWidth;
                this.ctx.lineCap = 'round';
                this.ctx.setLineDash([5, 5]);
                this.ctx.beginPath();
                this.ctx.moveTo(this.startX, this.startY);
                this.ctx.lineTo(this.currentX, this.currentY);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
            
            drawPreviewArrow() {
                this.drawPreviewLine();
                
                // Draw preview arrowhead
                const angle = Math.atan2(this.currentY - this.startY, this.currentX - this.startX);
                const arrowLength = Math.max(15, this.strokeWidth * 3);
                const arrowAngle = Math.PI / 6;
                
                this.ctx.strokeStyle = this.strokeColor;
                this.ctx.lineWidth = this.strokeWidth;
                this.ctx.lineCap = 'round';
                this.ctx.setLineDash([5, 5]);
                this.ctx.beginPath();
                this.ctx.moveTo(this.currentX, this.currentY);
                this.ctx.lineTo(
                    this.currentX - arrowLength * Math.cos(angle - arrowAngle),
                    this.currentY - arrowLength * Math.sin(angle - arrowAngle)
                );
                this.ctx.moveTo(this.currentX, this.currentY);
                this.ctx.lineTo(
                    this.currentX - arrowLength * Math.cos(angle + arrowAngle),
                    this.currentY - arrowLength * Math.sin(angle + arrowAngle)
                );
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
            
            drawSelection() {
                if (this.selectionBox) {
                    this.ctx.strokeStyle = '#007AFF';
                    this.ctx.lineWidth = 2 / this.zoom;
                    this.ctx.setLineDash([8 / this.zoom, 8 / this.zoom]);
                    this.ctx.strokeRect(
                        Math.min(this.selectionBox.startX, this.selectionBox.endX),
                        Math.min(this.selectionBox.startY, this.selectionBox.endY),
                        Math.abs(this.selectionBox.endX - this.selectionBox.startX),
                        Math.abs(this.selectionBox.endY - this.selectionBox.startY)
                    );
                    this.ctx.setLineDash([]);
                }
                
                // Draw selection bounds and handles
                if (this.selectedShapes.length > 0) {
                    const bounds = this.getSelectionBounds();
                    
                    // Selection rectangle
                    this.ctx.strokeStyle = '#007AFF';
                    this.ctx.lineWidth = 2 / this.zoom;
                    this.ctx.setLineDash([8 / this.zoom, 8 / this.zoom]);
                    this.ctx.strokeRect(
                        bounds.minX - 8 / this.zoom,
                        bounds.minY - 8 / this.zoom,
                        bounds.maxX - bounds.minX + 16 / this.zoom,
                        bounds.maxY - bounds.minY + 16 / this.zoom
                    );
                    this.ctx.setLineDash([]);
                    
                    // Resize handles
                    if (this.selectedShapes.length === 1) {
                        this.drawResizeHandles(bounds);
                    }
                }
            }
            
            drawResizeHandles(bounds) {
                const handleSize = 16 / this.zoom;
                const handleColor = '#007AFF';
                
                const handles = [
                    { x: bounds.minX, y: bounds.minY },
                    { x: bounds.maxX, y: bounds.minY },
                    { x: bounds.minX, y: bounds.maxY },
                    { x: bounds.maxX, y: bounds.maxY },
                    { x: (bounds.minX + bounds.maxX) / 2, y: bounds.minY },
                    { x: (bounds.minX + bounds.maxX) / 2, y: bounds.maxY },
                    { x: bounds.minX, y: (bounds.minY + bounds.maxY) / 2 },
                    { x: bounds.maxX, y: (bounds.minY + bounds.maxY) / 2 }
                ];
                
                handles.forEach(handle => {
                    // White fill
                    this.ctx.fillStyle = 'white';
                    this.ctx.fillRect(
                        handle.x - handleSize / 2,
                        handle.y - handleSize / 2,
                        handleSize,
                        handleSize
                    );
                    
                    // Blue border
                    this.ctx.strokeStyle = handleColor;
                    this.ctx.lineWidth = 2 / this.zoom;
                    this.ctx.strokeRect(
                        handle.x - handleSize / 2,
                        handle.y - handleSize / 2,
                        handleSize,
                        handleSize
                    );
                });
            }
            
            // Enhanced export functionality
            exportImage() {
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                
                // Calculate bounds of all shapes
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                
                if (this.shapes.length > 0) {
                    this.shapes.forEach(shape => {
                        const bounds = this.getShapeBounds(shape);
                        minX = Math.min(minX, bounds.minX);
                        minY = Math.min(minY, bounds.minY);
                        maxX = Math.max(maxX, bounds.maxX);
                        maxY = Math.max(maxY, bounds.maxY);
                    });
                } else {
                    // If no shapes, export current viewport
                    minX = -this.panX;
                    minY = -this.panY;
                    maxX = -this.panX + this.canvas.width / this.zoom;
                    maxY = -this.panY + this.canvas.height / this.zoom;
                }
                
                const padding = 50;
                const exportWidth = maxX - minX + padding * 2;
                const exportHeight = maxY - minY + padding * 2;
                
                // Set canvas size with high DPI
                const scale = 2; // Export at 2x resolution for better quality
                tempCanvas.width = exportWidth * scale;
                tempCanvas.height = exportHeight * scale;
                tempCtx.scale(scale, scale);
                
                // Fill background
                tempCtx.fillStyle = this.backgroundColor;
                tempCtx.fillRect(0, 0, exportWidth, exportHeight);
                
                // Translate context
                tempCtx.translate(-minX + padding, -minY + padding);
                
                // Enhanced context settings
                tempCtx.lineCap = 'round';
                tempCtx.lineJoin = 'round';
                tempCtx.imageSmoothingEnabled = true;
                tempCtx.imageSmoothingQuality = 'high';
                
                // Draw all shapes
                this.shapes.forEach(shape => {
                    this.drawShapeOnContext(tempCtx, shape);
                });
                
                // Create download
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `whiteboard-${timestamp}.jpg`;
                
                // Convert to JPEG with high quality
                tempCanvas.toBlob(blob => {
                    const link = document.createElement('a');
                    link.download = filename;
                    link.href = URL.createObjectURL(blob);
                    link.click();
                    URL.revokeObjectURL(link.href);
                    
                    // Hide save button after successful save
                    this.hideSaveButton();
                }, 'image/jpeg', 0.95);
            }
            
            drawShapeOnContext(ctx, shape) {
                const originalCtx = this.ctx;
                this.ctx = ctx;
                this.drawShape(shape);
                this.ctx = originalCtx;
            }
            
            // Utility functions
            generateId() {
                return Date.now().toString(36) + Math.random().toString(36).substr(2);
            }
        }
        
        // Initialize the app
        const app = new WhiteboardApp();
        
        // Add some helpful console messages
        console.log('🎨 Whiteboard App loaded!');
        console.log('Keyboard shortcuts:');
        console.log('• P - Pen tool');
        console.log('• E - Eraser tool');
        console.log('• V - Select tool');
        console.log('• R - Rectangle tool');
        console.log('• C - Circle tool');
        console.log('• L - Line tool');
        console.log('• A - Arrow tool');
        console.log('• T - Text tool');
        console.log('• Space - Pan mode');
        console.log('• Ctrl+Z - Undo');
        console.log('• Ctrl+Y - Redo');
        console.log('• Ctrl+S - Save/Export');
        console.log('• Delete - Delete selected');
