'use client';

import { useState, useEffect } from 'react';

// Custom type for extended PerformanceEntry with first-input properties
interface FirstInputEntry extends PerformanceEntry {
  processingStart: number;
  startTime: number;
}

// Extended Performance interface with memory info
interface ExtendedPerformance extends Performance {
  memory?: {
    jsHeapSizeLimit: number;
    totalJSHeapSize: number;
    usedJSHeapSize: number;
  };
}

// Interface for performance metrics
interface PerformanceMetrics {
  // Navigation and page load metrics
  navigationStart?: number;
  loadEventEnd?: number;
  domComplete?: number;
  pageLoadTime?: number;
  domLoadTime?: number;

  // First paint metrics
  firstPaint?: number;
  firstContentfulPaint?: number;
  
  // Interaction metrics
  firstInputDelay?: number;
  
  // JavaScript execution metrics
  longTasks: {
    startTime: number;
    duration: number;
    name: string;
  }[];
  
  // Memory usage
  jsHeapSizeLimit?: number;
  totalJSHeapSize?: number;
  usedJSHeapSize?: number;
  
  // Custom app metrics
  componentRenderTimes: Record<string, number>;
  apiCallTimes: Record<string, number>;
  customMetrics: Record<string, number>;
}

// Global performance store
class PerformanceStore {
  private static instance: PerformanceStore;
  private metrics: PerformanceMetrics = {
    longTasks: [],
    componentRenderTimes: {},
    apiCallTimes: {},
    customMetrics: {},
  };
  private observers: ((metrics: PerformanceMetrics) => void)[] = [];

  private constructor() {
    // Initialize performance monitoring if in the browser
    if (typeof window !== 'undefined') {
      this.setupPerformanceObservers();
      this.captureNavigationTiming();
    }
  }

  public static getInstance(): PerformanceStore {
    if (!PerformanceStore.instance) {
      PerformanceStore.instance = new PerformanceStore();
    }
    return PerformanceStore.instance;
  }

  private setupPerformanceObservers(): void {
    // Set up Long Tasks observer
    if ('PerformanceObserver' in window) {
      try {
        // Monitor long tasks (tasks that block the main thread for more than 50ms)
        const longTaskObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          entries.forEach((entry) => {
            this.metrics.longTasks.push({
              startTime: entry.startTime,
              duration: entry.duration,
              name: entry.entryType,
            });
          });
          this.notifyObservers();
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });

        // Monitor first paint metrics
        const paintObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          entries.forEach((entry) => {
            const metricName = entry.name === 'first-paint' 
              ? 'firstPaint' 
              : 'firstContentfulPaint';
            this.metrics[metricName] = entry.startTime;
          });
          this.notifyObservers();
        });
        paintObserver.observe({ entryTypes: ['paint'] });

        // Monitor first input delay
        if ('first-input' in PerformanceObserver.supportedEntryTypes) {
          const fidObserver = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            if (entries.length > 0) {
              // Cast to our extended FirstInputEntry to access processingStart property
              const firstInput = entries[0] as FirstInputEntry;
              this.metrics.firstInputDelay = firstInput.processingStart - firstInput.startTime;
              this.notifyObservers();
            }
          });
          fidObserver.observe({ type: 'first-input', buffered: true });
        }
      } catch (e) {
        console.error('Error setting up performance observers:', e);
      }
    }
  }

  private captureNavigationTiming(): void {
    if (performance && performance.timing) {
      // Wait for the page to fully load
      window.addEventListener('load', () => {
        // Wait a moment for load event to complete
        setTimeout(() => {
          const timing = performance.timing;
          
          this.metrics.navigationStart = timing.navigationStart;
          this.metrics.loadEventEnd = timing.loadEventEnd;
          this.metrics.domComplete = timing.domComplete;
          this.metrics.pageLoadTime = timing.loadEventEnd - timing.navigationStart;
          this.metrics.domLoadTime = timing.domComplete - timing.navigationStart;
          
          // Cast to ExtendedPerformance to access memory property
          const extendedPerf = performance as ExtendedPerformance;
          
          // Capture memory info if available
          if (extendedPerf.memory) {
            this.metrics.jsHeapSizeLimit = extendedPerf.memory.jsHeapSizeLimit;
            this.metrics.totalJSHeapSize = extendedPerf.memory.totalJSHeapSize;
            this.metrics.usedJSHeapSize = extendedPerf.memory.usedJSHeapSize;
          }
          
          this.notifyObservers();
        }, 0);
      });
    }
  }

  // Method to start timing a component render
  public startComponentRenderTimer(componentName: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      this.metrics.componentRenderTimes[componentName] = duration;
      this.notifyObservers();
    };
  }

  // Method to record API call timing
  public recordApiCall(endpoint: string, duration: number): void {
    this.metrics.apiCallTimes[endpoint] = duration;
    this.notifyObservers();
  }

  // Method to record custom metrics
  public recordCustomMetric(name: string, value: number): void {
    this.metrics.customMetrics[name] = value;
    this.notifyObservers();
  }

  // Register observer to get notified of metrics changes
  public subscribe(callback: (metrics: PerformanceMetrics) => void): () => void {
    this.observers.push(callback);
    
    // Immediately notify with current metrics
    callback(this.metrics);
    
    // Return unsubscribe function
    return () => {
      this.observers = this.observers.filter(cb => cb !== callback);
    };
  }

  private notifyObservers(): void {
    this.observers.forEach(callback => {
      callback(this.metrics);
    });
  }

  // Get the current metrics
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
}

