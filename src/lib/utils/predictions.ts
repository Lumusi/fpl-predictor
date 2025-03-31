import { Player, Team, Fixture } from '../services/fplApi';
import { POSITION_MAP } from './teamBuilder';
import logger from './logger';

// Constants for prediction algorithm
const PREDICTION_CONSTANTS = {
  // Weights
  BASE_POINTS_WEIGHT: 0.8,        // Weight for points per game
  FORM_WEIGHT: 0.5,               // Weight for form
  HOME_ADVANTAGE_BOOST: 1.1,      // 10% boost for home games
  
  // Playing time factors
  BASE_MINUTES_FACTOR: 0.7,       // Base factor for minutes played
  ADDITIONAL_MINUTES_FACTOR: 0.3, // Additional factor for minutes played
  MAX_MINUTES_DIVISOR: 900,       // Divisor for minutes played (cap at 1)
  MIN_MINUTES_FACTOR: 0.1,        // Minimum factor for players with 0 minutes
  
  // Double gameweek scaling
  FIXTURE_SCALING_FACTOR: 0.8,    // Scaling factor for multiple fixtures
  
  // Position-specific maximums
  GOALKEEPER_MAX_POINTS: 8,
  DEFENDER_MAX_POINTS: 12,
  MIDFIELDER_MAX_POINTS: 15,
  FORWARD_MAX_POINTS: 17,
  
  // Other factors
  DEFAULT_FIXTURE_DIFFICULTY: 3,  // Medium difficulty by default
  LOW_DIFFICULTY_THRESHOLD: 2,    // Threshold for low difficulty
  DEFENDER_CLEAN_SHEET_BOOST: 1.2,// Extra points for defenders against weak teams
  HOT_STRIKER_THRESHOLD: 5,       // Form threshold for hot strikers
  HOT_STRIKER_BOOST: 1.2,         // Extra points for in-form strikers
  
  // Random variation
  RANDOM_MIN: 0.85,               // Minimum random factor
  RANDOM_RANGE: 0.3                // Random factor range (max = min + range)
};

// Simple memoization helper
function memoize<T, R>(fn: (arg: T) => R): (arg: T) => R {
  const cache = new Map<string, R>();
  
  return (arg: T) => {
    const key = JSON.stringify(arg);
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = fn(arg);
    cache.set(key, result);
    return result;
  };
}

export interface PlayerPrediction {
  id: number;
  code?: number; // Add the code field for player images
  web_name: string;
  first_name?: string; // Player's first name
  second_name?: string; // Player's last name
  team: number;
  team_short_name?: string;
  team_name?: string; // Full team name
  predicted_points: number;
  form: string;
  price: number;
  points_per_game: string;
  minutes: number;
  total_points: number;
  goals_scored: number;
  assists: number;
  fixture_difficulty?: number;
  home_game?: boolean;
  element_type: number;
  position: string;
  fixture_count?: number;
  covered_gameweeks?: number[];
  opponents?: string; // Teams they are playing against
  opponentsPlain?: string; // Plain text version without HTML
}

/**
 * Get a player's team fixtures for a specific gameweek
 */
function getPlayerTeamFixtures(
  player: Player,
  fixtures: Fixture[],
  gameweek: number
): Fixture[] {
  return fixtures
    .filter(fixture => fixture.event === gameweek)
    .filter(fixture => fixture.team_h === player.team || fixture.team_a === player.team);
}

/**
 * Calculate average fixture difficulty for a player
 */
