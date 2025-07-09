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
    return (pixels / 28).toFixed(2);
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
    // FIXME: Dynamic offset causes coordinate mismatch with canvas
    // For now, use fixed origin to match canvas coordinate system
    return { x: 0, y: 0 };
    
    /* Original dynamic offset calculation (causes positioning issues):
    if (objects.length === 0) return { x: 0, y: 0 };
    
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    objects.forEach(obj => {
      if (!obj.visible) return;
      
      if (obj.points && obj.points.length > 0) {
        obj.points.forEach(point => {
          minX = Math.min(minX, point.x);
          maxX = Math.max(maxX, point.x);
          minY = Math.min(minY, point.y);
          maxY = Math.max(maxY, point.y);
        });
      } else {
        minX = Math.min(minX, obj.position.x);
        maxX = Math.max(maxX, obj.position.x);
        minY = Math.min(minY, obj.position.y);
        maxY = Math.max(maxY, obj.position.y);
      }
    });
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    return { x: centerX, y: centerY };
    */
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
        const scaledNameFontSize = Math.min(nameStyle.fontSize * 1.0, 18);
        nameStyleOptions += `, font=\\fontsize{${scaledNameFontSize}}{${scaledNameFontSize * 1.2}}\\selectfont`;
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
        const text = obj.text || 'Text';
        // Scale font size to match canvas appearance (max 24pt to avoid font errors)
        const scaledFontSize = Math.min((obj.fontSize || 16) * 1.0, 24);
        
        // Build node options following TikZ best practices
        let nodeOptions = [];
        
        // Add color
        if (strokeColor) nodeOptions.push(strokeColor);
        
        // Add font styling using TikZ font options
        if (obj.fontSize) {
          nodeOptions.push(`font=\\fontsize{${scaledFontSize}}{${scaledFontSize * 1.2}}\\selectfont`);
        }
        
        // Build text content with styling
        let styledText = text;
        if (obj.fontWeight === 'bold') styledText = `\\textbf{${styledText}}`;
        if (obj.fontStyle === 'italic') styledText = `\\textit{${styledText}}`;
        if (obj.textDecoration === 'underline') styledText = `\\uline{${styledText}}`;
        
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

      // Calculate precise object bounds based on type using direct Canvas coordinates
      switch (obj.type) {
        case 'circle':
          const radius = obj.radius || 30;
          minX = Math.min(minX, objX - radius);
          maxX = Math.max(maxX, objX + radius);
          minY = Math.min(minY, objY - radius);
          maxY = Math.max(maxY, objY + radius);
          break;
        
        case 'rectangle':
          const width = obj.width || 80;
          const height = obj.height || 60;
          // Rectangle position is top-left corner in Canvas coordinates
          minX = Math.min(minX, objX);
          maxX = Math.max(maxX, objX + width);
          minY = Math.min(minY, objY);
          maxY = Math.max(maxY, objY + height);
          break;
        
        case 'line':
        case 'polygon':
        case 'angle':
        case 'perpendicular':
        case 'parallel':
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
          break;
        
        case 'text':
          // Approximate text bounds based on font size
          const fontSize = obj.fontSize || 16;
          const textWidth = (obj.text?.length || 4) * fontSize * 0.6;
          const textHeight = fontSize;
          minX = Math.min(minX, objX);
          maxX = Math.max(maxX, objX + textWidth);
          minY = Math.min(minY, objY - textHeight);
          maxY = Math.max(maxY, objY);
          break;
        
        default:
          // Default case for other object types
          minX = Math.min(minX, objX);
          maxX = Math.max(maxX, objX);
          minY = Math.min(minY, objY);
          maxY = Math.max(maxY, objY);
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
    
    // Base padding: adaptive based on object density and natural coordinates
    let paddingFactorX, paddingFactorY;
    
    if (hasNaturalCoords && rangeX < 6 && rangeY < 6) {
      // For natural coordinates in small range, use minimal padding
      paddingFactorX = paddingFactorY = 0.15;
    } else if (rangeX < 2 || rangeY < 2) {
      // For very small objects, use generous padding
      paddingFactorX = paddingFactorY = 0.4;
    } else if (rangeX < 10 || rangeY < 10) {
      // For medium objects, moderate padding
      paddingFactorX = paddingFactorY = 0.25;
    } else {
      // For large objects, minimal padding
      paddingFactorX = paddingFactorY = 0.15;
    }
    
    const paddingX = Math.max(hasNaturalCoords ? 0.3 : 0.5, rangeX * paddingFactorX);
    const paddingY = Math.max(hasNaturalCoords ? 0.3 : 0.5, rangeY * paddingFactorY);

    // Apply padding
    minX -= paddingX;
    maxX += paddingX;
    minY -= paddingY;
    maxY += paddingY;

    // Make bounds symmetric around origin if objects are roughly centered or have natural coordinates
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    // More aggressive symmetry for natural coordinates
    const symmetryThreshold = hasNaturalCoords ? 1.5 : 1;
    
    // Make symmetric if center is close to origin or if we have natural coordinates in symmetric pattern
    if (Math.abs(centerX) < symmetryThreshold && Math.abs(centerY) < symmetryThreshold) {
      const maxRangeX = Math.max(Math.abs(minX), Math.abs(maxX));
      const maxRangeY = Math.max(Math.abs(minY), Math.abs(maxY));
      
      // For natural coordinates, prefer round numbers
      if (hasNaturalCoords) {
        const roundedRangeX = Math.ceil(maxRangeX);
        const roundedRangeY = Math.ceil(maxRangeY);
        minX = -roundedRangeX;
        maxX = roundedRangeX;
        minY = -roundedRangeY;
        maxY = roundedRangeY;
      } else {
        minX = -maxRangeX;
        maxX = maxRangeX;
        minY = -maxRangeY;
        maxY = maxRangeY;
      }
    }

    // Detect common geometric patterns for optimal bounds
    const detectGeometricPattern = () => {
      if (naturalBoundaries.length >= 6) {
        const uniqueCoords = [...new Set(naturalBoundaries.map(c => Math.round(c * 2) / 2))].sort((a, b) => a - b);
        
        // Square/rectangular grid pattern
        if (uniqueCoords.length <= 6 && uniqueCoords.every(c => c === Math.round(c))) {
          const range = uniqueCoords[uniqueCoords.length - 1] - uniqueCoords[0];
          if (range <= 6) {
            return {
              type: 'geometric',
              suggestedMinX: uniqueCoords[0] - 1,
              suggestedMaxX: uniqueCoords[uniqueCoords.length - 1] + 1,
              suggestedMinY: uniqueCoords[0] - 1,
              suggestedMaxY: uniqueCoords[uniqueCoords.length - 1] + 1
            };
          }
        }
      }
      return null;
    };
    
    const pattern = detectGeometricPattern();
    
    // Round to nice numbers for clean grid
    let finalMinX, finalMaxX, finalMinY, finalMaxY;
    
    if (pattern && hasNaturalCoords) {
      // Use geometric pattern suggestions
      finalMinX = pattern.suggestedMinX;
      finalMaxX = pattern.suggestedMaxX;
      finalMinY = pattern.suggestedMinY;
      finalMaxY = pattern.suggestedMaxY;
    } else {
      // Standard rounding
      finalMinX = Math.floor(minX * 2) / 2; // Round to 0.5
      finalMaxX = Math.ceil(maxX * 2) / 2;
      finalMinY = Math.floor(minY * 2) / 2;
      finalMaxY = Math.ceil(maxY * 2) / 2;
    }

    // Ensure minimum size (at least 2x2 grid)
    const finalRangeX = finalMaxX - finalMinX;
    const finalRangeY = finalMaxY - finalMinY;
    
    if (finalRangeX < 2) {
      const midX = (finalMinX + finalMaxX) / 2;
      return {
        minX: midX - 1,
        maxX: midX + 1,
        minY: finalRangeY < 2 ? -1 : finalMinY,
        maxY: finalRangeY < 2 ? 1 : finalMaxY
      };
    }
    
    if (finalRangeY < 2) {
      const midY = (finalMinY + finalMaxY) / 2;
      return {
        minX: finalMinX,
        maxX: finalMaxX,
        minY: midY - 1,
        maxY: midY + 1
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
    
    const header = showDocumentWrapper ? 
      `\\documentclass[tikz,border=10pt]{standalone}
\\usepackage{tikz}
\\usepackage{xcolor}
\\usepackage{ulem}
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
      
      // Determine appropriate grid step
      const getGridStep = (range: number) => {
        if (range <= 6) return 0.5;
        if (range <= 12) return 1;
        if (range <= 30) return 2;
        if (range <= 60) return 5;
        return 10;
      };
      
      const stepX = getGridStep(rangeX);
      const stepY = getGridStep(rangeY);
      
      // Calculate grid bounds aligned to step
      const gridMinX = Math.floor(bounds.minX / stepX) * stepX;
      const gridMaxX = Math.ceil(bounds.maxX / stepX) * stepX;
      const gridMinY = Math.floor(bounds.minY / stepY) * stepY;
      const gridMaxY = Math.ceil(bounds.maxY / stepY) * stepY;
      
      // Check if origin is within bounds
      const showOrigin = bounds.minX <= 0 && bounds.maxX >= 0 && bounds.minY <= 0 && bounds.maxY >= 0;
      
      coordinateSystem = `
  
  % Smart coordinate system`;

      // Add minor grid for fine details
      if (stepX >= 1 && stepY >= 1) {
        coordinateSystem += `
  \\draw[gray!15, very thin] (${gridMinX},${gridMinY}) grid[step=0.5] (${gridMaxX},${gridMaxY});`;
      }

      // Main grid with adaptive step
      coordinateSystem += `
  \\draw[gray!25, thin] (${gridMinX},${gridMinY}) grid[${stepX === stepY ? `step=${stepX}` : `xstep=${stepX}, ystep=${stepY}`}] (${gridMaxX},${gridMaxY});`;

      // Axes with smart endpoints
      const axisMinX = Math.max(gridMinX, bounds.minX - 0.2);
      const axisMaxX = Math.min(gridMaxX, bounds.maxX + 0.2);
      const axisMinY = Math.max(gridMinY, bounds.minY - 0.2);
      const axisMaxY = Math.min(gridMaxY, bounds.maxY + 0.2);
      
      if (showOrigin) {
        coordinateSystem += `
  \\draw[->] (${axisMinX},0) -- (${axisMaxX},0) node[right] {$x$};
  \\draw[->] (0,${axisMinY}) -- (0,${axisMaxY}) node[above] {$y$};`;
      }

      // Origin point with smart positioning
      if (showOrigin) {
        const originLabelPos = bounds.minX > -0.5 && bounds.minY > -0.5 ? 'above right' : 
                              bounds.maxX < 0.5 && bounds.minY > -0.5 ? 'above left' :
                              bounds.minX > -0.5 && bounds.maxY < 0.5 ? 'below right' : 'below left';
        coordinateSystem += `
  \\fill (0,0) circle (1pt) node[${originLabelPos}] {$O$};`;
      }

      // Add tick marks and labels for major grid lines
      if (stepX >= 1 && stepY >= 1) {
        const ticksX = [];
        const ticksY = [];
        
        for (let x = gridMinX; x <= gridMaxX; x += stepX) {
          if (Math.abs(x) >= stepX && x >= bounds.minX && x <= bounds.maxX) {
            ticksX.push(x);
          }
        }
        
        for (let y = gridMinY; y <= gridMaxY; y += stepY) {
          if (Math.abs(y) >= stepY && y >= bounds.minY && y <= bounds.maxY) {
            ticksY.push(y);
          }
        }
        
        if (showOrigin && ticksX.length > 0) {
          coordinateSystem += ``;
          ticksX.forEach(x => {
            coordinateSystem += `
  \\draw (${x},0) +(0,-1.5pt) -- +(0,1.5pt) node[below] {\\footnotesize $${x === Math.floor(x) ? x : x.toFixed(1)}$};`;
          });
        }
        
        if (showOrigin && ticksY.length > 0) {
          coordinateSystem += ``;
          ticksY.forEach(y => {
            coordinateSystem += `
  \\draw (0,${y}) +(-1.5pt,0) -- +(1.5pt,0) node[left] {\\footnotesize $${y === Math.floor(y) ? y : y.toFixed(1)}$};`;
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