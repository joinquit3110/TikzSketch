'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Toolbar, { type Tool } from '@/components/Toolbar';
import CanvasWrapper from '@/components/CanvasWrapper';
import PropertiesPanel from '@/components/PropertiesPanel';
import CodeOutput from '@/components/CodeOutput';
import { useAppStore } from '@/lib/store';

export default function Home() {
  const { 
    activeTool, 
    setActiveTool, 
    objects, 
    selectedObjectIds, 
    getSelectedObjects,
    undo, 
    redo, 
    canUndo, 
    canRedo 
  } = useAppStore();

  const selectedObjects = getSelectedObjects();
  const selectedObject = selectedObjects.length === 1 ? selectedObjects[0] : null;
  
  const [sidebarVisible, setSidebarVisible] = useState(true);
  
  // Memoize converted objects to prevent unnecessary re-renders
  const selectedObjectsProps = useMemo(() => 
    selectedObjects.map(obj => {
      // Use direct Canvas coordinates for Properties Panel display  
      // Simple coordinate flip for Y axis to match mathematical convention in Properties Panel
      return {
        ...obj,
        x: obj.position.x, // Direct Canvas X coordinate
        y: -obj.position.y, // Simple Y flip for mathematical display
        showName: obj.showName || false,
        points: obj.points ? obj.points.map(p => ({ x: p.x, y: -p.y })) : [] // Flip points Y coordinates for display
      };
    }), [selectedObjects]);

  // Single object props for backward compatibility
  const selectedObjectProps = selectedObject ? {
    ...selectedObject,
    x: selectedObject.position.x,
    y: -selectedObject.position.y, // Convert canvas Y to mathematical Y
    showName: selectedObject.showName || false
  } : null;

  const handlePropertyChange = useCallback((property: string, value: any) => {
    selectedObjects.forEach(obj => {
      if (property === 'x' || property === 'y') {
        // Handle position updates - convert from Properties Panel coordinates back to Canvas coordinates
        const newPosition = { ...obj.position };
        if (property === 'x') {
          newPosition.x = value; // Direct X coordinate
        } else if (property === 'y') {
          newPosition.y = -value; // Simple Y flip back to Canvas coordinates
        }
        useAppStore.getState().updateObject(obj.id, { position: newPosition });
      } else {
        // Handle other property updates directly
        useAppStore.getState().updateObject(obj.id, { [property]: value });
      }
    });
    // Save to history after all changes
    useAppStore.getState().saveToHistory();
  }, [selectedObjects]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in input fields
      const activeElement = document.activeElement as HTMLElement | null;
      const isTyping = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.contentEditable === 'true'
      );

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            if (e.shiftKey) {
              e.preventDefault();
              redo();
            } else {
              e.preventDefault();
              undo();
            }
            break;
          case 'y':
            e.preventDefault();
            redo();
            break;
          case 'a':
            e.preventDefault();
            useAppStore.getState().selectAll();
            break;
        }
      }
      
      // Handle polygon/bezier completion
      if (e.key === 'Enter') {
        const store = useAppStore.getState();
        if (store.isPolygonDrawing) {
          e.preventDefault();
          store.finishPolygon();
          return;
        }
      }
      
      // Tool shortcuts - only when not typing in input fields
      if (!isTyping) {
        switch (e.key) {
        case 'v':
        case 'V':
          setActiveTool('select');
          break;
        case 'p':
        case 'P':
          setActiveTool('point');
          break;
        case 'l':
        case 'L':
          setActiveTool('line');
          break;
        case 'r':
        case 'R':
          setActiveTool('rectangle');
          break;
        case 'c':
        case 'C':
          setActiveTool('circle');
          break;
        case 'g':
        case 'G':
          setActiveTool('polygon');
          break;
        case 't':
        case 'T':
          setActiveTool('text');
          break;
        case 'i':
        case 'I':
          setActiveTool('image');
          break;
        case 'q':
        case 'Q':
          setActiveTool('perpendicular');
          break;
        case 'e':
        case 'E':
          setActiveTool('parallel');
          break;
        case 'm':
        case 'M':
          setActiveTool('midpoint');
          break;
        case 'n':
        case 'N':
          setActiveTool('angle');
          break;
        case 'd':
        case 'D':
          setActiveTool('distance');
          break;
        case 'b':
        case 'B':
          setActiveTool('perp_bisector');
          break;
        case 'Escape':
          const store = useAppStore.getState();
          store.clearSelection();
          store.cancelDrawing();
          if (store.isPolygonDrawing) {
            store.cancelPolygon();
          }
          if (store.constructionMode !== 'none') {
            store.cancelConstruction();
          }
          break;
        case 'Delete':
          if (selectedObjects.length > 0) {
            useAppStore.getState().deleteSelectedObjects();
          }
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, setActiveTool, selectedObjects.length]);

  const handleExport = () => {
    // This will be handled by CodeOutput component
  };

  const handleCopy = () => {
    // This will be handled by CodeOutput component
  };

   return (
    <div className="h-screen w-screen flex flex-col bg-gray-50">
      {/* Header with Title and Main Toolbar */}
      <header className="border-b border-gray-200 bg-white px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="relative h-8 w-8 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 cursor-pointer active:scale-95 flex items-center justify-center group overflow-hidden">
                <img 
                  src="/logo.png" 
                  alt="TikzSketch Logo" 
                  className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 rounded-lg bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
              </div>
              <h1 className="text-xl font-bold hidden sm:block">
                <span className="text-blue-600">Tikz</span>
                <span className="text-gray-900">Sketch</span>
                <span className="text-xs text-gray-400 font-normal ml-1">v0.2: Onlineeee!</span>
              </h1>
            </div>
            <span className="text-sm text-gray-500">Nguyễn Hưng's Project</span>
            <div className="text-xs text-gray-400">
              Objects: {objects.length} | Selected: {selectedObjectIds.length}
            </div>
          </div>
          
          {/* Mobile sidebar toggle */}
          <div className="md:hidden">
            <button
              onClick={() => setSidebarVisible(!sidebarVisible)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d={sidebarVisible ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Toolbar */}
        <div className="w-16 md:w-16 sm:w-12 border-r border-gray-200 bg-white flex-shrink-0">
          <Toolbar 
            activeTool={activeTool as Tool}
            onToolChange={setActiveTool}
            onUndo={canUndo() ? undo : undefined}
            onRedo={canRedo() ? redo : undefined}
          />
        </div>

        {/* Central Canvas Area */}
        <div className="flex-1 relative bg-white min-w-0">
          <CanvasWrapper activeTool={activeTool} />
        </div>

        {/* Right Sidebar with Properties and Code */}
        <div className={`${
          sidebarVisible ? 'w-80 min-w-72 max-w-96 lg:w-80 md:w-72 sm:w-64' : 'hidden'
        } md:flex border-l border-gray-200 bg-white flex-col flex-shrink-0 ${
          sidebarVisible ? 'absolute md:relative z-10 right-0 top-0 bottom-0 shadow-lg md:shadow-none' : ''
        }`}>
          {/* Properties Panel */}
          <div className="flex-1 flex flex-col min-h-0 border-b border-gray-200">
            <div className="flex-shrink-0 p-3 border-b border-gray-100 bg-gray-50">
              <h3 className="font-medium text-gray-900">Properties</h3>
              {selectedObjects.length > 0 && (
                <span className="text-xs text-gray-500">
                  ({selectedObjects.length} selected)
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <PropertiesPanel 
                selectedObjects={selectedObjectsProps}
                onPropertyChange={handlePropertyChange}
              />
            </div>
          </div>

          {/* Resize Handle */}
          <div className="flex-shrink-0 h-1 bg-gray-300 hover:bg-gray-400 cursor-row-resize transition-colors"></div>

          {/* Code Output Panel */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-shrink-0 p-3 border-b border-gray-100 bg-gray-50">
              <h3 className="font-medium text-gray-900">LaTeX/TikZ Code</h3>
            </div>
            <div className="flex-1 overflow-hidden">
              <CodeOutput 
                objects={objects}
                onCopy={handleCopy}
                onExport={handleExport}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
