'use client';

import { useState, useEffect } from 'react';
import { useFplData } from '@/lib/hooks/useFplData';
import Header from '@/components/Header';
import ErrorDisplay from '@/components/ErrorDisplay';
import { 
  getGameweekData, 
  getFixturesByGameweek, 
  getAllTeams, 
  getAllPlayers,
  getDreamTeam,
  Team, 
  Player,
  Fixture,
  DreamTeam,
  DreamTeamPlayer
} from '@/lib/services/fplApi';
import { findPlayerImage, getPremierLeaguePlayerImageUrl } from '@/lib/utils/playerImages';
import { getManagerByTeam, getManagerImageUrlByTeam } from '@/lib/utils/managerImages';
import Image from 'next/image';

interface HighlightPlayer {
  id: number;
  code: number;
  name: string;
  team: Team;
  position: string;
  points: number;
  goals?: number;
  assists?: number;
  cleanSheets?: number;
  saves?: number;
  bonusPoints?: number;
  isManager?: boolean;
  optaId?: string;
}

interface GameweekHighlight {
  title: string;
  description: string;
  players?: HighlightPlayer[];
  dreamTeam?: HighlightPlayer[];
}

// Position mapping
const POSITIONS = {
  1: 'GKP',
  2: 'DEF',
  3: 'MID',
  4: 'FWD'
};

