'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Bold, Italic, Underline, Type, AlignLeft } from 'lucide-react';

interface ObjectProperties {
  id: string;
  type: 'point' | 'line' | 'rectangle' | 'circle' | 'text' | 'polygon' | 'angle' | 'perpendicular' | 'parallel' | 'midpoint' | 'distance' | 'perp_bisector' | 'function';
  name: string;
  x: number;
  y: number;
  stroke: string;
  strokeWidth: number;
  strokeStyle?: 'solid' | 'dashed' | 'dotted' | 'dashdot';
  strokeOpacity?: number;
  fill: string;
  fillOpacity?: number;
  visible: boolean;
  showName?: boolean;
  nameStyle?: {
    fontSize?: number;
    fontWeight?: 'normal' | 'bold';
    fontStyle?: 'normal' | 'italic';
    textDecoration?: 'none' | 'underline' | 'overline' | 'line-through';
    color?: string;
  };
  // Type-specific properties
  radius?: number;
  width?: number;
  height?: number;
  text?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  startAngle?: number;
  endAngle?: number;
  angleValue?: number;
  magnitude?: number;
  direction?: number;
  // Arrow properties for lines
  arrowStart?: 'none' | 'arrow' | 'stealth' | 'latex';
  arrowEnd?: 'none' | 'arrow' | 'stealth' | 'latex';
  // Points for lines and polygons
  points?: Array<{ x: number; y: number }>;
}

interface PropertiesPanelProps {
  selectedObjects?: ObjectProperties[];
  onPropertyChange?: (property: string, value: any) => void;
}

