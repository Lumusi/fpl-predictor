'use client';

import { useCallback, useRef, useEffect } from 'react';

/**
 * A hook that returns a memoized callback that only changes when its dependencies change.
 * This is an enhanced version of useCallback that ensures the callback doesn't change
 * unnecessarily, helping to prevent unnecessary re-renders of child components.
 * 
 * @param callback The callback function to memoize
 * @param dependencies The dependencies to watch for changes
 * @returns A memoized callback function
 */
export function useMemoizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  dependencies: any[]
): T {
  // Use a ref to store the latest callback
  const callbackRef = useRef<T>(callback);
  
  // Update the ref when the callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  // Create the memoized callback using useCallback
  // This ensures the function identity stays the same between renders
  // if the dependencies don't change
  return useCallback(
    ((...args: any[]) => {
      return callbackRef.current(...args);
    }) as T,
    dependencies
  );
}

/**
 * A hook that tracks previous values of a prop or state to detect changes
 * Useful for optimizing performance by avoiding unnecessary operations
 * 
 * @param value The value to track
 * @returns The previous value
 */
export function usePrevious<T>(value: T): T | undefined {
  // Keep the previous value in a ref
  const ref = useRef<T>();
  
  // Update the ref after each render
  useEffect(() => {
    ref.current = value;
  }, [value]);
  
  // Return the previous value
  return ref.current;
}

/**
 * A hook that performs deep comparison of dependencies for memoization.
 * This is useful when dependencies are objects or arrays that may have the 
 * same content but different references.
 * 
 * @param callback The callback function to memoize
 * @param dependencies The dependencies array for memoization
 * @returns A memoized callback that only changes when dependencies change semantically
 */
export function useDeepMemoizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  dependencies: any[]
): T {
  // Store dependencies in a ref
  const depsRef = useRef<any[]>(dependencies);
  
  // Check if dependencies have changed
  const hasChanged = dependencies && depsRef.current ? !arraysEqual(dependencies, depsRef.current) : true;
  
  // Update dependencies ref if they changed
  useEffect(() => {
    if (hasChanged) {
      depsRef.current = dependencies;
    }
  }, [hasChanged, dependencies]);
  
  // Return memoized callback that only changes when dependencies change
  return useCallback(
    ((...args: any[]) => callback(...args)) as T,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasChanged]
  );
}

/**
 * Helper function to perform deep equality check on arrays
 */
function arraysEqual(a: any[], b: any[]): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  
  for (let i = 0; i < a.length; i++) {
    const aVal = a[i];
    const bVal = b[i];
    
    // Handle objects
    if (typeof aVal === 'object' && aVal !== null && 
        typeof bVal === 'object' && bVal !== null) {
      if (Array.isArray(aVal) && Array.isArray(bVal)) {
        if (!arraysEqual(aVal, bVal)) return false;
      } else {
        // Deep compare objects
        const aKeys = Object.keys(aVal);
        const bKeys = Object.keys(bVal);
        
        if (aKeys.length !== bKeys.length) return false;
        
        for (const key of aKeys) {
          if (!Object.prototype.hasOwnProperty.call(bVal, key) || 
              !deepEqual(aVal[key], bVal[key])) {
            return false;
          }
        }
      }
    } else if (aVal !== bVal) {
      return false;
    }
  }
  
  return true;
}

/**
 * Helper function to perform deep equality check
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  
  if (a === null || b === null) return a === b;
  
  if (typeof a !== typeof b) return false;
  
  if (typeof a === 'object') {
    if (Array.isArray(a) && Array.isArray(b)) {
      return arraysEqual(a, b);
    } else if (a && b) {
      const aKeys = Object.keys(a);
      const bKeys = Object.keys(b);
      
      if (aKeys.length !== bKeys.length) return false;
      
      for (const key of aKeys) {
        if (!Object.prototype.hasOwnProperty.call(b, key) || 
            !deepEqual(a[key], b[key])) {
          return false;
        }
      }
      
      return true;
    }
    return false;
  }
  
  return a === b;
} 