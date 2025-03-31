import React, { useState, useCallback, useMemo, Fragment, useEffect } from 'react';
import { useTeam } from '@/lib/contexts/TeamContext';
import { FORMATION_CONSTRAINTS, POSITION_ID_MAP, ExtendedPlayer, MAX_BUDGET } from '@/lib/utils/teamBuilder';
import PlayerCard from './PlayerCard';
import { Tab } from '@headlessui/react';
import FieldView from './FieldView';
import { XMarkIcon, ArrowsRightLeftIcon, ArrowRightIcon, ArrowDownOnSquareIcon } from '@heroicons/react/24/outline';
import { Popover, Transition, Dialog } from '@headlessui/react';
import { TeamPlayer, TeamSuggestion } from '@/lib/utils/teamBuilder';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import ImportTeamModal from './ImportTeamModal';

// Simple Button component
const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'default' | 'outline' | 'ghost'
  }
>(({ className, variant = 'default', ...props }, ref) => {
  const variantClasses = {
    default: 'bg-blue-600 hover:bg-blue-700 text-white',
    outline: 'border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800',
    ghost: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
  };
  
  return (
    <button
      ref={ref}
      className={`px-4 py-2 rounded-md font-medium transition-colors ${variantClasses[variant]} ${className || ''}`}
      {...props}
    />
  );
});

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function TeamBuilder() {
  const { 
    myTeam, 
    allFormattedPlayers, 
    addPlayer, 
    removePlayer, 
    swapPlayer,
    clearTeam,
    remainingBudget, 
    teamCost,
    loadingTeam,
    loadingSuggestions,
    suggestions,
    getSuggestions,
    bank,
    teamValue,
    actualBudget,
    importingTeam
  } = useTeam();
  
  // Add a force refresh counter
  const [refreshCounter, setRefreshCounter] = useState(0);
  const forceRefresh = useCallback(() => {
    setRefreshCounter(prev => prev + 1);
  }, []);
  
  // Update persisted budget initialization
  const [persistedBudget, setPersistedBudget] = useState<number>(bank !== null ? bank : MAX_BUDGET);
  
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
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Group players by position - memoized to prevent recalculation
  const teamByPosition = useMemo(() => {
    return Object.keys(FORMATION_CONSTRAINTS).reduce((acc, position) => {
      acc[position] = myTeam.filter(player => player.position === position);
      return acc;
    }, {} as Record<string, typeof myTeam>);
  }, [myTeam]);
  
  // Memoize the current budget calculation for consistency across component
  const currentBudget = useMemo(() => {
    // First choice: use the persisted budget value which we control
    // Second choice: use the bank value from context
    // Last resort: calculate from MAX_BUDGET - teamCost
    const calculatedBudget = persistedBudget !== MAX_BUDGET 
      ? persistedBudget  
      : (bank !== null ? bank : MAX_BUDGET - teamCost);
    
    return calculatedBudget;
  }, [persistedBudget, bank, teamCost]);
  
  // Handle player selection - use useCallback to memoize this function
  const handleAddPlayer = useCallback((playerId: number) => {
    // Find the player in the original players array from the context
    const player = allFormattedPlayers.find(p => p.id === playerId);
    if (player) {
      // Calculate the correct price to use
      const playerPrice = player.price || (player.now_cost ? player.now_cost / 10 : 0);
      
      // For newly added players, don't set selling_price - let the TeamContext handle it
      // This ensures their selling price will initially be equal to their current price
      // Convert back to Player type - find the raw player that matches this ID
      const result = addPlayer({
        id: player.id,
        code: player.code || 0,
        web_name: player.web_name,
        team: player.team || 0,
        element_type: player.element_type,
        now_cost: player.now_cost || 0, // Make sure now_cost is set to ensure price can be calculated
        // Explicitly set the price value to make sure it's not 0
        price: playerPrice,
        // Don't include selling_price here - let the TeamContext set it based on current price
        // selling_price: undefined,
        // purchase_price: undefined,
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
      } as ExtendedPlayer);
      
      // If player was added successfully, update our local bank tracking state
      if (result.success && bank !== null) {
        const newBankValue = bank - playerPrice; // Use the calculated price
        setPersistedBudget(newBankValue);  // Update persisted budget immediately
        forceRefresh(); // Force refresh after player added
      }
      
      if (!result.success && result.message) {
        setErrorMessage(result.message);
        // Clear error after 3 seconds
        setTimeout(() => setErrorMessage(null), 3000);
      }
    }
  }, [addPlayer, allFormattedPlayers, bank, persistedBudget, setPersistedBudget, forceRefresh]);
  
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
      
      // Get player sell value (use selling_price if available)
      const playerSellValue = typeof player.selling_price === 'number' ? player.selling_price : player.price;
      
      // Format as TeamSuggestion objects with correct budget calculations
      const formattedSuggestions = suggestions.map(suggestion => {
        // Get the current price (PP) of the incoming player - this is always now_cost/10
        const incomingPlayerPP = suggestion.price || (suggestion.now_cost || 0) / 10;
        
        // Get the selling price (SP) of the outgoing player
        const outgoingPlayerSP = playerSellValue;
        
        // Calculate price difference - positive means we gain money, negative means we spend
        const costDifference = outgoingPlayerSP - incomingPlayerPP;
        
        return {
          playerOut: player,
          playerIn: suggestion,
          pointsImprovement: (suggestion.predicted_points || 0) - (player.predicted_points || 0),
          costDifference: costDifference,
          costDifferenceLabel: costDifference > 0 
            ? `Bank +£${costDifference.toFixed(1)}m` 
            : `Bank -£${Math.abs(costDifference).toFixed(1)}m`
        };
      });
      
      setPlayerSpecificSuggestions(formattedSuggestions);
    } catch (error) {
      console.error("Error getting player suggestions:", error);
    } finally {
      setLoadingPlayerSuggestions(false);
    }
  }, [allFormattedPlayers, myTeam, bank]);
  
  // Function to render the player selection sidebar
  const renderPlayerSelection = () => {
    // Calculate the correct budget to display
    return (
      <div className="p-2 bg-gradient-to-b from-blue-700 to-blue-800 rounded-lg w-full h-full flex flex-col overflow-hidden">
        <div className="mb-1 flex-shrink-0">
          <h3 className="text-white font-semibold text-lg mb-1">Player Selection</h3>
          <div className="flex gap-2 mb-1">
            <div className="flex-1">
              <select 
                className="w-full p-1 rounded-md border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-white dark:bg-slate-700 text-xs"
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
            </div>
            
            <div className="flex-1">
              <select 
                className="w-full p-1 rounded-md border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-white dark:bg-slate-700 text-xs"
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
          </div>
          
          <div className="flex flex-col mb-1">
            <div className="flex justify-between items-center mb-0.5">
              <label className="text-white text-xs">Max cost: £{maxCost}m</label>
              <span className="text-white text-xs" key={`selection-budget-${refreshCounter}`}>
                Bank: £{currentBudget.toFixed(1)}m
              </span>
            </div>
            <input 
              type="range" 
              min="0.5" 
              max="15.0" 
              step="0.1" 
              value={maxCost}
              onChange={(e) => {
                setMaxCost(parseFloat(e.target.value));
                setCurrentPage(1); // Reset to first page on filter change
              }}
              className="w-full h-1.5 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
          
          <div className="relative mb-1">
            <input
              type="text"
              placeholder="Search player or team..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset to first page on search
              }}
              className="w-full p-1 pl-6 rounded-md border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-white dark:bg-slate-700 text-xs"
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <div className="flex items-center justify-between text-white text-xs mb-1 px-1">
            <span>{filteredPlayers.length} players</span>
            <span>Page {currentPage}/{totalPages || 1}</span>
          </div>
        </div>
        
        {/* Player list */}
        <div id="player-list" className="flex-1 overflow-y-auto bg-white/10 rounded-md min-h-0 max-h-[70vh] lg:max-h-none">
          {loadingTeam ? (
            <div className="h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
            </div>
          ) : currentPlayers.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-white text-sm">No players match your filters</p>
            </div>
          ) : (
            <div className="flex flex-col h-full p-1">
              {currentPlayers.map((player) => {
                // Check if the player is already in the team
                const isInTeam = myTeam.some(p => p.id === player.id);
                
                return (
                  <div 
                    key={player.id}
                    className={`flex items-stretch h-[calc(100%/20-2px)] my-[1px] rounded-md text-xs ${
                      isInTeam 
                        ? 'bg-blue-600/50 text-white border border-blue-400/50 cursor-not-allowed'
                        : 'bg-white/90 dark:bg-slate-700/90 text-gray-800 dark:text-white border border-transparent hover:border-blue-300 cursor-pointer'
                    }`}
                    onClick={() => {
                      if (!isInTeam) {
                        handleAddPlayer(player.id);
                      }
                    }}
                  >
                    <div className="flex flex-col justify-center px-2 overflow-hidden flex-1">
                      <div className="flex items-center space-x-1">
                        <div 
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            player.position === 'GKP' ? 'bg-yellow-500' :
                            player.position === 'DEF' ? 'bg-blue-500' :
                            player.position === 'MID' ? 'bg-green-500' :
                            'bg-red-500'
                          }`}
                        />
                        <div className="font-medium truncate">{player.web_name}</div>
                      </div>
                      <div className="text-gray-500 dark:text-gray-400 text-[9px] ml-2.5">
                        {player.team_short_name} • {player.position}
                      </div>
                    </div>
                    
                    <div className="flex flex-col justify-center items-end gap-0.5 flex-shrink-0 px-2">
                      {player.predicted_points !== undefined && (
                        <div className={`w-10 py-0.5 rounded text-[10px] text-center ${
                          player.predicted_points > 0 
                            ? 'bg-green-600/90 text-white' 
                            : 'bg-gray-500/80 text-white'
                        }`}>
                          {player.predicted_points.toFixed(1)}
                        </div>
                      )}
                      {renderPlayerPrice(player)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Pagination controls */}
        <div className="flex justify-between mt-2 pt-2 sticky bottom-0 bg-gradient-to-b from-blue-800 to-blue-900 rounded-b-lg">
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className={`px-3 py-1 text-xs rounded-md ${
              currentPage <= 1
                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-600'
            }`}
          >
            Previous
          </button>
          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className={`px-3 py-1 text-xs rounded-md ${
              currentPage >= totalPages
                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-600'
            }`}
          >
            Next
          </button>
        </div>
      </div>
    );
  };
  
  // New function to render the player price details
  const renderPlayerPrice = (player: TeamPlayer) => {
    // If selling price is available and not zero, show it
    if (player.selling_price !== undefined && player.selling_price > 0) {
      // When selling price differs from current value, show both
      if (player.price && player.selling_price !== player.price) {
        return (
          <div className="text-xs">
            <span className="font-medium">£{player.selling_price.toFixed(1)}m</span>
            <span className="text-gray-500 dark:text-gray-400 ml-1">(£{player.price.toFixed(1)}m)</span>
          </div>
        );
      } else {
        // Just show the selling price
        return (
          <div className="text-xs font-medium">
            £{player.selling_price.toFixed(1)}m
          </div>
        );
      }
    }
    
    // Fall back to showing the player's price or now_cost/10
    return (
      <div className="text-xs font-medium">
        £{player.price ? player.price.toFixed(1) : ((player.now_cost || 0) / 10).toFixed(1)}m
      </div>
    );
  };
  
  // Update the renderPlayerSwapButton to use selling_price
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
                
                // Get player sell value (use selling_price if available)
                const playerSellValue = typeof player.selling_price === 'number' ? player.selling_price : player.price;
                
                // Format as TeamSuggestion objects with correct budget calculations
                const formattedSuggestions = suggestions.map(suggestion => {
                  // Get the current price (PP) of the incoming player - this is always now_cost/10
                  const incomingPlayerPP = suggestion.price || (suggestion.now_cost || 0) / 10;
                  
                  // Get the selling price (SP) of the outgoing player
                  const outgoingPlayerSP = playerSellValue;
                  
                  // Calculate price difference - positive means we gain money, negative means we spend
                  const costDifference = outgoingPlayerSP - incomingPlayerPP;
                  
                  return {
                    playerOut: player,
                    playerIn: suggestion,
                    pointsImprovement: (suggestion.predicted_points || 0) - (player.predicted_points || 0),
                    costDifference: costDifference,
                    costDifferenceLabel: costDifference > 0 
                      ? `Bank +£${costDifference.toFixed(1)}m` 
                      : `Bank -£${Math.abs(costDifference).toFixed(1)}m`
                  };
                });
                
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
                  {/* Show selling price in the header */}
                  <div className="mb-2 px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded-md text-center text-xs text-gray-600 dark:text-gray-300">
                    <div className="font-medium">Selling price: £{typeof player.selling_price === 'number' && player.selling_price > 0 ? player.selling_price.toFixed(1) : player.price.toFixed(1)}m</div>
                    {typeof player.selling_price === 'number' && typeof player.price === 'number' && player.selling_price !== player.price && (
                      <div className="text-gray-500">Current value: £{player.price.toFixed(1)}m</div>
                    )}
                    {player.purchase_price && (
                      <div className="text-gray-500">Purchase price: £{player.purchase_price.toFixed(1)}m</div>
                    )}
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-200 dark:border-gray-600">
                      <div>FPL sell price calculation:</div>
                      <div className="mt-0.5 text-[10px]">
                        {player.purchase_price && player.price > player.purchase_price ? (
                          <>
                            PP: £{player.purchase_price.toFixed(1)}m + 50% profit (£{((player.price - player.purchase_price) * 0.5).toFixed(1)}m) = £{(player.purchase_price + Math.floor((player.price - player.purchase_price) * 0.5 * 10) / 10).toFixed(1)}m
                          </>
                        ) : player.purchase_price && player.price < player.purchase_price ? (
                          <>
                            Current price £{player.price.toFixed(1)}m is lower than purchase price £{player.purchase_price.toFixed(1)}m, so sell price equals current price
                          </>
                        ) : (
                          <>
                            Purchase price equals current price, so sell price is £{player.price.toFixed(1)}m
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-gray-500 mt-1 text-[10px]">Cost differences are calculated using selling price</div>
                  </div>
                  
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
                            // Use the swapPlayer function for atomic operation
                            if (selectedPlayerForSwap) {
                              // Get player sell value (use selling_price if available)
                              const outgoingPlayerSP = typeof selectedPlayerForSwap.selling_price === 'number' 
                                ? selectedPlayerForSwap.selling_price 
                                : selectedPlayerForSwap.price;
                              
                              // Get incoming player purchase price - always use current price
                              // Add a fallback price from the price property if now_cost isn't available
                              const incomingPlayerPP = suggestion.playerIn.price || (suggestion.playerIn.now_cost || 0) / 10;
                              
                              // Pre-calculate the new budget, don't wait for context update
                              const calculatedNewBudget = persistedBudget + outgoingPlayerSP - incomingPlayerPP;
                              
                              // Update the budget immediately before the swap to prevent flickering
                              setPersistedBudget(calculatedNewBudget);
                              
                              // Execute the swap
                              const swapResult = swapPlayer(selectedPlayerForSwap.id, {
                                id: suggestion.playerIn.id,
                                code: suggestion.playerIn.code || 0,
                                web_name: suggestion.playerIn.web_name,
                                team: suggestion.playerIn.team || 0,
                                element_type: suggestion.playerIn.element_type,
                                now_cost: suggestion.playerIn.now_cost || 0,
                                selling_price: undefined, // Don't set a selling price for incoming player
                                purchase_price: incomingPlayerPP, // Set purchase price to current price
                                // Include other required fields or use defaults
                                total_points: suggestion.playerIn.total_points || 0,
                                goals_scored: 0,
                                assists: 0,
                                clean_sheets: 0,
                                minutes: 0,
                                form: suggestion.playerIn.form || "0",
                                points_per_game: "0",
                                selected_by_percent: "0",
                                status: "",
                                chance_of_playing_next_round: null
                              } as ExtendedPlayer);
                              
                              // Handle the result
                              if (!swapResult.success && swapResult.message) {
                                setErrorMessage(swapResult.message);
                                // If swap failed, revert our budget calculation
                                setPersistedBudget(persistedBudget);
                                // Clear error after 3 seconds
                                setTimeout(() => setErrorMessage(null), 3000);
                              }
                              
                              // Add verification check after swap to see if budget is correct
                              setTimeout(() => {
                                // Console logs removed for production
                              }, 10);
                              
                              // Update the UI after swap
                              forceRefresh();
                            }
                            
                            close(); // Close the popover after selection
                          }}
                        >
                          <div className="flex items-center mb-1">
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
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                              }`}>
                                Bank {suggestion.costDifference > 0 
                                  ? `+£${suggestion.costDifference.toFixed(1)}m` 
                                  : `-£${Math.abs(suggestion.costDifference).toFixed(1)}m`}
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
              </Popover.Panel>
            </Transition>
          </>
        )}
      </Popover>
    );
  };
  
  // Update the team stats display at the bottom of the component
  const renderTeamStats = () => {
    return (
      <div className="mt-3 mb-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md text-blue-800 dark:text-blue-300">
        <div className="flex justify-between items-center">
          <div>Team Cost:</div>
          <div className="font-semibold">£{teamCost.toFixed(1)}m</div>
        </div>
        <div className="flex justify-between items-center">
          <div>Budget Remaining:</div>
          <div className="font-semibold" key={`budget-${refreshCounter}`}>£{currentBudget.toFixed(1)}m</div>
        </div>
        
        {/* Add an import button */}
        <button
          onClick={() => setShowImportModal(true)}
          className="mt-3 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm flex items-center justify-center"
          disabled={importingTeam}
        >
          {importingTeam ? (
            <>
              <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
              Importing Team...
            </>
          ) : (
            <>
              <ArrowDownOnSquareIcon className="h-4 w-4 mr-2" />
              Import Your FPL Team
            </>
          )}
        </button>
      </div>
    );
  };
  
  // Add a helper function to handle player removal
  const handleRemovePlayer = useCallback((playerId: number) => {
    // Find the player we're removing to calculate the new bank value
    const playerToRemove = myTeam.find(player => player.id === playerId);
    
    if (playerToRemove && bank !== null) {
      // When removing a player, always use selling_price if available
      const playerValue = playerToRemove.selling_price !== undefined 
        ? playerToRemove.selling_price 
        : playerToRemove.price;
      
      // Execute the removal
      removePlayer(playerId);
      
      // Update our local tracking state for bank
      const newBankValue = bank + playerValue;
      setPersistedBudget(newBankValue);  // Update persisted budget immediately
      forceRefresh(); // Force refresh after player removed
    } else {
      // If we can't find the player or don't have bank info, just remove without updating local state
      removePlayer(playerId);
    }
  }, [myTeam, bank, removePlayer, setPersistedBudget, forceRefresh, persistedBudget]);
  
  // In the clearTeam handler, update to use setPersistedBudget instead of setLastBankUpdate
  const handleClearTeam = () => {
    clearTeam();
    setPersistedBudget(MAX_BUDGET); // Reset persisted budget to default
    forceRefresh();
  };
  
  if (loadingTeam) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div className="w-full flex flex-col lg:flex-row gap-4 min-h-screen overflow-visible mb-16">
      {errorMessage && (
        <div className="absolute top-20 left-0 right-0 mx-auto w-96 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md shadow-lg z-50">
          <span className="block sm:inline">{errorMessage}</span>
        </div>
      )}
      
      {/* Team actions and stats */}
      <div className="flex flex-col flex-1">
        {/* Main content area */}
        <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-lg shadow-md flex-1 overflow-visible flex flex-col pb-6">
          <Tab.Group>
            <div className="flex justify-between items-center mb-2">
              <Tab.List className="flex space-x-1 rounded-xl bg-blue-50 dark:bg-slate-700 p-0.5">
                <Tab
                  className={({ selected }) =>
                    classNames(
                      'w-full rounded-lg py-1.5 text-sm font-medium leading-5 text-blue-700 dark:text-white',
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
                      'w-full rounded-lg py-1.5 text-sm font-medium leading-5 text-blue-700 dark:text-white',
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
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleClearTeam}
                  className="bg-red-500 hover:bg-red-600 text-white rounded-md px-2 py-1 text-xs flex items-center"
                >
                  <XMarkIcon className="h-3.5 w-3.5 mr-1" /> Clear
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-visible flex flex-col">
              <Tab.Panels className="flex-1 flex flex-col overflow-visible">
                <Tab.Panel className="h-full flex flex-col overflow-visible">
                  <div className="flex flex-col lg:flex-row flex-1 overflow-visible">
                    <div className="flex-1 overflow-visible">
                      <FieldView 
                        team={myTeam} 
                        onRemovePlayer={handleRemovePlayer} 
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
                          
                          // Get player sell value (use selling_price if available)
                          const playerSellValue = typeof player.selling_price === 'number' ? player.selling_price : player.price;
                          
                          // Format as TeamSuggestion objects with correct budget calculations
                          const formattedSuggestions = suggestions.map(suggestion => {
                            // Get the current price (PP) of the incoming player - this is always now_cost/10
                            const incomingPlayerPP = suggestion.price || (suggestion.now_cost || 0) / 10;
                            
                            // Get the selling price (SP) of the outgoing player
                            const outgoingPlayerSP = playerSellValue;
                            
                            // Calculate price difference - positive means we gain money, negative means we spend
                            const costDifference = outgoingPlayerSP - incomingPlayerPP;
                            
                            return {
                              playerOut: player,
                              playerIn: suggestion,
                              pointsImprovement: (suggestion.predicted_points || 0) - (player.predicted_points || 0),
                              costDifference: costDifference,
                              costDifferenceLabel: costDifference > 0 
                                ? `Bank +£${costDifference.toFixed(1)}m` 
                                : `Bank -£${Math.abs(costDifference).toFixed(1)}m`
                            };
                          });
                          
                          setPlayerSpecificSuggestions(formattedSuggestions);
                          setLoadingPlayerSuggestions(false);
                          
                          // Show a popup with player suggestions - create a modal or overlay
                          setShowSuggestions(true);
                        }}
                      />
                    </div>
                    <div className="lg:w-72 xl:w-80 lg:ml-4 flex-none h-full" key={`player-selection-${refreshCounter}`}>
                      {renderPlayerSelection()}
                    </div>
                  </div>
                  
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
                          {/* Show selling price information */}
                          <div className="mb-3 text-center px-3 py-2 bg-gray-100 dark:bg-slate-700 rounded-md text-sm text-gray-600 dark:text-gray-300">
                            <div className="font-medium">Selling price: £{typeof selectedPlayerForSwap.selling_price === 'number' && selectedPlayerForSwap.selling_price > 0 ? selectedPlayerForSwap.selling_price.toFixed(1) : selectedPlayerForSwap.price.toFixed(1)}m</div>
                            {typeof selectedPlayerForSwap.selling_price === 'number' && typeof selectedPlayerForSwap.price === 'number' && selectedPlayerForSwap.selling_price !== selectedPlayerForSwap.price && (
                              <div className="text-gray-500">Current value: £{selectedPlayerForSwap.price.toFixed(1)}m</div>
                            )}
                            {selectedPlayerForSwap.purchase_price && (
                              <div className="text-gray-500">Purchase price: £{selectedPlayerForSwap.purchase_price.toFixed(1)}m</div>
                            )}
                            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-200 dark:border-gray-600">
                              <div>FPL sell price calculation:</div>
                              <div className="mt-0.5 text-[10px]">
                                {selectedPlayerForSwap.purchase_price && selectedPlayerForSwap.price > selectedPlayerForSwap.purchase_price ? (
                                  <>
                                    PP: £{selectedPlayerForSwap.purchase_price.toFixed(1)}m + 50% profit (£{((selectedPlayerForSwap.price - selectedPlayerForSwap.purchase_price) * 0.5).toFixed(1)}m) = £{(selectedPlayerForSwap.purchase_price + Math.floor((selectedPlayerForSwap.price - selectedPlayerForSwap.purchase_price) * 0.5 * 10) / 10).toFixed(1)}m
                                  </>
                                ) : selectedPlayerForSwap.purchase_price && selectedPlayerForSwap.price < selectedPlayerForSwap.purchase_price ? (
                                  <>
                                    Current price £{selectedPlayerForSwap.price.toFixed(1)}m is lower than purchase price £{selectedPlayerForSwap.purchase_price.toFixed(1)}m, so sell price equals current price
                                  </>
                                ) : (
                                  <>
                                    Purchase price equals current price, so sell price is £{selectedPlayerForSwap.price.toFixed(1)}m
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          
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
                                    // Use the swapPlayer function for atomic operation
                                    if (selectedPlayerForSwap) {
                                      // Get player sell value (use selling_price if available)
                                      const outgoingPlayerSP = typeof selectedPlayerForSwap.selling_price === 'number' 
                                        ? selectedPlayerForSwap.selling_price 
                                        : selectedPlayerForSwap.price;
                                      
                                      // Get incoming player purchase price - always use current price
                                      // Add a fallback price from the price property if now_cost isn't available
                                      const incomingPlayerPP = suggestion.playerIn.price || (suggestion.playerIn.now_cost || 0) / 10;
                                      
                                      // Pre-calculate the new budget, don't wait for context update
                                      const calculatedNewBudget = persistedBudget + outgoingPlayerSP - incomingPlayerPP;
                                      
                                      // Update the budget immediately before the swap to prevent flickering
                                      setPersistedBudget(calculatedNewBudget);
                                      
                                      // Execute the swap
                                      const swapResult = swapPlayer(selectedPlayerForSwap.id, {
                                        id: suggestion.playerIn.id,
                                        code: suggestion.playerIn.code || 0,
                                        web_name: suggestion.playerIn.web_name,
                                        team: suggestion.playerIn.team || 0,
                                        element_type: suggestion.playerIn.element_type,
                                        now_cost: suggestion.playerIn.now_cost || 0,
                                        selling_price: undefined, // Don't set a selling price for incoming player
                                        purchase_price: incomingPlayerPP, // Set purchase price to current price
                                        // Include other required fields or use defaults
                                        total_points: suggestion.playerIn.total_points || 0,
                                        goals_scored: 0,
                                        assists: 0,
                                        clean_sheets: 0,
                                        minutes: 0,
                                        form: suggestion.playerIn.form || "0",
                                        points_per_game: "0",
                                        selected_by_percent: "0",
                                        status: "",
                                        chance_of_playing_next_round: null
                                      } as ExtendedPlayer);
                                      
                                      // Handle the result
                                      if (!swapResult.success && swapResult.message) {
                                        setErrorMessage(swapResult.message);
                                        // If swap failed, revert our budget calculation
                                        setPersistedBudget(persistedBudget);
                                        // Clear error after 3 seconds
                                        setTimeout(() => setErrorMessage(null), 3000);
                                      }
                                      
                                      // Add verification check after swap to see if budget is correct
                                      setTimeout(() => {
                                        // Console logs removed for production
                                      }, 10);
                                      
                                      // Update the UI after swap
                                      forceRefresh();
                                    }
                                    
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
                                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                                          : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                      }`}>
                                        Bank {suggestion.costDifference > 0 
                                          ? `+£${suggestion.costDifference.toFixed(1)}m` 
                                          : `-£${Math.abs(suggestion.costDifference).toFixed(1)}m`}
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
                <Tab.Panel className="h-full overflow-visible">
                  <div className="flex flex-col lg:flex-row h-full overflow-visible">
                    <div className="flex-1 overflow-auto">
                      <div className="space-y-4 pb-4">
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
                                      {renderPlayerPrice(player)}
                                    </div>
                                    {renderPlayerSwapButton(player)}
                                    <button
                                      onClick={() => handleRemovePlayer(player.id)}
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
                    </div>
                    <div className="lg:w-80 lg:ml-4 mt-3 lg:mt-0 h-full" key={`player-selection-list-${refreshCounter}`}>
                      {renderPlayerSelection()}
                    </div>
                  </div>
                </Tab.Panel>
              </Tab.Panels>
            </div>
            
            <div key={`team-stats-${refreshCounter}`}>
              {renderTeamStats()}
            </div>
          </Tab.Group>
        </div>
      </div>
      
      {/* Import Team Modal */}
      <ImportTeamModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
    </div>
  );
}