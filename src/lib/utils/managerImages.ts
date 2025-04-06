/**
 * Utility functions for manager images
 */

import managersData from '../../../public/data/managers.json';

// Type definition for manager data
interface Manager {
  id: string;
  name: string;
  team: string;
  imageUrl: string;
}

// Create a map of team names to manager data for quick lookup
const teamToManagerMap = new Map<string, Manager>();
const managerIdMap = new Map<string, Manager>();

// Initialize the maps
(managersData as Manager[]).forEach(manager => {
  teamToManagerMap.set(manager.team.toLowerCase(), manager);
  managerIdMap.set(manager.id, manager);
});

/**
 * Get the URL for a manager's image from the managers directory
 * @param managerId - The manager's Opta code (e.g., 'man53902')
 * @param useFallback - Whether to use placeholder when image doesn't exist (default: true)
 * @returns The URL to the manager's image
 */
export function getManagerImageUrl(managerId: string, useFallback: boolean = true): string {
  if (!managerId) {
    return useFallback ? '/images/placeholder-manager.svg' : '';
  }
  
  // Primary location: public/images/managers folder
  return `/images/managers/${managerId}.png`;
}

/**
 * Get manager data by team name
 * @param teamName - The team name (e.g., 'Arsenal', 'Man City')
 * @returns The manager data or undefined if not found
 */
export function getManagerByTeam(teamName: string): Manager | undefined {
  if (!teamName) return undefined;
  
  // Normalize team name for lookup
  const normalizedTeamName = teamName.toLowerCase();
  return teamToManagerMap.get(normalizedTeamName);
}

/**
 * Get manager image URL by team name
 * @param teamName - The team name (e.g., 'Arsenal', 'Man City')
 * @param useFallback - Whether to use placeholder when image doesn't exist (default: true)
 * @returns The URL to the manager's image or fallback image
 */
export function getManagerImageUrlByTeam(teamName: string, useFallback: boolean = true): string {
  const manager = getManagerByTeam(teamName);
  
  if (!manager) {
    return useFallback ? '/images/placeholder-manager.svg' : '';
  }
  
  return getManagerImageUrl(manager.id, useFallback);
}

/**
 * Get manager data by Opta ID
 * @param optaId - The manager's Opta ID (e.g., 'man53902')
 * @returns The manager data or undefined if not found
 */
export function getManagerById(optaId: string): Manager | undefined {
  if (!optaId) return undefined;
  return managerIdMap.get(optaId);
}

/**
 * Get all available managers
 * @returns Array of all manager data
 */
export function getAllManagers(): Manager[] {
  return managersData as Manager[];
}

/**
 * Formats the manager ID to the format used by Premier League photos
 * @param managerId - The manager's Opta code (e.g., 'man53902')
 * @returns The URL to the Premier League manager photo
 */
export function getPremierLeagueManagerImageUrl(managerId: string): string {
  if (!managerId) {
    return '';
  }
  
  return `https://resources.premierleague.com/premierleague/photos/players/110x140/${managerId}.png`;
}
