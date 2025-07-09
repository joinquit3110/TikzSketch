import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Define the shape object types
export interface Point {
  x: number;
  y: number;
}

export interface DrawingObject {
  id: string;
  type: 'point' | 'line' | 'rectangle' | 'circle' | 'text' | 'polygon' | 'angle' | 'perpendicular' | 'parallel' | 'midpoint' | 'distance' | 'perp_bisector' | 'function' | 'image';
  name: string;
  visible: boolean;
  selected: boolean;
  showName?: boolean;
  namePosition?: Point; // Relative offset from object position
  nameStyle?: {
    fontSize?: number;
    fontWeight?: 'normal' | 'bold';
    fontStyle?: 'normal' | 'italic';
    textDecoration?: 'none' | 'underline' | 'overline' | 'line-through';
    color?: string;
  };
  
  // Position and basic properties
  position: Point;
  stroke: string;
  strokeWidth: number;
  strokeStyle?: 'solid' | 'dashed' | 'dotted' | 'dashdot';
  strokeOpacity?: number;
  fill: string;
  fillOpacity?: number;
  
  // Type-specific properties
  points?: Point[]; // For lines, polygons, bezier curves
  radius?: number; // For circles, arcs
  width?: number; // For rectangles, images
  height?: number; // For rectangles, images
  text?: string; // For text objects
  fontSize?: number; // For text objects
  fontFamily?: string; // For text objects
  fontWeight?: 'normal' | 'bold'; // For text objects
  fontStyle?: 'normal' | 'italic'; // For text objects
  textDecoration?: 'none' | 'underline'; // For text objects
  isMath?: boolean; // Add this property for text objects
  
  // Image properties
  imageData?: string; // Base64 encoded image data
  imageUrl?: string; // Image URL or path
  originalWidth?: number; // Original image dimensions
  originalHeight?: number; // Original image dimensions
  rotation?: number; // Rotation angle in degrees
  scaleX?: number; // Scale factor X
  scaleY?: number; // Scale factor Y
  flipX?: boolean; // Horizontal flip
  flipY?: boolean; // Vertical flip
  
  // Arrow properties for lines
  arrowStart?: 'none' | 'arrow' | 'stealth' | 'latex';
  arrowEnd?: 'none' | 'arrow' | 'stealth' | 'latex';
  
  // Advanced geometry properties
  startAngle?: number; // For arcs
  endAngle?: number; // For arcs
  controlPoints?: Point[]; // For bezier curves
  angleValue?: number; // For angle measurements
  baseLineId?: string; // For perpendicular/parallel lines
  pointAId?: string; // For geometric constructions
  pointBId?: string; // For geometric constructions
  expression?: string; // For function plotting
  
  // Vector properties
  magnitude?: number; // For vectors
  direction?: number; // For vectors (in degrees)
  
  // Creation timestamp for ordering
  createdAt: number;
  
  // Basic constraint system (simplified)
  constraints?: {
    type: 'center' | 'start_point' | 'end_point';
    targetId: string;
    offset?: Point;
  }[];
}

export interface CanvasSettings {
  gridVisible: boolean;
  gridSpacing: number;
  gridType: 'cartesian' | 'polar' | 'isometric';
  snapToGrid: boolean;
  showCoordinates: boolean;
  snapToPoints: boolean;
  snapDistance: number;
  backgroundColor: string;
  zoom: number;
  pan: Point;
}

export interface AppState {
  // Tool state
  activeTool: string;
  
  // Objects and selection
  objects: DrawingObject[];
  selectedObjectIds: string[];
  
  // Canvas settings
  canvas: CanvasSettings;
  
  // History for undo/redo
  history: DrawingObject[][];
  historyIndex: number;
  maxHistorySize: number;
  
  // Temporary states
  isDrawing: boolean;
  drawingStartPoint: Point | null;
  previewObject: DrawingObject | null;
  
  // Multi-point drawing (for polygon, bezier)
  currentPolygonPoints: Point[];
  isPolygonDrawing: boolean;
  
  // Geometric construction helpers
  constructionMode: 'none' | 'select_point' | 'select_line' | 'select_two_points';
  constructionStep: number;
  constructionData: any;
  
  // Selection box for multi-select
  isSelectionBoxActive: boolean;
  selectionBoxStart: Point | null;
  selectionBoxEnd: Point | null;
  
  // Text editing state
  isTextEditing: boolean;
  textEditorPosition: Point | null;
}

