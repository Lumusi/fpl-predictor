import React, { useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { PlayerPrediction } from '@/lib/utils/predictions';

interface PlayerPredictionTableProps {
  predictions: PlayerPrediction[];
  loading: boolean;
  title?: string;
}

export default function PlayerPredictionTable({ predictions, loading, title }: PlayerPredictionTableProps) {
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter predictions by position
  const filteredPredictions = predictions.filter(prediction => {
    // Filter by position if selected
    const matchesPosition = !selectedPosition || prediction.position === selectedPosition;
    
    // Filter by search query (player name or team)
    const matchesSearch = prediction.web_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (prediction.team_short_name && prediction.team_short_name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesPosition && matchesSearch;
  });
  
  // Skeleton loader for when data is loading
  const TableSkeleton = () => (
    <div className="animate-pulse">
      <div className="h-10 bg-gray-200 dark:bg-dark-card rounded-md mb-4 w-full"></div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-16 bg-gray-200 dark:bg-dark-card rounded-md mb-2 w-full"></div>
      ))}
    </div>
  );
  
  // If loading, show skeleton
  if (loading) {
    return (
      <div className="p-4">
        <TableSkeleton />
      </div>
    );
  }
  
  // Position buttons for filtering
  const positionButtons = [
    { label: 'All', value: null },
    { label: 'GKP', value: 'GKP' },
    { label: 'DEF', value: 'DEF' },
    { label: 'MID', value: 'MID' },
    { label: 'FWD', value: 'FWD' },
  ];
  
  return (
    <div className="w-full bg-light-card dark:bg-dark-card rounded-lg shadow-md overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-800 dark:to-blue-700 text-white">
        <h2 className="text-lg font-bold">{title || "Player Predictions"}</h2>
        <p className="text-sm text-blue-100">Predicted points for the next gameweek</p>
      </div>
      
      <div className="p-4">
        {/* Position filter buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {positionButtons.map(button => (
            <button
              key={button.label}
              onClick={() => setSelectedPosition(button.value)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                selectedPosition === button.value 
                ? 'bg-light-card text-light-accent-primary font-bold shadow-sm dark:bg-dark-background dark:text-dark-accent-secondary'
                : 'bg-blue-700/50 text-white hover:bg-blue-700/70 dark:bg-dark-accent-primary/50 dark:hover:bg-dark-accent-primary/70'
              }`}
            >
              {button.label}
            </button>
          ))}
        </div>
        
        {/* Search input */}
        <div className="mb-4 relative">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1.5 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search by player or team..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 px-3 py-1 text-sm bg-light-card dark:bg-dark-background text-light-text-primary dark:text-dark-text-primary rounded-md border border-transparent focus:border-light-accent-primary dark:focus:border-dark-accent-primary focus:ring-0 transition-colors"
          />
        </div>
        
        {/* Results count */}
        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-4">
          Showing {filteredPredictions.length} players
        </p>
        
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-light-background dark:bg-dark-card/50">
              <tr>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider w-12 text-center">
                  Rank
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
                  Player
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider w-20 text-center">
                  Pts
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider w-20 text-center">
                  £
                </th>
                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider w-24 text-center">
                  Form
                </th>
              </tr>
            </thead>
            <tbody className="bg-light-card dark:bg-dark-card divide-y divide-gray-200 dark:divide-slate-700">
              {filteredPredictions.map((player, index) => (
                <tr 
                  key={player.id} 
                  className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-light-text-secondary dark:text-dark-text-secondary text-center">
                    {index + 1}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="ml-0">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                            {player.web_name}
                          </div>
                          <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            player.home_game 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500'
                          }`}>
                            {player.home_game ? 'H' : 'A'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-light-text-secondary dark:text-dark-text-secondary">
                          <span>{player.team_short_name}</span>
                          <span>•</span>
                          <span className="font-medium">{player.position}</span>
                          {player.fixture_difficulty && (
                            <>
                              <span>•</span>
                              <span>Difficulty: {player.fixture_difficulty}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-center">
                    <div className="text-sm font-bold text-blue-600 dark:text-blue-400">{player.predicted_points.toFixed(1)}</div>
                    <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary">{player.total_points} total</div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-center">
                    <div className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">£{player.price.toFixed(1)}m</div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-center">
                    <button 
                      className="px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-slate-700 dark:hover:bg-slate-600 text-blue-600 dark:text-blue-300 rounded-md transition-colors"
                    >
                      View Stats
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 