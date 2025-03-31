'use client';

import React, { Suspense, lazy, useState, useEffect } from 'react';

// Lazy load the TeamBuilder component
const TeamBuilder = lazy(() => import('./team/TeamBuilder'));

// Simple loading state component
const LoadingState = () => (
  <div className="flex flex-col items-center justify-center min-h-screen p-4">
    <div className="animate-pulse mb-4">
      <div className="h-16 w-16 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center">
        <svg 
          className="text-white w-8 h-8" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor" 
          strokeWidth={2}
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M19.5 12h-15m0 0l6.75 6.75M4.5 12l6.75-6.75" 
          />
        </svg>
      </div>
    </div>
    <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
      Loading Team Builder
    </h2>
    <p className="text-gray-500 dark:text-gray-400 text-center">
      Preparing your team building experience...
    </p>
    <div className="w-48 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-4 overflow-hidden">
      <div className="h-full bg-blue-600 dark:bg-blue-500 animate-progressbar"></div>
    </div>
  </div>
);

// Error fallback component
const ErrorFallback = ({ error, resetErrorBoundary }: { 
  error: Error; 
  resetErrorBoundary: () => void;
}) => (
  <div className="flex flex-col items-center justify-center min-h-screen p-4">
    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg mb-4">
      <svg 
        className="w-12 h-12 text-red-500 mx-auto mb-2" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
        />
      </svg>
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2 text-center">
        Something went wrong
      </h2>
      <p className="text-gray-600 dark:text-gray-300 text-center mb-4">
        {error.message || "An error occurred while loading the team builder."}
      </p>
      <button
        onClick={resetErrorBoundary}
        className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors"
      >
        Try Again
      </button>
    </div>
  </div>
);

// ErrorBoundary class component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ComponentType<any> },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ComponentType<any> }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback } = this.props;
      return <Fallback error={this.state.error} resetErrorBoundary={this.resetErrorBoundary} />;
    }

    return this.props.children;
  }
}

/**
 * TeamBuilderLoader - Handles lazy loading the TeamBuilder component with Suspense
 * This provides code splitting to improve initial load performance
 */
export default function TeamBuilderLoader() {
  // Track if the component has mounted
  const [isMounted, setIsMounted] = useState(false);
  
  // Only show the team builder after mounting to ensure client-side hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Add custom CSS for the progress bar animation
  useEffect(() => {
    if (typeof document !== 'undefined') {
      // Add only if it doesn't already exist
      if (!document.getElementById('progress-animation')) {
        const style = document.createElement('style');
        style.id = 'progress-animation';
        style.innerHTML = `
          @keyframes progressbar {
            0% { width: 0; }
            100% { width: 100%; }
          }
          .animate-progressbar {
            animation: progressbar 2s ease-in-out infinite;
          }
        `;
        document.head.appendChild(style);
      }
    }
    
    return () => {
      // Clean up on unmount
      if (typeof document !== 'undefined') {
        const style = document.getElementById('progress-animation');
        if (style) {
          style.remove();
        }
      }
    };
  }, []);
  
  if (!isMounted) {
    return <LoadingState />;
  }
  
  return (
    <ErrorBoundary fallback={ErrorFallback}>
      <Suspense fallback={<LoadingState />}>
        <TeamBuilder />
      </Suspense>
    </ErrorBoundary>
  );
} 