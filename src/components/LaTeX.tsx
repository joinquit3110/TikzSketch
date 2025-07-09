'use client';

import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface LaTeXProps {
  children: string;
  displayMode?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function LaTeX({ children, displayMode = false, className = '', style = {} }: LaTeXProps) {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(children, containerRef.current, {
          displayMode,
          throwOnError: false,
          strict: false,
        });
      } catch (error) {
        console.warn('LaTeX rendering error:', error);
        // Fallback to plain text
        if (containerRef.current) {
          containerRef.current.textContent = children;
        }
      }
    }
  }, [children, displayMode]);

  return <span ref={containerRef} className={className} style={style} />;
} 