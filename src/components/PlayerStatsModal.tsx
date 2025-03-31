import React, { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import { getPlayerHistory } from '@/lib/services/fplApi';
import { ArrowLeftIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { findPlayerImage, getPremierLeaguePlayerImageUrl } from '@/lib/utils/playerImages';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { TeamPlayer } from '@/lib/utils/teamBuilder';
import { getTeamCrestUrl } from '@/lib/services/fplApi';

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

interface PlayerStatsModalProps {
  player: TeamPlayer | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function PlayerStatsModal({ player, isOpen, onClose }: PlayerStatsModalProps) {
  const [team, setTeam] = useState<{ id: number; name: string; short_name: string; crest_url: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [localImageError, setLocalImageError] = useState(false);
  const [useExternalImage, setUseExternalImage] = useState(false);

  // Get player data when modal is opened
  useEffect(() => {
    if (isOpen && player) {
      setLoading(true);
      // Get team info
      loadTeamInfo(player.team);
      
      // Get player stats from the API or fixture lists, etc.
      fetchPlayerStats(player.id);
    } else {
      setStats(null);
      setTeam(null);
    }
  }, [isOpen, player]);
  
  // Function to force refresh the image
  const refreshImage = () => {
    setRefreshKey(Date.now());
      setLocalImageError(false);
  };
  
  // Get player stats from API
  const fetchPlayerStats = async (playerId: number) => {
    try {
      // For demo, create dummy stats - in a real app, we'd fetch from the API
      setTimeout(() => {
        setStats({
          season_stats: {
            minutes_played: Math.floor(Math.random() * 1500),
            goals_scored: Math.floor(Math.random() * 10),
            assists: Math.floor(Math.random() * 8),
            clean_sheets: Math.floor(Math.random() * 5),
            bonus_points: Math.floor(Math.random() * 15),
            yellow_cards: Math.floor(Math.random() * 3),
            red_cards: Math.floor(Math.random() * 1),
          },
          recent_form: [
            { opponent: "MUN (H)", points: 2 },
            { opponent: "CHE (A)", points: 9 },
            { opponent: "NEW (H)", points: 1 },
            { opponent: "BRI (A)", points: 6 },
            { opponent: "WHU (H)", points: 2 },
          ],
          upcoming_fixtures: [
            { opponent: "CRY (A)", difficulty: 2 },
            { opponent: "MCI (H)", difficulty: 5 },
            { opponent: "LIV (A)", difficulty: 4 },
            { opponent: "ARS (H)", difficulty: 4 },
            { opponent: "BOU (A)", difficulty: 2 },
          ]
        });
        setLoading(false);
      }, 1000);
    } catch (err) {
      console.error('Failed to load player stats:', err);
      setLoading(false);
    }
  };

  // Load team information
  const loadTeamInfo = async (teamId?: number) => {
    if (!teamId) {
      setTeam(null);
      return;
    }
    
    try {
      const crestUrl = await getTeamCrestUrl(teamId);
      // For demo data
      setTeam({
        id: teamId,
        name: player?.team_name || 'Unknown Team',
        short_name: player?.team_short_name || '???',
        crest_url: crestUrl
      });
    } catch (err) {
      console.error('Error loading team mapping:', err);
    }
  };
  
  if (!player) return null;
  
  // Get the player code for image URLs - this is different from the player.id
  const playerImageId = player.code || player.id;
  
  // Use the more flexible image finder
  const localPlayerImageUrl = findPlayerImage(player.code?.toString() || '', player.id);
  
  // Placeholder image for when local image fails
  const placeholderImageUrl = '/images/placeholder-shirt.svg';
  
  // Premier League API image URL as fallback
  const plImageUrl = getPremierLeaguePlayerImageUrl(player.code || player.id);
  
  // Determine which image URL to use
  let imageUrl = localPlayerImageUrl;
  
  if (localImageError) {
    imageUrl = useExternalImage ? plImageUrl : placeholderImageUrl;
  }
  
  // Add refresh key to prevent caching
  if (imageUrl !== placeholderImageUrl && !imageUrl.startsWith('http')) {
    imageUrl = `${imageUrl}?key=${refreshKey}`;
  }
  
  // Handle local image error - try Premier League API as fallback
  const handleLocalImageError = () => {
    setLocalImageError(true);
    setUseExternalImage(true);
  };
  
    return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-xl bg-white dark:bg-slate-800 shadow-xl transition-all">
                {/* Header with player name and close button */}
                <div className="bg-blue-600 dark:bg-blue-700 text-white px-6 py-4 flex items-center justify-between">
                  <Dialog.Title as="h3" className="text-lg font-semibold">
                    {player.first_name} {player.second_name || player.web_name}
                  </Dialog.Title>
                <button 
                  onClick={onClose} 
                    className="text-white hover:text-blue-100"
                  >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
                {/* Player info */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left column - player image and basic info */}
                    <div className="flex flex-col items-center">
                      <div className="relative w-40 h-40 bg-gray-100 dark:bg-gray-700 rounded-lg mb-4 overflow-hidden">
                    <Image
                      src={imageUrl}
                      alt={player.web_name}
                      width={160}
                      height={160}
                      className="object-contain"
                          onError={handleLocalImageError}
                      unoptimized={true}
                        />
                  <button 
                    onClick={refreshImage}
                          className="absolute bottom-1 right-1 p-1 text-gray-600 hover:text-blue-500 bg-white bg-opacity-70 rounded-md"
                    title="Refresh player image"
                  >
                          <ArrowPathIcon className="h-5 w-5" />
                  </button>
                </div>
                      
                      <h3 className="text-xl font-bold dark:text-white">{player.web_name}</h3>
                      
                      {/* Team info and badge */}
                      <div className="flex items-center mt-2 space-x-2">
                        {team && team.crest_url && (
                          <Image
                            src={team.crest_url}
                            alt={team.name}
                            width={24}
                            height={24}
                            className="w-6 h-6"
                            unoptimized={true}
                          />
                        )}
                        <span className="text-gray-600 dark:text-gray-300">{player.team_name}</span>
              </div>
              
                      {/* Player position and price */}
                      <div className="mt-4 grid grid-cols-2 gap-4 w-full">
                        <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg flex flex-col items-center">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Position</span>
                          <span className="font-bold dark:text-white">{player.position}</span>
                  </div>
                        <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg flex flex-col items-center">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Price</span>
                          <span className="font-bold dark:text-white">£{player.price?.toFixed(1)}m</span>
            </div>
          </div>
          
                      {/* Player form/points */}
                      <div className="mt-4 w-full">
                        <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg flex flex-col items-center">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Total Points</span>
                          <span className="font-bold text-xl dark:text-white">{player.total_points || 0}</span>
                        </div>
                      </div>
                      
                      {/* Player injury status */}
                      {player.chance_of_playing_next_round !== null && player.chance_of_playing_next_round !== undefined && player.chance_of_playing_next_round < 100 && (
                        <div className="mt-4 w-full bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-3">
                          <span className="text-red-700 dark:text-red-300 font-medium">Chance of playing: {player.chance_of_playing_next_round}%</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Middle column - season stats */}
                    <div>
                      <h4 className="text-lg font-semibold mb-3 dark:text-white">Season Statistics</h4>
                      {loading ? (
                        <div className="animate-pulse space-y-2">
                          {[...Array(7)].map((_, i) => (
                            <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                          ))}
                          </div>
                      ) : stats ? (
                        <div className="space-y-2">
                          <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-300">Minutes played</span>
                            <span className="font-medium dark:text-white">{stats.season_stats.minutes_played}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-300">Goals</span>
                            <span className="font-medium dark:text-white">{stats.season_stats.goals_scored}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-300">Assists</span>
                            <span className="font-medium dark:text-white">{stats.season_stats.assists}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-300">Clean sheets</span>
                            <span className="font-medium dark:text-white">{stats.season_stats.clean_sheets}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-300">Bonus points</span>
                            <span className="font-medium dark:text-white">{stats.season_stats.bonus_points}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-300">Yellow cards</span>
                            <span className="font-medium dark:text-white">{stats.season_stats.yellow_cards}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-300">Red cards</span>
                            <span className="font-medium dark:text-white">{stats.season_stats.red_cards}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-gray-500 dark:text-gray-400">No statistics available</div>
                      )}
                    </div>
                    
                    {/* Right column - form and fixtures */}
                    <div>
                      {/* Recent form */}
                      <h4 className="text-lg font-semibold mb-3 dark:text-white">Recent Form</h4>
                      {loading ? (
                        <div className="animate-pulse space-y-2">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                          ))}
                        </div>
                      ) : stats?.recent_form ? (
                        <div className="grid grid-cols-5 gap-1 mb-6">
                          {stats.recent_form.map((game: any, index: number) => (
                            <div key={index} className="flex flex-col items-center">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white font-bold
                                ${game.points >= 8 ? 'bg-green-500' : 
                                  game.points >= 5 ? 'bg-green-400' : 
                                  game.points >= 3 ? 'bg-yellow-400' : 'bg-red-400'}`}>
                                {game.points}
                      </div>
                              <span className="text-xs mt-1 text-gray-600 dark:text-gray-400">{game.opponent}</span>
                    </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-500 dark:text-gray-400 mb-6">No form data available</div>
                      )}
                      
                      {/* Upcoming fixtures */}
                      <h4 className="text-lg font-semibold mb-3 dark:text-white">Upcoming Fixtures</h4>
                      {loading ? (
                        <div className="animate-pulse space-y-2">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                          ))}
                        </div>
                      ) : stats?.upcoming_fixtures ? (
                        <div className="space-y-2">
                          {stats.upcoming_fixtures.map((fixture: any, index: number) => (
                            <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                              <span className="text-gray-600 dark:text-gray-300">{fixture.opponent}</span>
                              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium text-white
                                ${fixture.difficulty <= 2 ? 'bg-green-500' : 
                                  fixture.difficulty === 3 ? 'bg-yellow-400' : 
                                  fixture.difficulty === 4 ? 'bg-orange-400' : 'bg-red-500'}`}>
                                {fixture.difficulty}
                              </div>
                          </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-500 dark:text-gray-400">No fixture data available</div>
                      )}
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 