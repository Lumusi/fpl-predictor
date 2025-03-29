import React, { useState, useCallback, useMemo, Fragment } from 'react';
import { useTeam } from '@/lib/contexts/TeamContext';
import { FORMATION_CONSTRAINTS, POSITION_ID_MAP } from '@/lib/utils/teamBuilder';
import PlayerCard from './PlayerCard';
import { Tab } from '@headlessui/react';
import FieldView from './FieldView';
import { XMarkIcon, ArrowsRightLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { Popover, Transition } from '@headlessui/react';
import { TeamPlayer, TeamSuggestion } from '@/lib/utils/teamBuilder';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function TeamBuilder() {
  const { 
    myTeam, 
    allFormattedPlayers, 
    addPlayer, 
    removePlayer, 
    clearTeam, 
    remainingBudget, 
    teamCost,
    loadingTeam,
    loadingSuggestions,
    suggestions,
    getSuggestions
  } = useTeam();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [viewType, setViewType] = useState<'list' | 'field'>('field');
  const [maxCost, setMaxCost] = useState<number>(15.0);
  const [sortBy, setSelectBy] = useState<'total_points' | 'price' | 'predicted_points'>('total_points');
  const [currentPage, setCurrentPage] = useState(1);
  const playersPerPage = 20; // Reduce the number of players shown at once
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPlayerForSwap, setSelectedPlayerForSwap] = useState<TeamPlayer | null>(null);
  const [playerSpecificSuggestions, setPlayerSpecificSuggestions] = useState<TeamSuggestion[]>([]);
  const [loadingPlayerSuggestions, setLoadingPlayerSuggestions] = useState(false);
  
  // Group players by position - memoized to prevent recalculation
  const teamByPosition = useMemo(() => {
    return Object.keys(FORMATION_CONSTRAINTS).reduce((acc, position) => {
      acc[position] = myTeam.filter(player => player.position === position);
      return acc;
    }, {} as Record<string, typeof myTeam>);
  }, [myTeam]);
  
  // Handle player selection - use useCallback to memoize this function
  const handleAddPlayer = useCallback((playerId: number) => {
    // Find the player in the original players array from the context
    const player = allFormattedPlayers.find(p => p.id === playerId);
    if (player) {
      // Convert back to Player type - find the raw player that matches this ID
      const result = addPlayer({
        id: player.id,
        code: player.code || 0,
        web_name: player.web_name,
        team: player.team || 0,
        element_type: player.element_type,
        now_cost: player.now_cost || 0,
        // Include other required fields or use defaults
        total_points: player.total_points || 0,
        goals_scored: 0,
        assists: 0,
        clean_sheets: 0,
        minutes: 0,
        form: player.form || "0",
        points_per_game: "0",
        selected_by_percent: "0",
        status: "",
        chance_of_playing_next_round: null
      });
      
      if (!result.success && result.message) {
        setErrorMessage(result.message);
        // Clear error after 3 seconds
        setTimeout(() => setErrorMessage(null), 3000);
      }
    }
  }, [addPlayer, allFormattedPlayers]);
  
  // Filter players for the selector - memoized to prevent recalculation
  const filteredPlayers = useMemo(() => {
    return allFormattedPlayers.filter(player => {
      const matchesSearch = 
        player.web_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.team_short_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (player.first_name && player.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (player.second_name && player.second_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (player.team_name && player.team_name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Fix position filtering by checking element_type and position
      const matchesPosition = !selectedPosition || 
        player.position === selectedPosition || 
        player.element_type === POSITION_ID_MAP[selectedPosition as keyof typeof POSITION_ID_MAP];
      
      // Filter by cost constraint
      const matchesCost = (player.now_cost || 0) / 10 <= maxCost;
      
      return matchesSearch && matchesPosition && matchesCost;
    });
  }, [allFormattedPlayers, searchTerm, selectedPosition, maxCost]);
  
  // Sort the filtered players - memoized to prevent recalculation
  const sortedPlayers = useMemo(() => {
    return [...filteredPlayers].sort((a, b) => {
      if (sortBy === 'predicted_points') {
        return (b.predicted_points || 0) - (a.predicted_points || 0);
      } else if (sortBy === 'price') {
        return ((b.now_cost || 0) / 10) - ((a.now_cost || 0) / 10);
      } else {
        return (b.total_points || 0) - (a.total_points || 0);
      }
    });
  }, [filteredPlayers, sortBy]);
  
  // Group players by position for selection panel - memoized
  const playersByPosition = useMemo(() => {
    return {
      GKP: sortedPlayers.filter(p => p.position === 'GKP'),
      DEF: sortedPlayers.filter(p => p.position === 'DEF'),
      MID: sortedPlayers.filter(p => p.position === 'MID'),
      FWD: sortedPlayers.filter(p => p.position === 'FWD')
    };
  }, [sortedPlayers]);

  // Calculate pagination
  const totalPages = Math.ceil(sortedPlayers.length / playersPerPage);
  const startIndex = (currentPage - 1) * playersPerPage;
  const endIndex = startIndex + playersPerPage;
  const currentPlayers = sortedPlayers.slice(startIndex, endIndex);
  
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      // Scroll to top of list when changing pages
      const playerList = document.getElementById('player-list');
      if (playerList) playerList.scrollTop = 0;
    }
  };
  
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      // Scroll to top of list when changing pages
      const playerList = document.getElementById('player-list');
      if (playerList) playerList.scrollTop = 0;
    }
  };
  
  // Function to get player-specific suggestions
  const getPlayerSuggestions = useCallback(async (player: TeamPlayer) => {
    if (!player || !allFormattedPlayers.length) return;
    
    setSelectedPlayerForSwap(player);
    setLoadingPlayerSuggestions(true);
    
    try {
      // Find available players of the same position who are not in the team
      const availableReplacements = allFormattedPlayers.filter(p => 
        p.position === player.position && 
        p.id !== player.id && 
        !myTeam.some(teamPlayer => teamPlayer.id === p.id)
      );
      
      // Sort by predicted points (highest first)
      const sortedReplacements = [...availableReplacements].sort((a, b) => 
        (b.predicted_points || 0) - (a.predicted_points || 0)
      );
      
      // Take up to 5 players with better predicted points than the current player
      const betterPlayers = sortedReplacements
        .filter(p => (p.predicted_points || 0) > (player.predicted_points || 0))
        .slice(0, 5);
      
      // If we don't have 5 better players, just take the top 5 anyway
      const suggestions = betterPlayers.length >= 3 
        ? betterPlayers 
        : sortedReplacements.slice(0, 5);
      
      // Format as TeamSuggestion objects
      const formattedSuggestions = suggestions.map(suggestion => ({
        playerOut: player,
        playerIn: suggestion,
        pointsImprovement: (suggestion.predicted_points || 0) - (player.predicted_points || 0),
        costDifference: ((suggestion.now_cost || 0) / 10) - ((player.now_cost || 0) / 10)
      }));
      
      setPlayerSpecificSuggestions(formattedSuggestions);
    } catch (error) {
      console.error("Error getting player suggestions:", error);
    } finally {
      setLoadingPlayerSuggestions(false);
    }
  }, [allFormattedPlayers, myTeam]);
  
  // Function to render the player selection sidebar
  const renderPlayerSelection = () => {
    return (
      <div className="p-2 bg-gradient-to-b from-blue-700 to-blue-800 rounded-lg h-full max-w-[270px] w-full ml-auto">
        <div className="mb-2">
          <h3 className="text-white font-semibold text-lg mb-2">Player Selection</h3>
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <select 
                className="w-full p-1.5 rounded-md border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-white dark:bg-slate-700 text-xs"
                value={selectedPosition || ''}
                onChange={(e) => {
                  setSelectedPosition(e.target.value || null);
                  setCurrentPage(1); // Reset to first page on filter change
                }}
              >
                <option value="">All players</option>
                <option value="GKP">Goalkeepers</option>
                <option value="DEF">Defenders</option>
                <option value="MID">Midfielders</option>
                <option value="FWD">Forwards</option>
              </select>
              
              <select 
                className="w-full p-1.5 rounded-md border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-white dark:bg-slate-700 text-xs"
                value={sortBy}
                onChange={(e) => {
                  setSelectBy(e.target.value as any);
                  setCurrentPage(1); // Reset to first page on sort change
                }}
              >
                <option value="total_points">Total points</option>
                <option value="predicted_points">Predicted points</option>
                <option value="price">Price</option>
              </select>
            </div>
            
            <div className="flex flex-col">
              <label className="text-white text-xs mb-1">Max cost: £{maxCost}m</label>
              <div className="w-full">
                <input 
                  type="range" 
                  min="0.5" 
                  max="15" 
                  step="0.1" 
                  value={maxCost} 
                  onChange={(e) => {
                    setMaxCost(parseFloat(e.target.value));
                    setCurrentPage(1); // Reset to first page on filter change
                  }}
                  className="w-full h-2 bg-white dark:bg-slate-600 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-white mt-1">
                  <span>£0.5m</span>
                  <span>£15m</span>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by player name or team (full/short name)..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // Reset to first page on search change
                }}
                className="w-full pl-8 pr-3 py-1.5 rounded-md border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-white dark:bg-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
        
        <div className="border-t border-white/20 pt-2 mb-1">
          <div className="flex justify-between items-center">
            <span className="text-white text-xs">{filteredPlayers.length} players</span>
            <span className="text-white text-xs">Page {currentPage}/{totalPages}</span>
          </div>
          
          <div className="bg-white/10 rounded-md p-1 mt-1 max-h-[60vh] overflow-y-auto" id="player-list">
            {currentPlayers.length > 0 ? (
              <div className="grid grid-cols-1 gap-1">
                {currentPlayers.map((player) => (
                  <div 
                    key={player.id} 
                    className="bg-white dark:bg-slate-700 rounded-md p-1.5 flex justify-between items-center text-xs cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-600"
                    onClick={() => handleAddPlayer(player.id)}
                  >
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-1 flex-shrink-0 ${
                        player.position === 'GKP' ? 'bg-yellow-500' :
                        player.position === 'DEF' ? 'bg-blue-500' :
                        player.position === 'MID' ? 'bg-green-500' :
                        'bg-red-500'
                      }`}></div>
                      <div>
                        <div className="font-medium text-gray-800 dark:text-white">{player.web_name}</div>
                        <div className="text-gray-500 dark:text-gray-300 text-xs flex items-center">
                          <span>{player.team_short_name}</span>
                          <span className="mx-1">•</span>
                          <span>{player.position}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="font-medium text-gray-800 dark:text-white">£{(player.now_cost || 0) / 10}m</div>
                      <div className="text-gray-500 dark:text-gray-300 text-xs">
                        {sortBy === 'predicted_points' 
                          ? `${player.predicted_points?.toFixed(1) || 0} pts` 
                          : `${player.total_points || 0} pts`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-white">
                No players match your filters
              </div>
            )}
          </div>
          
          {/* Pagination controls */}
          <div className="flex justify-between mt-2">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className={`px-2 py-1 rounded-md text-xs ${
                currentPage === 1 
                  ? 'bg-white/30 text-white/70 cursor-not-allowed' 
                  : 'bg-white text-blue-600 hover:bg-blue-50'
              }`}
            >
              Previous
            </button>
            
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className={`px-2 py-1 rounded-md text-xs ${
                currentPage === totalPages 
                  ? 'bg-white/30 text-white/70 cursor-not-allowed' 
                  : 'bg-white text-blue-600 hover:bg-blue-50'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Function to render the swap/transfer icon that opens the suggestions popup
  const renderTransferButton = () => {
    return (
      <Popover className="relative">
        {({ open }) => (
          <>
            <Popover.Button
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors
                ${open 
                  ? 'bg-blue-700 text-white' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
                }
                ${myTeam.length < 1 || loadingSuggestions
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
                }
              `}
              disabled={myTeam.length < 1 || loadingSuggestions}
              onClick={() => {
                if (suggestions.length === 0 && !loadingSuggestions) {
                  console.log("Getting suggestions for transfer button");
                  getSuggestions();
                }
              }}
            >
              <ArrowsRightLeftIcon className="h-4 w-4" />
              <span>Transfer Ideas</span>
            </Popover.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 translate-y-1"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-1"
            >
              <Popover.Panel className="absolute right-0 z-10 mt-2 w-96 origin-top-right rounded-md bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="bg-blue-500 dark:bg-blue-700 text-white p-3 rounded-t-md flex justify-between items-center">
                  <h3 className="text-sm font-medium">Suggested Transfers</h3>
                  <Popover.Button className="p-1 rounded-full hover:bg-blue-600 transition-colors">
                    <XMarkIcon className="h-4 w-4" />
                  </Popover.Button>
                </div>
                
                <div className="max-h-[60vh] overflow-y-auto p-3">
                  {loadingSuggestions ? (
                    <div className="text-center py-6">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-600 mb-2"></div>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">Finding better options...</p>
                    </div>
                  ) : suggestions.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                      <p className="mb-3">No transfer suggestions found.</p>
                      <button
                        onClick={() => getSuggestions()}
                        className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-xs transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {suggestions.map((suggestion, index) => (
                        <div key={index} className="bg-gray-50 dark:bg-slate-700 rounded-md p-2.5 border border-gray-200 dark:border-slate-600">
                          <div className="flex justify-between items-center mb-1.5">
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Suggestion #{index + 1}</div>
                            <div className="flex items-center gap-1.5">
                              <span className="bg-green-100 dark:bg-green-800/50 text-green-800 dark:text-green-300 px-1.5 py-0.5 rounded text-xs font-medium">
                                +{suggestion.pointsImprovement.toFixed(1)} pts
                              </span>
                              <span className={`${suggestion.costDifference > 0 ? 'bg-red-100 dark:bg-red-800/50 text-red-800 dark:text-red-300' : 'bg-green-100 dark:bg-green-800/50 text-green-800 dark:text-green-300'} px-1.5 py-0.5 rounded text-xs font-medium`}>
                                {suggestion.costDifference > 0 ? '+' : ''}{suggestion.costDifference.toFixed(1)}m
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {/* Player Out */}
                            <div className="flex-1 bg-white dark:bg-slate-800 rounded p-1.5 border border-red-100 dark:border-red-900/30">
                              <div className="text-xs text-red-600 dark:text-red-400 font-medium">OUT</div>
                              <div className="flex items-center mt-1">
                                <div className="mr-2">
                                  <img 
                                    src={`/images/players/${suggestion.playerOut.code}.png`} 
                                    alt={suggestion.playerOut.web_name}
                                    className="w-8 h-8 object-cover rounded-full" 
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = '/images/player-placeholder.png';
                                    }}
                                  />
                                </div>
                                <div>
                                  <div className="text-xs font-medium">{suggestion.playerOut.web_name}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {suggestion.playerOut.position} • {((suggestion.playerOut.now_cost || 0) / 10).toFixed(1)}m
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                            
                            {/* Player In */}
                            <div className="flex-1 bg-white dark:bg-slate-800 rounded p-1.5 border border-green-100 dark:border-green-900/30">
                              <div className="text-xs text-green-600 dark:text-green-400 font-medium">IN</div>
                              <div className="flex items-center mt-1">
                                <div className="mr-2">
                                  <img 
                                    src={`/images/players/${suggestion.playerIn.code}.png`} 
                                    alt={suggestion.playerIn.web_name}
                                    className="w-8 h-8 object-cover rounded-full" 
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = '/images/player-placeholder.png';
                                    }}
                                  />
                                </div>
                                <div>
                                  <div className="text-xs font-medium">{suggestion.playerIn.web_name}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {suggestion.playerIn.position} • {((suggestion.playerIn.now_cost || 0) / 10).toFixed(1)}m
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-1.5 text-xs text-blue-800 dark:text-blue-300">
                            <span className="font-medium">Prediction:</span> {suggestion.playerIn.predicted_points?.toFixed(1) || '?'} pts vs {suggestion.playerOut.predicted_points?.toFixed(1) || '?'} pts
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Popover.Panel>
            </Transition>
          </>
        )}
      </Popover>
    );
  };
  
  // New function to render the player swap button
  const renderPlayerSwapButton = (player: TeamPlayer) => {
    return (
      <Popover className="relative">
        {({ open, close }) => (
          <>
            <Popover.Button 
              className={`p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors ${
                open ? 'bg-blue-100 dark:bg-blue-900/30' : ''
              }`}
              onClick={() => {
                // Always reload suggestions when opening the popover
                setSelectedPlayerForSwap(player);
                setLoadingPlayerSuggestions(true);
                
                // Find available players of the same position who are not in the team
                const availableReplacements = allFormattedPlayers.filter(p => 
                  p.position === player.position && 
                  p.id !== player.id && 
                  !myTeam.some(teamPlayer => teamPlayer.id === p.id)
                );
                
                // Sort by predicted points (highest first)
                const sortedReplacements = [...availableReplacements].sort((a, b) => 
                  (b.predicted_points || 0) - (a.predicted_points || 0)
                );
                
                // Take up to 5 players with better predicted points than the current player
                const betterPlayers = sortedReplacements
                  .filter(p => (p.predicted_points || 0) > (player.predicted_points || 0))
                  .slice(0, 5);
                
                // If we don't have 5 better players, just take the top 5 anyway
                const suggestions = betterPlayers.length >= 3 
                  ? betterPlayers 
                  : sortedReplacements.slice(0, 5);
                
                // Format as TeamSuggestion objects
                const formattedSuggestions = suggestions.map(suggestion => ({
                  playerOut: player,
                  playerIn: suggestion,
                  pointsImprovement: (suggestion.predicted_points || 0) - (player.predicted_points || 0),
                  costDifference: ((suggestion.now_cost || 0) / 10) - ((player.now_cost || 0) / 10)
                }));
                
                setPlayerSpecificSuggestions(formattedSuggestions);
                setLoadingPlayerSuggestions(false);
              }}
            >
              <ArrowsRightLeftIcon className="h-3.5 w-3.5" />
            </Popover.Button>
            
            <Transition
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 translate-y-1"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-1"
            >
              <Popover.Panel className="absolute z-10 mt-1 w-[260px] origin-top-right rounded-md bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none right-0">
                <div className="bg-blue-500 dark:bg-blue-700 text-white p-2 rounded-t-md flex justify-between items-center">
                  <h3 className="text-xs font-medium">Replace {player.web_name}</h3>
                  <Popover.Button className="p-1 rounded-full hover:bg-blue-600 transition-colors">
                    <XMarkIcon className="h-3.5 w-3.5" />
                  </Popover.Button>
                </div>
                
                <div className="p-2 max-h-[400px] overflow-y-auto">
                  {loadingPlayerSuggestions ? (
                    <div className="text-center py-4">
                      <div className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-600 mb-2"></div>
                      <p className="text-gray-600 dark:text-gray-300 text-xs">Finding better options...</p>
                    </div>
                  ) : playerSpecificSuggestions.length === 0 ? (
                    <div className="text-center py-3 text-gray-500 dark:text-gray-400 text-xs">
                      <p>No better players found for this position.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {playerSpecificSuggestions.map((suggestion, index) => (
                        <div 
                          key={index} 
                          className="bg-gray-50 dark:bg-slate-700 rounded p-2 border border-gray-200 dark:border-slate-600 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          onClick={() => {
                            // First remove the current player
                            removePlayer(player.id);
                            
                            // Then add the new player
                            handleAddPlayer(suggestion.playerIn.id);
                            
                            // Close the popover
                            close();
                          }}
                        >
                          <div className="flex items-center mb-1">
                            <div className="flex-1">
                              <div className="flex items-center">
                                <img 
                                  src={`/images/players/${suggestion.playerIn.code}.png`}
                                  alt={suggestion.playerIn.web_name}
                                  className="w-6 h-6 object-cover rounded-full mr-1.5"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/images/player-placeholder.png';
                                  }}
                                />
                                <div className="text-xs font-medium">{suggestion.playerIn.web_name}</div>
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {suggestion.playerIn.team_short_name} • {suggestion.playerIn.position}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-medium">£{((suggestion.playerIn.now_cost || 0) / 10).toFixed(1)}m</div>
                              <div className="text-xs text-green-600 dark:text-green-400">
                                {suggestion.playerIn.predicted_points?.toFixed(1) || 0} pts
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className={`${suggestion.pointsImprovement > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {suggestion.pointsImprovement > 0 ? '+' : ''}{suggestion.pointsImprovement.toFixed(1)} pts
                            </span>
                            <span className={`${suggestion.costDifference > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                              {suggestion.costDifference > 0 ? '+' : ''}{suggestion.costDifference.toFixed(1)}m
                            </span>
                          </div>
                          
                          <button 
                            className="w-full py-1 px-2 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                          >
                            Make Transfer
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Popover.Panel>
            </Transition>
          </>
        )}
      </Popover>
    );
  };
  
  if (loadingTeam) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div className="w-full">
      {errorMessage && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-3 py-2 rounded-md mb-4">
          {errorMessage}
        </div>
      )}
      
      <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-lg shadow-md">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Your Team</h2>
          <div className="flex space-x-2">
            <button
              onClick={clearTeam}
              className="px-3 py-1.5 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600 rounded-md text-sm transition-colors"
            >
              Clear Team
            </button>
            {renderTransferButton()}
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 sm:gap-6">
          <div className="lg:max-w-full overflow-x-auto">
            <Tab.Group>
              <Tab.List className="flex space-x-1 rounded-xl bg-blue-50 dark:bg-slate-700 p-1 mb-4">
                <Tab
                  className={({ selected }) =>
                    classNames(
                      'w-full rounded-lg py-2 text-sm font-medium leading-5 text-blue-700 dark:text-white',
                      'focus:outline-none focus:ring-2 ring-offset-2 ring-offset-blue-400 ring-white ring-opacity-60',
                      selected
                        ? 'bg-white dark:bg-slate-900 shadow'
                        : 'text-blue-500 dark:text-blue-200 hover:bg-white/[0.12] dark:hover:bg-slate-800/[0.50]'
                    )
                  }
                >
                  Team View
                </Tab>
                <Tab
                  className={({ selected }) =>
                    classNames(
                      'w-full rounded-lg py-2 text-sm font-medium leading-5 text-blue-700 dark:text-white',
                      'focus:outline-none focus:ring-2 ring-offset-2 ring-offset-blue-400 ring-white ring-opacity-60',
                      selected
                        ? 'bg-white dark:bg-slate-900 shadow'
                        : 'text-blue-500 dark:text-blue-200 hover:bg-white/[0.12] dark:hover:bg-slate-800/[0.50]'
                    )
                  }
                >
                  List View
                </Tab>
              </Tab.List>
              <Tab.Panels>
                <Tab.Panel>
                  <FieldView 
                    team={myTeam} 
                    onRemovePlayer={removePlayer} 
                    onSwapPlayer={(player) => {
                      // Set the current player for suggestions
                      setSelectedPlayerForSwap(player);
                      setLoadingPlayerSuggestions(true);
                      
                      // Find available players of the same position who are not in the team
                      const availableReplacements = allFormattedPlayers.filter(p => 
                        p.position === player.position && 
                        p.id !== player.id && 
                        !myTeam.some(teamPlayer => teamPlayer.id === p.id)
                      );
                      
                      // Sort by predicted points (highest first)
                      const sortedReplacements = [...availableReplacements].sort((a, b) => 
                        (b.predicted_points || 0) - (a.predicted_points || 0)
                      );
                      
                      // Take up to 5 players with better predicted points than the current player
                      const betterPlayers = sortedReplacements
                        .filter(p => (p.predicted_points || 0) > (player.predicted_points || 0))
                        .slice(0, 5);
                      
                      // If we don't have 5 better players, just take the top 5 anyway
                      const suggestions = betterPlayers.length >= 3 
                        ? betterPlayers 
                        : sortedReplacements.slice(0, 5);
                      
                      // Format as TeamSuggestion objects
                      const formattedSuggestions = suggestions.map(suggestion => ({
                        playerOut: player,
                        playerIn: suggestion,
                        pointsImprovement: (suggestion.predicted_points || 0) - (player.predicted_points || 0),
                        costDifference: ((suggestion.now_cost || 0) / 10) - ((player.now_cost || 0) / 10)
                      }));
                      
                      setPlayerSpecificSuggestions(formattedSuggestions);
                      setLoadingPlayerSuggestions(false);
                      
                      // Show a popup with player suggestions - create a modal or overlay
                      // directly instead of trying to trigger Popover from here
                      setShowSuggestions(true);
                    }}
                  />
                  
                  {/* Add a modal for swap suggestions when triggered from the field view */}
                  {showSuggestions && selectedPlayerForSwap && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full mx-4">
                        <div className="bg-blue-500 dark:bg-blue-700 text-white p-3 rounded-t-lg flex justify-between items-center">
                          <h3 className="font-medium">Replace {selectedPlayerForSwap.web_name}</h3>
                          <button 
                            onClick={() => setShowSuggestions(false)}
                            className="p-1 rounded-full hover:bg-blue-600 transition-colors"
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        </div>
                        
                        <div className="p-4 max-h-[70vh] overflow-y-auto">
                          {loadingPlayerSuggestions ? (
                            <div className="text-center py-6">
                              <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-600 mb-2"></div>
                              <p className="text-gray-600 dark:text-gray-300">Finding better options...</p>
                            </div>
                          ) : playerSpecificSuggestions.length === 0 ? (
                            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                              <p>No better players found for this position.</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {playerSpecificSuggestions.map((suggestion, index) => (
                                <div 
                                  key={index} 
                                  className="bg-gray-50 dark:bg-slate-700 rounded p-3 border border-gray-200 dark:border-slate-600 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                  onClick={() => {
                                    removePlayer(selectedPlayerForSwap.id);
                                    handleAddPlayer(suggestion.playerIn.id);
                                    setShowSuggestions(false);
                                  }}
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1">
                                      <div className="flex items-center">
                                        <img 
                                          src={`/images/players/${suggestion.playerIn.code}.png`}
                                          alt={suggestion.playerIn.web_name}
                                          className="w-8 h-8 object-cover rounded-full mr-2"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).src = '/images/player-placeholder.png';
                                          }}
                                        />
                                        <div>
                                          <div className="font-medium">{suggestion.playerIn.web_name}</div>
                                          <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {suggestion.playerIn.team_short_name} • {suggestion.playerIn.position}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                      <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                        suggestion.pointsImprovement > 0 
                                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                                      }`}>
                                        {suggestion.pointsImprovement > 0 ? '+' : ''}{suggestion.pointsImprovement.toFixed(1)} pts
                                      </div>
                                      <div className={`mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                        suggestion.costDifference > 0 
                                          ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' 
                                          : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                      }`}>
                                        {suggestion.costDifference > 0 ? '+' : ''}{suggestion.costDifference.toFixed(1)}m
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <button 
                                    className="w-full py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors text-sm"
                                  >
                                    Make Transfer
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </Tab.Panel>
                <Tab.Panel>
                  <div className="space-y-4">
                    {Object.entries(teamByPosition).map(([position, players]) => (
                      <div key={position}>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-gray-800 dark:text-white">
                            {position === 'GKP' ? 'Goalkeepers' : 
                             position === 'DEF' ? 'Defenders' : 
                             position === 'MID' ? 'Midfielders' : 'Forwards'}
                          </h3>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {players.length}/{FORMATION_CONSTRAINTS[position as keyof typeof FORMATION_CONSTRAINTS].max}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {players.map(player => (
                            <div 
                              key={player.id}
                              className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-700 rounded-md"
                            >
                              <div>
                                <div className="font-medium text-gray-800 dark:text-white text-sm">{player.web_name}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{player.team_short_name}</div>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="text-right">
                                  <div className="font-semibold text-gray-800 dark:text-gray-200 text-sm">£{((player.now_cost || 0) / 10).toFixed(1)}m</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {player.predicted_points 
                                      ? <span className="text-green-600 dark:text-green-400">{player.predicted_points.toFixed(1)} pts</span>
                                      : <span>{player.total_points} pts</span>
                                    }
                                  </div>
                                </div>
                                {renderPlayerSwapButton(player)}
                                <button
                                  onClick={() => removePlayer(player.id)}
                                  className="p-1 rounded-full bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 text-gray-500 dark:text-gray-300"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))}
                          {players.length === 0 && (
                            <div className="p-2 bg-gray-50 dark:bg-slate-700 rounded-md text-gray-500 dark:text-gray-400 text-center text-sm">
                              No {position === 'GKP' ? 'goalkeeper' : position === 'DEF' ? 'defender' : position === 'MID' ? 'midfielder' : 'forward'} selected
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Tab.Panel>
              </Tab.Panels>
            </Tab.Group>
            
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md text-blue-800 dark:text-blue-300">
              <div className="flex justify-between items-center">
                <div>Team Cost:</div>
                <div className="font-semibold">£{teamCost.toFixed(1)}m</div>
              </div>
              <div className="flex justify-between items-center">
                <div>Budget Remaining:</div>
                <div className="font-semibold">£{remainingBudget.toFixed(1)}m</div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-slate-900 rounded-lg">
            {renderPlayerSelection()}
          </div>
        </div>
      </div>
    </div>
  );
}