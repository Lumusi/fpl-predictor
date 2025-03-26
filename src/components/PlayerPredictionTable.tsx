import React, { useState } from 'react';
import { predictPlayerPoints } from '@/lib/utils/predictions';

type PlayerPrediction = ReturnType<typeof predictPlayerPoints>[0] & {
  element_type?: number;
  position?: string;
};

interface PlayerPredictionTableProps {
  predictions: PlayerPrediction[];
  title?: string;
  loading?: boolean;
}

export default function PlayerPredictionTable({ 
  predictions, 
  title = "Predicted Points for Next Gameweek", 
  loading = false 
}: PlayerPredictionTableProps) {
  const [positionFilter, setPositionFilter] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [limit, setLimit] = useState(25);
  
  const positions = [
    { id: 1, name: 'GKP' },
    { id: 2, name: 'DEF' },
    { id: 3, name: 'MID' },
    { id: 4, name: 'FWD' }
  ];
  
  // Filter predictions based on position and search term
  const filteredPredictions = predictions
    .filter(player => {
      // Enhanced position filtering
      const matchesPosition = positionFilter === null || 
                             player.element_type === positionFilter ||
                             (player.position && player.position === positions.find(p => p.id === positionFilter)?.name);
      
      const matchesSearch = searchTerm === '' || 
                          player.web_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (player.team_short_name && player.team_short_name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return matchesPosition && matchesSearch;
    })
    .slice(0, limit);
  
  return (
    <div className="w-full bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 bg-blue-600 text-white">
        <h2 className="text-xl font-bold">{title}</h2>
        
        <div className="mt-3 flex flex-wrap gap-3">
          {/* Position filter buttons */}
          <div className="flex space-x-1">
            <button
              className={`px-3 py-1 text-sm rounded-md ${positionFilter === null 
                ? 'bg-white text-blue-600 font-bold' 
                : 'bg-blue-700 text-white'}`}
              onClick={() => setPositionFilter(null)}
            >
              ALL
            </button>
            
            {positions.map(position => (
              <button
                key={position.id}
                className={`px-3 py-1 text-sm rounded-md ${positionFilter === position.id 
                  ? 'bg-white text-blue-600 font-bold' 
                  : 'bg-blue-700 text-white'}`}
                onClick={() => setPositionFilter(position.id)}
              >
                {position.name}
              </button>
            ))}
          </div>
          
          {/* Search input */}
          <div className="flex-grow">
            <input
              type="text"
              placeholder="Search player or team..."
              className="w-full px-3 py-1 text-sm bg-white text-gray-900 rounded-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="p-8 flex justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Player
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">
                    Pos
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">
                    Team
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">
                    Price
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">
                    Form
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Fixture
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                    Predicted
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPredictions.length > 0 ? (
                  filteredPredictions.map(player => (
                    <tr key={player.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 truncate">{player.web_name}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{player.position || (player.element_type ? positions.find(p => p.id === player.element_type)?.name : '')}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{player.team_short_name}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-500">£{player.price.toFixed(1)}m</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{player.form}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className={`inline-flex px-2 text-xs font-semibold rounded-full 
                          ${player.home_game ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {player.home_game ? 'H' : 'A'} ({player.fixture_difficulty})
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-bold text-blue-600">{player.predicted_points.toFixed(1)}</div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      No players found matching the selected criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {limit < predictions.length && filteredPredictions.length > 0 && (
            <div className="p-4 border-t border-gray-200 flex justify-center">
              <button 
                className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md"
                onClick={() => setLimit(prev => prev + 25)}
              >
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
} 