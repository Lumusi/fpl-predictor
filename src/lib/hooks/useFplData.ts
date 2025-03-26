import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { 
  getAllPlayers, 
  getAllTeams, 
  getFixtures, 
  Player, 
  Team, 
  Fixture 
} from '../services/fplApi';
import { predictPlayerPoints, predictFutureGameweeks } from '../utils/predictions';

interface FplData {
  players: Player[];
  teams: Team[];
  fixtures: Fixture[];
  loading: boolean;
  error: Error | null;
  currentGameweek: number;
  predictedPoints: ReturnType<typeof predictPlayerPoints>;
  futurePredictions: ReturnType<typeof predictFutureGameweeks>;
  refreshData: () => void;
}

// Create a fetcher function for SWR
const playerFetcher = async () => await getAllPlayers();
const teamFetcher = async () => await getAllTeams();
const fixtureFetcher = async () => await getFixtures();

export function useFplData(gameweek?: number): FplData {
  // Use SWR for data fetching with caching and revalidation
  const { data: players, error: playersError, mutate: refreshPlayers } = useSWR<Player[]>('players', playerFetcher);
  const { data: teams, error: teamsError, mutate: refreshTeams } = useSWR<Team[]>('teams', teamFetcher);
  const { data: fixtures, error: fixturesError, mutate: refreshFixtures } = useSWR<Fixture[]>('fixtures', fixtureFetcher);
  
  // Get current gameweek from fixtures
  const [currentGameweek, setCurrentGameweek] = useState<number>(gameweek || 0);
  
  // Predictions
  const [predictedPoints, setPredictedPoints] = useState<ReturnType<typeof predictPlayerPoints>>([]);
  const [futurePredictions, setFuturePredictions] = useState<ReturnType<typeof predictFutureGameweeks>>({});
  
  // Determine current gameweek if not provided
  useEffect(() => {
    if (fixtures && !gameweek) {
      // Find the next upcoming gameweek from fixtures
      // For the example, if no kickoff_time exists, we'll use a fallback approach
      const fallbackToLatestGameweek = () => {
        // Fallback: get the max gameweek with available data
        const availableGameweeks = fixtures
          .filter(f => f.event !== null)
          .map(f => f.event as number);
          
        if (availableGameweeks.length > 0) {
          setCurrentGameweek(Math.max(...availableGameweeks));
        } else {
          // If no gameweek data is available, default to 1
          setCurrentGameweek(1);
        }
      };
      
      // Check if we can use kickoff_time
      const fixturesWithDates = fixtures.filter(f => f.event !== null && f.kickoff_time);
      
      if (fixturesWithDates.length > 0) {
        const now = new Date();
        const upcomingFixtures = fixturesWithDates
          .filter(f => new Date(f.kickoff_time as string) > now)
          .sort((a, b) => 
            new Date(a.kickoff_time as string).getTime() - 
            new Date(b.kickoff_time as string).getTime()
          );
        
        if (upcomingFixtures.length > 0 && upcomingFixtures[0].event) {
          setCurrentGameweek(upcomingFixtures[0].event);
        } else {
          fallbackToLatestGameweek();
        }
      } else {
        fallbackToLatestGameweek();
      }
    } else if (gameweek) {
      setCurrentGameweek(gameweek);
    }
  }, [fixtures, gameweek]);
  
  // Generate predictions when all data is loaded
  useEffect(() => {
    if (players && teams && fixtures && currentGameweek > 0) {
      // Predict points for current gameweek
      const predictions = predictPlayerPoints(players, teams, fixtures, currentGameweek);
      setPredictedPoints(predictions);
      
      // Predict points for future gameweeks
      const futureGameweeks = predictFutureGameweeks(players, teams, fixtures, currentGameweek, 5);
      setFuturePredictions(futureGameweeks);
    }
  }, [players, teams, fixtures, currentGameweek]);
  
  // Function to refresh all data
  const refreshData = async () => {
    await Promise.all([
      refreshPlayers(),
      refreshTeams(),
      refreshFixtures()
    ]);
  };
  
  // Loading and error states
  const loading = !players || !teams || !fixtures;
  const error = playersError || teamsError || fixturesError;
  
  return {
    players: players || [],
    teams: teams || [],
    fixtures: fixtures || [],
    loading,
    error,
    currentGameweek,
    predictedPoints,
    futurePredictions,
    refreshData
  };
} 