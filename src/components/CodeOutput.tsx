'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Download, Eye, EyeOff, Grid, FileText, Hash, Type } from 'lucide-react';
import type { DrawingObject } from '@/lib/store';

interface CodeOutputProps {
  objects?: DrawingObject[];
  onCopy?: () => void;
  onExport?: () => void;
}

export default function CodeOutput({ objects = [], onCopy, onExport }: CodeOutputProps) {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showCoordinates, setShowCoordinates] = useState(false);
  const [showDocumentWrapper, setShowDocumentWrapper] = useState(true);
  const [showNameComments, setShowNameComments] = useState(true);
  const [showNameLabels, setShowNameLabels] = useState(true);

  // Convert color hex to TikZ color name or RGB
  const formatColor = (color: string, opacity?: number) => {
    if (color === 'transparent') return 'transparent';
    
    const colorMap: { [key: string]: string } = {
      '#000000': 'black',
      '#ffffff': 'white',
      '#3b82f6': 'blue',
      '#ef4444': 'red',
      '#10b981': 'green',
      '#f59e0b': 'orange',
      '#8b5cf6': 'violet',
      '#ec4899': 'pink',
      '#6b7280': 'gray',
      '#1f2937': 'darkgray',
    };
    
    let baseColor = colorMap[color.toLowerCase()];
    
    if (!baseColor) {
      // Define custom color using HTML hex value (ensure consistent case)
      const colorName = `customcolor${color.toLowerCase().slice(1).toUpperCase()}`;
      baseColor = colorName;
      // We'll add the color definition in the header
    }
    
    // Add opacity if specified and not 1
    if (opacity && opacity < 1) {
      return `${baseColor}, opacity=${opacity.toFixed(2)}`;
    }
    
    return baseColor;
  };

  // Convert pixels to TikZ units (match canvas grid spacing: 28px = 1cm)
  const pixelToTikZ = (pixels: number) => {
    const value = pixels / 28;
    // Smart formatting: integers, clean halves, or 2 decimal places
    if (value === Math.floor(value)) {
      return value.toFixed(0); // Integer
    } else if (value * 2 === Math.floor(value * 2)) {
      return value.toFixed(1); // Half-integer (0.5, 1.5, etc.)
    } else {
      return value.toFixed(2); // Two decimal places
    }
  };

  // Convert canvas coordinates to TikZ coordinates
  const canvasToTikZ = (canvasPos: { x: number; y: number }) => {
    const offset = getOriginOffset();
    return {
      x: pixelToTikZ(canvasPos.x - offset.x),
      y: pixelToTikZ(-(canvasPos.y - offset.y)) // Flip Y-axis for mathematical coordinate system
    };
  };

  // Calculate center offset based on object distribution
  const getOriginOffset = () => {
    // Match Canvas coordinate system: fixed origin at center (0,0)
    // Canvas grid has origin at center, so TikZ should use same reference
    return { x: 0, y: 0 };
  };

  // Generate TikZ code for a single object
  const generateObjectCode = (obj: DrawingObject) => {
    if (!obj.visible) return ''; // Skip invisible objects

    const offset = getOriginOffset();
    // Use direct Canvas coordinates with simple conversion
    const x = pixelToTikZ(obj.position.x - offset.x);
    const y = pixelToTikZ(-(obj.position.y - offset.y)); // Flip Y axis for mathematical coordinate system
    const strokeColor = formatColor(obj.stroke, obj.strokeOpacity);
    const fillColor = obj.fill === 'transparent' ? '' : `, fill=${formatColor(obj.fill, obj.fillOpacity)}`;
    const strokeWidth = obj.strokeWidth > 2 ? `, line width=${(obj.strokeWidth * 0.5).toFixed(1)}pt` : obj.strokeWidth < 1 ? ', ultra thin' : obj.strokeWidth < 2 ? ', thin' : '';
    
    // Handle stroke styles (dashed, dotted, etc.)
    const getStrokeStyle = (style?: string) => {
      switch (style) {
        case 'dashed': return ', dashed';
        case 'dotted': return ', dotted';
        case 'dashdot': return ', dash dot';
        default: return '';
      }
    };
    const strokeStyle = getStrokeStyle(obj.strokeStyle);
    
    let code = '';
    let comment = (obj.showName && showNameComments) ? `  % ${obj.name}\n` : '';

    // Generate name label if showName is enabled
    const generateNameLabel = (offset: { x: number; y: number }) => {
      if (!obj.showName || !showNameLabels) return '';
      
      let nameX: string;
      let nameY: string;
      
      if (obj.namePosition) {
        // Use actual Canvas name position (already dragged by user)
        const actualNameX = obj.position.x + obj.namePosition.x;
        const actualNameY = obj.position.y + obj.namePosition.y;
        nameX = pixelToTikZ(actualNameX - offset.x);
        nameY = pixelToTikZ(-(actualNameY - offset.y)); // Flip Y for mathematical coordinates
      } else {
        // No custom name position - use actual Canvas default positioning logic
        // Get the same position calculation as Canvas.tsx uses
        let canvasNameX: number;
        let canvasNameY: number;
        
        switch (obj.type) {
          case 'circle':
            canvasNameX = obj.position.x;
            canvasNameY = obj.position.y - (obj.radius || 30) - 20; // Above circle
            break;
          case 'rectangle':
            canvasNameX = obj.position.x + (obj.width || 80) + 10; // Right side of rectangle
            canvasNameY = obj.position.y + (obj.height || 60) / 2; // Center vertically
            break;
          case 'point':
            canvasNameX = obj.position.x + 10; // Right of point
            canvasNameY = obj.position.y - 15; // Above point
            break;
          case 'image':
            // Image position is top-left corner, but we want name below the image
            canvasNameX = obj.position.x + (obj.width || 200) / 2; // Center horizontally
            canvasNameY = obj.position.y + (obj.height || 150) + 15; // Below image
            break;
          case 'text':
            // Text is centered, so position name above it
            const fontSize = obj.fontSize || 16;
            canvasNameX = obj.position.x;
            canvasNameY = obj.position.y - fontSize / 2 - 15; // Above text
            break;
          default:
            canvasNameX = obj.position.x;
            canvasNameY = obj.position.y - 15; // Above object
        }
        
        // Convert Canvas name position to TikZ coordinates
        nameX = pixelToTikZ(canvasNameX - offset.x);
        nameY = pixelToTikZ(-(canvasNameY - offset.y)); // Flip Y for mathematical coordinates
      }
      
      // Format name style
      const nameStyle = obj.nameStyle;
      let nameStyleOptions = '';
      if (nameStyle?.fontSize) {
        // Use safe font size range (8-18pt) for names to avoid LaTeX font errors
        const scaledNameFontSize = Math.max(8, Math.min(nameStyle.fontSize * 1.0, 18));
        
        // Use LaTeX font size commands for better compatibility
        let nameFontSizeCommand = '';
        if (scaledNameFontSize <= 8) nameFontSizeCommand = '\\tiny';
        else if (scaledNameFontSize <= 9) nameFontSizeCommand = '\\scriptsize';
        else if (scaledNameFontSize <= 10) nameFontSizeCommand = '\\footnotesize';
        else if (scaledNameFontSize <= 11) nameFontSizeCommand = '\\small';
        else if (scaledNameFontSize <= 12) nameFontSizeCommand = '\\normalsize';
        else if (scaledNameFontSize <= 14) nameFontSizeCommand = '\\large';
        else if (scaledNameFontSize <= 17) nameFontSizeCommand = '\\Large';
        else nameFontSizeCommand = '\\LARGE';
        
        nameStyleOptions += `, font=${nameFontSizeCommand}`;
      }
      if (nameStyle?.color && nameStyle.color !== '#666666') {
        nameStyleOptions += `, ${formatColor(nameStyle.color)}`;
      }
      
      // Build text styling for name
      let styledName = obj.name;
      
      // Apply text styling
      if (nameStyle?.fontWeight === 'bold') styledName = `\\textbf{${styledName}}`;
      if (nameStyle?.fontStyle === 'italic') styledName = `\\textit{${styledName}}`;
      if (nameStyle?.textDecoration === 'underline') styledName = `\\uline{${styledName}}`;
      if (nameStyle?.textDecoration === 'overline') styledName = `\\overline{${styledName}}`;
      
      return `  \\node[anchor=center${nameStyleOptions}] at (${nameX},${nameY}) {$${styledName}$};\n`;
    };

    switch (obj.type) {
      case 'point':
        code = `  \\fill[${strokeColor}] (${x},${y}) circle (${(obj.strokeWidth * 0.6).toFixed(1)}pt);\n`;
        break;

      case 'circle':
        const radius = pixelToTikZ(obj.radius || 30);
        
        // Build options following TikZ conventions
        let circleOptions = [];
        if (strokeColor) circleOptions.push(strokeColor);
        if (strokeWidth) circleOptions.push(strokeWidth.replace(', ', ''));
        if (strokeStyle) circleOptions.push(strokeStyle.replace(', ', ''));
        
        // Handle fill/draw actions based on TikZ design principles
        let action = '\\draw';
        if (obj.fill !== 'transparent' && fillColor) {
          if (obj.stroke !== 'transparent') {
            action = '\\filldraw'; // Both fill and draw
            circleOptions.push(fillColor.replace(', fill=', 'fill='));
          } else {
            action = '\\fill'; // Fill only
            circleOptions = [fillColor.replace(', fill=', '')];
          }
        }
        
        const circleOptionsStr = circleOptions.length > 0 ? `[${circleOptions.join(', ')}]` : '';
        code = `  ${action}${circleOptionsStr} (${x},${y}) circle (${radius});\n`;
        break;

      case 'rectangle':
        const width = pixelToTikZ(obj.width || 80);
        const height = pixelToTikZ(obj.height || 60);
        
        // IMPORTANT: Canvas position is top-left, but TikZ rectangle expects bottom-left
        // Convert from Canvas top-left to TikZ bottom-left coordinate
        const canvasTopLeft = { x: obj.position.x, y: obj.position.y };
        const canvasBottomLeft = { x: canvasTopLeft.x, y: canvasTopLeft.y + (obj.height || 60) };
        
        // Convert Canvas bottom-left to TikZ coordinates
        const tikzBottomLeftX = pixelToTikZ(canvasBottomLeft.x - offset.x);
        const tikzBottomLeftY = pixelToTikZ(-(canvasBottomLeft.y - offset.y)); // Flip Y for mathematical coordinates
        
        // Use TikZ rectangle syntax with correct bottom-left coordinate
        code = `  \\draw[${strokeColor}${strokeWidth}${strokeStyle}${fillColor}] (${tikzBottomLeftX},${tikzBottomLeftY}) rectangle ++(${width},${height});\n`;
        break;

      case 'line':
        if (obj.points && obj.points.length >= 2) {
          const points = obj.points.map(p => `(${pixelToTikZ(p.x - offset.x)},${pixelToTikZ(-(p.y - offset.y))})`).join(' -- ');
          
          // Build arrow specification based on TikZ arrows.meta library
          let arrowOptions = [];
          
          // Add stroke properties first
          if (strokeColor) arrowOptions.push(strokeColor);
          if (strokeWidth) arrowOptions.push(strokeWidth.replace(', ', ''));
          if (strokeStyle) arrowOptions.push(strokeStyle.replace(', ', ''));
          
          // Build arrow specification
          let arrowSpec = '';
          if (obj.arrowStart && obj.arrowStart !== 'none') {
            const arrowMap = { 'arrow': '<', 'stealth': 'Stealth', 'latex': 'Latex' };
            arrowSpec = `{${arrowMap[obj.arrowStart] || 'Stealth'}}`;
          }
          arrowSpec += '-';
          if (obj.arrowEnd && obj.arrowEnd !== 'none') {
            const arrowMap = { 'arrow': '>', 'stealth': 'Stealth', 'latex': 'Latex' };
            arrowSpec += `{${arrowMap[obj.arrowEnd] || 'Stealth'}}`;
          }
          
          if (arrowSpec !== '-') {
            arrowOptions.unshift(arrowSpec);
          }
          
          const lineOptionsStr = arrowOptions.length > 0 ? `[${arrowOptions.join(', ')}]` : '';
          code = `  \\draw${lineOptionsStr} ${points};\n`;
        }
        break;

      case 'text':
        let text = obj.text || 'Text';
        const fontSize = obj.fontSize || 16;
        
        // Build node options
        let nodeOptions = [];
        
        // Add color
        if (strokeColor) nodeOptions.push(strokeColor);
        
        // Use exact font size with \fontsize for precise matching
        if (fontSize) {
          // Use 1:1 mapping for better visual consistency (Canvas pixels ≈ LaTeX points)
          const fontSizePt = fontSize.toFixed(1);
          const lineHeightPt = (fontSize * 1.2).toFixed(1);
          nodeOptions.push(`font=\\fontsize{${fontSizePt}pt}{${lineHeightPt}pt}\\selectfont`);
        }
        
        // Build text content with styling
        let styledText = text;
        if (obj.fontWeight === 'bold') styledText = `\\textbf{${styledText}}`;
        if (obj.fontStyle === 'italic') styledText = `\\textit{${styledText}}`;
        if (obj.textDecoration === 'underline') styledText = `\\uline{${styledText}}`;
        // Nếu là math mode thì bọc $...$
        if (obj.isMath) styledText = `$${text}$`;
        
        // Remove anchor to use LaTeX default positioning
        // nodeOptions.push('anchor=mid');
        
        const nodeOptionsStr = nodeOptions.length > 0 ? `[${nodeOptions.join(', ')}]` : '';
        code = `  \\node${nodeOptionsStr} at (${x},${y}) {${styledText}};\n`;
        break;

      case 'polygon':
        if (obj.points && obj.points.length >= 3) {
          const points = obj.points.map(p => `(${pixelToTikZ(p.x - offset.x)},${pixelToTikZ(-(p.y - offset.y))})`).join(' -- ');
          code = `  \\draw[${strokeColor}${strokeWidth}${strokeStyle}${fillColor}] ${points} -- cycle;\n`;
        }
        break;

      case 'angle':
        if (obj.points && obj.points.length >= 3) {
          const [pointA, vertex, pointC] = obj.points;
          const angleRadius = pixelToTikZ(30);
          const angleValue = obj.angleValue || 0;
          
          // Calculate angles for arc (adjusted for flipped Y coordinate system)
          const angleA = Math.atan2(pointA.y - vertex.y, pointA.x - vertex.x) * 180 / Math.PI;
          const angleC = Math.atan2(pointC.y - vertex.y, pointC.x - vertex.x) * 180 / Math.PI;
          
          code = `  \\draw[${strokeColor}${strokeWidth}${strokeStyle}] (${pixelToTikZ(vertex.x - offset.x)},${pixelToTikZ(-(vertex.y - offset.y))}) ++(${Math.min(angleA, angleC)}:${angleRadius}) arc (${Math.min(angleA, angleC)}:${Math.max(angleA, angleC)}:${angleRadius});\n`;
          code += `  \\node at (${pixelToTikZ(vertex.x + 30 - offset.x)},${pixelToTikZ(-(vertex.y + 10 - offset.y))}) {$${angleValue.toFixed(1)}°$};\n`;
        }
        break;

      case 'perpendicular':
      case 'parallel':
        if (obj.points && obj.points.length >= 2) {
          const [start, end] = obj.points;
          const commentText = obj.type === 'perpendicular' ? 'Perpendicular line' : 'Parallel line';
          comment = `  % ${commentText}\n`;
          code = `  \\draw[${strokeColor}${strokeWidth}${strokeStyle}] (${pixelToTikZ(start.x - offset.x)},${pixelToTikZ(-(start.y - offset.y))}) -- (${pixelToTikZ(end.x - offset.x)},${pixelToTikZ(-(end.y - offset.y))});\n`;
        }
        break;

      case 'midpoint':
        code = `  \\fill[${strokeColor}] (${x},${y}) circle (${((obj.strokeWidth || 2) * 0.6).toFixed(1)}pt);\n`;
        break;

      case 'image':
        if (obj.width && obj.height) {
          const width = pixelToTikZ(obj.width);
          const height = pixelToTikZ(obj.height);
          
          // Canvas now stores position as top-left corner but renders with center rotation
          // We need to calculate the actual center position that Canvas displays
          const canvasCenterX = obj.position.x + obj.width / 2;  // Canvas center X
          const canvasCenterY = obj.position.y + obj.height / 2; // Canvas center Y
          
          // Convert to TikZ coordinates: just unit conversion and Y-flip
          const centerX = pixelToTikZ(canvasCenterX - offset.x);
          const centerY = pixelToTikZ(-(canvasCenterY - offset.y)); // Flip Y-axis for mathematical coordinates
          
          // Use the actual filename from upload
          const filename = obj.imageUrl || `${obj.name}.png`;
          
          // Build image options
          let imageOptions = [];
          if (obj.rotation && obj.rotation !== 0) {
            // Canvas: Y-axis down, clockwise rotation = positive
            // TikZ: Y-axis up, counter-clockwise rotation = positive
            // Need to negate rotation to match coordinate systems
            const tikzRotation = -obj.rotation;
            imageOptions.push(`rotate=${tikzRotation}`);
          }
          if (obj.scaleX && obj.scaleX !== 1) {
            imageOptions.push(`xscale=${obj.scaleX.toFixed(2)}`);
          }
          if (obj.scaleY && obj.scaleY !== 1) {
            imageOptions.push(`yscale=${obj.scaleY.toFixed(2)}`);
          }
          if (obj.flipX) {
            imageOptions.push('xscale=-1');
          }
          if (obj.flipY) {
            imageOptions.push('yscale=-1');
          }
          
          const optionsStr = imageOptions.length > 0 ? `[${imageOptions.join(', ')}]` : '';
          
          // Generate LaTeX code for image inclusion
          code = `  \\node${optionsStr} at (${centerX},${centerY}) {\\includegraphics[width=${width}cm,height=${height}cm]{${filename}}};\n`;
        }
        break;

      default:
        code = `  % Unsupported object type: ${obj.type}\n`;
    }

    // Add name label if enabled
    const nameLabel = generateNameLabel(offset);

    return comment + code + nameLabel;
  };

  // Calculate dynamic bounds for coordinate system
  const calculateBounds = () => {
    if (objects.length === 0) {
      return { minX: -3, maxX: 3, minY: -3, maxY: 3 }; // Default symmetric bounds
    }

    const offset = getOriginOffset();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    let hasVisibleObjects = false;
    let naturalBoundaries: number[] = []; // Collect "natural" coordinate values

    objects.forEach(obj => {
      if (!obj.visible) return;
      hasVisibleObjects = true;

      // Use direct Canvas coordinates for bounds calculation
      const objX = obj.position.x;
      const objY = obj.position.y;

      // Also consider name labels in bounds calculation
      let nameExtents = { minX: objX, maxX: objX, minY: objY, maxY: objY };
      if (obj.showName) {
        let nameX: number, nameY: number;
        
        if (obj.namePosition) {
          nameX = objX + obj.namePosition.x;
          nameY = objY + obj.namePosition.y;
        } else {
          // Calculate default name position (same logic as in generateNameLabel)
          switch (obj.type) {
            case 'circle':
              nameX = objX;
              nameY = objY - (obj.radius || 30) - 20;
              break;
            case 'rectangle':
              nameX = objX + (obj.width || 80) + 10;
              nameY = objY + (obj.height || 60) / 2;
              break;
            case 'point':
              nameX = objX + 10;
              nameY = objY - 15;
              break;
            case 'image':
              nameX = objX + (obj.width || 200) / 2;
              nameY = objY + (obj.height || 150) + 15;
              break;
            case 'text':
              const fontSize = obj.fontSize || 16;
              nameX = objX;
              nameY = objY - fontSize / 2 - 15;
              break;
            default:
              nameX = objX;
              nameY = objY - 15;
          }
        }
        
        // Better name text size estimation
        const nameLength = obj.name?.length || 4;
        const fontSize = obj.nameStyle?.fontSize || 12;
        const nameWidth = nameLength * fontSize * 0.7; // More accurate multiplier
        const nameHeight = fontSize * 1.2; // Account for line height
        
        // Name bounds with proper padding
        nameExtents.minX = Math.min(nameExtents.minX, nameX - nameWidth/2);
        nameExtents.maxX = Math.max(nameExtents.maxX, nameX + nameWidth/2);
        nameExtents.minY = Math.min(nameExtents.minY, nameY - nameHeight/2); // Center vertically
        nameExtents.maxY = Math.max(nameExtents.maxY, nameY + nameHeight/2);
      }

      // Calculate precise object bounds based on type using direct Canvas coordinates
      switch (obj.type) {
        case 'circle':
          const radius = obj.radius || 30;
          minX = Math.min(minX, objX - radius, nameExtents.minX);
          maxX = Math.max(maxX, objX + radius, nameExtents.maxX);
          minY = Math.min(minY, objY - radius, nameExtents.minY);
          maxY = Math.max(maxY, objY + radius, nameExtents.maxY);
          break;
        
        case 'rectangle':
          const width = obj.width || 80;
          const height = obj.height || 60;
          // Rectangle position is top-left corner in Canvas coordinates
          minX = Math.min(minX, objX, nameExtents.minX);
          maxX = Math.max(maxX, objX + width, nameExtents.maxX);
          minY = Math.min(minY, objY, nameExtents.minY);
          maxY = Math.max(maxY, objY + height, nameExtents.maxY);
          break;
        
        case 'point':
        case 'midpoint':
          // Points have small radius based on strokeWidth
          const pointRadius = (obj.strokeWidth || 2) * 0.6;
          minX = Math.min(minX, objX - pointRadius, nameExtents.minX);
          maxX = Math.max(maxX, objX + pointRadius, nameExtents.maxX);
          minY = Math.min(minY, objY - pointRadius, nameExtents.minY);
          maxY = Math.max(maxY, objY + pointRadius, nameExtents.maxY);
          break;

        case 'line':
        case 'polygon':
        case 'angle':
        case 'perpendicular':
        case 'parallel':
        case 'perp_bisector':
        case 'function':
          if (obj.points && obj.points.length > 0) {
            obj.points.forEach(point => {
              minX = Math.min(minX, point.x);
              maxX = Math.max(maxX, point.x);
              minY = Math.min(minY, point.y);
              maxY = Math.max(maxY, point.y);
            });
          } else {
            // Fallback to object position if no points
            minX = Math.min(minX, objX);
            maxX = Math.max(maxX, objX);
            minY = Math.min(minY, objY);
            maxY = Math.max(maxY, objY);
          }
          // Include name bounds
          minX = Math.min(minX, nameExtents.minX);
          maxX = Math.max(maxX, nameExtents.maxX);
          minY = Math.min(minY, nameExtents.minY);
          maxY = Math.max(maxY, nameExtents.maxY);
          break;
        
        case 'text':
        case 'distance':
          // Approximate text bounds based on font size - center like LaTeX node
          const fontSize = obj.fontSize || 16;
          const textWidth = (obj.text?.length || 4) * fontSize * 0.6;
          const textHeight = fontSize;
          
          // Text is centered at position
          const textCenterX = objX;
          const textCenterY = objY;
          
          minX = Math.min(minX, textCenterX - textWidth/2, nameExtents.minX);
          maxX = Math.max(maxX, textCenterX + textWidth/2, nameExtents.maxX);
          minY = Math.min(minY, textCenterY - textHeight/2, nameExtents.minY);
          maxY = Math.max(maxY, textCenterY + textHeight/2, nameExtents.maxY);
          break;
        
        case 'image':
          const imageWidth = obj.width || 200;
          const imageHeight = obj.height || 150;
          
          // Use same logic as generateObjectCode: position is top-left corner
          const scaleX = Math.abs((obj.scaleX || 1) * (obj.flipX ? -1 : 1));
          const scaleY = Math.abs((obj.scaleY || 1) * (obj.flipY ? -1 : 1));
          
          // For bounds calculation, use the envelope of rotated rectangle
          // Use negated rotation to match TikZ coordinate system
          const rotation = -(obj.rotation || 0) * Math.PI / 180; // Same negation as generateObjectCode
          const cos = Math.abs(Math.cos(rotation));
          const sin = Math.abs(Math.sin(rotation));
          
          // Scaled dimensions
          const scaledWidth = imageWidth * scaleX;
          const scaledHeight = imageHeight * scaleY;
          
          // Envelope of rotated rectangle (conservative bounds)
          const envelopeWidth = scaledWidth * cos + scaledHeight * sin;
          const envelopeHeight = scaledWidth * sin + scaledHeight * cos;
          
          // Calculate center point in Canvas coordinates (same as generateObjectCode)
          const canvasCenterX = objX + imageWidth / 2;
          const canvasCenterY = objY + imageHeight / 2;
          
          // Bounds around center in Canvas coordinates  
          const imageMinX = canvasCenterX - envelopeWidth / 2;
          const imageMaxX = canvasCenterX + envelopeWidth / 2;
          const imageMinY = canvasCenterY - envelopeHeight / 2;
          const imageMaxY = canvasCenterY + envelopeHeight / 2;
          
          minX = Math.min(minX, imageMinX, nameExtents.minX);
          maxX = Math.max(maxX, imageMaxX, nameExtents.maxX);
          minY = Math.min(minY, imageMinY, nameExtents.minY);
          maxY = Math.max(maxY, imageMaxY, nameExtents.maxY);
          break;
        
        default:
          // Default case for other object types
          minX = Math.min(minX, objX, nameExtents.minX);
          maxX = Math.max(maxX, objX, nameExtents.maxX);
          minY = Math.min(minY, objY, nameExtents.minY);
          maxY = Math.max(maxY, objY, nameExtents.maxY);
      }

      // Collect natural boundary values for coordinate detection (using Canvas coordinates first)
      if (Number.isInteger(objX) || (objX * 2) % 1 === 0) {
        const tikzX = parseFloat(pixelToTikZ(objX - offset.x));
        naturalBoundaries.push(tikzX);
      }
      if (Number.isInteger(objY) || (objY * 2) % 1 === 0) {
        const tikzY = parseFloat(pixelToTikZ(-(objY - offset.y)));
        naturalBoundaries.push(tikzY);
      }
    });

    // If no visible objects, return default bounds
    if (!hasVisibleObjects) {
      return { minX: -3, maxX: 3, minY: -3, maxY: 3 };
    }

    // Convert final bounds from Canvas coordinates to TikZ coordinates
    if (hasVisibleObjects) {
      // Use the same offset calculation as generateObjectCode for consistency
      const offset = getOriginOffset();
      
      // Convert X coordinates directly
      const tikzMinX = parseFloat(pixelToTikZ(minX - offset.x));
      const tikzMaxX = parseFloat(pixelToTikZ(maxX - offset.x));
      
      // Convert Y coordinates with proper flipping: Canvas Y down+ to TikZ Y up+
      const tikzMinY = parseFloat(pixelToTikZ(-(maxY - offset.y))); // Canvas maxY becomes TikZ minY
      const tikzMaxY = parseFloat(pixelToTikZ(-(minY - offset.y))); // Canvas minY becomes TikZ maxY
      
      minX = tikzMinX;
      maxX = tikzMaxX;
      minY = tikzMinY;
      maxY = tikzMaxY;
    }

    const rangeX = maxX - minX;
    const rangeY = maxY - minY;

    // Check for natural coordinate values (integers or half-integers)
    const hasNaturalCoords = naturalBoundaries.length > 0 && 
      naturalBoundaries.every(coord => Number.isInteger(coord) || (coord * 2) % 1 === 0);
    
    // Simplified adaptive padding - just add reasonable margins
    const basePadding = 1.0; // Standard padding
    const paddingX = Math.max(basePadding, rangeX * 0.1); // 10% of range, minimum 1 unit
    const paddingY = Math.max(basePadding, rangeY * 0.1);

    // Apply padding
    minX -= paddingX;
    maxX += paddingX;
    minY -= paddingY;
    maxY += paddingY;

    // Smart rounding for clean grid bounds
    const roundToNice = (value: number, isMin: boolean) => {
      const absValue = Math.abs(value);
      let step;
      
      if (absValue < 1) step = 0.5;
      else if (absValue < 5) step = 1;
      else if (absValue < 20) step = 2;
      else if (absValue < 100) step = 5;
      else step = 10;
      
      if (isMin) {
        return Math.floor(value / step) * step;
      } else {
        return Math.ceil(value / step) * step;
      }
    };
    
    const finalMinX = roundToNice(minX, true);
    const finalMaxX = roundToNice(maxX, false);
    const finalMinY = roundToNice(minY, true);
    const finalMaxY = roundToNice(maxY, false);

    // Ensure minimum reasonable size
    const finalRangeX = finalMaxX - finalMinX;
    const finalRangeY = finalMaxY - finalMinY;
    const minRange = 4; // Minimum 4 units range
    
    if (finalRangeX < minRange) {
      const midX = (finalMinX + finalMaxX) / 2;
      return { 
        minX: midX - minRange/2, 
        maxX: midX + minRange/2, 
        minY: finalMinY, 
        maxY: finalMaxY 
      };
    }
    
    if (finalRangeY < minRange) {
      const midY = (finalMinY + finalMaxY) / 2;
      return { 
        minX: finalMinX, 
        maxX: finalMaxX, 
        minY: midY - minRange/2, 
        maxY: midY + minRange/2 
      };
    }

    return { 
      minX: finalMinX, 
      maxX: finalMaxX, 
      minY: finalMinY, 
      maxY: finalMaxY 
    };
  };

  // Generate custom color definitions
  const generateColorDefinitions = () => {
    const customColors = new Set<string>();
    const commonColors = ['#000000', '#ffffff', '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6b7280', '#1f2937'];
    
    // Helper function to check if color is valid hex
    const isValidHexColor = (color: string) => {
      return /^#[0-9A-F]{6}$/i.test(color);
    };
    
    objects.forEach(obj => {
      if (obj.visible) {
        // Check stroke color
        if (obj.stroke && 
            obj.stroke !== 'transparent' && 
            isValidHexColor(obj.stroke) && 
            !commonColors.includes(obj.stroke.toLowerCase())) {
          customColors.add(obj.stroke.toLowerCase());
        }
        
        // Check fill color
        if (obj.fill && 
            obj.fill !== 'transparent' && 
            isValidHexColor(obj.fill) && 
            !commonColors.includes(obj.fill.toLowerCase())) {
          customColors.add(obj.fill.toLowerCase());
        }
        
        // Check name style color
        if (obj.nameStyle?.color && 
            isValidHexColor(obj.nameStyle.color) && 
            !commonColors.includes(obj.nameStyle.color.toLowerCase())) {
          customColors.add(obj.nameStyle.color.toLowerCase());
        }
      }
    });
    
    return Array.from(customColors).map(color => {
      const colorName = `customcolor${color.slice(1).toUpperCase()}`;
      return `% Custom color: ${color}\n\\definecolor{${colorName}}{HTML}{${color.slice(1).toUpperCase()}}`;
    }).join('\n');
  };

  // Generate complete TikZ code
  const generateTikZCode = () => {
    const colorDefinitions = generateColorDefinitions();
    
    // Check if any images exist to include graphicx package
    const hasImages = objects.some(obj => obj.type === 'image' && obj.visible);
    
    const header = showDocumentWrapper ? 
      `\\documentclass[tikz,border=10pt]{standalone}
\\usepackage{tikz}
\\usepackage{xcolor}
\\usepackage{ulem}${hasImages ? '\n\\usepackage{graphicx}' : ''}
\\usetikzlibrary{arrows.meta}
\\usetikzlibrary{shapes.geometric}
\\usetikzlibrary{calc}
\\usetikzlibrary{positioning}
${colorDefinitions ? colorDefinitions + '\n' : ''}\\begin{document}
\\begin{tikzpicture}` : 
      `\\begin{tikzpicture}`;

    const footer = showDocumentWrapper ? 
      `\\end{tikzpicture}
\\end{document}` : 
      `\\end{tikzpicture}`;

    // Add coordinate system if enabled with dynamic bounds
    let coordinateSystem = '';
    if (showCoordinates) {
      const bounds = calculateBounds();
      
      // Smart grid step calculation
      const rangeX = bounds.maxX - bounds.minX;
      const rangeY = bounds.maxY - bounds.minY;
      
      // Determine appropriate grid step - aim for 8-15 grid lines
      const getGridStep = (range: number) => {
        const targetLines = 10; // Target number of grid lines
        const roughStep = range / targetLines;
        
        // Round to nice numbers
        if (roughStep <= 0.25) return 0.25;
        if (roughStep <= 0.5) return 0.5;
        if (roughStep <= 1) return 1;
        if (roughStep <= 2) return 2;
        if (roughStep <= 5) return 5;
        if (roughStep <= 10) return 10;
        if (roughStep <= 20) return 20;
        if (roughStep <= 50) return 50;
        return Math.ceil(roughStep / 10) * 10; // Round up to nearest 10
      };
      
      const stepX = getGridStep(rangeX);
      const stepY = getGridStep(rangeY);
      
      // Calculate grid bounds aligned to step
      const gridMinX = Math.floor(bounds.minX / stepX) * stepX;
      const gridMaxX = Math.ceil(bounds.maxX / stepX) * stepX;
      const gridMinY = Math.floor(bounds.minY / stepY) * stepY;
      const gridMaxY = Math.ceil(bounds.maxY / stepY) * stepY;
      
      // Smart logic for showing coordinate system
      const originInBounds = bounds.minX <= 0 && bounds.maxX >= 0 && bounds.minY <= 0 && bounds.maxY >= 0;
      const originNearBounds = Math.abs(bounds.minX) <= 2 || Math.abs(bounds.maxX) <= 2 || 
                               Math.abs(bounds.minY) <= 2 || Math.abs(bounds.maxY) <= 2;
      const showAxes = originInBounds || originNearBounds;
      
      coordinateSystem = `
  
  % Smart coordinate system`;

      // Format coordinate values consistently
      const formatCoord = (value: number) => {
        if (value === Math.floor(value)) {
          return value.toFixed(0);
        } else if (value * 2 === Math.floor(value * 2)) {
          return value.toFixed(1);
        } else {
          return value.toFixed(2);
        }
      };

      // Add minor grid for fine details
      if (stepX >= 1 && stepY >= 1) {
        coordinateSystem += `
  \\draw[gray!15, very thin] (${formatCoord(gridMinX)},${formatCoord(gridMinY)}) grid[step=0.5] (${formatCoord(gridMaxX)},${formatCoord(gridMaxY)});`;
      }

      // Main grid with adaptive step
      coordinateSystem += `
  \\draw[gray!25, thin] (${formatCoord(gridMinX)},${formatCoord(gridMinY)}) grid[${stepX === stepY ? `step=${formatCoord(stepX)}` : `xstep=${formatCoord(stepX)}, ystep=${formatCoord(stepY)}`}] (${formatCoord(gridMaxX)},${formatCoord(gridMaxY)});`;

      // Smart axis drawing with equal margins from grid boundaries
      
      // Standard margin from grid edges
      const axisMargin = Math.min(stepX, stepY) * 0.3; // 30% of grid step as margin
      
      // X-axis: Draw if Y=0 line passes through bounds, span full grid with equal margins
      if (bounds.minY <= 0 && bounds.maxY >= 0) {
        const axisMinX = gridMinX + axisMargin;
        const axisMaxX = gridMaxX - axisMargin;
        
        coordinateSystem += `
  \\draw[->] (${formatCoord(axisMinX)},0) -- (${formatCoord(axisMaxX)},0) node[right] {$x$};`;
      }
      
      // Y-axis: Draw if X=0 line passes through bounds, span full grid with equal margins
      if (bounds.minX <= 0 && bounds.maxX >= 0) {
        const axisMinY = gridMinY + axisMargin;
        const axisMaxY = gridMaxY - axisMargin;
        
        coordinateSystem += `
  \\draw[->] (0,${formatCoord(axisMinY)}) -- (0,${formatCoord(axisMaxY)}) node[above] {$y$};`;
      }

      // Origin point with smart positioning (only if origin is actually in bounds)
      if (originInBounds) {
        const originLabelPos = bounds.minX > -0.5 && bounds.minY > -0.5 ? 'above right' : 
                              bounds.maxX < 0.5 && bounds.minY > -0.5 ? 'above left' :
                              bounds.minX > -0.5 && bounds.maxY < 0.5 ? 'below right' : 'below left';
        coordinateSystem += `
  \\fill (0,0) circle (1pt) node[${originLabelPos}] {$O$};`;
      }

      // Smart tick marks and labels
      
      // X-axis ticks (only when Y=0 line is in bounds)
      if (bounds.minY <= 0 && bounds.maxY >= 0) {
        // Use the same axis bounds as the X-axis line
        const axisMinX = gridMinX + axisMargin;
        const axisMaxX = gridMaxX - axisMargin;
        const xAxisRange = axisMaxX - axisMinX;
        
        // Determine tick spacing - aim for 8-12 ticks on the visible axis
        const targetTicks = 10;
        const roughTickSpacing = xAxisRange / targetTicks;
        
        // Round to nice numbers
        let tickSpacingX;
        if (roughTickSpacing <= 0.25) tickSpacingX = 0.25;
        else if (roughTickSpacing <= 0.5) tickSpacingX = 0.5;
        else if (roughTickSpacing <= 1) tickSpacingX = 1;
        else if (roughTickSpacing <= 2) tickSpacingX = 2;
        else if (roughTickSpacing <= 5) tickSpacingX = 5;
        else tickSpacingX = Math.ceil(roughTickSpacing);
        
        // Generate ticks within axis bounds
        const ticksX = [];
        const startTick = Math.ceil(axisMinX / tickSpacingX) * tickSpacingX;
        
        for (let x = startTick; x <= axisMaxX; x += tickSpacingX) {
          if (Math.abs(x) >= tickSpacingX * 0.1) { // Avoid zero tick
            ticksX.push(x);
          }
        }
        
        if (ticksX.length > 0) {
          ticksX.forEach(x => {
            coordinateSystem += `
  \\draw (${formatCoord(x)},0) +(0,-1.5pt) -- +(0,1.5pt) node[below] {\\footnotesize $${formatCoord(x)}$};`;
          });
        }
      }
      
      // Y-axis ticks (only when X=0 line is in bounds)
      if (bounds.minX <= 0 && bounds.maxX >= 0) {
        // Use the same axis bounds as the Y-axis line
        const axisMinY = gridMinY + axisMargin;
        const axisMaxY = gridMaxY - axisMargin;
        const yAxisRange = axisMaxY - axisMinY;
        
        // Determine tick spacing - aim for 8-12 ticks on the visible axis
        const targetTicks = 10;
        const roughTickSpacing = yAxisRange / targetTicks;
        
        // Round to nice numbers
        let tickSpacingY;
        if (roughTickSpacing <= 0.25) tickSpacingY = 0.25;
        else if (roughTickSpacing <= 0.5) tickSpacingY = 0.5;
        else if (roughTickSpacing <= 1) tickSpacingY = 1;
        else if (roughTickSpacing <= 2) tickSpacingY = 2;
        else if (roughTickSpacing <= 5) tickSpacingY = 5;
        else tickSpacingY = Math.ceil(roughTickSpacing);
        
        // Generate ticks within axis bounds
        const ticksY = [];
        const startTick = Math.ceil(axisMinY / tickSpacingY) * tickSpacingY;
        
        for (let y = startTick; y <= axisMaxY; y += tickSpacingY) {
          if (Math.abs(y) >= tickSpacingY * 0.1) { // Avoid zero tick
            ticksY.push(y);
          }
        }
        
        if (ticksY.length > 0) {
          ticksY.forEach(y => {
            coordinateSystem += `
  \\draw (0,${formatCoord(y)}) +(-1.5pt,0) -- +(1.5pt,0) node[left] {\\footnotesize $${formatCoord(y)}$};`;
          });
        }
      }
    }

    if (objects.length === 0) {
      const body = `
      
  % No objects to draw
  % Use the tools in the toolbar to create geometric shapes
  `;
      
      return header + body + coordinateSystem + '\n' + footer;
    }

    // Sort objects by creation time to maintain drawing order
    const sortedObjects = [...objects].sort((a, b) => a.createdAt - b.createdAt);
    
    const body = '\n' + sortedObjects.map(generateObjectCode).filter(code => code.trim()).join('\n');

    return header + coordinateSystem + body + '\n' + footer;
  };

  const tikzCode = generateTikZCode();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tikzCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopy?.();
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleExport = () => {
    const blob = new Blob([tikzCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tikzsketch-${new Date().toISOString().slice(0, 10)}.tex`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onExport?.();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with controls */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">LaTeX/TikZ</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="h-6 w-6 p-0"
            title="Toggle preview"
          >
            {showPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCoordinates(!showCoordinates)}
            className={`h-6 w-6 p-0 ${showCoordinates ? 'bg-blue-100 text-blue-600' : ''}`}
            title="Toggle coordinate system"
          >
            <Grid className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDocumentWrapper(!showDocumentWrapper)}
            className={`h-6 w-6 p-0 ${showDocumentWrapper ? 'bg-blue-100 text-blue-600' : ''}`}
            title="Toggle document header"
          >
            <FileText className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNameComments(!showNameComments)}
            className={`h-6 w-6 p-0 ${showNameComments ? 'bg-blue-100 text-blue-600' : ''}`}
            title="Toggle name comments"
          >
            <Hash className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNameLabels(!showNameLabels)}
            className={`h-6 w-6 p-0 ${showNameLabels ? 'bg-blue-100 text-blue-600' : ''}`}
            title="Toggle name labels"
          >
            <Type className="h-3 w-3" />
          </Button>
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-6 w-6 p-0"
            disabled={copied}
            title={copied ? 'Copied!' : 'Copy LaTeX code'}
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExport}
            className="h-6 w-6 p-0"
            title="Export .tex file"
          >
            <Download className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Code content */}
      <div className="flex-1 overflow-hidden">
        {showPreview ? (
          <div className="h-full bg-white border border-gray-200 rounded-lg m-3 p-4 overflow-auto">
            <div className="text-sm text-gray-600 mb-2">Preview Information:</div>
            <div className="bg-gray-50 p-4 rounded border space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Objects:</span> {objects.length}
                </div>
                <div>
                  <span className="font-medium">Visible:</span> {objects.filter(obj => obj.visible).length}
                </div>
                <div>
                  <span className="font-medium">Selected:</span> {objects.filter(obj => obj.selected).length}
                </div>
                <div>
                  <span className="font-medium">Code Lines:</span> {tikzCode.split('\n').length}
                </div>
              </div>
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Object types: {Array.from(new Set(objects.map(obj => obj.type))).join(', ') || 'None'}
                </p>
              </div>
              <div className="text-center mt-4 p-4 bg-blue-50 rounded">
                <p className="text-sm text-blue-600">
                  📐 TikZ Compilation Preview
                </p>
                <p className="text-xs text-blue-400 mt-1">
                  To see the rendered output, compile the exported .tex file with LaTeX
                </p>
              </div>
            </div>
          </div>
        ) : (
          <pre className="h-full p-3 text-xs font-mono bg-gray-50 overflow-auto border-0 resize-none leading-relaxed">
            <code className="text-gray-800">
              {tikzCode}
            </code>
          </pre>
        )}
      </div>

      {/* Compact footer with stats and tip */}
      <div className="flex-shrink-0 px-3 py-2 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>{tikzCode.split('\n').length} lines</span>
          <span>{tikzCode.length} chars</span>
          <span>{objects.length} objects</span>
        </div>

      </div>
    </div>
  );
} 