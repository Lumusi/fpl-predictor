import React, { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import { getPlayerHistory } from '@/lib/services/fplApi';
import { ArrowLeftIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { findPlayerImage, getPremierLeaguePlayerImageUrl } from '@/lib/utils/playerImages';

interface PlayerHistoryEntry {
  element: number;
  fixture: number;
  opponent_team: number;
  total_points: number;
  was_home: boolean;
  kickoff_time: string;
  team_h_score: number;
  team_a_score: number;
  round: number;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  own_goals: number;
  penalties_saved: number;
  penalties_missed: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  bonus: number;
  bps: number;
  influence: string;
  creativity: string;
  threat: string;
  ict_index: string;
  value: number;
  transfers_balance: number;
  selected: number;
  transfers_in: number;
  transfers_out: number;
}

interface PlayerStats {
  history: PlayerHistoryEntry[];
  fixtures: any[];
  history_past: any[];
}

export interface PlayerStatsModalProps {
  player: {
    id: number;
    web_name: string;
    first_name?: string;
    second_name?: string; 
    team_short_name?: string;
    position: string;
    price: number;
    total_points: number;
    form: string;
    code?: number;
  };
  isOpen: boolean;
  onClose: () => void;
}

export default function PlayerStatsModal({ player, isOpen, onClose }: PlayerStatsModalProps) {
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [teamMap, setTeamMap] = useState<Record<number, string>>({});
  
  const modalRef = useRef<HTMLDivElement>(null);
  const [playerHistory, setPlayerHistory] = useState<PlayerHistoryEntry[]>([]);
  const [localImageError, setLocalImageError] = useState(false);
  const [useExternalImage, setUseExternalImage] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (isOpen && player) {
      loadPlayerStats();
      loadTeamMap();
    }
    
    return () => {
      // Clean up on unmount
      setPlayerStats(null);
      setLoading(true);
      setError(null);
      // Reset image states too
      setLocalImageError(false);
      setImageLoaded(false);
    };
  }, [isOpen, player?.id]);

  const loadPlayerStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const stats = await getPlayerHistory(player.id);
      setPlayerStats(stats);
    } catch (err) {
      console.error('Failed to load player stats:', err);
      setError('Failed to load player statistics');
    } finally {
      setLoading(false);
    }
  };

  const loadTeamMap = async () => {
    try {
      const response = await fetch('/api/team-map');
      if (!response.ok) {
        throw new Error('Failed to fetch team mapping');
      }
      const data = await response.json();
      setTeamMap(data);
    } catch (err) {
      console.error('Error loading team mapping:', err);
      // Don't set an error state here as it's not critical
    }
  };

  const getTeamName = (teamId: number) => {
    return teamMap[teamId] || `Team ${teamId}`;
  };

  // Function to force refresh the image
  const refreshImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalImageError(false);
    setImageLoaded(false);
  };

  // Get the player code for image URLs
  const playerImageId = player.code || player.id;
  
  // Add debug logging
  console.log(`PlayerStatsModal: Player ${player.web_name} - ID: ${player.id}, Code: ${player.code}, Image ID: ${playerImageId}`);

  // Use the more flexible image finder with null check
  const localPlayerImageUrl = findPlayerImage(player.code || '', player.id);
  
  // Add debug logging for the image URL
  console.log(`PlayerStatsModal: Image URL for ${player.web_name}: ${localPlayerImageUrl}`);
  
  // Premier League API image URL as fallback
  const plImageUrl = getPremierLeaguePlayerImageUrl(player.code || player.id);
  
  // Handle local image error - try Premier League API fallback
  const handleLocalImageError = () => {
    console.log(`PlayerStatsModal: Local image error for ${player.web_name}, trying external image: ${plImageUrl}`);
    setLocalImageError(true);
    setUseExternalImage(true);
  };
  
  // Handle successful image load
  const handleImageLoaded = () => {
    setImageLoaded(true);
  };

  // Placeholder image for when local image fails
  const placeholderImageUrl = '/images/placeholder-shirt.svg';
  
  // Determine which image URL to use
  let imageUrl = localPlayerImageUrl;
  
  if (localImageError) {
    imageUrl = useExternalImage ? plImageUrl : placeholderImageUrl;
  }
  
  // Add refresh key to prevent caching
  if (!imageUrl.startsWith('http') && !imageUrl.includes('placeholder')) {
    imageUrl = `${imageUrl}?key=${Date.now()}`;
  }

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!playerStats?.history?.length) return null;
    
    // Sort by gameweek
    const sortedGames = [...playerStats.history]
      .sort((a, b) => a.round - b.round);
    
    return {
      gameweeks: sortedGames.map(game => game.round),
      points: sortedGames.map(game => game.total_points),
      minutes: sortedGames.map(game => game.minutes),
    };
  }, [playerStats]);

  // Calculate the max value for scaling the chart
  const maxPoints = useMemo(() => {
    if (!chartData?.points.length) return 20; // Default max
    return Math.max(...chartData.points) + 2; // Add some padding
  }, [chartData]);

  // Calculate totals and averages
  const gameHistory = playerStats?.history || [];
  const gameCount = gameHistory.length;
  
  const totalMinutes = gameHistory.reduce((sum, game) => sum + game.minutes, 0);
  const totalGoals = gameHistory.reduce((sum, game) => sum + game.goals_scored, 0);
  const totalAssists = gameHistory.reduce((sum, game) => sum + game.assists, 0);
  const totalCleanSheets = gameHistory.reduce((sum, game) => sum + game.clean_sheets, 0);
  const totalBonus = gameHistory.reduce((sum, game) => sum + game.bonus, 0);
  const totalBps = gameHistory.reduce((sum, game) => sum + game.bps, 0);
  
  const avgMinutes = gameCount ? (totalMinutes / gameCount).toFixed(1) : '0';
  const avgPoints = gameCount ? (gameHistory.reduce((sum, game) => sum + game.total_points, 0) / gameCount).toFixed(1) : '0';
  
  // Sort games by most recent first
  const sortedGames = [...gameHistory].sort((a, b) => {
    return new Date(b.kickoff_time).getTime() - new Date(a.kickoff_time).getTime();
  });

  // Get match result (W/L/D) based on scores and whether player was home or away
  const getMatchResult = (game: PlayerHistoryEntry) => {
    const homeScore = game.team_h_score;
    const awayScore = game.team_a_score;
    
    if (homeScore === awayScore) {
      return { result: 'D', color: 'bg-gray-500' };
    }
    
    if (game.was_home) {
      return homeScore > awayScore 
        ? { result: 'W', color: 'bg-green-500' }
        : { result: 'L', color: 'bg-red-500' };
    } else {
      return awayScore > homeScore 
        ? { result: 'W', color: 'bg-green-500' }
        : { result: 'L', color: 'bg-red-500' };
    }
  };

  // Form indicator
  const getFormIndicator = (points: number) => {
    if (points >= 8) return 'bg-green-500';
    if (points >= 4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (!isOpen) return null;

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen">
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose}></div>
          <div className="relative bg-white dark:bg-dark-card rounded-lg shadow-xl max-w-3xl w-full mx-4 overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Loading Stats...</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="flex justify-center items-center h-64">
                <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen">
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose}></div>
          <div className="relative bg-white dark:bg-dark-card rounded-lg shadow-xl max-w-3xl w-full mx-4 overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Error</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md">
                {error}
              </div>
              <div className="mt-4 flex justify-end">
                <button 
                  onClick={onClose} 
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose}></div>
        <div className="relative bg-white dark:bg-dark-card rounded-lg shadow-xl max-w-4xl w-full mx-4 overflow-hidden">
          {/* Header with Player Image - Updated to match the image design exactly */}
          <div className="bg-blue-600 dark:bg-blue-700">
            <div className="absolute top-4 right-4">
              <button onClick={onClose} className="text-white hover:text-blue-100">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="flex flex-col items-center pt-6 pb-1">
              <div className="text-white text-sm font-medium mb-1">{player.position}</div>
              <h2 className="text-2xl font-bold text-white mb-0.5">
                {player.web_name} 
                {player.first_name && player.second_name && (
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                    ({player.first_name} {player.second_name})
                  </span>
                )}
              </h2>
              <p className="text-white/90 text-sm font-medium mb-4">{player.team_short_name}</p>
            </div>
            
            <div className="grid grid-cols-12 px-8 pb-6">
              {/* Player Image - with transparent background and larger size, moved up to align with data */}
              <div className="col-span-3 -mt-8">
                <div className="w-44 h-44 rounded-lg overflow-hidden flex items-center justify-center relative">
                  <div className={`${imageLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 w-full h-full flex items-center justify-center`}>
                    <Image
                      src={imageUrl}
                      alt={player.web_name}
                      width={160}
                      height={160}
                      className="object-contain"
                      loading="lazy"
                      onLoadingComplete={handleImageLoaded}
                      priority={false}
                      unoptimized={true}
                      style={{ height: 'auto', maxWidth: '100%' }}
                      onError={handleLocalImageError}
                    />
                  </div>
                  {!imageLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                    </div>
                  )}
                  <button 
                    onClick={refreshImage}
                    className="absolute bottom-0 right-0 p-1 text-gray-500 hover:text-blue-500 bg-white bg-opacity-70 rounded-tl-md"
                    title="Refresh player image"
                  >
                    <ArrowPathIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              {/* Stats Grid - adjusted to center Form with player name */}
              <div className="col-span-9">
                <div className="grid grid-cols-3 gap-x-4 gap-y-3">
                  <div className="flex flex-col">
                    <div className="text-xs text-white/80 mb-1 text-center">Price</div>
                    <div className="text-lg font-bold text-white text-center">£{player.price.toFixed(1)}m</div>
                    <div className="text-xs text-white/80 text-center">1 of 346</div>
                  </div>
                  <div className="flex flex-col">
                    <div className="text-xs text-white/80 mb-1 text-center">Form</div>
                    <div className="text-lg font-bold text-white text-center">{player.form}</div>
                    <div className="text-xs text-white/80 text-center">&nbsp;</div>
                  </div>
                  <div className="flex flex-col">
                    <div className="text-xs text-white/80 mb-1 text-center">Pts / Match</div>
                    <div className="text-lg font-bold text-white text-center">{avgPoints}</div>
                    <div className="text-xs text-white/80 text-center">1 of 346</div>
                  </div>
                  <div className="flex flex-col">
                    <div className="text-xs text-white/80 mb-1 text-center">GW29 Pts</div>
                    <div className="text-lg font-bold text-white text-center">
                      {gameHistory.find(g => g.round === 29)?.total_points || 0}
                    </div>
                    <div className="text-xs text-white/80 text-center">&nbsp;</div>
                  </div>
                  <div className="flex flex-col">
                    <div className="text-xs text-white/80 mb-1 text-center">Total Pts</div>
                    <div className="text-lg font-bold text-white text-center">{player.total_points}</div>
                    <div className="text-xs text-white/80 text-center">&nbsp;</div>
                  </div>
                  <div className="flex flex-col">
                    <div className="text-xs text-white/80 mb-1 text-center">Total Bonus</div>
                    <div className="text-lg font-bold text-white text-center">{totalBonus}</div>
                    <div className="text-xs text-white/80 text-center">&nbsp;</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Tab Navigation - removed All Stats tab */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex">
              <button 
                onClick={() => setActiveTab('current')}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === 'current' 
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Current Season
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === 'history' 
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Season History
              </button>
            </nav>
          </div>
          
          {/* Content */}
          <div className="p-4 max-h-[70vh] overflow-y-auto">
            {activeTab === 'current' && (
              <>
                {/* All Stats (formerly in the 'all' tab) */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
                  <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Complete Season Stats</h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Basic Stats</h4>
                      <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Total Points</div>
                            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{player.total_points}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Points Per Game</div>
                            <div className="text-lg font-bold">{avgPoints}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Minutes Played</div>
                            <div className="text-lg font-bold">{totalMinutes}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Games Played</div>
                            <div className="text-lg font-bold">{gameCount}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Attacking</h4>
                      <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Goals</div>
                            <div className="text-lg font-bold">{totalGoals}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Assists</div>
                            <div className="text-lg font-bold">{totalAssists}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Goal Involvements</div>
                            <div className="text-lg font-bold">{totalGoals + totalAssists}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Bonus Points</div>
                            <div className="text-lg font-bold">{totalBonus}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Defensive</h4>
                      <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Clean Sheets</div>
                            <div className="text-lg font-bold">{totalCleanSheets}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Goals Conceded</div>
                            <div className="text-lg font-bold">{gameHistory.reduce((sum, game) => sum + game.goals_conceded, 0)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Yellow Cards</div>
                            <div className="text-lg font-bold">{gameHistory.reduce((sum, game) => sum + game.yellow_cards, 0)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Red Cards</div>
                            <div className="text-lg font-bold">{gameHistory.reduce((sum, game) => sum + game.red_cards, 0)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Advanced</h4>
                      <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">BPS Total</div>
                            <div className="text-lg font-bold">{totalBps}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Avg BPS</div>
                            <div className="text-lg font-bold">{gameCount ? (totalBps / gameCount).toFixed(1) : '0'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Saves</div>
                            <div className="text-lg font-bold">{gameHistory.reduce((sum, game) => sum + game.saves, 0)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Penalties Saved</div>
                            <div className="text-lg font-bold">{gameHistory.reduce((sum, game) => sum + game.penalties_saved, 0)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Form Analysis</h4>
                    <div className="bg-white dark:bg-gray-700 rounded-lg p-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Current Form</div>
                          <div className="text-lg font-bold">{player.form}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Last 5 Games Avg</div>
                          <div className="text-lg font-bold">
                            {sortedGames.slice(0, 5).length > 0 
                              ? (sortedGames.slice(0, 5).reduce((sum, game) => sum + game.total_points, 0) / Math.min(5, sortedGames.length)).toFixed(1) 
                              : '0'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Home vs Away PPG</div>
                          <div className="text-lg font-bold">
                            {`${gameHistory.filter(g => g.was_home).length > 0 
                              ? (gameHistory.filter(g => g.was_home).reduce((sum, game) => sum + game.total_points, 0) / 
                                 gameHistory.filter(g => g.was_home).length).toFixed(1) 
                              : '0'} / ${gameHistory.filter(g => !g.was_home).length > 0 
                              ? (gameHistory.filter(g => !g.was_home).reduce((sum, game) => sum + game.total_points, 0) / 
                                 gameHistory.filter(g => !g.was_home).length).toFixed(1) 
                              : '0'}`}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Game by Game Stats - similar to Current Season's Gameweek History */}
                <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">Game by Game Stats</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">GW</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Opponent</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Result</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Points</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Min</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">G</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">A</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">CS</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">BPS</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-700 divide-y divide-gray-200 dark:divide-gray-800">
                      {sortedGames.map((game, index) => {
                        const matchResult = getMatchResult(game);
                        return (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-600">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">{game.round}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              <span className="flex items-center gap-1">
                                <span>{game.was_home ? 'vs' : '@'} {getTeamName(game.opponent_team)}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {game.team_h_score}-{game.team_a_score}
                                </span>
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-medium ${matchResult.color}`}>
                                {matchResult.result}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center justify-center px-2 py-1 rounded text-white text-sm font-medium ${getFormIndicator(game.total_points)}`}>
                                {game.total_points}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">{game.minutes}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">{game.goals_scored}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">{game.assists}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">{game.clean_sheets}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">{game.bps}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            
            {activeTab === 'history' && (
              <div className="p-4">
                <h3 className="text-lg font-medium mb-4">Previous Seasons</h3>
                {playerStats?.history_past && playerStats.history_past.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Season</th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Team</th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Points</th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">PPG</th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Minutes</th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">G</th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">A</th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">CS</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-700 divide-y divide-gray-200 dark:divide-gray-800">
                        {[...playerStats.history_past].sort((a, b) => {
                          // Sort by season in descending order (newest first)
                          return b.season_name.localeCompare(a.season_name);
                        }).map((season, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-600">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">{season.season_name}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">{season.team_name || '-'}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400">{season.total_points}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">{season.points_per_game}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">{season.minutes}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">{season.goals_scored}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">{season.assists}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">{season.clean_sheets}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">No historical data available for this player.</p>
                )}
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex justify-end">
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 