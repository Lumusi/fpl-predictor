import { Player, Team } from '../services/fplApi';
import { predictPlayerPoints } from './predictions';

// Constants
export const MAX_BUDGET = 100.0; // £100.0m
export const MAX_PLAYERS_FROM_SAME_TEAM = 3;
export const TEAM_SIZE = 15;
export const FORMATION_CONSTRAINTS = {
  GKP: { min: 2, max: 2 },
  DEF: { min: 5, max: 5 },
  MID: { min: 5, max: 5 }, 
  FWD: { min: 3, max: 3 }
};

// Position type mapping
export const POSITION_MAP = {
  1: 'GKP',
  2: 'DEF',
  3: 'MID',
  4: 'FWD'
};

export const POSITION_ID_MAP = {
  'GKP': 1,
  'DEF': 2,
  'MID': 3,
  'FWD': 4
};

// Types
export interface TeamPlayer {
  id: number;
  code?: number;   // The player code used in the Premier League photos URL
  web_name: string;
  now_cost?: number;  // in 0.1m units
  position: string;   // GKP, DEF, MID, FWD
  element_type: number; // 1, 2, 3, 4
  price: number;      // in 1.0m units (now_cost / 10)
  team?: number;       // team ID
  team_short_name?: string; // 3-letter team code
  team_name?: string;  // full team name
  total_points?: number;
  form?: string;
  predicted_points?: number;
  fixtures?: any[];   // upcoming fixtures
  home_game?: boolean; // whether the next fixture is a home game
  chance_of_playing_next_round?: number | null; // player availability
}

export interface TeamSuggestion {
  playerOut: TeamPlayer;
  playerIn: TeamPlayer;
  pointsImprovement: number;
  costDifference: number;
}

// Format player data for the team context
export function formatPlayerForTeam(player: Player, teams: Team[]): TeamPlayer {
  const team = teams.find(t => t.id === player.team);
  
  // Get position string from element_type
  const position = POSITION_MAP[player.element_type as keyof typeof POSITION_MAP] || 'UNK';
  
  // Check if next fixture is home game
  let isHomeGame = false;
  if (player.fixtures && player.fixtures.length > 0) {
    isHomeGame = player.fixtures[0].is_home;
  }
  
  const formattedPlayer: TeamPlayer = {
    ...player, // Include all original player properties
    position,
    team_name: team?.name,
    team_short_name: team?.short_name,
    price: player.now_cost ? player.now_cost / 10 : 0,
    home_game: isHomeGame,
    code: player.code // Explicitly include code property for player images
  };
  
  return formattedPlayer;
}

// Calculate the total cost of a team
export function calculateTeamCost(team: TeamPlayer[]): number {
  return team.reduce((total, player) => total + player.price, 0);
}

// Check if a player can be added to the team based on team constraints
export function canAddPlayer(
  player: TeamPlayer, 
  currentTeam: TeamPlayer[]
): { allowed: boolean, reason?: string } {
  // Check position constraints
  const positionCount = currentTeam.filter(p => p.position === player.position).length;
  const positionLimit = FORMATION_CONSTRAINTS[player.position as keyof typeof FORMATION_CONSTRAINTS]?.max || 0;
  
  if (positionCount >= positionLimit) {
    return { 
      allowed: false, 
      reason: `Maximum number of ${player.position} players (${positionLimit}) reached` 
    };
  }
  
  // Check for team constraints (max 3 from same team)
  const teamCount = currentTeam.filter(p => p.team === player.team).length;
  if (teamCount >= MAX_PLAYERS_FROM_SAME_TEAM) {
    return { 
      allowed: false, 
      reason: `Maximum number of players (${MAX_PLAYERS_FROM_SAME_TEAM}) from ${player.team_short_name} reached` 
    };
  }
  
  // Check if player is already in the team
  if (currentTeam.some(p => p.id === player.id)) {
    return { allowed: false, reason: 'Player already in team' };
  }
  
  return { allowed: true };
}

// Get suggestions for team improvements
export function getSuggestedTransfers(
  currentTeam: TeamPlayer[],
  allPlayers: TeamPlayer[],
  budget: number = 0, // Additional budget available
  limit: number = 5
): TeamSuggestion[] {
  const suggestions: TeamSuggestion[] = [];
  const alreadySuggestedOutPlayerIds = new Set<number>();
  
  // For each player in the team
  currentTeam.forEach(currentPlayer => {
    // Skip players that have already been suggested for replacement
    if (alreadySuggestedOutPlayerIds.has(currentPlayer.id)) return;
    
    // Find potential replacements of the same position
    const potentialReplacements = allPlayers.filter(player => 
      // Must be same position
      player.position === currentPlayer.position &&
      // Must not be the same player
      player.id !== currentPlayer.id && 
      // Must not already be in the team
      !currentTeam.some(teamPlayer => teamPlayer.id === player.id) &&
      // Ensure the team constraint is maintained
      (player.team === currentPlayer.team || 
        currentTeam.filter(p => p.team === player.team).length < MAX_PLAYERS_FROM_SAME_TEAM)
    );
    
    // Sort replacements by predicted points
    potentialReplacements.sort((a, b) => 
      (b.predicted_points || 0) - (a.predicted_points || 0)
    );
    
    // Find valid replacements within budget
    potentialReplacements.forEach(replacement => {
      const costDifference = replacement.price - currentPlayer.price;
      const pointsImprovement = (replacement.predicted_points || 0) - (currentPlayer.predicted_points || 0);
      
      // Only suggest if it's an improvement and within budget
      if (pointsImprovement > 0 && costDifference <= budget) {
        suggestions.push({
          playerOut: currentPlayer,
          playerIn: replacement,
          pointsImprovement,
          costDifference
        });
        
        // Mark this player as already suggested for replacement
        alreadySuggestedOutPlayerIds.add(currentPlayer.id);
        
        // Stop after finding a good replacement for this player
        return;
      }
    });
  });
  
  // Sort by points improvement and return limited number
  return suggestions
    .sort((a, b) => b.pointsImprovement - a.pointsImprovement)
    .slice(0, limit);
}

// Calculate remaining budget
export function getRemainingBudget(team: TeamPlayer[]): number {
  const teamCost = calculateTeamCost(team);
  return Number((MAX_BUDGET - teamCost).toFixed(1));
} 