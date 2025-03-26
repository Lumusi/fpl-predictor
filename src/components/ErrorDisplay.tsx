import React from 'react';

interface ErrorDisplayProps {
  error: any;
  onRetry?: () => void;
}

export default function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  // Extract useful information from the error object
  const errorMessage = error?.message || 'Unknown error occurred';
  const isNetworkError = errorMessage.toLowerCase().includes('network error');
  const status = error?.response?.status;
  const statusText = error?.response?.statusText;
  
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
      <h3 className="text-lg font-medium">Error loading data from the FPL API</h3>
      
      <div className="mt-2">
        <p className="font-medium">Details:</p>
        <ul className="list-disc pl-5 mt-1 space-y-1 text-sm text-red-600">
          <li>{errorMessage}</li>
          {status && <li>Status: {status} {statusText}</li>}
          {isNetworkError && (
            <li>
              This appears to be a network connectivity issue. The FPL API may be down or 
              there might be CORS restrictions.
            </li>
          )}
        </ul>
      </div>
      
      <div className="mt-4">
        <p className="text-sm">
          {isNetworkError ? (
            <>
              The application is now using a server-side proxy to avoid CORS issues.
              If you're still seeing this error, the FPL API might be temporarily unavailable or
              there could be a network connection problem.
            </>
          ) : (
            <>
              This might be due to rate limiting or temporary API issues. Please try again later.
            </>
          )}
        </p>
      </div>
      
      {onRetry && (
        <button 
          onClick={onRetry}
          className="mt-3 bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-md transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
} 