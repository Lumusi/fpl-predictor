'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { isMobile } from '@/lib/utils/deviceUtils';
import { setupPerformanceMonitoring, recordCustomMetric, startFrameRateMonitoring } from '@/lib/utils/performanceMonitoring';

interface MobileAppShellProps {
  children: React.ReactNode;
}

// Network quality detection and connection throttling
class NetworkMonitor {
  private static instance: NetworkMonitor;
  private slowConnection = false;
  private observers: ((isSlowConnection: boolean) => void)[] = [];
  
  private constructor() {
    this.detectNetworkQuality();
    this.setupNetworkListeners();
  }
  
  public static getInstance(): NetworkMonitor {
    if (!NetworkMonitor.instance) {
      NetworkMonitor.instance = new NetworkMonitor();
    }
    return NetworkMonitor.instance;
  }
  
  private detectNetworkQuality() {
    // Check connection type if available
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const conn = (navigator as any).connection;
      if (conn) {
        // Update slow connection state based on connection type
        const connectionTypes = ['slow-2g', '2g', 'cellular'];
        this.slowConnection = connectionTypes.includes(conn.effectiveType) || 
          (conn.downlink && conn.downlink < 1.0) ||
          (conn.rtt && conn.rtt > 500);
          
        if (this.slowConnection) {
          console.info('Slow connection detected, enabling data saving mode');
        }
        
        // Save to performance metrics
        recordCustomMetric('networkType', conn.effectiveType);
        recordCustomMetric('networkDownlink', conn.downlink);
        recordCustomMetric('networkRtt', conn.rtt);
      }
    }
  }
  
  private setupNetworkListeners() {
    // Add event listeners if available
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const conn = (navigator as any).connection;
      if (conn) {
        conn.addEventListener('change', () => {
          this.detectNetworkQuality();
          this.notifyObservers();
        });
      }
    }
    
    // Also monitor for offline/online events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.notifyObservers();
      });
      
      window.addEventListener('offline', () => {
        this.slowConnection = true;
        this.notifyObservers();
      });
    }
  }
  
  public isSlowConnection(): boolean {
    return this.slowConnection;
  }
  
  public subscribe(callback: (isSlowConnection: boolean) => void): () => void {
    this.observers.push(callback);
    callback(this.slowConnection);
    
    return () => {
      this.observers = this.observers.filter(cb => cb !== callback);
    };
  }
  
  private notifyObservers(): void {
    this.observers.forEach(callback => {
      callback(this.slowConnection);
    });
  }
}

/**
 * Mobile-specific app shell that provides a native app-like experience
 * This includes:
 * - Full viewport height with proper mobile viewport handling
 * - Pull-to-refresh behavior
 * - "Add to homescreen" prompt
 * - Performance monitoring for mobile devices
 * - Network quality detection and optimization
 */
