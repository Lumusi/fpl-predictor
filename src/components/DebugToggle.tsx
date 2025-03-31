'use client';

import React, { useState, useEffect } from 'react';
import logger from '@/lib/utils/logger';

interface DebugToggleProps {
  className?: string;
}

/**
 * A hidden component that allows developers to toggle debug logging with a keyboard shortcut
 */
export default function DebugToggle({ className }: DebugToggleProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  
  useEffect(() => {
    // Set up keyboard shortcut (Alt+Shift+D) for toggling debug mode
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.key === 'D') {
        setIsEnabled(prev => {
          const newState = !prev;
          logger.setForceLogsOff(!newState);
          logger.enableDebug(newState);
          return newState;
        });
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    // Clean up
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  return (
    <div className={`fixed bottom-0 right-0 p-1 text-[8px] text-gray-400 ${className || ''}`}>
      {isEnabled ? '🔍 Debug ON' : ''}
    </div>
  );
} 