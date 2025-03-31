import axios from 'axios';

// Base URL for our proxy API
const PROXY_API_URL = '/api/fpl';

// Create axios instance with credentials
const axiosWithCredentials = axios.create({
  withCredentials: true,
  headers: {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  }
});

// Types
export interface Player {
  id: number;
  code: number;  // This is the player code used in the Premier League photos URL
  web_name: string;
  first_name?: string; // Player's first name
  second_name?: string; // Player's last name
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
  position?: number; // Current league position
  points?: number; // Total points
  played?: number; // Matches played
  win?: number; // Wins
  draw?: number; // Draws
  loss?: number; // Losses
  goals_for?: number; // Goals scored
  goals_against?: number; // Goals conceded
  goal_difference?: number; // Goal difference
}

export interface Fixture {
  id: number;
  event: number | null;
  team_h: number;
  team_a: number;
  team_h_difficulty: number;
  team_a_difficulty: number;
  kickoff_time?: string;
  finished?: boolean;
  started?: boolean;
  team_h_score?: number | null;
  team_a_score?: number | null;
  finished_provisional?: boolean;
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
  'ips': 40,
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
    const response = await axiosWithCredentials.get(`${PROXY_API_URL}?endpoint=bootstrap-static/`);
    return response.data.elements;
  } catch (error) {
    console.error('Error fetching all players:', error);
    throw error;
  }
}

export async function getAllTeams(): Promise<Team[]> {
  try {
    const response = await axiosWithCredentials.get(`${PROXY_API_URL}?endpoint=bootstrap-static/`);
    return response.data.teams;
  } catch (error) {
    console.error('Error fetching all teams:', error);
    throw error;
  }
}

export async function getFixtures(): Promise<Fixture[]> {
  try {
    const response = await axiosWithCredentials.get(`${PROXY_API_URL}?endpoint=fixtures/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching fixtures:', error);
    throw error;
  }
}

export async function getPlayerHistory(playerId: number): Promise<any> {
  try {
    const response = await axiosWithCredentials.get(`${PROXY_API_URL}?endpoint=element-summary/${playerId}/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching player history for player ${playerId}:`, error);
    throw error;
  }
}

export async function getGameweekData(gameweek: number): Promise<any> {
  try {
    const response = await axiosWithCredentials.get(`${PROXY_API_URL}?endpoint=event/${gameweek}/live/`);
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

// Get URL for team shirt
export function getTeamShirtUrl(_teamId: number | string, _type: 'home' | 'away' | 'keeper' = 'home'): string {
  // TODO: Implement if needed. We currently use downloaded static images.
  // Need to map to the Premier League website shirt images if they expose them
  return '';
}

// Get URL for team crest/badge
export function getTeamCrestUrl(teamId: number | string): string {
  try {
    // Ensure teamId is a number
    const id = typeof teamId === 'string' ? parseInt(teamId, 10) : teamId;
    
    // For server-side access, use absolute URL from the Premier League API 
    // For client-side, use relative URL to our static assets
    const isServerSide = typeof window === 'undefined';
    
    if (isServerSide) {
      // Use Premier League API URL
      return `https://resources.premierleague.com/premierleague/badges/t${id}.png`;
    } else {
      // Try our local cached version first
      return `/images/teams/badges/${id}.png`;
    }
  } catch (error) {
    console.error('Error getting team crest URL:', error);
    return '';
  }
}

