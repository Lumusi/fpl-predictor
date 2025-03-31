import { SWRConfiguration } from 'swr';

// Default revalidation intervals in milliseconds
export const CACHE_TIMES = {
  TEAMS: 24 * 60 * 60 * 1000,        // 24 hours (teams rarely change)
  PLAYERS: 6 * 60 * 60 * 1000,       // 6 hours (player data changes after games)
  FIXTURES: 12 * 60 * 60 * 1000,     // 12 hours (fixtures rarely change)
  PLAYER_HISTORY: 6 * 60 * 60 * 1000 // 6 hours (history updates after games)
};

// Default SWR configuration
export const defaultSWRConfig: SWRConfiguration = {
  // Global configuration applied to all SWR hooks
  revalidateIfStale: true,     // Revalidate if the data is stale
  revalidateOnFocus: true,     // Revalidate when window gets focused
  revalidateOnReconnect: true, // Revalidate when browser regains connection
  shouldRetryOnError: true,    // Retry on error
  errorRetryCount: 3,          // Number of retry attempts
  dedupingInterval: 2000,      // Dedupe requests during this time (milliseconds)
  focusThrottleInterval: 5000, // Throttle focus events within this period
};

// Resource-specific SWR configurations
export const swrConfigs = {
  teams: {
    ...defaultSWRConfig,
    dedupingInterval: CACHE_TIMES.TEAMS,
    revalidateOnFocus: false,  // Teams rarely change, no need to revalidate on focus
  },
  
  players: {
    ...defaultSWRConfig,
    dedupingInterval: CACHE_TIMES.PLAYERS,
  },
  
  fixtures: {
    ...defaultSWRConfig,
    dedupingInterval: CACHE_TIMES.FIXTURES,
    revalidateOnFocus: false,  // Fixtures don't change often
  },
  
  playerHistory: {
    ...defaultSWRConfig,
    dedupingInterval: CACHE_TIMES.PLAYER_HISTORY,
  },
};

// Helper to get configuration for a specific resource
export function getSWRConfig(resource: keyof typeof swrConfigs): SWRConfiguration {
  return swrConfigs[resource] || defaultSWRConfig;
}

// Helper to check if data needs refreshing based on cache time
export function isDataStale(
  lastFetchTime: number | null, 
  resource: keyof typeof CACHE_TIMES
): boolean {
  if (!lastFetchTime) return true;
  
  const cacheTime = CACHE_TIMES[resource] || 0;
  const now = Date.now();
  return (now - lastFetchTime) > cacheTime;
} 