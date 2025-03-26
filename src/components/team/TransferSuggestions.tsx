import React from 'react';
import { useTeam } from '@/lib/contexts/TeamContext';
import PlayerCard from './PlayerCard';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

export default function TransferSuggestions() {
  const { suggestions, getSuggestions, myTeam } = useTeam();
  
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
            onClick={getSuggestions}
            className="px-4 py-2 bg-white text-blue-600 hover:bg-blue-50 rounded-md text-sm font-medium"
          >
            Generate Suggestions
          </button>
        </div>
      </div>
      
      <div className="p-4">
        {suggestions.length === 0 ? (
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
      </div>
    </div>
  );
} 