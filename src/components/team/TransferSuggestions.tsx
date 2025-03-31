import React, { useEffect, useState, useCallback } from 'react';
import { useTeam } from '@/lib/contexts/TeamContext';
import PlayerCard from './PlayerCard';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { TeamPlayer, ExtendedPlayer } from '@/lib/utils/teamBuilder';

export default function TransferSuggestions() {
  const { 
    suggestions,
    getSuggestions, 
    myTeam, 
    loadingSuggestions, 
    teamCost, 
    bank, 
    actualBudget,
    swapPlayer
  } = useTeam();
  
  // Track successful transfers to force UI update
  const [lastTransfer, setLastTransfer] = useState<{from: string, to: string} | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);
  
  // Debug log bank value changes
  useEffect(() => {
    // No console log needed
  }, [bank]);
  
  // Force a refresh of suggestions after successful transfer
  useEffect(() => {
    if (lastTransfer) {
      // No console log needed
      getSuggestions();
      
      // Clear transfer status after a delay
      const timer = setTimeout(() => {
        setLastTransfer(null);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [lastTransfer, getSuggestions]);
  
  // Clear error message after 5 seconds
  useEffect(() => {
    if (transferError) {
      const timer = setTimeout(() => {
        setTransferError(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [transferError]);
  
  // Only enable the suggestion button if we have at least one player
  const canGenerateSuggestions = myTeam.length > 0;
  
  // Calculate the maximum budget based on available information
  const maxBudgetDisplay = bank !== null && teamCost ? 
    `£${(bank + teamCost).toFixed(1)}m` : 
    actualBudget ? `£${actualBudget.toFixed(1)}m` : '£100.0m';
  
  // Handle making the transfer
  const handleMakeTransfer = useCallback((outPlayer: TeamPlayer, inPlayer: TeamPlayer) => {
    // Clear any previous error
    setTransferError(null);
    
    // Calculate the budget impact based on selling price vs purchase price
    const outgoingPlayerSP = typeof outPlayer.selling_price === 'number' 
      ? outPlayer.selling_price  // Use the calculated selling price
      : ((outPlayer.now_cost || 0) / 10); // Fallback to current price
    
    const incomingPlayerPP = ((inPlayer.now_cost || 0) / 10); // Always use the current price
    
    // Calculate the price difference - positive means we gain money, negative means we spend
    const priceDifference = outgoingPlayerSP - incomingPlayerPP;
    
    // Calculate the expected new bank value
    const expectedNewBank = bank !== null 
      ? bank + priceDifference
      : null;
    
    // Convert TeamPlayer to ExtendedPlayer for the swapPlayer function
    const extendedPlayer: ExtendedPlayer = {
      id: inPlayer.id,
      code: inPlayer.code || 0,
      web_name: inPlayer.web_name,
      team: inPlayer.team || 0,
      element_type: inPlayer.element_type,
      now_cost: inPlayer.now_cost || 0,
      selling_price: undefined, // Don't set a selling price for incoming player
      purchase_price: incomingPlayerPP, // Set purchase price to current price for regular transfers
      // Add required ExtendedPlayer fields
      total_points: inPlayer.total_points || 0,
      goals_scored: 0,
      assists: 0,
      clean_sheets: 0,
      minutes: 0,
      form: inPlayer.form || "0",
      points_per_game: "0",
      selected_by_percent: "0",
      status: "",
      chance_of_playing_next_round: null
    };
    
    try {
      // Perform the swap which will handle the budget adjustment internally
      const result = swapPlayer(outPlayer.id, extendedPlayer);
      
      if (!result.success && result.message) {
        setTransferError(result.message);
      } else {
        // Update last transfer to trigger UI refresh
        setLastTransfer({
          from: outPlayer.web_name,
          to: inPlayer.web_name
        });
      }
    } catch (error) {
      console.error("Error performing transfer:", error);
      setTransferError("An unexpected error occurred during the transfer.");
    }
  }, [bank, swapPlayer, teamCost, actualBudget]);
  
  if (!canGenerateSuggestions) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4">
        <h2 className="text-xl font-bold mb-4 dark:text-white">Transfer Suggestions</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Add players to your team to get transfer suggestions.
        </p>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
      <div className="p-4 bg-blue-600 dark:bg-blue-700 text-white">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Transfer Suggestions</h2>
          <div className="flex items-center space-x-2">
            {/* Display bank balance prominently */}
            <div className="text-sm bg-white/20 px-3 py-1 rounded">
              Bank: £{bank !== null ? bank.toFixed(1) : '0.0'}m
            </div>
            <button 
              onClick={() => {
                // No console log needed
                getSuggestions();
              }}
              disabled={loadingSuggestions}
              className={`px-4 py-2 bg-white text-blue-600 hover:bg-blue-50 dark:bg-slate-700 dark:text-blue-300 dark:hover:bg-slate-600 rounded-md text-sm font-medium flex items-center ${
                loadingSuggestions ? 'opacity-70 cursor-wait' : ''
              }`}
            >
              {loadingSuggestions ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600 dark:text-blue-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                'Generate Suggestions'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Show transfer error if any */}
      {transferError && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700 dark:text-red-300">{transferError}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Show success message for last transfer */}
      {lastTransfer && (
        <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-green-700 dark:text-green-300">
                Successfully transferred {lastTransfer.from} to {lastTransfer.to}!
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Show info about team status */}
      <div className="p-4 border-b dark:border-slate-700">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="block text-gray-500 dark:text-gray-400">Team Size</span>
            <span className="font-medium dark:text-white">{myTeam.length} / 15</span>
          </div>
          <div>
            <span className="block text-gray-500 dark:text-gray-400">Team Value</span>
            <span className="font-medium dark:text-white">£{teamCost ? teamCost.toFixed(1) : '0.0'}m</span>
          </div>
          <div>
            <span className="block text-gray-500 dark:text-gray-400">Bank</span>
            <span className="font-medium dark:text-white">£{bank !== null ? bank.toFixed(1) : '0.0'}m</span>
          </div>
          <div>
            <span className="block text-gray-500 dark:text-gray-400">Total Budget</span>
            <span className="font-medium dark:text-white">{maxBudgetDisplay}</span>
          </div>
        </div>
      </div>
      
      {loadingSuggestions ? (
        <div className="p-8 flex justify-center">
          <div className="text-center">
            <svg className="animate-spin h-10 w-10 text-blue-600 dark:text-blue-300 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4 text-lg font-medium text-gray-700 dark:text-gray-300">Analyzing potential transfers...</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">This may take a moment</p>
          </div>
        </div>
      ) : suggestions.length > 0 ? (
        <div className="overflow-auto max-h-[70vh]">
          {suggestions.map((suggestion, index) => (
            <div key={`${suggestion.playerOut.id}-${suggestion.playerIn.id}`} 
                 className={`p-4 grid grid-cols-1 md:grid-cols-7 items-center gap-2 
                            ${index % 2 === 0 ? 'bg-gray-50 dark:bg-slate-750' : 'bg-white dark:bg-slate-800'}`}>
              
              {/* Left side - player leaving */}
              <div className="md:col-span-3">
                <PlayerCard 
                  player={suggestion.playerOut} 
                  showRemove={false} 
                  highlight={true}
                  className="text-sm"
                />
              </div>
              
              {/* Middle - transfer details */}
              <div className="flex flex-col items-center justify-center md:col-span-1">
                <ArrowRightIcon className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                <div className={`text-sm font-medium mt-1 rounded px-2 py-1
                                ${suggestion.costDifference > 0 
                                  ? 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/20' 
                                  : suggestion.costDifference < 0 
                                    ? 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/20'
                                    : 'text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-gray-700/30'}`}>
                  {suggestion.costDifference > 0 
                    ? `+£${suggestion.costDifference.toFixed(1)}m` 
                    : suggestion.costDifference < 0 
                      ? `-£${Math.abs(suggestion.costDifference).toFixed(1)}m`
                      : '£0.0m'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {suggestion.pointsImprovement > 0 
                    ? `+${suggestion.pointsImprovement.toFixed(1)} pts` 
                    : suggestion.pointsImprovement < 0 
                      ? `${suggestion.pointsImprovement.toFixed(1)} pts`
                      : '0 pts'}
                </div>
              </div>
              
              {/* Right side - player coming in */}
              <div className="md:col-span-3 relative">
                <PlayerCard 
                  player={suggestion.playerIn} 
                  showRemove={false}
                  highlight={true}
                  className="text-sm"
                />
                <button
                  onClick={() => handleMakeTransfer(suggestion.playerOut, suggestion.playerIn)}
                  className="mt-2 w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md
                             dark:bg-blue-700 dark:hover:bg-blue-600 transition duration-150 ease-in-out"
                >
                  Complete Transfer
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-6 text-center">
          <p className="text-gray-600 dark:text-gray-300">
            No transfer suggestions available. Click 'Generate Suggestions' to analyze possible transfers.
          </p>
        </div>
      )}
    </div>
  );
} 