export interface AppActions {
  // Tool actions
  setActiveTool: (tool: string) => void;
  
  // Object management
  addObject: (object: Omit<DrawingObject, 'id' | 'createdAt'>) => void;
  updateObject: (id: string, updates: Partial<DrawingObject>) => void;
  deleteObject: (id: string) => void;
  deleteSelectedObjects: () => void;
  
  // Selection
  selectObject: (id: string, multiSelect?: boolean) => void;
  selectObjects: (ids: string[]) => void;
  clearSelection: () => void;
  selectAll: () => void;
  
  // Selection box
  startSelectionBox: (point: Point) => void;
  updateSelectionBox: (point: Point) => void;
  finishSelectionBox: () => void;
  cancelSelectionBox: () => void;
  
  // Canvas operations
  updateCanvasSettings: (settings: Partial<CanvasSettings>) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: Point) => void;
  resetView: (stageSize?: { width: number; height: number }) => void;
  centerView: (stageSize: { width: number; height: number }) => void;
  
  // History
  saveToHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Drawing state
  startDrawing: (point: Point) => void;
  updateDrawing: (point: Point, shiftPressed?: boolean) => void;
  finishDrawing: () => void;
  cancelDrawing: () => void;
  setPreviewObject: (object: DrawingObject | null) => void;
  
  // Multi-point drawing (polygon, bezier)
  startPolygonDrawing: (point: Point) => void;
  addPolygonPoint: (point: Point) => void;
  finishPolygon: () => void;
  cancelPolygon: () => void;
  
  // Geometric construction
  startConstruction: (mode: 'select_point' | 'select_line' | 'select_two_points', data?: any) => void;
  addConstructionPoint: (objectId: string) => void;
  finishConstruction: () => void;
  cancelConstruction: () => void;
  
  // Advanced geometry utilities
  calculateMidpoint: (pointA: Point, pointB: Point) => Point;
  calculatePerpendicularLine: (baseLineId: string, throughPoint: Point) => Omit<DrawingObject, 'id' | 'createdAt'> | null;
  calculateParallelLine: (baseLineId: string, throughPoint: Point) => Omit<DrawingObject, 'id' | 'createdAt'> | null;
  calculateAngle: (pointA: Point, vertex: Point, pointC: Point) => number;
  
  // Basic constraint system (simplified)
  addConstraint: (objectId: string, constraint: {
    type: 'center' | 'start_point' | 'end_point';
    targetId: string;
    offset?: Point;
  }) => void;
  removeConstraint: (objectId: string, targetId: string) => void;
  updateConstrainedObjects: (objectId: string) => void;
  
  // Text editing
  startTextEditing: (position: Point) => void;
  cancelTextEditing: () => void;
  finishTextEditing: (text: string, isMath?: boolean) => void;
  
  // Utility
  getSelectedObjects: () => DrawingObject[];
  getObjectById: (id: string) => DrawingObject | undefined;
  generateObjectName: (type: string) => string;
  clearCanvas: () => void;
}

type AppStore = AppState & AppActions;

const defaultCanvasSettings: CanvasSettings = {
  gridVisible: true,
  gridSpacing: 28, // 1cm in pixels (28.35px ≈ 1cm at 72dpi)
  gridType: 'cartesian',
  snapToGrid: false,
  showCoordinates: true,
  snapToPoints: true,
  snapDistance: 14, // 0.5cm snap distance
  backgroundColor: '#ffffff',
  zoom: 1,
  // Center canvas so (0,0) world coordinates appear at viewport center
  pan: { x: 400, y: 300 }, // Default canvas 800x600
};

const generateId = () => Math.random().toString(36).substr(2, 9);