export default function MobileAppShell({ children }: MobileAppShellProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [isLowEndDevice, setIsLowEndDevice] = useState(false);
  const [isSlowConnection, setIsSlowConnection] = useState(false);
  const [isLowPowerMode, setIsLowPowerMode] = useState(false);
  
  // Detect low-end devices
  useEffect(() => {
    if (!isMobile()) return;
    
    // Check device memory
    if (typeof navigator !== 'undefined' && 'deviceMemory' in navigator) {
      const memory = (navigator as any).deviceMemory;
      if (memory && memory < 4) {
        setIsLowEndDevice(true);
        console.info(`Low memory device detected (${memory}GB), enabling lite mode`);
        recordCustomMetric('deviceMemory', memory);
      }
    }
    
    // Check for battery status if available
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        // Check if device is charging and battery level
        const updateBatteryStatus = () => {
          // If battery level is below 15% and not charging, enable low power mode
          if (battery.level < 0.15 && !battery.charging) {
            setIsLowPowerMode(true);
            console.info('Low battery detected, enabling power saving mode');
          } else {
            setIsLowPowerMode(false);
          }
          recordCustomMetric('batteryLevel', battery.level * 100);
          recordCustomMetric('batteryCharging', battery.charging ? 1 : 0);
        };
        
        // Initial check
        updateBatteryStatus();
        
        // Add event listeners
        battery.addEventListener('levelchange', updateBatteryStatus);
        battery.addEventListener('chargingchange', updateBatteryStatus);
        
        return () => {
          battery.removeEventListener('levelchange', updateBatteryStatus);
          battery.removeEventListener('chargingchange', updateBatteryStatus);
        };
      }).catch(() => {
        // Battery API not supported or permission denied
      });
    }
  }, []);
  
  // Subscribe to network quality changes
  useEffect(() => {
    if (!isMobile()) return;
    
    const networkMonitor = NetworkMonitor.getInstance();
    const unsubscribe = networkMonitor.subscribe(setIsSlowConnection);
    
    return unsubscribe;
  }, []);
  
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
    
    // Start frame rate monitoring on mobile devices
    const unsubscribeFrameRate = startFrameRateMonitoring(25); // Lower threshold for mobile
    
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
      unsubscribeFrameRate();
    };
  }, [isRefreshing]);
  
  // Apply specific optimizations when on low-end device or slow connection
  useEffect(() => {
    if (isLowEndDevice || isSlowConnection || isLowPowerMode) {
      // Add data-saving class to body for CSS optimizations
      document.body.classList.add('data-saving-mode');
      
      // Disable animations to improve performance
      if (isLowEndDevice || isLowPowerMode) {
        document.body.classList.add('reduce-motion');
      }
      
      // Add performance CSS overrides
      if (typeof document !== 'undefined') {
        // Add CSS for performance mode if not already present
        if (!document.getElementById('performance-mode-css')) {
          const style = document.createElement('style');
          style.id = 'performance-mode-css';
          style.innerHTML = `
            /* Reduce motion for low-end devices */
            .reduce-motion * {
              transition-duration: 0.05s !important;
              animation-duration: 0.05s !important;
            }
            
            /* Performance optimizations for data saving mode */
            .data-saving-mode .animate-pulse {
              animation: none !important;
            }
            
            /* Reduce shadow complexity */
            .data-saving-mode * {
              box-shadow: none !important;
              text-shadow: none !important;
              backdrop-filter: none !important;
            }
            
            /* Simplify gradients */
            .data-saving-mode .bg-gradient-to-b,
            .data-saving-mode .bg-gradient-to-r {
              background-image: none !important;
            }
          `;
          document.head.appendChild(style);
        }
      }
      
      // Record device state for telemetry
      recordCustomMetric('dataSavingMode', 1);
      recordCustomMetric('lowEndDevice', isLowEndDevice ? 1 : 0);
      recordCustomMetric('slowConnection', isSlowConnection ? 1 : 0);
      recordCustomMetric('lowPowerMode', isLowPowerMode ? 1 : 0);
      
      return () => {
        document.body.classList.remove('data-saving-mode');
        document.body.classList.remove('reduce-motion');
        // Remove the style element if it exists
        const style = document.getElementById('performance-mode-css');
        if (style) {
          style.remove();
        }
      };
    }
  }, [isLowEndDevice, isSlowConnection, isLowPowerMode]);
  
  // If not on mobile, just render the children
  if (!isMobile()) {
    return <>{children}</>;
  }
  
  return (
    <div 
      className="mobile-app-shell" 
      style={{ height: 'calc(var(--vh, 1vh) * 100)' }}
      data-saving-mode={isLowEndDevice || isSlowConnection || isLowPowerMode ? 'true' : 'false'}
    >
      {/* Network/device status indicator */}
      {(isSlowConnection || isLowEndDevice || isLowPowerMode) && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white text-xs text-center py-0.5">
          {isSlowConnection ? 'Slow connection' : isLowPowerMode ? 'Power saving mode' : 'Lite mode'} - Optimizing performance
        </div>
      )}
      
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