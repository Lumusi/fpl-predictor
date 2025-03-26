import axios from 'axios';

// Base URL for our proxy API
const PROXY_API_URL = '/api/fpl';

// Types
export interface Player {
  id: number;
  code: number;  // This is the player code used in the Premier League photos URL
  web_name: string;
  team: number;
  element_type: number;
  now_cost: number;
  total_points: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  minutes: number;
  form: string;
  points_per_game: string;
  selected_by_percent: string;
  status: string;
  chance_of_playing_next_round: number | null;
  fixtures?: {
    is_home: boolean;
    difficulty: number;
    team_h: number;
    team_a: number;
    event: number;
    kickoff_time: string;
  }[];
}

export interface Team {
  id: number;
  name: string;
  short_name: string;
  strength: number;
  strength_overall_home: number;
  strength_overall_away: number;
  strength_attack_home: number;
  strength_attack_away: number;
  strength_defence_home: number;
  strength_defence_away: number;
}

export interface Fixture {
  id: number;
  event: number | null;
  team_h: number;
  team_a: number;
  team_h_difficulty: number;
  team_a_difficulty: number;
  kickoff_time?: string;
}

// Team data context - used to store FPL team information across the app
type TeamDataContext = {
  teams: Team[];
  teamIdMap: Record<string, number>; // Maps team names/short names to FPL IDs
  isLoaded: boolean;
};

// Global context for team data to avoid repeated API calls
let teamDataContext: TeamDataContext = {
  teams: [],
  teamIdMap: {},
  isLoaded: false
};

// Define a static mapping for team IDs based on the downloaded images
const STATIC_TEAM_ID_MAP: Record<string, number> = {
  // Team short names to IDs mapping (2023-2024 season)
  // Exact mapping from downloadTeamImagesSimple.ts
  'ars': 3,
  'arsenal': 3,
  'avl': 7,
  'aston villa': 7,
  'bou': 91,
  'bournemouth': 91,
  'bre': 94,
  'brentford': 94,
  'bha': 36,
  'brighton': 36,
  'che': 8,
  'chelsea': 8,
  'cry': 31,
  'crystal palace': 31,
  'eve': 11,
  'everton': 11,
  'ful': 54,
  'fulham': 54,
  'ipw': 40,
  'ipswich': 40,
  'lei': 13,
  'leicester': 13,
  'liv': 14,
  'liverpool': 14,
  'mci': 43,
  'man city': 43,
  'manchester city': 43,
  'mun': 1,
  'man utd': 1,
  'manchester united': 1,
  'new': 4,
  'newcastle': 4,
  'nfo': 17,
  'nottingham forest': 17,
  "nott'm forest": 17,
  'sou': 20,
  'southampton': 20,
  'tot': 6,
  'spurs': 6,
  'tottenham': 6,
  'whu': 21,
  'west ham': 21,
  'wol': 39,
  'wolves': 39
};

// API functions
export async function getAllPlayers(): Promise<Player[]> {
  try {
    const response = await axios.get(`${PROXY_API_URL}?endpoint=bootstrap-static/`);
    return response.data.elements;
  } catch (error) {
    console.error('Error fetching all players:', error);
    throw error;
  }
}

export async function getAllTeams(): Promise<Team[]> {
  try {
    const response = await axios.get(`${PROXY_API_URL}?endpoint=bootstrap-static/`);
    return response.data.teams;
  } catch (error) {
    console.error('Error fetching all teams:', error);
    throw error;
  }
}

