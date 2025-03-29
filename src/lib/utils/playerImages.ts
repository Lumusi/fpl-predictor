/**
 * Utility functions for player images
 */

/**
 * Get the URL for a player's image from the players directory
 * @param playerId - The player's code (not the regular ID)
 * @param useFallback - Whether to use placeholder when image doesn't exist (default: true)
 * @returns The URL to the player's image
 */
export function getPlayerImageUrl(playerId: number | string, useFallback: boolean = true): string {
  if (!playerId) {
    return useFallback ? '/images/placeholder-shirt.svg' : '';
  }
  
  // Primary location: public/images/players folder
  return `/images/players/${playerId}.png`;
}

/**
 * Try multiple formats to find a player image
 * This is a fallback solution when the standard image naming convention doesn't match
 * @param playerId - Primary ID to try (usually the code)
 * @param fallbackId - Fallback ID to try (usually the element ID)
 * @param useFallback - Whether to use placeholder when image doesn't exist
 * @returns URL to the best available image
 */
export function findPlayerImage(playerId: number | string, fallbackId?: number | string, useFallback: boolean = true): string {
  if (!playerId && !fallbackId) {
    return useFallback ? '/images/placeholder-shirt.svg' : '';
  }
  
  // When checking browser console, log the paths we're checking
  const paths = [];
  
  // List of possible paths to try in order
  if (playerId) {
    paths.push(`/images/players/${playerId}.png`);
    // Also try without leading zeros if it's a string with leading zeros
    if (typeof playerId === 'string' && playerId.startsWith('0')) {
      paths.push(`/images/players/${parseInt(playerId, 10)}.png`);
    }
  }
  
  if (fallbackId && fallbackId !== playerId) {
    paths.push(`/images/players/${fallbackId}.png`);
    // Also try without leading zeros
    if (typeof fallbackId === 'string' && fallbackId.startsWith('0')) {
      paths.push(`/images/players/${parseInt(fallbackId, 10)}.png`);
    }
  }
  
  // Log the paths we're checking (for debugging)
  console.log(`Searching for player image in paths: ${paths.join(', ')}`);
  
  // Always return the first path, as we can't check if files exist on the client side
  // The image component will handle fallbacks if the file doesn't exist
  return paths[0] || (useFallback ? '/images/placeholder-shirt.svg' : '');
}

/**
 * Formats the player ID to the format used by Premier League photos
 * This is useful if you need to get images directly from the Premier League website
 * @param playerId - The player's code (not the regular ID)
 * @returns The URL to the Premier League player photo
 */
export function getPremierLeaguePlayerImageUrl(playerId: number | string): string {
  if (!playerId) {
    return '';
  }
  
  return `https://resources.premierleague.com/premierleague/photos/players/250x250/p${playerId}.png`;
}

/**
 * Utility function to check if a player image exists via the API
 * Note: This makes a network request and should be used sparingly
 * @param playerId - The player's ID
 * @returns Promise that resolves to a boolean indicating if the image exists
 */
export async function checkPlayerImageExists(playerId: number | string): Promise<boolean> {
  try {
    const response = await fetch(`/api/player-images?id=${playerId}`);
    const data = await response.json();
    return data.exists === true;
  } catch (error) {
    console.error(`Error checking if image exists for player ${playerId}:`, error);
    return false;
  }
}

/**
 * Get a list of all available player images
 * @returns Promise that resolves to an array of player IDs
 */
export async function getAvailablePlayerImages(): Promise<string[]> {
  try {
    const response = await fetch('/api/player-images?list=true');
    const data = await response.json();
    return data.playerImages || [];
  } catch (error) {
    console.error('Error getting available player images:', error);
    return [];
  }
} 