// Export singleton instance getter
export const getPerformanceStore = () => PerformanceStore.getInstance();

// Add this new export for recording custom metrics directly
export const recordCustomMetric = (name: string, value: number): void => {
  const store = getPerformanceStore();
  store.recordCustomMetric(name, value);
};

// React hook to use performance metrics
export function usePerformanceMetrics(): PerformanceMetrics {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    longTasks: [],
    componentRenderTimes: {},
    apiCallTimes: {},
    customMetrics: {},
  });

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return;
    }

    const store = getPerformanceStore();
    const unsubscribe = store.subscribe(setMetrics);
    
    return unsubscribe;
  }, []);

  return metrics;
}

// Helper to measure React component render time
export function useComponentRenderTimer(componentName: string): void {
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return;
    }

    // Start the timer when component mounts
    const store = getPerformanceStore();
    const endTimer = store.startComponentRenderTimer(componentName);
    
    // End the timer when component unmounts
    return endTimer;
  }, [componentName]);
}

// Helper for timing API calls
export function measureApiCall<T>(
  endpoint: string,
  promise: Promise<T>
): Promise<T> {
  const startTime = performance.now();
  
  return promise.finally(() => {
    const duration = performance.now() - startTime;
    getPerformanceStore().recordApiCall(endpoint, duration);
  });
}

// Helper to log/report performance issues
export function reportPerformanceIssue(
  issueType: string, 
  details: Record<string, any>
): void {
  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.warn(`Performance issue detected - ${issueType}:`, details);
  }
  
  // In production, could send to analytics or monitoring service
  // if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
  //   // Example: send to analytics
  //   window.gtag?.('event', 'performance_issue', {
  //     event_category: 'performance',
  //     event_label: issueType,
  //     ...details
  //   });
  // }
}

// Auto-detect performance issues
export function setupPerformanceMonitoring(): () => void {
  if (typeof window === 'undefined') {
    return () => {}; // No-op for SSR
  }
  
  const store = getPerformanceStore();
  
  const unsubscribe = store.subscribe((metrics) => {
    // Check for long tasks
    const recentLongTasks = metrics.longTasks
      .filter(task => task.duration > 100); // Tasks over 100ms
    
    if (recentLongTasks.length > 0) {
      reportPerformanceIssue('long_task', {
        count: recentLongTasks.length,
        maxDuration: Math.max(...recentLongTasks.map(t => t.duration)),
        tasks: recentLongTasks
      });
    }
    
    // Check for slow API calls
    const slowApiCalls = Object.entries(metrics.apiCallTimes)
      .filter(([, duration]) => duration > 1000) // API calls over 1s
      .map(([endpoint, duration]) => ({ endpoint, duration }));
    
    if (slowApiCalls.length > 0) {
      reportPerformanceIssue('slow_api_call', { calls: slowApiCalls });
    }
    
    // Check for slow component renders
    const slowComponents = Object.entries(metrics.componentRenderTimes)
      .filter(([, duration]) => duration > 50) // Components that took over 50ms to render
      .map(([component, duration]) => ({ component, duration }));
    
    if (slowComponents.length > 0) {
      reportPerformanceIssue('slow_component_render', { components: slowComponents });
    }
  });
  
  return unsubscribe;
}

// Export frame rate monitoring function
export function startFrameRateMonitoring(thresholdFps = 30, sampleSize = 10): () => void {
  let frames = 0;
  let lastTime = performance.now();
  let frameRates: number[] = [];
  let frameTimes: number[] = [];
  let rafId: number | null = null;
  
  // Track if we're in low FPS mode
  let isLowFpsDetected = false;
  
  const tick = () => {
    frames++;
    const now = performance.now();
    const elapsed = now - lastTime;
    
    // Calculate FPS every second
    if (elapsed >= 1000) {
      const fps = Math.round((frames * 1000) / elapsed);
      
      // Record frame time (ms per frame)
      const frameTime = elapsed / frames;
      frameTimes.push(frameTime);
      
      // Keep the sample size limited
      frameRates.push(fps);
      if (frameRates.length > sampleSize) {
        frameRates.shift();
        frameTimes.shift();
      }
      
      // Calculate average FPS over the sample
      const avgFps = Math.round(
        frameRates.reduce((sum, fps) => sum + fps, 0) / frameRates.length
      );
      
      // Calculate average frame time
      const avgFrameTime = frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
      
      // Log performance data
      if (avgFps < thresholdFps && !isLowFpsDetected) {
        console.warn(`Low frame rate detected: ${avgFps} FPS, avg frame time: ${avgFrameTime.toFixed(2)}ms`);
        recordCustomMetric('lowFpsDetected', 1);
        isLowFpsDetected = true;
      } else if (avgFps >= thresholdFps && isLowFpsDetected) {
        console.info(`Frame rate recovered: ${avgFps} FPS`);
        recordCustomMetric('lowFpsDetected', 0);
        isLowFpsDetected = false;
      }
      
      // Record fps metric
      recordCustomMetric('currentFps', avgFps);
      recordCustomMetric('avgFrameTime', avgFrameTime);
      
      // Reset counters
      frames = 0;
      lastTime = now;
    }
    
    // Continue monitoring
    rafId = requestAnimationFrame(tick);
  };
  
  // Start monitoring
  rafId = requestAnimationFrame(tick);
  
  // Return cleanup function
  return () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
  };
} 