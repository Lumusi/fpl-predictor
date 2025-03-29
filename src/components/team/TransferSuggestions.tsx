import React from 'react';
import { useTeam } from '@/lib/contexts/TeamContext';
import PlayerCard from './PlayerCard';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

export default function TransferSuggestions() {
  const { suggestions, getSuggestions, myTeam, loadingSuggestions } = useTeam();
  
  // Only enable the suggestion button if we have at least one player
  const canGenerateSuggestions = myTeam.length > 0;
  
  if (!canGenerateSuggestions) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <h2 className="text-xl font-bold mb-4">Transfer Suggestions</h2>
        <p className="text-gray-600">
          Add players to your team to get transfer suggestions.
        </p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 bg-blue-600 text-white">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Transfer Suggestions</h2>
          <button
            onClick={() => {
              console.log("Generate Suggestions clicked from TransferSuggestions");
              getSuggestions();
            }}
            disabled={loadingSuggestions}
            className={`px-4 py-2 bg-white text-blue-600 hover:bg-blue-50 rounded-md text-sm font-medium flex items-center ${
              loadingSuggestions ? 'opacity-70 cursor-wait' : ''
            }`}
          >
            {loadingSuggestions ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
      
      <div className="p-4">
        {loadingSuggestions ? (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mb-2"></div>
            <p className="text-gray-600">Generating suggestions...</p>
            <p className="text-xs text-gray-500 mt-1">This may take a moment</p>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            Click the button above to generate transfer suggestions based on predicted points.
          </div>
        ) : (
          <div className="space-y-4">
            {suggestions.map((suggestion, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center mb-2">
                  <div className="text-xs font-medium text-blue-600 px-2 py-1 bg-blue-50 rounded-full">
                    +{suggestion.pointsImprovement.toFixed(2)} pts
                  </div>
                  <div className="ml-2 text-xs font-medium text-gray-500 px-2 py-1 bg-gray-50 rounded-full">
                    {suggestion.costDifference > 0 
                      ? `Cost: +£${suggestion.costDifference.toFixed(1)}m` 
                      : `Cost: £${suggestion.costDifference.toFixed(1)}m`}
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <div className="w-full sm:w-5/12">
                    <PlayerCard 
                      player={suggestion.playerOut} 
                      showRemove={false}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {suggestion.playerOut.team_short_name} • {suggestion.playerOut.position} • 
                      £{((suggestion.playerOut.now_cost || 0) / 10).toFixed(1)}m • 
                      {suggestion.playerOut.predicted_points === 0 ? (
                        <span className="text-amber-500">No prediction</span>
                      ) : (
                        `${suggestion.playerOut.predicted_points?.toFixed(1) || 0} pts`
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center w-full sm:w-2/12">
                    <ArrowRightIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  
                  <div className="w-full sm:w-5/12">
                    <PlayerCard 
                      player={suggestion.playerIn} 
                      showRemove={false}
                      highlight={true}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {suggestion.playerIn.team_short_name} • {suggestion.playerIn.position} • 
                      £{((suggestion.playerIn.now_cost || 0) / 10).toFixed(1)}m • 
                      {suggestion.playerIn.predicted_points?.toFixed(1) || 0} pts
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {suggestions.length > 0 && (
              <div className="bg-blue-50 p-3 text-sm text-blue-800 rounded-md">
                <p><strong>Note:</strong> Suggestions are based on predicted points for upcoming fixtures.</p>
                <p className="mt-1">Transfers shown are always players not currently in your team.</p>
                <p className="mt-1">Consider team balance, fixtures, and other factors when making transfers.</p>
              </div>
            )}
          </div>
        )}
        
        {!loadingSuggestions && suggestions.length === 0 && myTeam.length > 0 && (
          <div className="bg-orange-50 p-3 text-sm text-orange-800 rounded-md mt-4">
            <p><strong>No suggestions found?</strong> This could mean:</p>
            <ul className="list-disc pl-5 mt-1">
              <li>No available players would improve your predicted points</li>
              <li>Your team is already well-optimized</li>
              <li>Try removing a player to make room for different options</li>
            </ul>
            <p className="mt-2">
              Note: The system is looking for players that provide better predicted points within your total team budget (£100m).
            </p>
            <p className="mt-1">
              You can always manually select players through the Player Selection panel.
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 