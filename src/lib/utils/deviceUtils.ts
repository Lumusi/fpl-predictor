'use client';

/**
 * Checks if the current device is mobile based on window width
 * @returns Boolean indicating if the device is mobile
 */
export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
};

/**
 * Checks if the current device is a tablet based on window width
 * @returns Boolean indicating if the device is a tablet
 */
export const isTablet = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= 768 && window.innerWidth < 1024;
};

/**
 * Gets the appropriate number of items to display based on device type
 * @param defaultCount Default number of items for desktop
 * @param mobileCount Number of items for mobile devices
 * @param tabletCount Optional number of items for tablet devices
 * @returns Number of items appropriate for the current device
 */
export const getDeviceAwareCount = (
  defaultCount: number,
  mobileCount: number,
  tabletCount?: number
): number => {
  if (isMobile()) return mobileCount;
  if (isTablet() && tabletCount !== undefined) return tabletCount;
  return defaultCount;
}; 