// Get direct team ID lookup from our pre-defined mapping
export function getDirectTeamId(teamName: string): number | null {
  try {
    // If no name provided, return null
    if (!teamName) return null;
    
    // Normalize the team name
    const normalizedName = teamName.toLowerCase().trim();
    
    // First check our static mapping (most reliable)
    if (STATIC_TEAM_ID_MAP[normalizedName]) {
      return STATIC_TEAM_ID_MAP[normalizedName];
    }
    
    // If not in our static mapping, try to find a partial match
    const possibleKeys = Object.keys(STATIC_TEAM_ID_MAP);
    
    // First try to find an exact match in any of our keys
    const exactMatch = possibleKeys.find(key => key === normalizedName);
    if (exactMatch) {
      return STATIC_TEAM_ID_MAP[exactMatch];
    }
    
    // Next try to find if the name contains any of our keys, or if any key contains the name
    const partialMatch = possibleKeys.find(key => 
      normalizedName.includes(key) || key.includes(normalizedName)
    );
    
    if (partialMatch) {
      return STATIC_TEAM_ID_MAP[partialMatch];
    }
    
    // If still not found, and team data is loaded, try the team data mapping
    if (teamDataContext.isLoaded) {
      // Try exact match
      if (teamDataContext.teamIdMap[normalizedName]) {
        return teamDataContext.teamIdMap[normalizedName];
      }
      
      // Try partial match
      const teamMapKeys = Object.keys(teamDataContext.teamIdMap);
      const teamMapPartialMatch = teamMapKeys.find(key =>
        normalizedName.includes(key) || key.includes(normalizedName)
      );
      
      if (teamMapPartialMatch) {
        return teamDataContext.teamIdMap[teamMapPartialMatch];
      }
    }
    
    // Not found anywhere
    console.warn(`Team not found with name: ${teamName}`);
    return null;
  } catch (error) {
    console.error('Error getting team ID:', error);
    return null;
  }
}

// Debug function to log all FPL team IDs available
export async function logAllFplTeamIds(): Promise<void> {
  try {
    // Get the official FPL team data
    const response = await axiosWithCredentials.get(`${PROXY_API_URL}?endpoint=bootstrap-static/`);
    const teams = response.data.teams;
    
    // Sort teams by ID
    const sortedTeams = [...teams].sort((a, b) => a.id - b.id);
    
    // Create a nice formatted output
    // This is removed in production
  } catch (error) {
    console.error('Error fetching team IDs:', error);
  }
}

// User team data types
export interface UserTeam {
  id: number;
  name: string;
  player_first_name: string;
  player_last_name: string;
  summary_overall_points: number;
  summary_overall_rank: number;
  current_event: number; // Current gameweek
}

export interface UserTeamPicks {
  active_chip: string | null;
  automatic_subs: any[];
  entry_history: {
    event: number;
    points: number;
    total_points: number;
    rank: number;
    event_transfers: number;
    event_transfers_cost: number;
    bank: number; // in 0.1m units
    value: number; // in 0.1m units
  };
  picks: {
    element: number; // player id
    position: number; // position in team (1-15)
    multiplier: number; // captain (2) or vice-captain (1) or bench (0)
    is_captain: boolean;
    is_vice_captain: boolean;
    purchase_price: number; // Price player was purchased at (in 0.1m units)
    selling_price: number; // Price player can be sold for (in 0.1m units)
  }[];
}

export async function getUserTeam(teamId: number): Promise<UserTeam> {
  try {
    const response = await axiosWithCredentials.get(`${PROXY_API_URL}?endpoint=entry/${teamId}/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching team data for ${teamId}:`, error);
    throw error;
  }
}

export async function getCurrentGameweek(): Promise<number> {
  try {
    const response = await axiosWithCredentials.get(`${PROXY_API_URL}?endpoint=bootstrap-static/`);
    const currentGameweek = response.data.events.find((event: any) => event.is_current);
    return currentGameweek ? currentGameweek.id : 1;
  } catch (error) {
    console.error('Error fetching current gameweek:', error);
    throw error;
  }
}

export async function getUserTeamPicks(teamId: number, gameweek?: number): Promise<UserTeamPicks> {
  try {
    // If gameweek is not provided, use the current one
    const currentGw = gameweek || await getCurrentGameweek();
    const response = await axiosWithCredentials.get(`${PROXY_API_URL}?endpoint=entry/${teamId}/event/${currentGw}/picks/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching team picks for ${teamId}:`, error);
    throw error;
  }
}

