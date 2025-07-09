'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Canvas to avoid SSR issues
const Canvas = dynamic(() => import('./Canvas'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-sm text-gray-500">Loading Canvas...</p>
      </div>
    </div>
  )
});

interface CanvasWrapperProps {
  activeTool: string;
}

export default function CanvasWrapper({ activeTool }: CanvasWrapperProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Initializing Canvas...</p>
        </div>
      </div>
    );
  }

  return <Canvas activeTool={activeTool} />;
} 