export const useAppStore = create<AppStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial state
        activeTool: 'select',
        objects: [],
        selectedObjectIds: [],
        canvas: defaultCanvasSettings,
        history: [[]],
        historyIndex: 0,
        maxHistorySize: 50,
        isDrawing: false,
        drawingStartPoint: null,
        previewObject: null,
        currentPolygonPoints: [],
        isPolygonDrawing: false,
        constructionMode: 'none',
        constructionStep: 0,
        constructionData: null,
        isSelectionBoxActive: false,
        selectionBoxStart: null,
        selectionBoxEnd: null,
        
        // Text editing state
        isTextEditing: false,
        textEditorPosition: null,

        // Tool actions
        setActiveTool: (tool: string) => {
          set((state) => {
            state.activeTool = tool;
            // Clear drawing state when switching tools
            state.isDrawing = false;
            state.drawingStartPoint = null;
            state.previewObject = null;
            // Cancel polygon drawing when switching tools
            if (state.isPolygonDrawing) {
              state.isPolygonDrawing = false;
              state.currentPolygonPoints = [];
            }
            // Cancel construction mode when switching tools
            if (state.constructionMode !== 'none') {
              state.constructionMode = 'none';
              state.constructionStep = 0;
              state.constructionData = null;
            }
            // Cancel text editing when switching away from text tool
            if (tool !== 'text' && state.isTextEditing) {
              state.isTextEditing = false;
              state.textEditorPosition = null;
            }
          });
        },

        // Object management
        addObject: (objectData) => {
          const newObjectId = generateId();
          set((state) => {
            const newObject: DrawingObject = {
              ...objectData,
              id: newObjectId,
              createdAt: Date.now(),
            };
            state.objects.push(newObject);
          });
          
          // Auto-select the newly created object
          get().selectObject(newObjectId);
          get().saveToHistory();
        },

        updateObject: (id: string, updates: Partial<DrawingObject>) => {
          set((state) => {
            const index = state.objects.findIndex(obj => obj.id === id);
            if (index !== -1) {
              Object.assign(state.objects[index], updates);
            }
          });
          get().saveToHistory();
        },

        deleteObject: (id: string) => {
          set((state) => {
            state.objects = state.objects.filter(obj => obj.id !== id);
            state.selectedObjectIds = state.selectedObjectIds.filter(selectedId => selectedId !== id);
          });
          get().saveToHistory();
        },

        deleteSelectedObjects: () => {
          const { selectedObjectIds } = get();
          selectedObjectIds.forEach((id: string) => get().deleteObject(id));
        },

        // Selection
        selectObject: (id: string, multiSelect = false) => {
          set((state) => {
            if (multiSelect) {
              if (state.selectedObjectIds.includes(id)) {
                state.selectedObjectIds = state.selectedObjectIds.filter(selectedId => selectedId !== id);
              } else {
                state.selectedObjectIds.push(id);
              }
            } else {
              state.selectedObjectIds = [id];
            }
            
            // Update selected property on objects
            state.objects.forEach((obj: DrawingObject) => {
              obj.selected = state.selectedObjectIds.includes(obj.id);
            });
          });
        },

        selectObjects: (ids: string[]) => {
          set((state) => {
            state.selectedObjectIds = ids;
            state.objects.forEach((obj: DrawingObject) => {
              obj.selected = ids.includes(obj.id);
            });
          });
        },

        clearSelection: () => {
          set((state) => {
            state.selectedObjectIds = [];
            state.objects.forEach((obj: DrawingObject) => {
              obj.selected = false;
            });
          });
        },

        selectAll: () => {
          set((state) => {
            const allIds = state.objects.map((obj: DrawingObject) => obj.id);
            state.selectedObjectIds = allIds;
            state.objects.forEach((obj: DrawingObject) => {
              obj.selected = true;
            });
          });
        },

        // Selection box
        startSelectionBox: (point: Point) => {
          set((state) => {
            state.isSelectionBoxActive = true;
            state.selectionBoxStart = point;
          });
        },

        updateSelectionBox: (point: Point) => {
          set((state) => {
            state.selectionBoxEnd = point;
          });
        },

        finishSelectionBox: () => {
          const { selectionBoxStart, selectionBoxEnd, objects } = get();
          if (selectionBoxStart && selectionBoxEnd) {
            // Calculate bounding box
            const minX = Math.min(selectionBoxStart.x, selectionBoxEnd.x);
            const maxX = Math.max(selectionBoxStart.x, selectionBoxEnd.x);
            const minY = Math.min(selectionBoxStart.y, selectionBoxEnd.y);
            const maxY = Math.max(selectionBoxStart.y, selectionBoxEnd.y);
            
            // Find objects within the selection box
            const selectedIds: string[] = [];
            objects.forEach(obj => {
              if (!obj.visible) return;
              
              let isInBox = false;
              
              switch (obj.type) {
                case 'point':
                  isInBox = obj.position.x >= minX && obj.position.x <= maxX &&
                           obj.position.y >= minY && obj.position.y <= maxY;
                  break;
                  
                case 'line':
                  if (obj.points && obj.points.length >= 2) {
                    isInBox = obj.points.some(point => 
                      point.x >= minX && point.x <= maxX &&
                      point.y >= minY && point.y <= maxY
                    );
                  }
                  break;
                  
                case 'rectangle':
                  isInBox = obj.position.x >= minX && obj.position.x <= maxX &&
                           obj.position.y >= minY && obj.position.y <= maxY;
                  break;
                  
                case 'circle':
                  isInBox = obj.position.x >= minX && obj.position.x <= maxX &&
                           obj.position.y >= minY && obj.position.y <= maxY;
                  break;
                  
                case 'text':
                  isInBox = obj.position.x >= minX && obj.position.x <= maxX &&
                           obj.position.y >= minY && obj.position.y <= maxY;
                  break;
                  
                default:
                  isInBox = obj.position.x >= minX && obj.position.x <= maxX &&
                           obj.position.y >= minY && obj.position.y <= maxY;
              }
              
              if (isInBox) {
                selectedIds.push(obj.id);
              }
            });
            
            // Select the objects
            get().selectObjects(selectedIds);
          }
          
          set((state) => {
            state.isSelectionBoxActive = false;
            state.selectionBoxStart = null;
            state.selectionBoxEnd = null;
          });
        },

        cancelSelectionBox: () => {
          set((state) => {
            state.isSelectionBoxActive = false;
            state.selectionBoxStart = null;
            state.selectionBoxEnd = null;
          });
        },

        // Canvas operations
        updateCanvasSettings: (settings: Partial<CanvasSettings>) => {
          set((state) => {
            Object.assign(state.canvas, settings);
          });
        },

        setZoom: (zoom: number) => {
          set((state) => {
            state.canvas.zoom = Math.max(0.1, Math.min(5, zoom));
          });
        },

        setPan: (pan: Point) => {
          set((state) => {
            state.canvas.pan = pan;
          });
        },

        resetView: (stageSize?: { width: number; height: number }) => {
          set((state) => {
            state.canvas.zoom = 1;
            // Center the canvas viewport so (0,0) world coordinates appear at screen center
            if (stageSize) {
              state.canvas.pan = { x: stageSize.width / 2, y: stageSize.height / 2 };
            } else {
              // Default canvas size is 800x600, so center should be at (400, 300)
              state.canvas.pan = { x: 400, y: 300 };
            }
          });
        },

        centerView: (stageSize: { width: number; height: number }) => {
          set((state) => {
            // Center the viewport without changing zoom
            state.canvas.pan = { x: stageSize.width / 2, y: stageSize.height / 2 };
          });
        },

        // History
        saveToHistory: () => {
          set((state) => {
            const currentObjects = JSON.parse(JSON.stringify(state.objects));
            
            // Remove future history if we're not at the end
            if (state.historyIndex < state.history.length - 1) {
              state.history = state.history.slice(0, state.historyIndex + 1);
            }
            
            // Add new state
            state.history.push(currentObjects);
            
            // Limit history size
            if (state.history.length > state.maxHistorySize) {
              state.history = state.history.slice(-state.maxHistorySize);
            }
            
            state.historyIndex = state.history.length - 1;
          });
        },

        undo: () => {
          const { history, historyIndex } = get();
          if (historyIndex > 0) {
            set((state) => {
              state.historyIndex--;
              state.objects = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
              state.selectedObjectIds = [];
              state.objects.forEach((obj: DrawingObject) => obj.selected = false);
            });
          }
        },

        redo: () => {
          const { history, historyIndex } = get();
          if (historyIndex < history.length - 1) {
            set((state) => {
              state.historyIndex++;
              state.objects = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
              state.selectedObjectIds = [];
              state.objects.forEach((obj: DrawingObject) => obj.selected = false);
            });
          }
        },

        canUndo: () => get().historyIndex > 0,
        canRedo: () => get().historyIndex < get().history.length - 1,

        // Drawing state
        startDrawing: (point: Point) => {
          set((state) => {
            state.isDrawing = true;
            state.drawingStartPoint = point;
          });
        },

        updateDrawing: (point: Point, shiftPressed: boolean = false) => {
          const { activeTool, drawingStartPoint } = get();
          if (!drawingStartPoint) return;

          // Create preview object based on active tool
          let previewObject: DrawingObject | null = null;
          
          if (activeTool === 'rectangle') {
            // Calculate proper rectangle bounds regardless of drag direction
            const minX = Math.min(drawingStartPoint.x, point.x);
            const minY = Math.min(drawingStartPoint.y, point.y);
            const maxX = Math.max(drawingStartPoint.x, point.x);
            const maxY = Math.max(drawingStartPoint.y, point.y);
            
            let width = maxX - minX;
            let height = maxY - minY;
            let rectX = minX;
            let rectY = minY;
            
            // If Shift is pressed, make it a square
            if (shiftPressed) {
              const maxDimension = Math.max(width, height);
              
              // Calculate drag direction to determine square positioning
              const dragX = point.x - drawingStartPoint.x;
              const dragY = point.y - drawingStartPoint.y;
              
              // Always create square centered on the drawing start point for consistency
              rectX = drawingStartPoint.x - maxDimension / 2;
              rectY = drawingStartPoint.y - maxDimension / 2;
              
              // Adjust final position based on drag direction to be intuitive
              if (dragX >= 0 && dragY >= 0) {
                // Dragging down-right: square positioned down-right from start
                rectX = drawingStartPoint.x;
                rectY = drawingStartPoint.y;
              } else if (dragX < 0 && dragY >= 0) {
                // Dragging down-left: square positioned down-left from start
                rectX = drawingStartPoint.x - maxDimension;
                rectY = drawingStartPoint.y;
              } else if (dragX >= 0 && dragY < 0) {
                // Dragging up-right: square positioned up-right from start
                rectX = drawingStartPoint.x;
                rectY = drawingStartPoint.y - maxDimension;
              } else {
                // Dragging up-left: square positioned up-left from start
                rectX = drawingStartPoint.x - maxDimension;
                rectY = drawingStartPoint.y - maxDimension;
              }
              
              width = maxDimension;
              height = maxDimension;
            }
            
            previewObject = {
              id: 'preview',
              type: 'rectangle',
              name: 'Rectangle Preview',
              visible: true,
              selected: false,
              showName: true,
              position: { x: rectX, y: rectY }, // Use calculated position
              stroke: '#3b82f6',
              strokeWidth: 2,
              fill: 'transparent',
              width,
              height,
              createdAt: Date.now(),
            };
          } else if (activeTool === 'circle') {
            const radius = Math.sqrt(
              Math.pow(point.x - drawingStartPoint.x, 2) + 
              Math.pow(point.y - drawingStartPoint.y, 2)
            );
            previewObject = {
              id: 'preview',
              type: 'circle',
              name: 'Circle Preview',
              visible: true,
              selected: false,
              showName: true,
              position: drawingStartPoint,
              stroke: '#3b82f6',
              strokeWidth: 2,
              fill: 'transparent',
              radius,
              createdAt: Date.now(),
            };
          } else if (activeTool === 'line') {
            previewObject = {
              id: 'preview',
              type: 'line',
              name: 'Line Preview',
              visible: true,
              selected: false,
              showName: true,
              position: drawingStartPoint,
              stroke: '#3b82f6',
              strokeWidth: 2,
              fill: 'transparent',
              points: [drawingStartPoint, point],
              arrowStart: 'none',
              arrowEnd: 'none',
              createdAt: Date.now(),
            };
          }
          
          set((state) => {
            state.previewObject = previewObject;
          });
        },

        finishDrawing: () => {
          const { previewObject } = get();
          if (previewObject) {
            const { id, ...objectData } = previewObject;
            // Set proper name instead of preview name
            objectData.name = get().generateObjectName(previewObject.type);
            get().addObject(objectData);
          }
          
          set((state) => {
            state.isDrawing = false;
            state.drawingStartPoint = null;
            state.previewObject = null;
          });
        },

        cancelDrawing: () => {
          set((state) => {
            state.isDrawing = false;
            state.drawingStartPoint = null;
            state.previewObject = null;
          });
        },

        setPreviewObject: (object: DrawingObject | null) => {
          set((state) => {
            state.previewObject = object;
          });
        },

        // Utility
        getSelectedObjects: () => {
          const { objects, selectedObjectIds } = get();
          return objects.filter(obj => selectedObjectIds.includes(obj.id));
        },

        getObjectById: (id: string) => {
          return get().objects.find(obj => obj.id === id);
        },

        generateObjectName: (type: string) => {
          const objects = get().objects;
          const typeObjects = objects.filter(obj => obj.type === type);
          const count = typeObjects.length + 1;
          
          const displayName = type.charAt(0).toUpperCase() + type.slice(1);
          
          // Short names for common objects  
          const shortNames: Record<string, string> = {
            'point': 'P',
            'line': 'L', 
            'circle': 'C',
            'rectangle': 'R',
            'text': 'T',
            'polygon': 'Poly',
            'angle': 'α',
            'midpoint': 'M'
          };
          
          if (shortNames[type]) {
            return `${shortNames[type]}${count}`;
          }
          
          return `${displayName}${count}`;
        },

        clearCanvas: () => {
          set((state) => {
            state.objects = [];
            state.selectedObjectIds = [];
            state.history = [[]];
            state.historyIndex = 0;
            state.isDrawing = false;
            state.drawingStartPoint = null;
            state.previewObject = null;
            state.currentPolygonPoints = [];
            state.isPolygonDrawing = false;
            state.constructionMode = 'none';
            state.constructionStep = 0;
            state.constructionData = null;
            state.isSelectionBoxActive = false;
            state.selectionBoxStart = null;
            state.selectionBoxEnd = null;
            // Reset text editing state
            state.isTextEditing = false;
            state.textEditorPosition = null;
          });
        },

        // Multi-point drawing methods
        startPolygonDrawing: (point: Point) => {
          set((state) => {
            state.isPolygonDrawing = true;
            state.currentPolygonPoints = [point];
          });
        },

        addPolygonPoint: (point: Point) => {
          set((state) => {
            if (state.isPolygonDrawing) {
              state.currentPolygonPoints.push(point);
            }
          });
        },

        finishPolygon: () => {
          const { currentPolygonPoints, activeTool } = get();
          if (currentPolygonPoints.length >= 3) {
            if (activeTool === 'polygon') {
              get().addObject({
                type: 'polygon',
                name: get().generateObjectName('polygon'),
                visible: true,
                selected: false,
                showName: true,
                position: currentPolygonPoints[0],
                points: [...currentPolygonPoints],
                stroke: '#3b82f6',
                strokeWidth: 2,
                fill: 'transparent',
              });
            }
          }
          
          set((state) => {
            state.isPolygonDrawing = false;
            state.currentPolygonPoints = [];
          });
        },

        cancelPolygon: () => {
          set((state) => {
            state.isPolygonDrawing = false;
            state.currentPolygonPoints = [];
          });
        },

        // Geometric construction methods (simplified)
        startConstruction: (mode, data = null) => {
          set((state) => {
            state.constructionMode = mode;
            state.constructionStep = 0;
            state.constructionData = data;
          });
        },

        addConstructionPoint: (objectId: string) => {
          const { constructionMode, constructionStep, constructionData, activeTool } = get();
          
          set((state) => {
            if (!state.constructionData) {
              state.constructionData = {};
            }
            state.constructionData[`point${state.constructionStep}`] = objectId;
            state.constructionStep++;
          });

          // Check if construction is complete
          if (constructionMode === 'select_line' && constructionStep >= 0) {
            // For perpendicular and parallel tools - need 1 line selected
            get().finishConstruction();
          } else if (constructionMode === 'select_two_points' && constructionStep >= 1) {
            // For midpoint and angle tools - need 2 points selected
            get().finishConstruction();
          }
        },

        finishConstruction: () => {
          const { constructionMode, constructionData, activeTool } = get();
          
          if (activeTool === 'midpoint' && constructionData?.point0 && constructionData?.point1) {
            const pointA = get().getObjectById(constructionData.point0);
            const pointB = get().getObjectById(constructionData.point1);
            
            if (pointA && pointB) {
              const midpoint = get().calculateMidpoint(pointA.position, pointB.position);
              get().addObject({
                type: 'point',
                name: get().generateObjectName('midpoint'),
                visible: true,
                selected: false,
                showName: true,
                position: midpoint,
                stroke: '#f59e0b',
                strokeWidth: 4,
                fill: '#f59e0b',
                pointAId: pointA.id,
                pointBId: pointB.id,
              });
            }
          }
          
          if (activeTool === 'perpendicular' && constructionData?.point0 && constructionData?.tool && constructionData?.throughPoint) {
            const baseLine = get().getObjectById(constructionData.point0);
            if (baseLine && baseLine.type === 'line') {
              const perpLine = get().calculatePerpendicularLine(baseLine.id, constructionData.throughPoint);
              if (perpLine) {
                get().addObject(perpLine);
              }
            }
          }
          
          if (activeTool === 'parallel' && constructionData?.point0 && constructionData?.tool && constructionData?.throughPoint) {
            const baseLine = get().getObjectById(constructionData.point0);
            if (baseLine && baseLine.type === 'line') {
              const parallelLine = get().calculateParallelLine(baseLine.id, constructionData.throughPoint);
              if (parallelLine) {
                get().addObject(parallelLine);
              }
            }
          }
          
          if (activeTool === 'angle' && constructionData?.point0 && constructionData?.point1) {
            const pointA = get().getObjectById(constructionData.point0);
            const pointB = get().getObjectById(constructionData.point1);
            
            if (pointA && pointB) {
              // Use midpoint between the two points as vertex
              const vertex = get().calculateMidpoint(pointA.position, pointB.position);
              // Create angle measurement arc
              const angleValue = get().calculateAngle(pointA.position, vertex, pointB.position);
              
              get().addObject({
                type: 'angle',
                name: get().generateObjectName('angle'),
                visible: true,
                selected: false,
                showName: true,
                position: vertex,
                points: [pointA.position, vertex, pointB.position],
                stroke: '#8b5cf6',
                strokeWidth: 2,
                fill: 'transparent',
                angleValue: angleValue,
                pointAId: pointA.id,
                pointBId: pointB.id,
              });
            }
          }
          
          set((state) => {
            state.constructionMode = 'none';
            state.constructionStep = 0;
            state.constructionData = null;
          });
        },

        cancelConstruction: () => {
          set((state) => {
            state.constructionMode = 'none';
            state.constructionStep = 0;
            state.constructionData = null;
          });
        },

        // Basic geometry calculation utilities
        calculateMidpoint: (pointA: Point, pointB: Point) => {
          return {
            x: (pointA.x + pointB.x) / 2,
            y: (pointA.y + pointB.y) / 2,
          };
        },

        calculatePerpendicularLine: (baseLineId: string, throughPoint: Point): Omit<DrawingObject, 'id' | 'createdAt'> | null => {
          const baseLine = get().getObjectById(baseLineId);
          if (!baseLine || baseLine.type !== 'line' || !baseLine.points || baseLine.points.length < 2) {
            return null;
          }

          const [p1, p2] = baseLine.points;
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          
          // Perpendicular direction vector
          const perpDx = -dy;
          const perpDy = dx;
          
          // Normalize and extend
          const length = 100;
          const magnitude = Math.sqrt(perpDx * perpDx + perpDy * perpDy);
          const unitX = perpDx / magnitude;
          const unitY = perpDy / magnitude;
          
          const startPoint = {
            x: throughPoint.x - unitX * length,
            y: throughPoint.y - unitY * length,
          };
          const endPoint = {
            x: throughPoint.x + unitX * length,
            y: throughPoint.y + unitY * length,
          };

          return {
            type: 'line' as const,
            name: get().generateObjectName('perpendicular'),
            visible: true,
            selected: false,
            showName: true,
            position: startPoint,
            points: [startPoint, endPoint],
            stroke: '#ef4444',
            strokeWidth: 2,
            fill: 'transparent',
            arrowStart: 'none',
            arrowEnd: 'none',
            baseLineId: baseLineId,
          };
        },

        calculateParallelLine: (baseLineId: string, throughPoint: Point): Omit<DrawingObject, 'id' | 'createdAt'> | null => {
          const baseLine = get().getObjectById(baseLineId);
          if (!baseLine || baseLine.type !== 'line' || !baseLine.points || baseLine.points.length < 2) {
            return null;
          }

          const [p1, p2] = baseLine.points;
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          
          // Parallel direction vector (same as base line)
          const length = 100;
          const magnitude = Math.sqrt(dx * dx + dy * dy);
          const unitX = dx / magnitude;
          const unitY = dy / magnitude;
          
          const startPoint = {
            x: throughPoint.x - unitX * length,
            y: throughPoint.y - unitY * length,
          };
          const endPoint = {
            x: throughPoint.x + unitX * length,
            y: throughPoint.y + unitY * length,
          };

          return {
            type: 'line' as const,
            name: get().generateObjectName('parallel'),
            visible: true,
            selected: false,
            showName: true,
            position: startPoint,
            points: [startPoint, endPoint],
            stroke: '#10b981',
            strokeWidth: 2,
            fill: 'transparent',
            arrowStart: 'none',
            arrowEnd: 'none',
            baseLineId: baseLineId,
          };
        },

        calculateAngle: (pointA: Point, vertex: Point, pointC: Point) => {
          const vectorAB = { x: pointA.x - vertex.x, y: pointA.y - vertex.y };
          const vectorCB = { x: pointC.x - vertex.x, y: pointC.y - vertex.y };
          
          const dotProduct = vectorAB.x * vectorCB.x + vectorAB.y * vectorCB.y;
          const magnitudeAB = Math.sqrt(vectorAB.x * vectorAB.x + vectorAB.y * vectorAB.y);
          const magnitudeCB = Math.sqrt(vectorCB.x * vectorCB.x + vectorCB.y * vectorCB.y);
          
          const cosTheta = dotProduct / (magnitudeAB * magnitudeCB);
          const angleRadians = Math.acos(Math.max(-1, Math.min(1, cosTheta)));
          const angleDegrees = (angleRadians * 180) / Math.PI;
          
          return angleDegrees;
        },

        // Basic constraint system methods
        addConstraint: (objectId: string, constraint) => {
          set((state) => {
            const obj = state.objects.find(o => o.id === objectId);
            if (obj) {
              if (!obj.constraints) obj.constraints = [];
              obj.constraints.push(constraint);
            }
          });
        },

        removeConstraint: (objectId: string, targetId: string) => {
          set((state) => {
            const obj = state.objects.find(o => o.id === objectId);
            if (obj && obj.constraints) {
              obj.constraints = obj.constraints.filter(c => c.targetId !== targetId);
            }
          });
        },

        updateConstrainedObjects: (objectId: string) => {
          const state = get();
          
          set((draft) => {
            // Simple constraint update for basic geometry
            draft.objects.forEach(obj => {
              if (!obj.constraints) return;
              
              obj.constraints.forEach(constraint => {
                if (constraint.targetId !== objectId) return;
                
                const target = draft.objects.find(o => o.id === objectId);
                if (!target) return;
                
                switch (constraint.type) {
                  case 'center':
                    if (obj.type === 'circle') {
                      obj.position = { ...target.position };
                      if (constraint.offset) {
                        obj.position.x += constraint.offset.x;
                        obj.position.y += constraint.offset.y;
                      }
                    }
                    break;
                    
                  case 'start_point':
                    if (obj.type === 'line' && obj.points) {
                      obj.points[0] = { ...target.position };
                      obj.position = obj.points[0];
                    }
                    break;
                    
                  case 'end_point':
                    if (obj.type === 'line' && obj.points) {
                      obj.points[1] = { ...target.position };
                    }
                    break;
                }
              });
            });
          });
        },

        // Text editing actions
        startTextEditing: (position: Point) => {
          set((state) => {
            state.isTextEditing = true;
            state.textEditorPosition = position;
          });
        },

        cancelTextEditing: () => {
          set((state) => {
            state.isTextEditing = false;
            state.textEditorPosition = null;
          });
        },

        finishTextEditing: (text: string, isMath = false) => {
          const { textEditorPosition } = get();
          if (textEditorPosition && text.trim()) {
            get().addObject({
              type: 'text',
              name: get().generateObjectName('text'),
              visible: true,
              selected: false,
              showName: false,
              position: textEditorPosition,
              stroke: '#000000',
              strokeWidth: 1,
              fill: 'transparent',
              text: text.trim(),
              fontSize: 16,
              fontFamily: 'Arial',
              fontWeight: 'normal',
              fontStyle: 'normal',
              textDecoration: 'none',
              isMath,
            });
          }
          
          set((state) => {
            state.isTextEditing = false;
            state.textEditorPosition = null;
          });
        },


      }))
    ),
    { name: 'tikzsketch-store' }
  )
);

// Persist state to localStorage
if (typeof window !== 'undefined') {
  useAppStore.subscribe(
    (state) => state.objects,
    (objects) => {
      localStorage.setItem('tikzsketch-objects', JSON.stringify(objects));
    }
  );

  useAppStore.subscribe(
    (state) => state.canvas,
    (canvas) => {
      localStorage.setItem('tikzsketch-canvas', JSON.stringify(canvas));
    }
  );

  // Load state from localStorage on init
  const savedObjects = localStorage.getItem('tikzsketch-objects');
  const savedCanvas = localStorage.getItem('tikzsketch-canvas');
  
  if (savedObjects) {
    try {
      const objects = JSON.parse(savedObjects);
      useAppStore.setState({ objects });
    } catch (e) {
      console.warn('Failed to load saved objects:', e);
    }
  }
  
  if (savedCanvas) {
    try {
      const canvas = JSON.parse(savedCanvas);
      useAppStore.setState({ canvas: { ...defaultCanvasSettings, ...canvas } });
    } catch (e) {
      console.warn('Failed to load saved canvas settings:', e);
    }
  }
} 