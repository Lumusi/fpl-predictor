import { Player, Team, Fixture } from '../services/fplApi';
import { POSITION_MAP } from './teamBuilder';

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
 * Calculate predicted points for players in the next gameweek
 */
export function predictPlayerPoints(
  players: Player[],
  teams: Team[],
  fixtures: Fixture[],
  gameweek: number
): PlayerPrediction[] {
  console.log(`Predicting points for gameweek ${gameweek} for ${players.length} players`);
  
  // Get next gameweek fixtures
  const nextGameweekFixtures = fixtures.filter(fixture => fixture.event === gameweek);
  console.log(`Found ${nextGameweekFixtures.length} fixtures for gameweek ${gameweek}`);
  
  const predictions: PlayerPrediction[] = players
    // Including all players, even those with 0 minutes
    .map(player => {
      // Get player's team
      const playerTeam = teams.find(team => team.id === player.team);
      
      // Find ALL of player's team's fixtures for the next gameweek (to handle double gameweeks)
      const teamFixtures = nextGameweekFixtures.filter(
        fixture => fixture.team_h === player.team || fixture.team_a === player.team
      );
      
      // Get opponent teams with their short names with difficulty-based colors
      const opponentTeamsFormatted = teamFixtures.map(fixture => {
        const opponentId = fixture.team_h === player.team ? fixture.team_a : fixture.team_h;
        const opponentTeam = teams.find(t => t.id === opponentId);
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
      
      // Initialize fixture difficulty and home game status
      let averageFixtureDifficulty = 3; // Medium difficulty by default
      let homeGame = false; // Default to away for simplicity
      
      if (fixtureCount > 0) {
        // Calculate the average fixture difficulty across all fixtures
        let totalDifficulty = 0;
        
        // At least one fixture is home game
        const hasHomeGame = teamFixtures.some(fixture => fixture.team_h === player.team);
        homeGame = hasHomeGame;
        
        // Sum up difficulty ratings across all fixtures
        teamFixtures.forEach(fixture => {
          if (fixture.team_h === player.team) {
            // Home game difficulty
            totalDifficulty += fixture.team_h_difficulty;
          } else {
            // Away game difficulty
            totalDifficulty += fixture.team_a_difficulty;
          }
        });
        
        // Calculate average difficulty
        averageFixtureDifficulty = totalDifficulty / fixtureCount;
      }
      
      // Convert form to number
      const formValue = parseFloat(player.form || '0');
      
      // Convert points_per_game to number
      const ppgValue = parseFloat(player.points_per_game || '0');
      
      // Calculate predicted points based on various factors
      let predictedPoints = 0;
      
      // Calculate base points using player's points per game as the foundation
      predictedPoints = ppgValue * 0.8; // Base points (80% weight)
      
      // Add form factor (recent performance)
      predictedPoints += formValue * 0.5;
      
      // Apply fixture difficulty adjustment (scale: 1-5)
      // Higher difficulty = fewer predicted points
      const difficultyFactor = 1 - ((averageFixtureDifficulty - 1) / 6);
      predictedPoints *= difficultyFactor;
      
      // Apply home advantage if at least one fixture is at home
      if (homeGame) {
        predictedPoints *= 1.1; // 10% boost for home games
      }
      
      // Playing time probability adjustment - consider minutes played
      // For players with 0 minutes, we'll use a low but non-zero factor
      const minutesFactor = player.minutes > 0 ? Math.min(player.minutes / 900, 1) : 0.1; // Cap at 1
      predictedPoints *= (0.7 + (0.3 * minutesFactor));
      
      // Injury/availability adjustment
      if (player.chance_of_playing_next_round !== null && player.chance_of_playing_next_round < 100) {
        predictedPoints *= player.chance_of_playing_next_round / 100;
      }
      
      // Position-specific adjustments (reflecting how FPL scoring works)
      if (player.element_type === 1) {
        // Goalkeepers - make prediction more conservative
        predictedPoints = Math.min(predictedPoints, 8);
      } else if (player.element_type === 2) {
        // Defenders - boost clean sheet potential for low difficulty
        if (averageFixtureDifficulty <= 2) {
          predictedPoints += 1.2;
        }
        predictedPoints = Math.min(predictedPoints, 12);
      } else if (player.element_type === 3) {
        // Midfielders - slightly more volatile
        predictedPoints = Math.min(predictedPoints, 15);
      } else if (player.element_type === 4) {
        // Forwards - boom or bust scoring pattern
        if (formValue > 5) {
          predictedPoints *= 1.2; // Hot strikers tend to keep scoring
        }
        predictedPoints = Math.min(predictedPoints, 17);
      }
      
      // For double gameweeks (or more), scale up points but not linearly
      // This accounts for rotation risk and diminishing returns
      if (fixtureCount > 1) {
        // Scale factor decreases as fixture count increases
        // e.g., 1.8x for 2 fixtures, 2.4x for 3 fixtures, etc.
        const scaleFactor = 1 + (fixtureCount - 1) * 0.8;
        predictedPoints *= scaleFactor;
      }
      
      // Add small random factor for natural variation (max ±15%)
      const randomFactor = 0.85 + (Math.random() * 0.3);
      predictedPoints *= randomFactor;
      
      // Ensure no negative points and round to 2 decimal places
      predictedPoints = Math.max(0, predictedPoints);
      
      // Ensure element_type and position are always included
      const elementType = player.element_type || 0;
      const position = POSITION_MAP[elementType as keyof typeof POSITION_MAP] || 'Unknown';
      
      // Return prediction object
      return {
        id: player.id,
        code: player.code, // Include the player code for images
        web_name: player.web_name,
        first_name: player.first_name,
        second_name: player.second_name,
        team: player.team,
        team_short_name: playerTeam?.short_name,
        team_name: playerTeam?.name, // Add full team name
        predicted_points: Number(predictedPoints.toFixed(2)),
        form: player.form,
        price: player.now_cost / 10, // Convert to actual price (in millions)
        points_per_game: player.points_per_game,
        minutes: player.minutes,
        total_points: player.total_points,
        goals_scored: player.goals_scored,
        assists: player.assists,
        fixture_difficulty: averageFixtureDifficulty,
        home_game: homeGame,
        element_type: elementType,
        position: position,
        fixture_count: fixtureCount, // Add number of fixtures in gameweek
        covered_gameweeks: [],
        opponents: opponentsHtml,
        opponentsPlain: opponentsPlain
      };
    })
    .sort((a, b) => b.predicted_points - a.predicted_points); // Sort by predicted points (highest first)
  
  console.log(`Generated ${predictions.length} player predictions`);
  console.log(`Top 5 predicted players:`, predictions.slice(0, 5).map(p => ({
    name: p.web_name,
    points: p.predicted_points,
    team: p.team_short_name,
    position: p.position
  })));
  console.log(`Percentage of players with predicted points > 0: ${(predictions.filter(p => p.predicted_points > 0).length / predictions.length * 100).toFixed(1)}%`);
  
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
  const predictions: Record<number, PlayerPrediction[]> = {};
  
  for (let i = 0; i < numberOfWeeks; i++) {
    const gameweek = currentGameweek + i;
    predictions[gameweek] = predictPlayerPoints(players, teams, fixtures, gameweek);
  }
  
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
    html: `<span class="${colorClass} px-1 rounded">${teamName}${homeAway}</span>`,
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
        .map(([gw, opponents]) => `GW${gw}: ${opponents.html}`)
        .join('; ');
        
      const opponentsListPlain = Array.from(opponentsByGw.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([gw, opponents]) => `GW${gw}: ${opponents.plain}`)
        .join('; ');
      
      player.opponents = opponentsListHtml;
      player.opponentsPlain = opponentsListPlain;
    }
  });
  
  // Convert map to array and sort by total predicted points
  return Array.from(playerTotals.values())
    .sort((a, b) => b.predicted_points - a.predicted_points);
} 