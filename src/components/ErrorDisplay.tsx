import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ErrorResponse {
  message?: string; 
  response?: { 
    status?: number; 
    statusText?: string; 
  }
}

type ErrorType = Error | ErrorResponse;

interface ErrorDisplayProps {
  error: ErrorType;
  onRetry?: () => void;
}

export default function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  // Extract useful information from the error object
  const errorMessage = error?.message || 'Unknown error occurred';
  const isNetworkError = errorMessage.toLowerCase().includes('network error');
  
  // Check if error has response property (ErrorResponse type)
  const hasResponse = (err: ErrorType): err is ErrorResponse => 
    typeof (err as ErrorResponse).response !== 'undefined';
  
  const status = hasResponse(error) ? error.response?.status : undefined;
  const statusText = hasResponse(error) ? error.response?.statusText : undefined;
  
  return (
    <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-6 py-5 rounded-lg shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <ExclamationTriangleIcon className="h-6 w-6 text-red-500 dark:text-red-400" />
        <h3 className="text-lg font-medium">Error loading data from the FPL API</h3>
      </div>
      
      <div className="mt-3">
        <p className="font-medium">Details:</p>
        <ul className="list-disc pl-5 mt-2 space-y-2 text-sm text-red-600 dark:text-red-300">
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
      
      <div className="mt-4 text-sm text-red-600 dark:text-red-300 border-t border-red-200 dark:border-red-800/50 pt-3">
        {isNetworkError ? (
          <>
            The application is now using a server-side proxy to avoid CORS issues.
            If you&apos;re still seeing this error, the FPL API might be temporarily unavailable or
            there could be a network connection problem.
          </>
        ) : (
          <>
            This might be due to rate limiting or temporary API issues. Please try again later.
          </>
        )}
      </div>
      
      {onRetry && (
        <button 
          onClick={onRetry}
          className="mt-4 bg-red-100 hover:bg-red-200 dark:bg-red-800/30 dark:hover:bg-red-800/50 text-red-700 dark:text-red-300 px-4 py-2 rounded-md transition-colors flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Try Again
        </button>
      )}
    </div>
  );
} 