function calculateFixtureDifficulty(player: Player, fixtures: Fixture[]): { 
  averageFixtureDifficulty: number;
  homeGame: boolean;
} {
  if (fixtures.length === 0) {
    return {
      averageFixtureDifficulty: PREDICTION_CONSTANTS.DEFAULT_FIXTURE_DIFFICULTY,
      homeGame: false
    };
  }
  
  // Calculate the average fixture difficulty across all fixtures
  let totalDifficulty = 0;
  
  // Check if at least one fixture is a home game
  const hasHomeGame = fixtures.some(fixture => fixture.team_h === player.team);
  
  // Sum up difficulty ratings across all fixtures
  fixtures.forEach(fixture => {
    if (fixture.team_h === player.team) {
      // Home game difficulty
      totalDifficulty += fixture.team_h_difficulty;
    } else {
      // Away game difficulty
      totalDifficulty += fixture.team_a_difficulty;
    }
  });
  
  // Calculate average difficulty
  const averageFixtureDifficulty = totalDifficulty / fixtures.length;
  
  return {
    averageFixtureDifficulty,
    homeGame: hasHomeGame
  };
}

/**
 * Calculate the difficulty factor for points adjustment
 */
function calculateDifficultyFactor(difficulty: number): number {
  // Higher difficulty = fewer predicted points
  // Scale: 1-5, with 1 being easiest
  return 1 - ((difficulty - 1) / 6);
}

/**
 * Calculate minutes-played factor for points adjustment
 */
function calculateMinutesFactor(minutes: number): number {
  if (minutes <= 0) {
    return PREDICTION_CONSTANTS.MIN_MINUTES_FACTOR;
  }
  
  const minutesProportion = Math.min(
    minutes / PREDICTION_CONSTANTS.MAX_MINUTES_DIVISOR, 
    1
  );
  
  return PREDICTION_CONSTANTS.BASE_MINUTES_FACTOR + 
         (PREDICTION_CONSTANTS.ADDITIONAL_MINUTES_FACTOR * minutesProportion);
}

/**
 * Apply position-specific adjustments to predicted points
 */
function applyPositionAdjustments(
  predictedPoints: number,
  elementType: number,
  formValue: number,
  fixtureDifficulty: number
): number {
  let adjustedPoints = predictedPoints;
  
  switch (elementType) {
    case 1: // Goalkeepers
      // Make prediction more conservative
      adjustedPoints = Math.min(adjustedPoints, PREDICTION_CONSTANTS.GOALKEEPER_MAX_POINTS);
      break;
    
    case 2: // Defenders
      // Boost clean sheet potential for low difficulty
      if (fixtureDifficulty <= PREDICTION_CONSTANTS.LOW_DIFFICULTY_THRESHOLD) {
        adjustedPoints += PREDICTION_CONSTANTS.DEFENDER_CLEAN_SHEET_BOOST;
      }
      adjustedPoints = Math.min(adjustedPoints, PREDICTION_CONSTANTS.DEFENDER_MAX_POINTS);
      break;
    
    case 3: // Midfielders
      // Slightly more volatile
      adjustedPoints = Math.min(adjustedPoints, PREDICTION_CONSTANTS.MIDFIELDER_MAX_POINTS);
      break;
    
    case 4: // Forwards
      // Boom or bust scoring pattern
      if (formValue > PREDICTION_CONSTANTS.HOT_STRIKER_THRESHOLD) {
        adjustedPoints *= PREDICTION_CONSTANTS.HOT_STRIKER_BOOST; // Hot strikers tend to keep scoring
      }
      adjustedPoints = Math.min(adjustedPoints, PREDICTION_CONSTANTS.FORWARD_MAX_POINTS);
      break;
  }
  
  return adjustedPoints;
}

/**
 * Calculate fixture scaling for double/triple gameweeks
 */
function calculateFixtureScaling(fixtureCount: number): number {
  if (fixtureCount <= 1) return 1;
  
  // Scale factor decreases as fixture count increases
  // e.g., 1.8x for 2 fixtures, 2.4x for 3 fixtures, etc.
  return 1 + (fixtureCount - 1) * PREDICTION_CONSTANTS.FIXTURE_SCALING_FACTOR;
}

/**
 * Apply random variation factor
 */
function applyRandomVariation(points: number): number {
  const randomFactor = PREDICTION_CONSTANTS.RANDOM_MIN + 
                       (Math.random() * PREDICTION_CONSTANTS.RANDOM_RANGE);
  return points * randomFactor;
}

