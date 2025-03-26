import { Player, Team, Fixture } from '../services/fplApi';
import { POSITION_MAP } from './teamBuilder';

interface PlayerPrediction {
  id: number;
  web_name: string;
  team: number;
  team_short_name?: string;
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
  // Get next gameweek fixtures
  const nextGameweekFixtures = fixtures.filter(fixture => fixture.event === gameweek);
  
  const predictions: PlayerPrediction[] = players
    .filter(player => player.minutes > 0) // Only consider players who have played
    .map(player => {
      // Get player's team
      const playerTeam = teams.find(team => team.id === player.team);
      
      // Find player's team's fixture for the next gameweek
      const teamFixture = nextGameweekFixtures.find(
        fixture => fixture.team_h === player.team || fixture.team_a === player.team
      );
      
      // Determine if home or away and get the fixture difficulty
      let fixtureDifficulty = 3; // Medium difficulty by default
      let homeGame = false;
      
      if (teamFixture) {
        if (teamFixture.team_h === player.team) {
          // Home game
          homeGame = true;
          fixtureDifficulty = teamFixture.team_h_difficulty;
        } else {
          // Away game
          fixtureDifficulty = teamFixture.team_a_difficulty;
        }
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
      const difficultyFactor = 1 - ((fixtureDifficulty - 1) / 6);
      predictedPoints *= difficultyFactor;
      
      // Apply home advantage
      if (homeGame) {
        predictedPoints *= 1.1; // 10% boost for home games
      }
      
      // Playing time probability adjustment
      const minutesFactor = Math.min(player.minutes / 900, 1); // Cap at 1
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
        if (fixtureDifficulty <= 2) {
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
        web_name: player.web_name,
        team: player.team,
        team_short_name: playerTeam?.short_name,
        predicted_points: Number(predictedPoints.toFixed(2)),
        form: player.form,
        price: player.now_cost / 10, // Convert to actual price (in millions)
        points_per_game: player.points_per_game,
        minutes: player.minutes,
        total_points: player.total_points,
        goals_scored: player.goals_scored,
        assists: player.assists,
        fixture_difficulty: fixtureDifficulty,
        home_game: homeGame,
        element_type: elementType,
        position: position
      };
    })
    .sort((a, b) => b.predicted_points - a.predicted_points); // Sort by predicted points (highest first)
  
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