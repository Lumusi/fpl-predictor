'use client';

import React, { useState, useEffect } from 'react';
import { isMobile } from '@/lib/utils/deviceUtils';
import { setupPerformanceMonitoring } from '@/lib/utils/performanceMonitoring';

interface MobileAppShellProps {
  children: React.ReactNode;
}

/**
 * Mobile-specific app shell that provides a native app-like experience
 * This includes:
 * - Full viewport height with proper mobile viewport handling
 * - Pull-to-refresh behavior
 * - "Add to homescreen" prompt
 * - Performance monitoring for mobile devices
 */
export default function MobileAppShell({ children }: MobileAppShellProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Fix viewport height on mobile devices
  useEffect(() => {
    if (!isMobile()) return;
    
    // Fix for mobile viewport height issues
    const setViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    // Set initial viewport height
    setViewportHeight();
    
    // Update on resize
    window.addEventListener('resize', setViewportHeight);
    
    // Set up performance monitoring on mobile
    const unsubscribePerformance = setupPerformanceMonitoring();
    
    // Detect if app is installed or can be installed
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setShowInstallPrompt(true);
    });
    
    // Add swipe down to refresh functionality
    let startY = 0;
    let currentY = 0;
    
    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (!document.scrollingElement) return;
      
      // Only trigger pull-to-refresh when at the top of the page
      if (document.scrollingElement.scrollTop <= 0) {
        currentY = e.touches[0].clientY;
        const pullDistance = currentY - startY;
        
        if (pullDistance > 70) {
          setIsRefreshing(true);
        }
      }
    };
    
    const handleTouchEnd = () => {
      if (isRefreshing) {
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    };
    
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
    
    // Set a timeout to hide initial loading screen
    setTimeout(() => {
      setInitialLoad(false);
    }, 1000);
    
    return () => {
      window.removeEventListener('resize', setViewportHeight);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      unsubscribePerformance();
    };
  }, [isRefreshing]);
  
  // If not on mobile, just render the children
  if (!isMobile()) {
    return <>{children}</>;
  }
  
  return (
    <div className="mobile-app-shell" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
      {/* Pull to refresh indicator */}
      {isRefreshing && (
        <div className="fixed top-0 left-0 right-0 z-50 flex justify-center py-2 bg-blue-500 text-white">
          <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Refreshing...
        </div>
      )}
      
      {/* Initial loading screen */}
      {initialLoad && (
        <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col items-center justify-center transition-opacity duration-500">
          <div className="w-20 h-20 mb-4 relative">
            <div className="w-full h-full rounded-full border-4 border-blue-500 dark:border-blue-400 border-t-transparent animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-10 h-10 text-blue-500 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">FPL Predictor</h2>
          <p className="text-gray-600 dark:text-gray-300">Loading your fantasy data...</p>
        </div>
      )}
      
      {/* Add to homescreen prompt */}
      {showInstallPrompt && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 p-4 shadow-lg border-t border-gray-200 dark:border-gray-700 z-40">
          <div className="flex items-center">
            <div className="flex-shrink-0 mr-4">
              <svg className="w-12 h-12 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">Add to Home Screen</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Install this app on your device for a better experience</p>
            </div>
          </div>
          <div className="mt-3 flex space-x-2">
            <button 
              onClick={() => setShowInstallPrompt(false)} 
              className="flex-1 py-2 px-4 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md"
            >
              Later
            </button>
            <button 
              onClick={() => setShowInstallPrompt(false)} 
              className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-md"
            >
              Install
            </button>
          </div>
        </div>
      )}
      
      {/* Bottom safe area for mobile */}
      <div className="pb-safe">
        {children}
      </div>
    </div>
  );
} 