export async function getFixtures(): Promise<Fixture[]> {
  try {
    const response = await axios.get(`${PROXY_API_URL}?endpoint=fixtures/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching fixtures:', error);
    throw error;
  }
}

export async function getPlayerHistory(playerId: number): Promise<any> {
  try {
    const response = await axios.get(`${PROXY_API_URL}?endpoint=element-summary/${playerId}/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching player history for player ${playerId}:`, error);
    throw error;
  }
}

export async function getGameweekData(gameweek: number): Promise<any> {
  try {
    const response = await axios.get(`${PROXY_API_URL}?endpoint=event/${gameweek}/live/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching gameweek ${gameweek} data:`, error);
    throw error;
  }
}

// Get all teams and create a mapping of team names to FPL IDs
export async function loadTeamData(): Promise<TeamDataContext> {
  if (teamDataContext.isLoaded) {
    return teamDataContext;
  }
  
  try {
    const teams = await getAllTeams();
    
    // Create mapping from team names and short names to FPL IDs
    const teamIdMap: Record<string, number> = {...STATIC_TEAM_ID_MAP};
    
    teams.forEach(team => {
      // Map both full name and short name to the FPL ID
      teamIdMap[team.name.toLowerCase()] = team.id;
      teamIdMap[team.short_name.toLowerCase()] = team.id;
    });
    
    teamDataContext = {
      teams,
      teamIdMap,
      isLoaded: true
    };
    
    return teamDataContext;
  } catch (error) {
    console.error('Error loading team data:', error);
    // In case of API failure, still use the static mapping
    teamDataContext = {
      teams: [],
      teamIdMap: STATIC_TEAM_ID_MAP,
      isLoaded: true
    };
    return teamDataContext;
  }
}

// Function to find FPL team ID by team name
export function getFplTeamIdByName(teamName: string): number | null {
  if (!teamDataContext.isLoaded) {
    // Use static map even if team data not loaded
    const normalizedName = teamName.toLowerCase().trim();
    const staticId = STATIC_TEAM_ID_MAP[normalizedName];
    if (staticId) {
      return staticId;
    }
    console.warn('Team data not loaded yet. Call loadTeamData() first.');
    return null;
  }
  
  const normalizedName = teamName.toLowerCase().trim();
  return teamDataContext.teamIdMap[normalizedName] || null;
}

// Get the shirt image URL - always returns placeholder now
export function getTeamShirtUrl(_teamId: number | string, _type: 'home' | 'away' | 'keeper' = 'home'): string {
  // Add a random parameter to avoid browser caching
  const cacheBuster = Date.now();
  // Always return placeholder image
  return `/images/placeholder-shirt.svg?t=${cacheBuster}`;
}

// Get the team crest URL - always returns placeholder now
export function getTeamCrestUrl(_teamId: number | string): string {
  // Add a random parameter to avoid browser caching
  const cacheBuster = Date.now();
  // Always return placeholder image
  return `/images/placeholder-crest.svg?t=${cacheBuster}`;
}

/**
 * Direct mapping of team short names to IDs, avoiding the need to load team data
 * This ensures we're using the exact IDs from downloadTeamImagesSimple.ts
 */
export function getDirectTeamId(teamName: string): number | null {
  // Normalize the team name
  const normalizedName = teamName.toLowerCase().trim();
  
  // Direct mapping of team names/short names to IDs
  const directMapping: Record<string, number> = {
    'ars': 3,
    'arsenal': 3,
    'avl': 7,
    'aston villa': 7,
    'bou': 91,
    'bournemouth': 91,
    'bre': 94,
    'brentford': 94,
    'bha': 36,
    'brighton': 36,
    'che': 8,
    'chelsea': 8,
    'cry': 31,
    'crystal palace': 31,
    'eve': 11,
    'everton': 11,
    'ful': 54,
    'fulham': 54,
    'ipw': 13,
    'ipswich': 13,
    'lei': 13,
    'leicester': 13,
    'liv': 14,
    'liverpool': 14,
    'mci': 43,
    'man city': 43,
    'manchester city': 43,
    'mun': 1,
    'man utd': 1,
    'manchester united': 1,
    'new': 4,
    'newcastle': 4,
    'nfo': 17,
    'nottingham forest': 17,
    "nott'm forest": 17,
    'sou': 20,
    'southampton': 20,
    'tot': 6,
    'spurs': 6,
    'tottenham': 6,
    'whu': 21,
    'west ham': 21,
    'wol': 39,
    'wolves': 39
  };
  
  return directMapping[normalizedName] || null;
}

// Function to fetch and display all current FPL teams with their IDs
export async function logAllFplTeamIds(): Promise<void> {
  try {
    const teams = await getAllTeams();
    
    // Sort teams by ID for better readability
    teams.sort((a, b) => a.id - b.id);
    
    // Format team data for logging
    const teamInfo = teams.map(team => ({
      id: team.id,
      name: team.name,
      short_name: team.short_name
    }));
    
    console.log('==== FPL Team IDs ====');
    console.table(teamInfo);
    console.log('=====================');
    
    return;
  } catch (error) {
    console.error('Error fetching team IDs:', error);
  }
} 