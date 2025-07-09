'use client';

import { useState } from 'react';
import { 
  MousePointer2, 
  Circle, 
  Square, 
  Minus, 
  Type,
  RotateCcw,
  RotateCw,
  Pentagon,
  Split,
  CornerUpRight,
  Target,
  Route,
  Crosshair
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export type Tool = 
  | 'select'
  | 'point' 
  | 'line' 
  | 'rectangle' 
  | 'circle' 
  | 'polygon'
  | 'text'
  | 'perpendicular'
  | 'parallel'
  | 'midpoint'
  | 'angle'
  | 'distance'
  | 'perp_bisector'
  | 'function';

interface ToolbarProps {
  activeTool?: Tool;
  onToolChange?: (tool: Tool) => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

const basicTools = [
  { id: 'select' as Tool, icon: MousePointer2, label: 'Selection Tool', shortcut: 'V' },
  { id: 'point' as Tool, icon: Target, label: 'Point', shortcut: 'P' },
  { id: 'line' as Tool, icon: Minus, label: 'Line', shortcut: 'L' },
  { id: 'rectangle' as Tool, icon: Square, label: 'Rectangle', shortcut: 'R' },
  { id: 'circle' as Tool, icon: Circle, label: 'Circle', shortcut: 'C' },
];

const advancedTools = [
  { id: 'polygon' as Tool, icon: Pentagon, label: 'Polygon', shortcut: 'G' },
  { id: 'text' as Tool, icon: Type, label: 'Text', shortcut: 'T' },
];

const geometryTools = [
  { id: 'perpendicular' as Tool, icon: CornerUpRight, label: 'Perpendicular Line', shortcut: 'Q' },
  { id: 'parallel' as Tool, icon: Split, label: 'Parallel Line', shortcut: 'E' },
  { id: 'midpoint' as Tool, icon: Crosshair, label: 'Midpoint', shortcut: 'M' },
  { id: 'angle' as Tool, icon: Route, label: 'Angle', shortcut: 'N' },
  { id: 'distance' as Tool, icon: Target, label: 'Distance', shortcut: 'D' },
  { id: 'perp_bisector' as Tool, icon: CornerUpRight, label: 'Perpendicular Bisector', shortcut: 'B' },
];



export default function Toolbar({ 
  activeTool = 'select', 
  onToolChange,
  onUndo,
  onRedo 
}: ToolbarProps) {
  const [selectedTool, setSelectedTool] = useState<Tool>(activeTool);

  const handleToolSelect = (tool: Tool) => {
    setSelectedTool(tool);
    onToolChange?.(tool);
  };

  const renderToolSection = (tools: typeof basicTools, title?: string) => (
    <div className="space-y-1">
      {title && <div className="text-xs text-gray-400 px-1 py-1">{title}</div>}
      {tools.map((tool) => {
        const IconComponent = tool.icon;
        return (
          <Tooltip key={tool.id}>
            <TooltipTrigger asChild>
              <Button
                variant={selectedTool === tool.id ? "default" : "ghost"}
                size="sm"
                className="w-12 h-12 sm:w-10 sm:h-10 p-0"
                onClick={() => handleToolSelect(tool.id)}
              >
                <IconComponent className="h-4 w-4 sm:h-3 sm:w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{tool.label} ({tool.shortcut})</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );

  return (
    <TooltipProvider>
      <div className="flex flex-col p-2 space-y-2 h-full overflow-y-auto">
        {/* Basic Tools */}
        {renderToolSection(basicTools)}
        
        {/* Separator */}
        <div className="border-t border-gray-200" />
        
        {/* Advanced Drawing Tools */}
        {renderToolSection(advancedTools, "Advanced")}
        
        {/* Separator */}
        <div className="border-t border-gray-200" />
        
        {/* Geometry Tools */}
        {renderToolSection(geometryTools, "Geometry")}

        {/* Separator */}
        <div className="border-t border-gray-200 my-2" />

        {/* History Tools */}
        <div className="space-y-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-12 h-12 sm:w-10 sm:h-10 p-0"
                onClick={onUndo}
              >
                <RotateCcw className="h-4 w-4 sm:h-3 sm:w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Undo (Ctrl+Z)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-12 h-12 sm:w-10 sm:h-10 p-0"
                onClick={onRedo}
              >
                <RotateCw className="h-4 w-4 sm:h-3 sm:w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Redo (Ctrl+Y)</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Spacer to push content to top */}
        <div className="flex-1" />
      </div>
    </TooltipProvider>
  );
} 