export interface TransferHistoryItem {
  element_in: number;       // Player ID that was transferred in
  element_in_cost: number;  // Cost of player transferred in (in 0.1m units)
  element_out: number;      // Player ID that was transferred out
  element_out_cost: number; // Cost of player transferred out (in 0.1m units)
  entry: number;            // Team ID
  event: number;            // Gameweek
  time: string;             // Timestamp of the transfer
}

export async function getUserTransferHistory(teamId: number): Promise<TransferHistoryItem[]> {
  try {
    const response = await axiosWithCredentials.get(`${PROXY_API_URL}?endpoint=entry/${teamId}/transfers/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching transfer history for ${teamId}:`, error);
    throw error;
  }
}

// Calculate league table based on fixtures
export async function getLeagueTable(): Promise<Team[]> {
  try {
    const [teams, fixtures] = await Promise.all([
      getAllTeams(),
      getFixtures()
    ]);
    
    // Create table with initial values
    const table = teams.map(team => ({
      ...team,
      position: 0,
      points: 0,
      played: 0,
      win: 0,
      draw: 0,
      loss: 0,
      goals_for: 0,
      goals_against: 0,
      goal_difference: 0
    }));
    
    // Process completed fixtures
    for (const fixture of fixtures) {
      // Only count completed matches with scores
      if (fixture.finished && fixture.team_h_score !== null && fixture.team_a_score !== null) {
        const homeTeam = table.find(team => team.id === fixture.team_h);
        const awayTeam = table.find(team => team.id === fixture.team_a);
        
        if (homeTeam && awayTeam) {
          // Update games played
          homeTeam.played += 1;
          awayTeam.played += 1;
          
          // Update goals
          const homeScore = fixture.team_h_score || 0;
          const awayScore = fixture.team_a_score || 0;
          homeTeam.goals_for += homeScore;
          homeTeam.goals_against += awayScore;
          awayTeam.goals_for += awayScore;
          awayTeam.goals_against += homeScore;
          
          // Update goal difference
          homeTeam.goal_difference = homeTeam.goals_for - homeTeam.goals_against;
          awayTeam.goal_difference = awayTeam.goals_for - awayTeam.goals_against;
          
          // Update results and points
          if (homeScore > awayScore) {
            // Home win
            homeTeam.win += 1;
            homeTeam.points += 3;
            awayTeam.loss += 1;
          } else if (homeScore < awayScore) {
            // Away win
            awayTeam.win += 1;
            awayTeam.points += 3;
            homeTeam.loss += 1;
          } else {
            // Draw
            homeTeam.draw += 1;
            homeTeam.points += 1;
            awayTeam.draw += 1;
            awayTeam.points += 1;
          }
        }
      }
    }
    
    // Sort table by points, goal difference, goals scored
    const sortedTable = table.sort((a, b) => {
      if (a.points !== b.points) {
        return b.points - a.points; // Higher points first
      }
      
      if (a.goal_difference !== b.goal_difference) {
        return b.goal_difference - a.goal_difference; // Higher goal difference first
      }
      
      if (a.goals_for !== b.goals_for) {
        return b.goals_for - a.goals_for; // Higher goals scored first
      }
      
      return a.name.localeCompare(b.name); // Alphabetical order if all else equal
    });
    
    // Set positions
    sortedTable.forEach((team, index) => {
      team.position = index + 1;
    });
    
    return sortedTable;
  } catch (error) {
    console.error('Error calculating league table:', error);
    return [];
  }
}

export async function getFixturesByGameweek(gameweek: number): Promise<Fixture[]> {
  try {
    const response = await axiosWithCredentials.get(`${PROXY_API_URL}?endpoint=fixtures/?event=${gameweek}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching fixtures for gameweek ${gameweek}:`, error);
    throw error;
  }
} 