export default function HighlightsPage() {
  const { currentGameweek, loading: fplLoading, error: fplError } = useFplData();
  const [highlights, setHighlights] = useState<GameweekHighlight[]>([]);
  const [selectedGameweek, setSelectedGameweek] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<Record<number, Team>>({});
  const [players, setPlayers] = useState<Record<number, Player>>({});
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [dreamTeamData, setDreamTeamData] = useState<DreamTeam | null>(null);

  // Add custom CSS for dark dropdown
  useEffect(() => {
    // Add custom styles to the head
    const style = document.createElement('style');
    style.innerHTML = `
      select option {
        background-color: #1a1a1a !important;
        color: white !important;
      }
    `;
    document.head.appendChild(style);
    
    // Clean up on unmount
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Get all gameweeks
  const gameweeks = Array.from({ length: 38 }, (_, i) => i + 1);

  // Function to get player image URL
  const getPlayerImageUrl = (player: HighlightPlayer) => {
    // Check if this is a manager
    if (player.isManager && player.optaId) {
      return `/images/managers/${player.optaId}.png`;
    }
    
    const playerImageId = player.code || player.id;
    
    // Use the flexible image finder
    const localImageUrl = findPlayerImage(playerImageId.toString(), player.id.toString());
    
    // If there's an error, use Premier League API fallback
    if (imageErrors[player.id]) {
      return getPremierLeaguePlayerImageUrl(playerImageId);
    }
    
    return localImageUrl;
  };

  // Function to check if a player is actually a manager
  const checkIfManager = (player: HighlightPlayer): HighlightPlayer => {
    // Check if this player's name matches any manager name
    const manager = getManagerByTeam(player.team?.name);
    
    // If the player's name matches a manager's name, mark as manager
    if (manager && player.name.toLowerCase().includes(manager.name.toLowerCase())) {
      return {
        ...player,
        isManager: true,
        optaId: manager.id,
        position: 'Manager' // Override position to show as Manager
      };
    }
    
    return player;
  };

  // Handle image load error
  const handleImageError = (playerId: number) => {
    setImageErrors(prev => ({
      ...prev,
      [playerId]: true
    }));
  };

  useEffect(() => {
    const fetchTeamsAndPlayers = async () => {
      try {
        // Get all teams
        const teamsData = await getAllTeams();
        const teamsMap = teamsData.reduce((acc, team) => {
          acc[team.id] = team;
          return acc;
        }, {} as Record<number, Team>);
        setTeams(teamsMap);

        // Get all players
        const playersData = await getAllPlayers();
        const playersMap = playersData.reduce((acc, player) => {
          acc[player.id] = player;
          return acc;
        }, {} as Record<number, Player>);
        setPlayers(playersMap);
      } catch (err) {
        console.error("Failed to fetch teams and players data", err);
        setError("Failed to load teams and players data. Please try again later.");
      }
    };

    fetchTeamsAndPlayers();
  }, []);

  useEffect(() => {
    if (currentGameweek > 0 && !selectedGameweek) {
      setSelectedGameweek(currentGameweek);
    }
  }, [currentGameweek, selectedGameweek]);

  useEffect(() => {
    const fetchHighlights = async () => {
      if (!selectedGameweek || Object.keys(teams).length === 0 || Object.keys(players).length === 0) return;
      
      try {
        setLoading(true);
        
        // Get gameweek data
        const gameweekData = await getGameweekData(selectedGameweek);
        const fixtures = await getFixturesByGameweek(selectedGameweek);
        
        // Try to fetch the dream team data
        let dreamTeam: DreamTeam | null = null;
        try {
          dreamTeam = await getDreamTeam(selectedGameweek);
          
          // Enrich dream team data with player details
          if (dreamTeam && dreamTeam.team) {
            dreamTeam.team = dreamTeam.team.map(player => {
              const playerDetails = players[player.element];
              if (playerDetails) {
                return {
                  ...player,
                  name: `${playerDetails.first_name} ${playerDetails.second_name}`,
                  team: teams[playerDetails.team],
                  element_type: playerDetails.element_type,
                  code: playerDetails.code
                };
              }
              return player;
            });
          }
          
          setDreamTeamData(dreamTeam);
        } catch (dreamTeamError) {
          console.error(`Failed to fetch dream team for gameweek ${selectedGameweek}`, dreamTeamError);
          // Don't set error state, just continue without dream team data
        }
        
        // Generate highlights
        const generatedHighlights: GameweekHighlight[] = [];
        
        // Process player stats from gameweek data
        const playerStats = gameweekData.elements || [];
        
        // Map player stats to our format with complete player information
        const processedPlayerStats = playerStats.map((stat: any) => {
          const player = players[stat.id];
          if (!player) return null;
          
          return {
            id: player.id,
            code: player.code,
            name: `${player.first_name} ${player.second_name}`,
            team: teams[player.team],
            position: POSITIONS[player.element_type as keyof typeof POSITIONS] || 'Unknown',
            points: stat.stats.total_points,
            goals: stat.stats.goals_scored,
            assists: stat.stats.assists,
            cleanSheets: stat.stats.clean_sheets,
            bonusPoints: stat.stats.bonus,
            saves: stat.stats.saves
          };
        }).filter(Boolean) as HighlightPlayer[];
        
        // Check if any players are managers
        const processedPlayerStatsWithManagers = processedPlayerStats.map(checkIfManager);
        
        // Sort by points (highest first)
        const sortedPlayerStats = [...processedPlayerStatsWithManagers].sort((a, b) => b.points - a.points);
        
        // Top performers (top 3 players)
        const topPerformers = sortedPlayerStats.slice(0, 3);
        
        if (topPerformers.length > 0) {
          generatedHighlights.push({
            title: `Gameweek ${selectedGameweek} Stars`,
            description: `The top performers from Gameweek ${selectedGameweek}`,
            players: topPerformers
          });
        }
        
        // Add official dream team if available
        if (dreamTeam && dreamTeam.team && dreamTeam.team.length > 0) {
          // Convert dream team players to HighlightPlayer format
          const dreamTeamPlayers = dreamTeam.team.map(player => {
            const position = player.element_type ? POSITIONS[player.element_type as keyof typeof POSITIONS] : 'Unknown';
            // Ensure team is properly typed as Team
            const playerTeam = player.team || teams[0] || {
              id: 0,
              name: 'Unknown',
              short_name: 'UNK',
              strength: 0,
              strength_overall_home: 0,
              strength_overall_away: 0,
              strength_attack_home: 0,
              strength_attack_away: 0,
              strength_defence_home: 0,
              strength_defence_away: 0
            };
            
            return {
              id: player.element,
              code: player.code || 0,
              name: player.name || `Player ${player.element}`,
              team: playerTeam,
              position,
              points: player.points
            };
          });
          
          // Check if any dream team players are managers
          const dreamTeamPlayersWithManagers = dreamTeamPlayers.map(checkIfManager);
          
          generatedHighlights.push({
            title: 'Official Dream Team',
            description: `The official FPL Dream Team for Gameweek ${selectedGameweek}`,
            dreamTeam: dreamTeamPlayersWithManagers
          });
        }
        
        setHighlights(generatedHighlights);
      } catch (err) {
        console.error(`Failed to fetch highlights for gameweek ${selectedGameweek}`, err);
        setError(`Failed to load highlights for gameweek ${selectedGameweek}. Please try again later.`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHighlights();
  }, [selectedGameweek, teams, players]);

  const handleGameweekChange = (gameweek: number) => {
    setSelectedGameweek(gameweek);
  };

  if (fplError && !fplLoading) {
    return <ErrorDisplay error={fplError} />;
  }

  return (
    <div className="min-h-screen bg-light-background dark:bg-dark-background">
      <Header 
        currentGameweek={currentGameweek} 
        loading={fplLoading}
      />
      
      <main className="container mx-auto py-8 px-4 text-light-text-primary dark:text-dark-text-primary">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
          <h1 className="text-2xl font-bold mb-4 md:mb-0">Gameweek Highlights</h1>
          
          <div className="relative">
            <select
              value={selectedGameweek || ''}
              onChange={(e) => handleGameweekChange(Number(e.target.value))}
              className="appearance-none bg-dark-card text-white border border-gray-700 py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ colorScheme: 'dark' }}
            >
              <option value="" disabled className="bg-dark-card text-white">Select Gameweek</option>
              {gameweeks.map((gw) => (
                <option key={gw} value={gw} className="bg-dark-card text-white">
                  Gameweek {gw}{gw === currentGameweek ? ' (Current)' : ''}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <svg className="h-4 w-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-lg shadow">
            {error}
          </div>
        ) : highlights.length === 0 ? (
          <div className="bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 p-4 rounded-lg shadow">
            No highlights available for this gameweek.
          </div>
        ) : (
          <div className="space-y-8">
            {highlights.map((highlight, index) => (
              <div key={index} className="bg-light-card dark:bg-dark-card rounded-lg shadow overflow-hidden">
                <div className="bg-blue-600 text-white py-3 px-4">
                  <h2 className="font-bold">{highlight.title}</h2>
                </div>
                <div className="p-4">
                  <p className="text-gray-600 dark:text-gray-400 mb-4">{highlight.description}</p>
                  
                  {/* Top Performers */}
                  {highlight.players && highlight.players.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {highlight.players.map((player) => (
                        <div key={player.id} className="bg-light-background dark:bg-dark-background rounded-lg p-4 flex items-center">
                          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mr-4 overflow-hidden">
                            <Image 
                              src={getPlayerImageUrl(player)}
                              alt={player.name}
                              width={48}
                              height={48}
                              className="object-cover"
                              unoptimized
                              onError={() => handleImageError(player.id)}
                            />
                          </div>
                          <div>
                            <div className="font-medium">{player.name}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                              {player.team?.short_name || 'Unknown'} | {player.position}
                            </div>
                            <div className="mt-1 text-green-600 dark:text-green-400 font-bold">
                              {player.points} pts
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Dream Team */}
                  {highlight.dreamTeam && highlight.dreamTeam.length > 0 && (
                    <div className="mt-4">
                      <div className="relative bg-blue-800 rounded-lg p-4 pt-16 pb-16">
                        {/* Goalkeepers */}
                        <div className="flex justify-center mb-8">
                          {highlight.dreamTeam.filter(p => p.position === 'GKP').map((player) => (
                            <div key={player.id} className="text-center mx-2">
                              <div className="w-16 h-16 mx-auto bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-1 overflow-hidden border-2 border-white">
                                <Image 
                                  src={getPlayerImageUrl(player)}
                                  alt={player.name}
                                  width={64}
                                  height={64}
                                  className="object-cover"
                                  unoptimized
                                  onError={() => handleImageError(player.id)}
                                />
                              </div>
                              <div className="text-white text-xs font-medium truncate max-w-[80px]">{player.name.split(' ').pop()}</div>
                              <div className="text-blue-300 text-xs">{player.points} pts</div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Defenders */}
                        <div className="flex justify-center mb-8">
                          {highlight.dreamTeam.filter(p => p.position === 'DEF').map((player) => (
                            <div key={player.id} className="text-center mx-2">
                              <div className="w-16 h-16 mx-auto bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-1 overflow-hidden border-2 border-white">
                                <Image 
                                  src={getPlayerImageUrl(player)}
                                  alt={player.name}
                                  width={64}
                                  height={64}
                                  className="object-cover"
                                  unoptimized
                                  onError={() => handleImageError(player.id)}
                                />
                              </div>
                              <div className="text-white text-xs font-medium truncate max-w-[80px]">{player.name.split(' ').pop()}</div>
                              <div className="text-blue-300 text-xs">{player.points} pts</div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Midfielders */}
                        <div className="flex justify-center mb-8">
                          {highlight.dreamTeam.filter(p => p.position === 'MID').map((player) => (
                            <div key={player.id} className="text-center mx-2">
                              <div className="w-16 h-16 mx-auto bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-1 overflow-hidden border-2 border-white">
                                <Image 
                                  src={getPlayerImageUrl(player)}
                                  alt={player.name}
                                  width={64}
                                  height={64}
                                  className="object-cover"
                                  unoptimized
                                  onError={() => handleImageError(player.id)}
                                />
                              </div>
                              <div className="text-white text-xs font-medium truncate max-w-[80px]">{player.name.split(' ').pop()}</div>
                              <div className="text-blue-300 text-xs">{player.points} pts</div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Forwards */}
                        <div className="flex justify-center">
                          {highlight.dreamTeam.filter(p => p.position === 'FWD').map((player) => (
                            <div key={player.id} className="text-center mx-2">
                              <div className="w-16 h-16 mx-auto bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-1 overflow-hidden border-2 border-white">
                                <Image 
                                  src={getPlayerImageUrl(player)}
                                  alt={player.name}
                                  width={64}
                                  height={64}
                                  className="object-cover"
                                  unoptimized
                                  onError={() => handleImageError(player.id)}
                                />
                              </div>
                              <div className="text-white text-xs font-medium truncate max-w-[80px]">{player.name.split(' ').pop()}</div>
                              <div className="text-blue-300 text-xs">{player.points} pts</div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Field lines */}
                        <div className="absolute inset-0 pointer-events-none">
                          <div className="h-full w-full border-2 border-white/30 rounded-lg"></div>
                          {/* Removed the horizontal middle line */}
                          {/* Removed the vertical middle line */}
                          {/* Removed the top and bottom area borders */}
                          {/* Kept the goal areas */}
                          <div className="absolute top-0 left-1/2 w-[20%] h-[10%] border-2 border-t-0 border-white/30 transform -translate-x-1/2"></div>
                          <div className="absolute bottom-0 left-1/2 w-[20%] h-[10%] border-2 border-b-0 border-white/30 transform -translate-x-1/2"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
