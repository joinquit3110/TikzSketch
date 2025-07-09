'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Stage, Layer, Line, Circle, Rect, Text, Transformer, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import { useAppStore } from '@/lib/store';
import type { DrawingObject, Point } from '@/lib/store';


interface CanvasProps {
  activeTool?: string;
}

// Separate component for rendering images
interface ImageObjectProps {
  obj: DrawingObject;
  commonProps: any;
}

function ImageObject({ obj, commonProps }: ImageObjectProps) {
  const [konvaImage, setKonvaImage] = useState<HTMLImageElement | null>(null);
  
  useEffect(() => {
    if (obj.imageData) {
      const imageElement = new Image();
      imageElement.onload = () => {
        setKonvaImage(imageElement);
      };
      imageElement.src = obj.imageData;
    }
  }, [obj.imageData]);
  
  if (!konvaImage || !obj.width || !obj.height) {
    return null;
  }
  
  return (
    <KonvaImage
      {...commonProps}
      image={konvaImage}
      x={obj.position.x + obj.width / 2}
      y={obj.position.y + obj.height / 2}
      width={obj.width}
      height={obj.height}
      offsetX={obj.width / 2}
      offsetY={obj.height / 2}
      rotation={obj.rotation || 0}
      scaleX={(obj.scaleX || 1) * (obj.flipX ? -1 : 1)}
      scaleY={(obj.scaleY || 1) * (obj.flipY ? -1 : 1)}
    />
  );
}