/**
 * Calculate predicted points for a single player
 */
function calculatePlayerPrediction(
  player: Player,
  playerTeam: Team | undefined,
  teamFixtures: Fixture[],
  teams: Team[]
): PlayerPrediction {
  // Calculate formatted opponent information
  const opponentTeamsFormatted = teamFixtures.map(fixture => {
    const opponentId = fixture.team_h === player.team ? fixture.team_a : fixture.team_h;
    // Get the actual opponent team
    const opponentTeam = teams.find(team => team.id === opponentId);
    const isHome = fixture.team_h === player.team;
    
    // Get the difficulty for this specific fixture
    const difficulty = isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty;
    
    // Format with colors based on difficulty
    return formatOpponentWithDifficulty(
      opponentTeam?.short_name || 'UNK',
      isHome,
      difficulty
    );
  });
  
  // Create colored HTML version and plain text version
  const opponentsHtml = opponentTeamsFormatted.map(t => t.html).join(', ');
  const opponentsPlain = opponentTeamsFormatted.map(t => t.plain).join(', ');
  
  // Calculate if this is a double gameweek (or more)
  const fixtureCount = teamFixtures.length;
  
  // Calculate fixture difficulty and home advantage
  const { averageFixtureDifficulty, homeGame } = calculateFixtureDifficulty(player, teamFixtures);
  
  // Convert form and points_per_game to numbers
  const formValue = parseFloat(player.form || '0');
  const ppgValue = parseFloat(player.points_per_game || '0');
  
  // Calculate predicted points based on various factors
  let predictedPoints = 0;
  
  // Calculate base points using player's points per game as the foundation
  predictedPoints = ppgValue * PREDICTION_CONSTANTS.BASE_POINTS_WEIGHT;
  
  // Add form factor (recent performance)
  predictedPoints += formValue * PREDICTION_CONSTANTS.FORM_WEIGHT;
  
  // Apply fixture difficulty adjustment
  const difficultyFactor = calculateDifficultyFactor(averageFixtureDifficulty);
  predictedPoints *= difficultyFactor;
  
  // Apply home advantage if at least one fixture is at home
  if (homeGame) {
    predictedPoints *= PREDICTION_CONSTANTS.HOME_ADVANTAGE_BOOST;
  }
  
  // Playing time probability adjustment
  const minutesFactor = calculateMinutesFactor(player.minutes);
  predictedPoints *= minutesFactor;
  
  // Injury/availability adjustment
  if (player.chance_of_playing_next_round !== null && player.chance_of_playing_next_round < 100) {
    predictedPoints *= player.chance_of_playing_next_round / 100;
  }
  
  // Position-specific adjustments
  predictedPoints = applyPositionAdjustments(
    predictedPoints, 
    player.element_type, 
    formValue, 
    averageFixtureDifficulty
  );
  
  // For double gameweeks (or more), scale up points
  if (fixtureCount > 1) {
    const scaleFactor = calculateFixtureScaling(fixtureCount);
    predictedPoints *= scaleFactor;
  }
  
  // Add small random factor for natural variation
  predictedPoints = applyRandomVariation(predictedPoints);
  
  // Ensure no negative points
  predictedPoints = Math.max(0, predictedPoints);
  
  // Ensure element_type and position are always included
  const elementType = player.element_type || 0;
  const position = POSITION_MAP[elementType as keyof typeof POSITION_MAP] || 'Unknown';
  
  // Return prediction object
  return {
    id: player.id,
    code: player.code,
    web_name: player.web_name,
    first_name: player.first_name,
    second_name: player.second_name,
    team: player.team,
    team_short_name: playerTeam?.short_name,
    team_name: playerTeam?.name,
    predicted_points: Number(predictedPoints.toFixed(2)),
    form: player.form,
    price: player.now_cost / 10,
    points_per_game: player.points_per_game,
    minutes: player.minutes,
    total_points: player.total_points,
    goals_scored: player.goals_scored,
    assists: player.assists,
    fixture_difficulty: averageFixtureDifficulty,
    home_game: homeGame,
    element_type: elementType,
    position: position,
    fixture_count: fixtureCount,
    covered_gameweeks: [],
    opponents: opponentsHtml,
    opponentsPlain: opponentsPlain
  };
}