export default function PropertiesPanel({ 
  selectedObjects = [], 
  onPropertyChange 
}: PropertiesPanelProps) {
  // Demo selected object for display
  const demoObject: ObjectProperties = selectedObjects[0] || {
    id: 'demo-point',
    type: 'point',
    name: 'P1',
    x: 100,
    y: 100,
    stroke: '#3b82f6',
    strokeWidth: 2,
    fill: 'transparent',
    fillOpacity: 1,
    visible: true,
    showName: true,
  };

  // Merge common properties from multiple selected objects
  const getCommonProperties = (): ObjectProperties => {
    if (selectedObjects.length === 0) return demoObject;
    if (selectedObjects.length === 1) return selectedObjects[0];

    const first = selectedObjects[0];
    const common: any = { ...first };

    // Check each property to see if it's common across all objects
    Object.keys(first).forEach(key => {
      const hasCommonValue = selectedObjects.every(obj => 
        JSON.stringify((obj as any)[key]) === JSON.stringify((first as any)[key])
      );
      
      if (!hasCommonValue) {
        // For non-common properties, show placeholder or first value
        if (['x', 'y', 'name', 'id'].includes(key)) {
          (common as any)[key] = undefined; // Don't show position/name for multiple objects
        }
      }
    });

    return common;
  };

  const [properties, setProperties] = useState<ObjectProperties>(getCommonProperties());
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate line length for line objects
  const calculateLineLength = useCallback(() => {
    if (selectedObjects.length === 1 && selectedObjects[0].type === 'line' && selectedObjects[0].points) {
      const points = selectedObjects[0].points;
      if (points.length < 2) return "0";
      
      let totalLength = 0;
      for (let i = 1; i < points.length; i++) {
        const dx = points[i].x - points[i-1].x;
        const dy = points[i].y - points[i-1].y;
        totalLength += Math.sqrt(dx * dx + dy * dy);
      }
      
      return totalLength.toFixed(1);
    }
    return "N/A";
  }, [selectedObjects]);

  // Sync with external changes
  useEffect(() => {
    const commonProps = getCommonProperties();
    setProperties(commonProps);
  }, [selectedObjects]);

  // Update property with reduced debouncing for better responsiveness
  const handlePropertyUpdate = (property: string, value: any) => {
    setProperties(prev => ({ ...prev, [property]: value }));
    
    // Clear existing timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Reduced debounce time for better responsiveness
    debounceRef.current = setTimeout(() => {
      onPropertyChange?.(property, value);
    }, 150); // Reduced from 300ms to 150ms
  };

  // Immediate update for sliders (no debounce during drag)
  const handleSliderUpdate = useCallback((property: string, value: any) => {
    setProperties(prev => ({ ...prev, [property]: value }));
    onPropertyChange?.(property, value);
  }, [onPropertyChange]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, []);

  const commonColors = [
    '#000000', '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
    '#8b5cf6', '#ec4899', '#6b7280', '#1f2937', '#ffffff'
  ];

  const lineStyles = [
    { value: 'solid', label: 'Solid', pattern: '────────' },
    { value: 'dashed', label: 'Dashed', pattern: '── ── ──' },
    { value: 'dotted', label: 'Dotted', pattern: '∙∙∙∙∙∙∙∙' },
    { value: 'dashdot', label: 'Dash-dot', pattern: '──∙──∙──' },
  ];

  if (selectedObjects.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p className="text-sm">Select an object to view its properties</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4 p-4 text-sm">
      {/* Header showing selection info */}
      <div className="pb-2 border-b border-gray-200">
        {selectedObjects.length === 1 ? (
          <h3 className="font-medium text-gray-900">
            {selectedObjects[0].name} Properties
          </h3>
        ) : (
          <div>
            <h3 className="font-medium text-gray-900">
              Multiple Objects ({selectedObjects.length})
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Editing common properties
            </p>
          </div>
        )}
      </div>

      {/* Object Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Object Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {selectedObjects.length === 1 ? (
            <>
              {/* Name field - not for text objects */}
              {(properties.type as string) !== 'text' && (
                <div>
                  <Label htmlFor="object-name" className="text-xs">Name</Label>
                  <Input
                    id="object-name"
                    value={properties.name || ''}
                    onChange={(e) => handlePropertyUpdate('name', e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="x-pos" className="text-xs">X</Label>
                  <Input
                    id="x-pos"
                    type="number"
                    value={properties.x || 0}
                    onChange={(e) => handlePropertyUpdate('x', parseFloat(e.target.value) || 0)}
                    className="h-7 text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="y-pos" className="text-xs">Y</Label>
                  <Input
                    id="y-pos"
                    type="number"
                    value={properties.y || 0}
                    onChange={(e) => handlePropertyUpdate('y', parseFloat(e.target.value) || 0)}
                    className="h-7 text-xs"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="text-xs text-gray-500">
              <p>Multiple objects selected</p>
              <p className="mt-1">Common properties shown below</p>
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={properties.visible}
              onChange={(e) => handlePropertyUpdate('visible', e.target.checked)}
              className="w-3 h-3"
            />
            <Label className="text-xs">Visible</Label>
          </div>
          {/* Show Name checkbox - not for text objects */}
          {(properties.type as string) !== 'text' && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={properties.showName || false}
                onChange={(e) => handlePropertyUpdate('showName', e.target.checked)}
                className="w-3 h-3"
              />
              <Label className="text-xs">Show Name</Label>
            </div>
          )}
          
          {/* Name Styling - not for text objects */}
          {(properties.type as string) !== 'text' && properties.showName && (
            <div className="space-y-2 p-2 bg-gray-50 rounded">
              <Label className="text-xs font-medium">Name Style</Label>
              
              {/* Name Font Size */}
              <div>
                <Label className="text-xs">Size: {properties.nameStyle?.fontSize || 12}px</Label>
                <Slider
                  value={[properties.nameStyle?.fontSize || 12]}
                  onValueChange={(value) => handleSliderUpdate('nameStyle', {
                    ...properties.nameStyle,
                    fontSize: value[0]
                  })}
                  max={24}
                  min={8}
                  step={1}
                  className="mt-1"
                />
              </div>

              {/* Name Style Buttons */}
              <div className="grid grid-cols-3 gap-1">
                <Button
                  variant={properties.nameStyle?.fontWeight === 'bold' ? 'default' : 'outline'}
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => handlePropertyUpdate('nameStyle', {
                    ...properties.nameStyle,
                    fontWeight: properties.nameStyle?.fontWeight === 'bold' ? 'normal' : 'bold'
                  })}
                  title="Bold"
                >
                  <Bold className="h-3 w-3" />
                </Button>
                <Button
                  variant={properties.nameStyle?.fontStyle === 'italic' ? 'default' : 'outline'}
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => handlePropertyUpdate('nameStyle', {
                    ...properties.nameStyle,
                    fontStyle: properties.nameStyle?.fontStyle === 'italic' ? 'normal' : 'italic'
                  })}
                  title="Italic"
                >
                  <Italic className="h-3 w-3" />
                </Button>
                <Button
                  variant={properties.nameStyle?.textDecoration === 'underline' ? 'default' : 'outline'}
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => handlePropertyUpdate('nameStyle', {
                    ...properties.nameStyle,
                    textDecoration: properties.nameStyle?.textDecoration === 'underline' ? 'none' : 'underline'
                  })}
                  title="Underline"
                >
                  <Underline className="h-3 w-3" />
                </Button>
              </div>

              {/* Name Color */}
              <div>
                <Label className="text-xs">Color</Label>
                <Input
                  type="color"
                  value={properties.nameStyle?.color || '#666666'}
                  onChange={(e) => handlePropertyUpdate('nameStyle', {
                    ...properties.nameStyle,
                    color: e.target.value
                  })}
                  className="h-6 w-full mt-1"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dimensions (if applicable) */}
      {(properties.type === 'rectangle' || properties.type === 'circle') && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Dimensions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {properties.type === 'circle' && (
              <div>
                <Label htmlFor="radius" className="text-xs">Radius</Label>
                <Input
                  id="radius"
                  type="number"
                  value={properties.radius || 0}
                  onChange={(e) => handlePropertyUpdate('radius', parseFloat(e.target.value) || 0)}
                  className="h-7 text-xs"
                />
              </div>
            )}
            {properties.type === 'rectangle' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="width" className="text-xs">Width</Label>
                  <Input
                    id="width"
                    type="number"
                    value={properties.width || 0}
                    onChange={(e) => handlePropertyUpdate('width', parseFloat(e.target.value) || 0)}
                    className="h-7 text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="height" className="text-xs">Height</Label>
                  <Input
                    id="height"
                    type="number"
                    value={properties.height || 0}
                    onChange={(e) => handlePropertyUpdate('height', parseFloat(e.target.value) || 0)}
                    className="h-7 text-xs"
                  />
                </div>
              </div>
            )}
            
            {/* Rectangle corner coordinates display */}
            {properties.type === 'rectangle' && selectedObjects.length === 1 && (
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Corner Coordinates</Label>
                <div className="p-2 bg-gray-50 rounded space-y-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Bottom-Left:</span>
                    <span className="font-mono">({(properties.x || 0).toFixed(1)}, {(properties.y || 0).toFixed(1)})</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Top-Right:</span>
                    <span className="font-mono">({((properties.x || 0) + (properties.width || 0)).toFixed(1)}, {((properties.y || 0) + (properties.height || 0)).toFixed(1)})</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Arrow Properties (for lines) */}
      {properties.type === 'line' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Arrow Properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Coordinates Display */}
            {selectedObjects.length === 1 && selectedObjects[0].points && selectedObjects[0].points.length >= 2 && (
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Endpoints</Label>
                <div className="p-2 bg-gray-50 rounded space-y-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Start:</span>
                    <span className="font-mono">({selectedObjects[0].points[0].x.toFixed(1)}, {selectedObjects[0].points[0].y.toFixed(1)})</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">End:</span>
                    <span className="font-mono">({selectedObjects[0].points[selectedObjects[0].points.length - 1].x.toFixed(1)}, {selectedObjects[0].points[selectedObjects[0].points.length - 1].y.toFixed(1)})</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Start Arrow</Label>
                <select 
                  value={properties.arrowStart || 'none'}
                  onChange={(e) => handlePropertyUpdate('arrowStart', e.target.value)}
                  className="h-7 text-xs w-full border border-gray-300 rounded px-1"
                >
                  <option value="none">None</option>
                  <option value="arrow">Arrow</option>
                  <option value="stealth">Stealth</option>
                  <option value="latex">LaTeX</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">End Arrow</Label>
                <select 
                  value={properties.arrowEnd || 'none'}
                  onChange={(e) => handlePropertyUpdate('arrowEnd', e.target.value)}
                  className="h-7 text-xs w-full border border-gray-300 rounded px-1"
                >
                  <option value="none">None</option>
                  <option value="arrow">Arrow</option>
                  <option value="stealth">Stealth</option>
                  <option value="latex">LaTeX</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Line Properties */}
      {properties.type === 'line' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Line Properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Length: {calculateLineLength()}px</Label>
              <div className="mt-1 text-xs text-gray-500">
                Use construction tools or select individual points to adjust length
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Angle Properties */}
      {properties.type === 'angle' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Angle Measurement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Angle Value</Label>
              <div className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                {properties.angleValue?.toFixed(1)}°
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Appearance */}
      {properties.type !== 'text' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Appearance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stroke Color */}
            <div>
            <Label className="text-xs">Stroke Color</Label>
            <div className="mt-1 flex flex-wrap gap-1">
              <button
                className={`w-6 h-6 rounded border-2 flex items-center justify-center text-xs ${
                  properties.stroke === 'transparent' ? 'border-gray-900' : 'border-gray-300'
                }`}
                style={{ backgroundColor: 'white' }}
                onClick={() => handlePropertyUpdate('stroke', 'transparent')}
              >
                ∅
              </button>
              {commonColors.map((color) => (
                <button
                  key={color}
                  className={`w-6 h-6 rounded border-2 ${
                    properties.stroke === color ? 'border-gray-900' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => handlePropertyUpdate('stroke', color)}
                />
              ))}
            </div>
            <Label className="text-xs text-gray-500 mt-2 block">Custom Color:</Label>
            <Input
              type="color"
              value={properties.stroke && properties.stroke !== 'transparent' ? properties.stroke : '#000000'}
              onChange={(e) => handlePropertyUpdate('stroke', e.target.value)}
              className="h-7 w-full mt-1"
            />
          </div>

          {/* Stroke Width */}
          <div>
            <Label className="text-xs">Stroke Width: {properties.strokeWidth}px</Label>
            <Slider
              value={[properties.strokeWidth]}
              onValueChange={(value) => handleSliderUpdate('strokeWidth', value[0])}
              max={10}
              min={0.5}
              step={0.5}
              className="mt-2"
            />
          </div>

          {/* Stroke Style */}
          <div>
            <Label className="text-xs">Stroke Style</Label>
            <div className="mt-1 grid grid-cols-2 gap-1">
              {lineStyles.map((style) => (
                <button
                  key={style.value}
                  className={`p-1 text-xs border rounded flex flex-col items-center justify-center min-h-[3rem] ${
                    (properties.strokeStyle || 'solid') === style.value 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300'
                  }`}
                  onClick={() => handlePropertyUpdate('strokeStyle', style.value)}
                >
                  <span className="text-sm font-mono leading-none">{style.pattern}</span>
                  <span className="text-xs mt-0.5">{style.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Stroke Opacity - not for text objects (they have Text Opacity in Text section) */}
          {(properties.type as string) !== 'text' && (
            <div>
              <Label className="text-xs">Stroke Opacity</Label>
              <Slider
                value={[properties.strokeOpacity || 1]}
                onValueChange={(value) => handlePropertyUpdate('strokeOpacity', value[0])}
                max={1}
                min={0}
                step={0.1}
                className="mt-2"
              />
            </div>
          )}

          {/* Fill Color */}
          {!['point', 'line'].includes(properties.type as string) && (
            <div>
              <Label className="text-xs">Fill Color</Label>
              <div className="mt-1 flex flex-wrap gap-1">
                <button
                  className={`w-6 h-6 rounded border-2 flex items-center justify-center text-xs ${
                    properties.fill === 'transparent' ? 'border-gray-900' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: 'white' }}
                  onClick={() => handlePropertyUpdate('fill', 'transparent')}
                >
                  ∅
                </button>
                {commonColors.map((color) => (
                  <button
                    key={color}
                    className={`w-6 h-6 rounded border-2 ${
                      properties.fill === color ? 'border-gray-900' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => handlePropertyUpdate('fill', color)}
                  />
                ))}
              </div>
              <Label className="text-xs text-gray-500 mt-2 block">Custom Color:</Label>
              <Input
                type="color"
                value={properties.fill && properties.fill !== 'transparent' ? properties.fill : '#ffffff'}
                onChange={(e) => handlePropertyUpdate('fill', e.target.value)}
                className="h-7 w-full mt-1"
              />
            </div>
          )}

          {/* Fill Opacity */}
          {!['point', 'line'].includes(properties.type as string) && (
            <div>
              <Label className="text-xs">Fill Opacity</Label>
              <Slider
                value={[properties.fillOpacity || 1]}
                onValueChange={(value) => handlePropertyUpdate('fillOpacity', value[0])}
                max={1}
                min={0}
                step={0.1}
                className="mt-2"
              />
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Text Properties (if text object) */}
      {properties.type === 'text' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Text</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="text-content" className="text-xs">Content</Label>
              <Input
                id="text-content"
                value={properties.text || ''}
                onChange={(e) => handlePropertyUpdate('text', e.target.value)}
                className="h-7 text-xs"
                placeholder="Enter text..."
              />
            </div>
            <div>
              <Label className="text-xs">Font Size: {properties.fontSize || 16}px</Label>
              <Slider
                value={[properties.fontSize || 16]}
                onValueChange={(value) => handlePropertyUpdate('fontSize', value[0])}
                max={48}
                min={8}
                step={1}
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-xs">Text Color</Label>
              <div className="mt-1 flex flex-wrap gap-1">
                {commonColors.map((color) => (
                  <button
                    key={color}
                    className={`w-6 h-6 rounded border-2 ${
                      properties.stroke === color ? 'border-gray-900' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => handlePropertyUpdate('stroke', color)}
                  />
                ))}
              </div>
              <Label className="text-xs text-gray-500 mt-2 block">Custom Color:</Label>
              <Input
                type="color"
                value={properties.stroke}
                onChange={(e) => handlePropertyUpdate('stroke', e.target.value)}
                className="h-7 w-full mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Text Style</Label>
              <div className="flex space-x-1 mt-1">
                <Button
                  variant={properties.fontWeight === 'bold' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => handlePropertyUpdate('fontWeight', 
                    properties.fontWeight === 'bold' ? 'normal' : 'bold')}
                  title="Bold"
                >
                  <Bold className="h-3 w-3" />
                </Button>
                <Button
                  variant={properties.fontStyle === 'italic' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => handlePropertyUpdate('fontStyle', 
                    properties.fontStyle === 'italic' ? 'normal' : 'italic')}
                  title="Italic"
                >
                  <Italic className="h-3 w-3" />
                </Button>
                <Button
                  variant={properties.textDecoration === 'underline' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => handlePropertyUpdate('textDecoration', 
                    properties.textDecoration === 'underline' ? 'none' : 'underline')}
                  title="Underline"
                >
                  <Underline className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs">Text Opacity</Label>
              <Slider
                value={[properties.strokeOpacity || 1]}
                onValueChange={(value) => handlePropertyUpdate('strokeOpacity', value[0])}
                max={1}
                min={0}
                step={0.1}
                className="mt-2"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 