export default function Canvas({ activeTool = 'select' }: CanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  
  const {
    objects,
    selectedObjectIds,
    canvas,
    isDrawing,
    previewObject,
    isPolygonDrawing,
    currentPolygonPoints,
    constructionMode,
    constructionStep,
    isSelectionBoxActive,
    selectionBoxStart,
    selectionBoxEnd,
    setZoom,
    setPan,
    updateCanvasSettings,
    centerView,
    selectObject,
    // Text editing
    isTextEditing,
    textEditorPosition,
    startTextEditing,
    cancelTextEditing,
    finishTextEditing,
    clearSelection,
    startDrawing,
    updateDrawing,
    finishDrawing,
    cancelDrawing,
    addObject,
    generateObjectName,
    startPolygonDrawing,
    addPolygonPoint,
    finishPolygon,
    cancelPolygon,
    startConstruction,
    addConstructionPoint,
    finishConstruction,
    calculateMidpoint,
    calculatePerpendicularLine,
    calculateParallelLine,
    startSelectionBox,
    updateSelectionBox,
    finishSelectionBox,
    cancelSelectionBox
  } = useAppStore();

  // State for mouse position and snap targets
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [snapTarget, setSnapTarget] = useState<any>(null);

  // State for text editor
  const [textEditorValue, setTextEditorValue] = useState('');
  const [isMathMode, setIsMathMode] = useState(false);

  // Image upload handler
  const handleImageUpload = useCallback((position: Point) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const imageData = event.target?.result as string;
          
          // Create an image element to get dimensions
          const img = new Image();
          img.onload = () => {
            const maxSize = 200; // Default size
            const aspectRatio = img.width / img.height;
            let width, height;
            
            if (aspectRatio > 1) {
              width = maxSize;
              height = maxSize / aspectRatio;
            } else {
              width = maxSize * aspectRatio;
              height = maxSize;
            }
            
            // Extract filename without extension and clean it for LaTeX
            const filename = file.name.split('.')[0].replace(/[^a-zA-Z0-9_-]/g, '_');
            
            addObject({
              type: 'image',
              name: filename,
              visible: true,
              selected: false,
              showName: true,
              position: position,
              stroke: 'transparent',
              strokeWidth: 0,
              fill: 'transparent',
              width: width,
              height: height,
              imageData: imageData,
              imageUrl: file.name, // Store original filename
              originalWidth: img.width,
              originalHeight: img.height,
              rotation: 0,
              scaleX: 1,
              scaleY: 1,
              flipX: false,
              flipY: false,
            });
          };
          img.src = imageData;
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }, [addObject]);

  // Helper function to create arrow points
  const getArrowPoints = (x: number, y: number, angle: number, size: number, arrowType: string) => {
    const points = [];
    
    switch (arrowType) {
      case 'arrow':
        // Standard arrow with 45-degree angle
        points.push(x, y);
        points.push(x - size * Math.cos(angle - Math.PI / 6), y - size * Math.sin(angle - Math.PI / 6));
        points.push(x - size * Math.cos(angle + Math.PI / 6), y - size * Math.sin(angle + Math.PI / 6));
        break;
      case 'stealth':
        // Stealth arrow - more pointed
        points.push(x, y);
        points.push(x - size * Math.cos(angle - Math.PI / 8), y - size * Math.sin(angle - Math.PI / 8));
        points.push(x - size * 0.7 * Math.cos(angle), y - size * 0.7 * Math.sin(angle));
        points.push(x - size * Math.cos(angle + Math.PI / 8), y - size * Math.sin(angle + Math.PI / 8));
        break;
      case 'latex':
        // LaTeX-style arrow - wider
        points.push(x, y);
        points.push(x - size * Math.cos(angle - Math.PI / 4), y - size * Math.sin(angle - Math.PI / 4));
        points.push(x - size * 0.5 * Math.cos(angle), y - size * 0.5 * Math.sin(angle));
        points.push(x - size * Math.cos(angle + Math.PI / 4), y - size * Math.sin(angle + Math.PI / 4));
        break;
      default:
        // Default arrow
        points.push(x, y);
        points.push(x - size * Math.cos(angle - Math.PI / 6), y - size * Math.sin(angle - Math.PI / 6));
        points.push(x - size * Math.cos(angle + Math.PI / 6), y - size * Math.sin(angle + Math.PI / 6));
    }
    
    return points;
  };

  // Handle window resize
  useEffect(() => {
    const updateSize = () => {
      const container = stageRef.current?.container().parentElement;
      if (container) {
        const newSize = {
          width: container.offsetWidth,
          height: container.offsetHeight
        };
        setStageSize(newSize);
        // Auto-center canvas when size changes
        centerView(newSize);
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [centerView]);

  // Update stage position and scale from store
  useEffect(() => {
    const stage = stageRef.current;
    if (stage) {
      stage.scale({ x: canvas.zoom, y: canvas.zoom });
      stage.position(canvas.pan);
    }
  }, [canvas.zoom, canvas.pan]);

  // Generate grid lines
  const generateGrid = () => {
    if (!canvas.gridVisible) return [];
    
    const lines = [];
    const padding = 1000;
    const spacing = canvas.gridSpacing;
    const startX = Math.floor((-canvas.pan.x - padding) / spacing) * spacing;
    const endX = Math.floor((-canvas.pan.x + stageSize.width + padding) / spacing) * spacing;
    const startY = Math.floor((-canvas.pan.y - padding) / spacing) * spacing;
    const endY = Math.floor((-canvas.pan.y + stageSize.height + padding) / spacing) * spacing;

    // Vertical lines - lighter axes
    for (let x = startX; x <= endX; x += spacing) {
      lines.push(
        <Line
          key={`v-${x}`}
          points={[x, startY, x, endY]}
          stroke={x === 0 ? "#6b7280" : "#d1d5db"} // Lighter color for Y-axis
          strokeWidth={x === 0 ? 2.0 : 0.8} // Reduced thickness
          opacity={x === 0 ? 0.8 : 0.4} // Reduced opacity for axes
          listening={false}
        />
      );
    }

    // Horizontal lines - lighter axes
    for (let y = startY; y <= endY; y += spacing) {
      lines.push(
        <Line
          key={`h-${y}`}
          points={[startX, y, endX, y]}
          stroke={y === 0 ? "#6b7280" : "#d1d5db"} // Lighter color for X-axis
          strokeWidth={y === 0 ? 2.0 : 0.8} // Reduced thickness
          opacity={y === 0 ? 0.8 : 0.4} // Reduced opacity for axes
          listening={false}
        />
      );
    }

    // Add coordinate labels if showCoordinates is enabled
    if (canvas.showCoordinates) {
      // Smart label spacing: show every grid line for zoom > 1.5, every 2 units otherwise
      const labelSpacing = canvas.zoom > 1.5 ? spacing : spacing * 2;
      
      // X-axis labels
      for (let x = startX; x <= endX; x += labelSpacing) {
        if (x !== 0) { // Skip origin
          const tikzValue = (x / 28); // Convert to TikZ coordinates
          // Only show integer values or clean half-integers
          const displayValue = tikzValue === Math.floor(tikzValue) ? 
            tikzValue.toFixed(0) : 
            (tikzValue * 2 === Math.floor(tikzValue * 2) ? tikzValue.toFixed(1) : tikzValue.toFixed(2));
          
          lines.push(
            <Text
              key={`label-x-${x}`}
              x={x}
              y={8}
              text={displayValue}
              fontSize={10}
              fill="#666666"
              align="center"
              verticalAlign="middle"
              listening={false}
            />
          );
        }
      }
      
      // Y-axis labels  
      for (let y = startY; y <= endY; y += labelSpacing) {
        if (y !== 0) { // Skip origin
          const tikzValue = (-y / 28); // Convert to TikZ coordinates (flip Y)
          // Only show integer values or clean half-integers
          const displayValue = tikzValue === Math.floor(tikzValue) ? 
            tikzValue.toFixed(0) : 
            (tikzValue * 2 === Math.floor(tikzValue * 2) ? tikzValue.toFixed(1) : tikzValue.toFixed(2));
          
          lines.push(
            <Text
              key={`label-y-${y}`}
              x={-15}
              y={y}
              text={displayValue}
              fontSize={10}
              fill="#666666"
              align="center"
              verticalAlign="middle"
              listening={false}
            />
          );
        }
      }
      

    }

    return lines;
  };

  // Handle wheel zoom
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    
    const stage = e.target.getStage();
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = Math.max(0.1, Math.min(5, oldScale * (1 + direction * 0.1)));

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    setZoom(newScale);
    setPan(newPos);
  }, [setZoom, setPan]);

  // Get world coordinates from pointer
  const getWorldPos = (stage: Konva.Stage) => {
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;
    
    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();
    return transform.point(pointer);
  };

  // Find nearby point for snapping
  const findNearbyPoint = (worldPos: { x: number; y: number; }) => {
    if (!canvas.snapToPoints) return null;
    
    const snapDistance = canvas.snapDistance;
    let closestTarget: any = null;
    let closestDistance = snapDistance;
    
    for (const obj of objects) {
      if (!obj.visible) continue;
      
      // Check main position for all objects (except lines which use points instead)
      if (obj.type !== 'line') {
        const distance = Math.sqrt(
          Math.pow(worldPos.x - obj.position.x, 2) + 
          Math.pow(worldPos.y - obj.position.y, 2)
        );
        
        if (distance <= closestDistance) {
          closestTarget = { point: obj.position, objectId: obj.id, distance, type: 'position' };
          closestDistance = distance;
        }
      }
      
      // Check specific points for lines, polygons, etc.
      if (obj.points && obj.points.length > 0) {
        for (let i = 0; i < obj.points.length; i++) {
          const point = obj.points[i];
          const pointDistance = Math.sqrt(
            Math.pow(worldPos.x - point.x, 2) + 
            Math.pow(worldPos.y - point.y, 2)
          );
          
          if (pointDistance <= closestDistance) {
            closestTarget = { 
              point, 
              objectId: obj.id, 
              distance: pointDistance, 
              pointIndex: i,
              type: obj.type === 'line' ? (i === 0 ? 'startpoint' : i === obj.points.length - 1 ? 'endpoint' : 'point') : 'point'
            };
            closestDistance = pointDistance;
          }
        }
      }
    }
    
    return closestTarget;
  };

  // Get snapped position or original if no snap
  const getSnappedPosition = (worldPos: { x: number; y: number; }) => {
    const nearbyPoint = findNearbyPoint(worldPos);
    return nearbyPoint ? nearbyPoint.point : worldPos;
  };

  // Get snap target for visual feedback
  const getSnapTarget = (worldPos: { x: number; y: number; }) => {
    return findNearbyPoint(worldPos);
  };

  // Find curve that point should be constrained to
  const findCurveForPoint = (worldPos: { x: number; y: number; }) => {
    const tolerance = 15; // pixels
    
    for (const obj of objects) {
      if (!obj.visible) continue;
      
      switch (obj.type) {
        case 'line':
          if (obj.points && obj.points.length >= 2) {
            // Check distance to line segment
            const [p1, p2] = obj.points;
            const distance = distanceToLineSegment(worldPos, p1, p2);
            if (distance <= tolerance) {
              return { object: obj, type: 'line' };
            }
          }
          break;
          
        case 'circle':
          // Check distance to circle circumference
          const distance = Math.sqrt(
            Math.pow(worldPos.x - obj.position.x, 2) + 
            Math.pow(worldPos.y - obj.position.y, 2)
          );
          const radius = obj.radius || 30;
          if (Math.abs(distance - radius) <= tolerance) {
            return { object: obj, type: 'circle' };
          }
          break;
      }
    }
    
    return null;
  };

  // Calculate distance from point to line segment
  const distanceToLineSegment = (point: { x: number; y: number; }, lineStart: { x: number; y: number; }, lineEnd: { x: number; y: number; }) => {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return Math.sqrt(A * A + B * B);
    
    let param = dot / lenSq;
    
    let xx, yy;
    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Get constrained position for point on curve
  const getConstrainedPosition = (worldPos: { x: number; y: number; }, constraintInfo: any) => {
    if (!constraintInfo) return worldPos;
    
    const { object, type } = constraintInfo;
    
    switch (type) {
      case 'line':
        if (object.points && object.points.length >= 2) {
          // Project point onto line
          const [p1, p2] = object.points;
          const A = worldPos.x - p1.x;
          const B = worldPos.y - p1.y;
          const C = p2.x - p1.x;
          const D = p2.y - p1.y;
          
          const dot = A * C + B * D;
          const lenSq = C * C + D * D;
          
          if (lenSq === 0) return p1;
          
          const param = Math.max(0, Math.min(1, dot / lenSq));
          
          return {
            x: p1.x + param * C,
            y: p1.y + param * D
          };
        }
        break;
        
      case 'circle':
        // Project point onto circle
        const distance = Math.sqrt(
          Math.pow(worldPos.x - object.position.x, 2) + 
          Math.pow(worldPos.y - object.position.y, 2)
        );
        
        if (distance === 0) return object.position;
        
        const radius = object.radius || 30;
        const ratio = radius / distance;
        
        return {
          x: object.position.x + (worldPos.x - object.position.x) * ratio,
          y: object.position.y + (worldPos.y - object.position.y) * ratio
        };
    }
    
    return worldPos;
  };

  // Handle mouse down
  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    const worldPos = getWorldPos(stage);
    if (!worldPos) return;

    // Debug logging removed for performance optimization

    // Cancel polygon drawing only if right-clicking or clicking outside canvas
    if (isPolygonDrawing && e.evt.button === 2) { // Right click
      cancelPolygon();
      return;
    }

    // Handle geometric construction mode
    if (constructionMode !== 'none') {
      const clickedObject = e.target;
      const objectId = clickedObject.getAttr('objectId');
      
      if (objectId) {
        addConstructionPoint(objectId);
      }
      return;
    }

    // Handle selection
    if (activeTool === 'select') {
      const clickedObject = e.target;
      if (clickedObject === stage) {
        // If Shift is pressed and clicking on empty space, start selection box
        if (e.evt.shiftKey) {
          startSelectionBox(worldPos);
        } else {
          clearSelection();
        }
      } else {
        const objectId = clickedObject.getAttr('objectId');
        if (objectId) {
          selectObject(objectId, e.evt.shiftKey);
        }
      }
      return;
    }

    // Handle polygon drawing
    if (activeTool === 'polygon') {
      const snappedPos = getSnappedPosition(worldPos);
      
      if (!isPolygonDrawing) {
        startPolygonDrawing(snappedPos);
      } else {
        // Check for double-click or close polygon
        const firstPoint = currentPolygonPoints[0];
        const distanceToFirst = Math.sqrt(
          Math.pow(snappedPos.x - firstPoint.x, 2) + Math.pow(snappedPos.y - firstPoint.y, 2)
        );
        
        if (distanceToFirst < 20 && currentPolygonPoints.length >= 3) {
          // Close polygon
          finishPolygon();
        } else {
          // Add new point
          addPolygonPoint(snappedPos);
        }
      }
      return;
    }

    // Handle geometric construction tools
    if (['perpendicular', 'parallel', 'midpoint', 'angle'].includes(activeTool)) {
      if (activeTool === 'perpendicular' || activeTool === 'parallel') {
        startConstruction('select_line', { tool: activeTool, throughPoint: worldPos });
      } else if (activeTool === 'midpoint') {
        startConstruction('select_two_points', { tool: activeTool });
      } else if (activeTool === 'angle') {
        startConstruction('select_two_points', { tool: activeTool });
      }
      return;
    }

    // Handle point creation
    if (activeTool === 'point') {
      // Check if point should be constrained to a curve
      const curveConstraint = findCurveForPoint(worldPos);
      
      if (curveConstraint) {
        // Create constrained point on curve
        const constrainedPos = getConstrainedPosition(worldPos, curveConstraint);
        addObject({
          type: 'point',
          name: generateObjectName('point'),
          visible: true,
          selected: false,
          showName: true,
          position: constrainedPos,
          stroke: '#f59e0b', // Different color for constrained points
          strokeWidth: 3,
          strokeOpacity: 1,
          fill: '#f59e0b',
          fillOpacity: 1,
          // Store constraint info
          baseLineId: curveConstraint.object.id,
          pointAId: curveConstraint.type, // Store constraint type
        });
      } else {
        // Create free point with snapping
        const snappedPos = getSnappedPosition(worldPos);
        addObject({
          type: 'point',
          name: generateObjectName('point'),
          visible: true,
          selected: false,
          showName: true,
          position: snappedPos,
          stroke: '#3b82f6',
          strokeWidth: 3,
          strokeOpacity: 1,
          fill: '#3b82f6',
          fillOpacity: 1,
        });
      }
      return;
    }

    // Handle text creation
    if (activeTool === 'text') {
      if (!isTextEditing) {
        const snappedPos = getSnappedPosition(worldPos);
        
        // Start text editing at the snapped position
        startTextEditing(snappedPos);
        setTextEditorValue('');
      } else {
        // If text editor is open and clicking outside, cancel it
        cancelTextEditing();
        setTextEditorValue('');
      }
      return;
    }

    // Handle image upload
    if (activeTool === 'image') {
      const snappedPos = getSnappedPosition(worldPos);
      handleImageUpload(snappedPos);
      return;
    }

    // Handle standard drawing tools
    if (['line', 'rectangle', 'circle'].includes(activeTool)) {
      const snappedPos = getSnappedPosition(worldPos);
      startDrawing(snappedPos);
    }
  }, [
    activeTool, 
    constructionMode, 
    isPolygonDrawing, 
    currentPolygonPoints,
    isDrawing,
    isTextEditing,
    textEditorPosition,
    canvas.zoom,
    canvas.pan,
    clearSelection, 
    selectObject, 
    addObject, 
    generateObjectName, 
    startDrawing,
    startPolygonDrawing,
    addPolygonPoint,
    finishPolygon,
    cancelPolygon,
    startConstruction,
    addConstructionPoint,
    startSelectionBox,
    getSnappedPosition,
    getConstrainedPosition,
    findCurveForPoint,
    startTextEditing,
    cancelTextEditing,
    setTextEditorValue,
    handleImageUpload
  ]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    const worldPos = getWorldPos(stage);
    if (!worldPos) return;

    setMousePosition(worldPos);

    // Update selection box if active
    if (isSelectionBoxActive) {
      updateSelectionBox(worldPos);
      return;
    }

    // Check for snap targets
    if (canvas.snapToPoints && ['point', 'line', 'rectangle', 'circle'].includes(activeTool)) {
      const target = getSnapTarget(worldPos);
      setSnapTarget(target);
    } else {
      setSnapTarget(null);
    }

    if (isDrawing && activeTool !== 'select') {
      // Apply snapping to the current mouse position during drawing
      const snappedPos = getSnappedPosition(worldPos);
      // Check if Shift key is pressed for rectangle drawing
      const shiftPressed = e.evt.shiftKey;
      updateDrawing(snappedPos, shiftPressed);
    }
  }, [isDrawing, updateDrawing, canvas.snapToPoints, canvas.snapDistance, objects, activeTool, getSnappedPosition, isSelectionBoxActive, updateSelectionBox]);

  // Handle mouse up
  const handleMouseUp = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isSelectionBoxActive) {
      finishSelectionBox();
    } else if (isDrawing) {
      finishDrawing();
    }
  }, [isSelectionBoxActive, finishSelectionBox, isDrawing, finishDrawing]);

  // Handle drag to pan
  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    setPan({
      x: e.target.x(),
      y: e.target.y(),
    });
  }, [setPan]);

  // Render drawing object
  const renderObject = (obj: DrawingObject) => {
    const isSelected = selectedObjectIds.includes(obj.id);
    // Convert stroke style to Konva dash pattern
    const getDashArray = (style?: string) => {
      switch (style) {
        case 'dashed': return [10, 5];
        case 'dotted': return [2, 2];
        case 'dashdot': return [10, 5, 2, 5];
        default: return [];
      }
    };

    // Convert stroke and fill to include opacity
    const getColorWithOpacity = (color: string, opacity?: number) => {
      if (color === 'transparent') return undefined;
      if (!opacity || opacity === 1) return color;
      
      // Convert hex to rgba
      if (color.startsWith('#')) {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
      }
      return color;
    };

    const commonProps = {
      objectId: obj.id,
      stroke: getColorWithOpacity(obj.stroke, obj.strokeOpacity),
      strokeWidth: obj.strokeWidth,
      dash: getDashArray(obj.strokeStyle),
      fill: obj.fill === 'transparent' ? 'transparent' : getColorWithOpacity(obj.fill, obj.fillOpacity),
      opacity: obj.visible ? 1 : 0.5,
      listening: true,
      // Selection effects - subtle indication only
      shadowEnabled: isSelected,
      shadowColor: '#3b82f6',
      shadowBlur: isSelected ? 8 : 0,
      shadowOffset: { x: 0, y: 0 },
      onDragStart: (e: any) => {
        e.cancelBubble = true;
        e.target.getStage().container().style.cursor = 'grabbing';
      },
      onDragMove: (e: any) => {
        e.cancelBubble = true;
        
        let newPos = { x: e.target.x(), y: e.target.y() };
        
        // Handle constrained points (points on curves) - only update visual position
        if (obj.type === 'point' && obj.baseLineId && obj.pointAId) {
          const constraintObject = objects.find(o => o.id === obj.baseLineId);
          if (constraintObject) {
            const constraintInfo = { object: constraintObject, type: obj.pointAId };
            newPos = getConstrainedPosition(newPos, constraintInfo);
          }
        }
        
        // Handle circle snapping to points during drag
        if (obj.type === 'circle' && canvas.snapToPoints) {
          const snapTarget = findNearbyPoint(newPos);
          if (snapTarget) {
            newPos = snapTarget.point;
          }
        }
        
        // For images, position is center for display but we need to track top-left internally
        // during drag move, just set the visual position directly
        e.target.position(newPos);
      },
      onDragEnd: (e: any) => {
        e.cancelBubble = true;
        e.target.getStage().container().style.cursor = 'default';
        
        let newPos = { x: e.target.x(), y: e.target.y() };
        
        // Handle constrained points (points on curves)
        if (obj.type === 'point' && obj.baseLineId && obj.pointAId) {
          const constraintObject = objects.find(o => o.id === obj.baseLineId);
          if (constraintObject) {
            const constraintInfo = { object: constraintObject, type: obj.pointAId };
            newPos = getConstrainedPosition(newPos, constraintInfo);
          }
        }
        
        // Handle circle snapping to points
        if (obj.type === 'circle' && canvas.snapToPoints) {
          const snapTarget = findNearbyPoint(newPos);
          if (snapTarget) {
            newPos = snapTarget.point;
          }
        }
        
        // UNIFIED logic for all objects with points (line, polygon, etc.)
        if ((obj.type === 'line' || obj.type === 'polygon') && obj.points && obj.points.length > 0) {
          // For objects with points: drag delta = visual position change
          const deltaX = newPos.x;  // newPos is the drag delta since we render at (0,0)
          const deltaY = newPos.y;
          
          const updatedPoints = obj.points.map(point => ({
            x: point.x + deltaX,
            y: point.y + deltaY
          }));
          
          useAppStore.getState().updateObject(obj.id, { 
            position: { x: 0, y: 0 }, // Reset position since points are absolute
            points: updatedPoints
          });
          
          // Reset visual position after updating data
          e.target.position({ x: 0, y: 0 });
        } else {
          // Handle image position update - convert from center back to top-left corner
          if (obj.type === 'image') {
            const adjustedPos = {
              x: newPos.x - (obj.width || 200) / 2,
              y: newPos.y - (obj.height || 150) / 2
            };
            useAppStore.getState().updateObject(obj.id, { position: adjustedPos });
          } else {
            // Simple position update for shapes without points
            useAppStore.getState().updateObject(obj.id, { position: newPos });
          }
        }
        
        // Update constrained objects
        useAppStore.getState().updateConstrainedObjects(obj.id);
        
        useAppStore.getState().saveToHistory();
      },
      draggable: isSelected && activeTool === 'select',
    };

    switch (obj.type) {
      case 'point':
        return (
          <Circle
            key={obj.id}
            {...commonProps}
            x={obj.position.x}
            y={obj.position.y}
            radius={obj.strokeWidth || 3}
            fill={obj.stroke}
          />
        );

      case 'circle':
        return (
          <Circle
            key={obj.id}
            {...commonProps}
            x={obj.position.x}
            y={obj.position.y}
            radius={obj.radius || 30}
          />
        );

      case 'rectangle':
        return (
          <Rect
            key={obj.id}
            {...commonProps}
            x={obj.position.x}
            y={obj.position.y}
            width={obj.width || 80}
            height={obj.height || 60}
          />
        );

      case 'line':
        if (obj.points && obj.points.length >= 2) {
          const points = obj.points.flatMap(p => [p.x, p.y]);
          const elements = [];
          
          // Render the main line - points are absolute, no position offset needed
          elements.push(
            <Line
              key={obj.id}
              {...commonProps}
              x={0}
              y={0}
              points={points}
            />
          );
          
          // Render arrows if specified
          const startPoint = obj.points[0];
          const endPoint = obj.points[obj.points.length - 1];
          
          // Calculate arrow size based on stroke width
          const arrowSize = Math.max(8, obj.strokeWidth * 3);
          
          // Start arrow
          if (obj.arrowStart && obj.arrowStart !== 'none' && obj.points.length >= 2) {
            const secondPoint = obj.points[1];
            const angle = Math.atan2(secondPoint.y - startPoint.y, secondPoint.x - startPoint.x);
            const arrowPoints = getArrowPoints(startPoint.x, startPoint.y, angle + Math.PI, arrowSize, obj.arrowStart);
            
            elements.push(
              <Line
                key={`${obj.id}-arrow-start`}
                id={`${obj.id}-arrow-start`}
                points={arrowPoints}
                fill={obj.stroke}
                stroke={obj.stroke}
                strokeWidth={obj.strokeWidth}
                closed={true}
                listening={false}
                draggable={false}
              />
            );
          }
          
          // End arrow
          if (obj.arrowEnd && obj.arrowEnd !== 'none' && obj.points.length >= 2) {
            const secondToLastPoint = obj.points[obj.points.length - 2];
            const angle = Math.atan2(endPoint.y - secondToLastPoint.y, endPoint.x - secondToLastPoint.x);
            const arrowPoints = getArrowPoints(endPoint.x, endPoint.y, angle, arrowSize, obj.arrowEnd);
            
            elements.push(
              <Line
                key={`${obj.id}-arrow-end`}
                id={`${obj.id}-arrow-end`}
                points={arrowPoints}
                fill={obj.stroke}
                stroke={obj.stroke}
                strokeWidth={obj.strokeWidth}
                closed={true}
                listening={false}
                draggable={false}
              />
            );
          }
          
          return elements;
        }
        return null;

      case 'text':
        const text = obj.text || 'Text';
        const fontSize = obj.fontSize || 16;
        const textWidth = text.length * fontSize * 0.5;
        return (
          <Text
            key={obj.id}
            {...commonProps}
            x={obj.position.x}
            y={obj.position.y}
            text={text}
            fontSize={fontSize}
            fontFamily={obj.fontFamily || 'Arial'}
            fontStyle={obj.fontStyle === 'italic' ? 'italic' : 'normal'}
            fontWeight={obj.fontWeight === 'bold' ? 'bold' : 'normal'}
            textDecoration={obj.textDecoration === 'underline' ? 'underline' : ''}
            fill={getColorWithOpacity(obj.stroke, obj.strokeOpacity)}
            align="left"
            verticalAlign="middle"
            offsetX={textWidth / 2}
          />
        );

      case 'polygon':
        if (obj.points && obj.points.length >= 3) {
          const points = obj.points.flatMap(p => [p.x, p.y]);
          return (
            <Line
              key={obj.id}
              {...commonProps}
              x={0}
              y={0}
              points={points}
              closed={true}
            />
          );
        }
        return null;

      case 'angle':
        if (obj.points && obj.points.length >= 3) {
          const [pointA, vertex, pointC] = obj.points;
          const radius = 30;
          
          // Calculate angles
          const angleA = Math.atan2(pointA.y - vertex.y, pointA.x - vertex.x);
          const angleC = Math.atan2(pointC.y - vertex.y, pointC.x - vertex.x);
          
          return (
            <>
              {/* Angle arc */}
              <Circle
                key={`${obj.id}-arc`}
                {...commonProps}
                x={vertex.x}
                y={vertex.y}
                radius={radius}
                angle={Math.abs(angleC - angleA) * 180 / Math.PI}
                rotation={Math.min(angleA, angleC) * 180 / Math.PI}
              />
              {/* Angle value text */}
              <Text
                key={`${obj.id}-text`}
                x={vertex.x + radius * 0.7}
                y={vertex.y - 10}
                text={`${Math.round(obj.angleValue || 0)}°`}
                fontSize={12}
                fill={obj.stroke}
                listening={false}
              />
            </>
          );
        }
        return null;

      case 'image':
        if (obj.imageData && obj.width && obj.height) {
          return (
            <ImageObject
              key={obj.id}
              obj={obj}
              commonProps={commonProps}
            />
          );
        }
        return null;

      default:
        return null;
    }
  };

  // Render preview object
  const renderPreview = () => {
    const elements = [];
    
    // Render regular preview object
    if (previewObject) {
      const previewProps = {
        ...previewObject,
        stroke: '#3b82f6',
        strokeWidth: 2,
        opacity: 0.7,
        listening: false,
      };
      elements.push(renderObject(previewProps));
    }
    
    // Render polygon drawing preview
    if (isPolygonDrawing && currentPolygonPoints.length > 0) {
      // Render points
      currentPolygonPoints.forEach((point, index) => {
        elements.push(
          <Circle
            key={`polygon-point-${index}`}
            x={point.x}
            y={point.y}
            radius={4}
            fill="#3b82f6"
            opacity={0.8}
            listening={false}
          />
        );
      });
      
      // Render lines between points
      if (currentPolygonPoints.length > 1) {
        const points = currentPolygonPoints.flatMap(p => [p.x, p.y]);
        elements.push(
          <Line
            key="polygon-preview-line"
            points={points}
            stroke="#3b82f6"
            strokeWidth={2}
            opacity={0.6}
            listening={false}
            dash={[5, 5]}
          />
        );
      }
      
      // Show first point highlight when can close polygon
      if (currentPolygonPoints.length >= 3) {
        elements.push(
          <Circle
            key="polygon-close-hint"
            x={currentPolygonPoints[0].x}
            y={currentPolygonPoints[0].y}
            radius={8}
            stroke="#10b981"
            strokeWidth={2}
            fill="transparent"
            opacity={0.8}
            listening={false}
          />
        );
      }
    }
    
    return elements;
  };

  // Render selection handles for selected objects
  const renderSelectionHandles = () => {
    return selectedObjectIds.map(objectId => {
      const obj = objects.find(o => o.id === objectId);
      if (!obj || !obj.visible) return null;

      let bounds = { x: 0, y: 0, width: 0, height: 0 };
      
      switch (obj.type) {
        case 'point':
          const radius = obj.strokeWidth || 3;
          bounds = {
            x: obj.position.x - radius - 5,
            y: obj.position.y - radius - 5,
            width: (radius + 5) * 2,
            height: (radius + 5) * 2
          };
          break;
        case 'circle':
          const circleRadius = obj.radius || 30;
          bounds = {
            x: obj.position.x - circleRadius - 5,
            y: obj.position.y - circleRadius - 5,
            width: (circleRadius + 5) * 2,
            height: (circleRadius + 5) * 2
          };
          break;
        case 'rectangle':
          bounds = {
            x: obj.position.x - 5,
            y: obj.position.y - 5,
            width: (obj.width || 80) + 10,
            height: (obj.height || 60) + 10
          };
          break;
        case 'line':
        case 'polygon':
          if (obj.points && obj.points.length > 0) {
            const xs = obj.points.map(p => p.x);
            const ys = obj.points.map(p => p.y);
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);
            bounds = {
              x: minX - 5,
              y: minY - 5,
              width: maxX - minX + 10,
              height: maxY - minY + 10
            };
          }
          break;
        case 'image':
          bounds = {
            x: obj.position.x - 5,
            y: obj.position.y - 5,
            width: (obj.width || 200) + 10,
            height: (obj.height || 150) + 10
          };
          break;
        case 'text':
          // Text is centered, so calculate bounds around center
          const fontSize = obj.fontSize || 16;
          const textWidth = (obj.text?.length || 4) * fontSize * 0.6;
          const textHeight = fontSize;
          bounds = {
            x: obj.position.x - textWidth/2 - 5,
            y: obj.position.y - textHeight/2 - 5,
            width: textWidth + 10,
            height: textHeight + 10
          };
          break;
        default:
          bounds = {
            x: obj.position.x - 20,
            y: obj.position.y - 20,
            width: 40,
            height: 40
          };
      }

      return (
        <Rect
          key={`selection-${objectId}`}
          x={bounds.x}
          y={bounds.y}
          width={bounds.width}
          height={bounds.height}
          stroke="#3b82f6"
          strokeWidth={1}
          dash={[2, 2]}
          fill="transparent"
          listening={false}
        />
      );
    });
  };

  // Render object names
  const renderObjectNames = () => {
    return objects.filter(obj => obj.visible && obj.showName).map(obj => {
      // Use custom name position if set, otherwise calculate default
      let namePosition = { x: obj.position.x, y: obj.position.y };
      
      if (obj.namePosition) {
        namePosition = {
          x: obj.position.x + obj.namePosition.x,
          y: obj.position.y + obj.namePosition.y
        };
      } else {
        // Default positioning logic - consistent with expected behavior from image
        switch (obj.type) {
          case 'circle':
            namePosition.x = obj.position.x;
            namePosition.y = obj.position.y - (obj.radius || 30) - 20; // Above circle
            break;
          case 'rectangle':
            namePosition.x = obj.position.x + (obj.width || 80) + 10; // Right side of rectangle
            namePosition.y = obj.position.y + (obj.height || 60) / 2; // Center vertically
            break;
          case 'point':
            namePosition.x = obj.position.x + 10; // Right of point
            namePosition.y = obj.position.y - 15; // Above point
            break;
          case 'image':
            // Image position is top-left corner, so calculate center for name
            namePosition.x = obj.position.x + (obj.width || 200) / 2; // Center horizontally
            namePosition.y = obj.position.y + (obj.height || 150) + 15; // Below image
            break;
          case 'text':
            // Text is centered, so position name above it
            const fontSize = obj.fontSize || 16;
            namePosition.x = obj.position.x;
            namePosition.y = obj.position.y - fontSize / 2 - 15; // Above text
            break;
          default:
            namePosition.x = obj.position.x;
            namePosition.y = obj.position.y - 15; // Above object
        }
      }

      const handleNameDragEnd = (e: any) => {
        // Prevent event bubbling to avoid background drag
        e.cancelBubble = true;
        
        const textPos = e.target.position();
        
        // Calculate relative offset from object position
        const offset = {
          x: textPos.x - obj.position.x,
          y: textPos.y - obj.position.y
        };
        
        useAppStore.getState().updateObject(obj.id, { namePosition: offset });
      };

      const handleNameDragStart = (e: any) => {
        // Prevent background from being dragged
        e.cancelBubble = true;
      };

      return [
        // Render shadow for bold effect
        obj.nameStyle?.fontWeight === 'bold' && (
          <Text
            key={`name-${obj.id}-shadow`}
            x={namePosition.x + 0.5}
            y={namePosition.y}
            text={obj.name}
            fontSize={obj.nameStyle?.fontSize || 12}
            fontFamily="Arial"
            fill={obj.nameStyle?.color || "#666"}
            listening={false}
            opacity={0.6}
            skewX={obj.nameStyle?.fontStyle === 'italic' ? -0.3 : 0}
          />
        ),
        <Text
          key={`name-${obj.id}`}
          x={namePosition.x}
          y={namePosition.y}
          text={obj.name}
          fontSize={obj.nameStyle?.fontSize || 12}
          fontFamily="Arial"
          fill={obj.nameStyle?.color || "#666"}
          listening={activeTool === 'select'}
          textDecoration={obj.nameStyle?.textDecoration === 'underline' ? 'underline' : ''}
          skewX={obj.nameStyle?.fontStyle === 'italic' ? -0.3 : 0}
          draggable={activeTool === 'select'}
          onDragStart={handleNameDragStart}
          onDragEnd={handleNameDragEnd}
          style={{ cursor: activeTool === 'select' ? 'move' : 'default' }}
        />
      ].filter(Boolean);
    });
  };

  // Render curve highlights when point tool is active
  const renderCurveHighlights = () => {
    if (activeTool !== 'point') return [];
    
    return objects.filter(obj => obj.visible && (obj.type === 'line' || obj.type === 'circle')).map(obj => {
      const highlightProps = {
        stroke: '#ff6b35',
        strokeWidth: 1,
        dash: [2, 2],
        opacity: 0.6,
        listening: false,
      };

      switch (obj.type) {
        case 'line':
          if (obj.points && obj.points.length >= 2) {
            const points = obj.points.flatMap(p => [p.x, p.y]);
            return (
              <Line
                key={`highlight-${obj.id}`}
                {...highlightProps}
                points={points}
              />
            );
          }
          break;
          
        case 'circle':
          return (
            <Circle
              key={`highlight-${obj.id}`}
              {...highlightProps}
              x={obj.position.x}
              y={obj.position.y}
              radius={obj.radius || 30}
              fill="transparent"
            />
          );
      }
      
      return null;
    });
  };

  // Render snap indicators
  const renderSnapIndicators = () => {
    if (!snapTarget) return null;

    return (
      <Circle
        key="snap-indicator"
        x={snapTarget.point.x}
        y={snapTarget.point.y}
        radius={8}
        stroke="#3b82f6"
        strokeWidth={2}
        fill="transparent"
        dash={[3, 3]}
        opacity={0.8}
        listening={false}
      />
    );
  };

  // Render selection box
  const renderSelectionBox = () => {
    if (!isSelectionBoxActive || !selectionBoxStart || !selectionBoxEnd) {
      return null;
    }

    const x = Math.min(selectionBoxStart.x, selectionBoxEnd.x);
    const y = Math.min(selectionBoxStart.y, selectionBoxEnd.y);
    const width = Math.abs(selectionBoxEnd.x - selectionBoxStart.x);
    const height = Math.abs(selectionBoxEnd.y - selectionBoxStart.y);

    return (
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="rgba(59, 130, 246, 0.1)"
        stroke="#3b82f6"
        strokeWidth={1}
        dash={[5, 5]}
        listening={false}
      />
    );
  };

  // Handle text editor
  const handleTextSubmit = useCallback(() => {
    if (textEditorValue.trim()) {
      finishTextEditing(textEditorValue.trim(), isMathMode);
      setTextEditorValue('');
      setIsMathMode(false);
    }
  }, [textEditorValue, finishTextEditing, isMathMode]);

  const handleTextCancel = useCallback(() => {
    setTextEditorValue('');
    setIsMathMode(false);
    cancelTextEditing();
  }, [cancelTextEditing]);

  const handleTextKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      handleTextSubmit();
    } else if (e.key === 'Escape') {
      handleTextCancel();
    }
  }, [handleTextSubmit, handleTextCancel]);



  return (
    <div className="w-full h-full relative bg-gray-50 overflow-hidden">
      {/* Canvas Controls */}
      <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-sm border border-gray-200 p-2">
        <div className="flex items-center space-x-2 text-sm">
          <label className="flex items-center space-x-1">
            <input
              type="checkbox"
              checked={canvas.gridVisible}
              onChange={(e) => updateCanvasSettings({ gridVisible: e.target.checked })}
              className="w-3 h-3"
            />
            <span>Grid</span>
          </label>

          <span className="text-gray-400">|</span>
          <label className="flex items-center space-x-1">
            <input
              type="checkbox"
              checked={canvas.snapToPoints}
              onChange={(e) => updateCanvasSettings({ snapToPoints: e.target.checked })}
              className="w-3 h-3"
            />
            <span>Snap</span>
          </label>
          <span className="text-gray-400">|</span>
          <span className="text-gray-600">
            Zoom: {Math.round(canvas.zoom * 100)}%
          </span>
          <span className="text-gray-400">|</span>
          <span className="text-gray-600">
            Objects: {objects.length}
          </span>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 z-10 bg-white rounded-lg shadow-sm border border-gray-200 p-3 max-w-sm">
        <p className="text-sm text-gray-600">
          <strong>Controls:</strong> Mouse wheel to zoom, drag to pan.
          {activeTool === 'select' && ' Click objects to select, drag to move.'}
          {activeTool === 'point' && ' Click to place points.'}
          {activeTool === 'polygon' && (
            isPolygonDrawing 
              ? ' Click to add points. Click first point or press Enter to finish.'
              : ' Click to start drawing. Add multiple points.'
          )}
          {['perpendicular', 'parallel'].includes(activeTool) && constructionMode === 'select_line' && ' Click on a line first.'}
          {activeTool === 'midpoint' && constructionMode === 'select_two_points' && ` Select ${constructionStep === 0 ? 'first' : 'second'} point.`}
          {activeTool === 'angle' && constructionMode === 'select_two_points' && ` Select ${constructionStep === 0 ? 'first' : 'second'} point for angle.`}
          {!['select', 'point', 'polygon', 'perpendicular', 'parallel', 'midpoint', 'angle'].includes(activeTool) && ' Click and drag to draw.'}
        </p>
      </div>

      {/* Konva Stage */}
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        scaleX={canvas.zoom}
        scaleY={canvas.zoom}
        x={canvas.pan.x}
        y={canvas.pan.y}
        draggable={activeTool === 'pan' || (activeTool === 'select' && selectedObjectIds.length === 0 && !isSelectionBoxActive)}
        onWheel={handleWheel}
        onDragEnd={handleDragEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ cursor: activeTool === 'pan' ? 'grab' : 'default' }}
      >
        {/* Grid Layer */}
        <Layer listening={false}>
          {generateGrid()}
        </Layer>

        {/* Objects Layer */}
        <Layer>
          {/* Render other objects first */}
          {objects.filter(obj => obj.type !== 'point').map(renderObject)}
          {renderPreview()}
          {renderCurveHighlights()}
          {renderSnapIndicators()}
          {renderSelectionBox()}
          {/* Top layer: Points and names always on top */}
          {objects.filter(obj => obj.type === 'point').map(renderObject)}
          {renderObjectNames()}
        </Layer>
      </Stage>

      {/* Text Editor Overlay */}
      {isTextEditing && textEditorPosition && (
        <div
          className="absolute z-20 bg-white border border-blue-400 rounded shadow-lg p-2"
          style={{
            left: Math.max(10, Math.min(stageSize.width - 200, textEditorPosition.x * canvas.zoom + canvas.pan.x - 50)),
            top: Math.max(10, Math.min(stageSize.height - 100, textEditorPosition.y * canvas.zoom + canvas.pan.y - 35)),
          }}
        >
          <input
            type="text"
            value={textEditorValue}
            onChange={(e) => setTextEditorValue(e.target.value)}
            onKeyDown={handleTextKeyDown}
            placeholder="Enter text..."
            className="text-sm border-none outline-none bg-transparent min-w-[120px]"
            autoFocus
          />
          <div className="flex gap-1 mt-1">
            <button
              onClick={handleTextSubmit}
              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              ✓
            </button>
            <button
              onClick={handleTextCancel}
              className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              ✕
            </button>
            <button
              onClick={() => setIsMathMode((v) => !v)}
              className={`px-2 py-1 text-xs rounded ${isMathMode ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'} hover:bg-green-600`}
              title="Math Mode"
            >
              f(x)
            </button>
          </div>
        </div>
      )}


    </div>
  );
} 