// Memoized version of calculatePlayerPrediction to reuse results for the same inputs
const memoizedCalculatePlayerPrediction = memoize(
  (params: { player: Player, playerTeam: Team | undefined, teamFixtures: Fixture[], teams: Team[] }) => 
    calculatePlayerPrediction(params.player, params.playerTeam, params.teamFixtures, params.teams)
);

/**
 * Calculate predicted points for players in the next gameweek
 */
export function predictPlayerPoints(
  players: Player[],
  teams: Team[],
  fixtures: Fixture[],
  gameweek: number
): PlayerPrediction[] {
  logger.time('predictPlayerPoints');
  logger.log(`Predicting points for gameweek ${gameweek} for ${players.length} players`);
  
  // Get next gameweek fixtures
  const nextGameweekFixtures = fixtures.filter(fixture => fixture.event === gameweek);
  logger.log(`Found ${nextGameweekFixtures.length} fixtures for gameweek ${gameweek}`);
  
  const predictions: PlayerPrediction[] = players
    // Including all players, even those with 0 minutes
    .map(player => {
      // Get player's team
      const playerTeam = teams.find(team => team.id === player.team);
      
      // Find ALL of player's team's fixtures for the next gameweek (to handle double gameweeks)
      const teamFixtures = getPlayerTeamFixtures(player, nextGameweekFixtures, gameweek);
      
      // Calculate the player prediction
      return memoizedCalculatePlayerPrediction({
        player, 
        playerTeam, 
        teamFixtures,
        teams
      });
    })
    .sort((a, b) => b.predicted_points - a.predicted_points); // Sort by predicted points (highest first)
  
  // Log prediction summary information (only in development)
  logger.log(`Generated ${predictions.length} player predictions`);
  logger.debug(`Top 5 predicted players:`, predictions.slice(0, 5).map(p => ({
    name: p.web_name,
    points: p.predicted_points,
    team: p.team_short_name,
    position: p.position
  })));
  logger.log(`Percentage of players with predicted points > 0: ${(predictions.filter(p => p.predicted_points > 0).length / predictions.length * 100).toFixed(1)}%`);
  
  logger.timeEnd('predictPlayerPoints');
  return predictions;
}

/**
 * Predict player points for multiple future gameweeks
 */
export function predictFutureGameweeks(
  players: Player[],
  teams: Team[],
  fixtures: Fixture[],
  currentGameweek: number,
  numberOfWeeks: number = 5
): Record<number, PlayerPrediction[]> {
  logger.time('predictFutureGameweeks');
  const predictions: Record<number, PlayerPrediction[]> = {};
  
  for (let i = 0; i < numberOfWeeks; i++) {
    const gameweek = currentGameweek + i;
    predictions[gameweek] = predictPlayerPoints(players, teams, fixtures, gameweek);
  }
  
  logger.timeEnd('predictFutureGameweeks');
  return predictions;
}

/**
 * Get color class based on fixture difficulty
 */
export function getDifficultyColorClass(difficulty: number): string {
  if (difficulty <= 2) return 'text-white bg-green-500'; // FDR 1-2: Green (Easy)
  if (difficulty <= 3) return 'text-white bg-teal-500'; // FDR 3: Teal (Medium-Easy)
  if (difficulty <= 4) return 'text-white bg-yellow-500'; // FDR 4: Yellow (Medium)
  if (difficulty <= 4.5) return 'text-white bg-pink-500'; // FDR 4-5: Pink (Hard)
  return 'text-white bg-red-500'; // FDR 5: Red (Very Hard)
}

/**
 * Format opponent team string with difficulty-based colors
 */
