'use client';

import { useState, useEffect } from 'react';

/**
 * A hook that provides debounced state updates
 * @param value The value to debounce
 * @param delay The debounce delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Update debounced value after delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cancel the timeout if value changes or unmounts
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * A hook that provides a debounced setter function
 * @param setter The state setter function to debounce
 * @param delay The debounce delay in milliseconds
 * @returns A debounced version of the setter function
 */
export function useDebouncedSetter<T>(
  setter: (value: T) => void, 
  delay: number = 300
): (value: T) => void {
  const [value, setValue] = useState<T | null>(null);
  const debouncedValue = useDebounce(value, delay);

  useEffect(() => {
    // Only call the setter when we have a debounced value
    if (debouncedValue !== null) {
      setter(debouncedValue);
    }
  }, [debouncedValue, setter]);

  return setValue as (value: T) => void;
} 