export function formatOpponentWithDifficulty(
  teamName: string, 
  isHome: boolean, 
  difficulty: number
): { html: string, plain: string } {
  const colorClass = getDifficultyColorClass(difficulty);
  const homeAway = isHome ? '(H)' : '(A)';
  
  return {
    html: `<span class="${colorClass} px-1 py-0.5 text-xs rounded">${teamName}${homeAway}</span>`,
    plain: `${teamName}${homeAway}`
  };
}

/**
 * Calculate total predicted points across multiple gameweeks
 */
export function calculateTotalPredictedPoints(
  futurePredictions: Record<number, PlayerPrediction[]>,
  gameweeks: number[] = [],
  teams?: Team[] // Add teams parameter to map team IDs to names
): PlayerPrediction[] {
  logger.time('calculateTotalPredictedPoints');
  
  // If no specific gameweeks provided, use all available gameweeks
  const targetGameweeks = gameweeks.length > 0 
    ? gameweeks 
    : Object.keys(futurePredictions).map(Number);
  
  if (targetGameweeks.length === 0) return [];
  
  // Get all unique player IDs across all predictions
  const allPlayerIds = new Set<number>();
  targetGameweeks.forEach(gw => {
    futurePredictions[gw]?.forEach(player => {
      allPlayerIds.add(player.id);
    });
  });
  
  // Create a map to hold total points for each player
  const playerTotals = new Map<number, PlayerPrediction>();
  
  // Create map for opponent details by gameweek
  const playerOpponentsByGw = new Map<number, Map<number, { html: string, plain: string }>>();
  
  // Calculate total points for each player across selected gameweeks
  targetGameweeks.forEach(gw => {
    const gwPredictions = futurePredictions[gw] || [];
    
    gwPredictions.forEach(player => {
      // Track opponents for each gameweek
      if (!playerOpponentsByGw.has(player.id)) {
        playerOpponentsByGw.set(player.id, new Map<number, { html: string, plain: string }>());
      }
      const playerOpponents = playerOpponentsByGw.get(player.id)!;
      
      if (player.opponents) {
        // Store both HTML and plain versions
        playerOpponents.set(gw, { 
          html: player.opponents,
          plain: player.opponents
        });
      }
      
      if (!playerTotals.has(player.id)) {
        // First occurrence of this player, initialize with a deep copy
        playerTotals.set(player.id, {
          ...player,
          predicted_points: player.predicted_points,
          fixture_count: player.fixture_count || 0,
          covered_gameweeks: [gw]
        });
      } else {
        // Update existing player data
        const existing = playerTotals.get(player.id)!;
        playerTotals.set(player.id, {
          ...existing,
          predicted_points: existing.predicted_points + player.predicted_points,
          fixture_count: (existing.fixture_count || 0) + (player.fixture_count || 0),
          covered_gameweeks: [...(existing.covered_gameweeks || []), gw],
          team_name: player.team_name // Ensure team_name is preserved
        });
      }
    });
  });
  
  // Add opponent information to each player
  playerTotals.forEach((player, playerId) => {
    const opponentsByGw = playerOpponentsByGw.get(playerId);
    if (opponentsByGw) {
      // Format as "GW1: Team A, Team B; GW2: Team C"
      const opponentsListHtml = Array.from(opponentsByGw.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([gw, opponents]) => `<span class="whitespace-nowrap">GW${gw}: ${opponents.html}</span>`)
        .join(' ');
        
      const opponentsListPlain = Array.from(opponentsByGw.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([gw, opponents]) => `GW${gw}: ${opponents.plain}`)
        .join('; ');
      
      player.opponents = opponentsListHtml;
      player.opponentsPlain = opponentsListPlain;
    }
  });
  
  // Convert map to array and sort by total predicted points
  const result = Array.from(playerTotals.values())
    .sort((a, b) => b.predicted_points - a.predicted_points);
  
  logger.timeEnd('calculateTotalPredictedPoints');
  return result;
} 