import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { getAllPlayers, Player, getAllTeams, Team } from '@/lib/services/fplApi';
import { findPlayerImage, getPremierLeaguePlayerImageUrl } from '@/lib/utils/playerImages';

// Extended sort options based on the dropdown images
type SortOption = 
  | 'total_points' 
  | 'round_points'
  | 'now_cost' 
  | 'selected_by_percent' 
  | 'minutes' 
  | 'goals_scored' 
  | 'assists' 
  | 'clean_sheets'
  | 'goals_conceded'
  | 'own_goals'
  | 'penalties_saved'
  | 'penalties_missed'
  | 'yellow_cards'
  | 'red_cards'
  | 'saves'
  | 'bonus'
  | 'bps'
  | 'ict_index'
  | 'influence'
  | 'creativity'
  | 'threat'
  | 'form'
  | 'points_per_game'
  | 'value_form'
  | 'value_season'
  | 'transfers_in'
  | 'transfers_out'
  | 'transfers_in_event'
  | 'transfers_out_event'
  | 'price_rise'
  | 'price_fall'
  | 'price_rise_event'
  | 'price_fall_event'
  | 'expected_goals'
  | 'expected_assists'
  | 'expected_goal_involvements'
  | 'expected_goals_conceded';

interface PlayerWithTeam extends Player {
  team_short_name: string;
  team_name: string;
  position_name: string;
}

interface StatsTableProps {
  positionFilter?: string;
  teamFilter?: string;
}

// Column definition interface
interface ColumnDef {
  key: SortOption | 'player'; // player is special case
  label: string;
  format?: (value: any) => string | number;
  className?: string;
}

export default function StatsTable({ positionFilter: initialPositionFilter, teamFilter: initialTeamFilter }: StatsTableProps) {
  const [players, setPlayers] = useState<PlayerWithTeam[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('total_points');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [viewFilter, setViewFilter] = useState<string>('All players');
  const [currentPage, setCurrentPage] = useState(1);
  const playersPerPage = 15;
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

  // Position mapping
  const positionMap: Record<number, string> = {
    1: 'GKP',
    2: 'DEF',
    3: 'MID',
    4: 'FWD'
  };

  // Position name mapping 
  const positionNameMap: Record<number, string> = {
    1: 'Goalkeepers',
    2: 'Defenders',
    3: 'Midfielders',
    4: 'Forwards'
  };

  // Column definitions
  const columns: ColumnDef[] = [
    { key: 'player', label: 'Player' },
    { key: 'now_cost', label: 'Price', format: (value) => (value / 10).toFixed(1), className: 'text-right' },
    { key: 'selected_by_percent', label: 'Selected %', format: (value) => `${value}%`, className: 'text-right' },
    { key: 'form', label: 'Form', className: 'text-right' },
    { key: 'total_points', label: 'Total Pts', className: 'text-right' },
    { key: 'points_per_game', label: 'Pts/Game', className: 'text-right' },
    { key: 'minutes', label: 'Minutes', className: 'text-right' },
    { key: 'goals_scored', label: 'Goals', className: 'text-right' },
    { key: 'assists', label: 'Assists', className: 'text-right' },
    { key: 'clean_sheets', label: 'Clean Sheets', className: 'text-right' },
    { key: 'goals_conceded', label: 'Goals Conc.', className: 'text-right' },
    { key: 'yellow_cards', label: 'Yellow Cards', className: 'text-right' },
    { key: 'red_cards', label: 'Red Cards', className: 'text-right' },
    { key: 'bonus', label: 'Bonus', className: 'text-right' },
    { key: 'bps', label: 'BPS', className: 'text-right' },
    { key: 'ict_index', label: 'ICT Index', className: 'text-right' },
    { key: 'influence', label: 'Influence', className: 'text-right' },
    { key: 'creativity', label: 'Creativity', className: 'text-right' },
    { key: 'threat', label: 'Threat', className: 'text-right' },
    { key: 'expected_goals', label: 'xG', className: 'text-right' },
    { key: 'expected_assists', label: 'xA', className: 'text-right' },
    { key: 'expected_goal_involvements', label: 'xGI', className: 'text-right' },
    { key: 'expected_goals_conceded', label: 'xGC', className: 'text-right' }
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch teams and players
        const [teamsData, playersData] = await Promise.all([
          getAllTeams(),
          getAllPlayers()
        ]);
        
        setTeams(teamsData);
        
        // Combine player data with team information
        const processedPlayers: PlayerWithTeam[] = playersData.map(player => {
          const playerTeam = teamsData.find(team => team.id === player.team);
          return {
            ...player,
            team_short_name: playerTeam?.short_name || '',
            team_name: playerTeam?.name || '',
            position_name: positionMap[player.element_type] || ''
          };
        });

        setPlayers(processedPlayers);
        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };

    fetchData();
    // Set initial filter if provided
    if (initialPositionFilter) {
      setViewFilter(initialPositionFilter);
    } else if (initialTeamFilter && initialTeamFilter !== 'Global') {
      setViewFilter(initialTeamFilter);
    }
  }, [initialPositionFilter, initialTeamFilter]);

  // Handle image error
  const handleImageError = (playerId: number) => {
    setImageErrors(prev => ({ ...prev, [playerId]: true }));
  };

  // Get filter type
  const getFilterType = (filter: string): 'all' | 'position' | 'team' => {
    if (filter === 'All players' || filter === 'Global') {
      return 'all';
    } else if (['Goalkeepers', 'Defenders', 'Midfielders', 'Forwards'].includes(filter)) {
      return 'position';
    } else {
      return 'team';
    }
  };

  // Filter players based on view filter
  const filteredPlayers = players.filter(player => {
    const filterType = getFilterType(viewFilter);
    
    if (filterType === 'all') {
      return true;
    } else if (filterType === 'position') {
      const positionNumber = Object.entries(positionNameMap)
        .find(([_, name]) => name === viewFilter)?.[0];
      
      return positionNumber ? player.element_type === parseInt(positionNumber) : true;
    } else { // team filter
      return player.team_name === viewFilter;
    }
  });

  // Sort players by selected option
  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    let aValue: any = a[sortBy as keyof Player];
    let bValue: any = b[sortBy as keyof Player];
    
    // Handle string values like form, selected_by_percent, etc.
    if (typeof aValue === 'string' && !isNaN(parseFloat(aValue))) {
      aValue = parseFloat(aValue);
    }
    if (typeof bValue === 'string' && !isNaN(parseFloat(bValue))) {
      bValue = parseFloat(bValue);
    }
    
    // Default to 0 if value is undefined or null
    aValue = aValue ?? 0;
    bValue = bValue ?? 0;
    
    // Apply sort direction
    return sortDirection === 'desc' ? bValue - aValue : aValue - bValue;
  });

  // Handle column sort
  const handleColumnSort = (column: SortOption) => {
    if (sortBy === column) {
      // Toggle sort direction if clicking the same column
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      // Default to descending for new column
      setSortBy(column);
      setSortDirection('desc');
    }
    setCurrentPage(1); // Reset to first page when sort changes
  };

  // Handle view filter change
  const handleViewFilterChange = (value: string) => {
    setViewFilter(value);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  // Calculate pagination
  const indexOfLastPlayer = currentPage * playersPerPage;
  const indexOfFirstPlayer = indexOfLastPlayer - playersPerPage;
  const currentPlayers = sortedPlayers.slice(indexOfFirstPlayer, indexOfLastPlayer);
  const totalPages = Math.ceil(sortedPlayers.length / playersPerPage);

  // Change page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-pulse">Loading player statistics...</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md">
      <div className="p-4">
        <h2 className="text-xl font-bold text-light-text-primary dark:text-white mb-4">Statistics</h2>
        
        {/* View Filter Control */}
        <div className="flex mb-4">
          <div className="flex items-center">
            <label className="mr-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">View</label>
            <select 
              className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm"
              value={viewFilter}
              onChange={(e) => handleViewFilterChange(e.target.value)}
            >
              <option value="All players">All players</option>
              <optgroup label="By Position">
                <option value="Goalkeepers">Goalkeepers</option>
                <option value="Defenders">Defenders</option>
                <option value="Midfielders">Midfielders</option>
                <option value="Forwards">Forwards</option>
              </optgroup>
              <optgroup label="By Team">
                {teams.map(team => (
                  <option key={team.id} value={team.name}>{team.name}</option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>
        
        {/* Stats Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left text-sm text-light-text-secondary dark:text-dark-text-secondary">
                <th className="py-3 px-2 sticky left-0 bg-white dark:bg-slate-800">#</th>
                {columns.map((column) => (
                  <th 
                    key={column.key} 
                    className={`py-3 px-2 ${column.className || ''} ${column.key !== 'player' ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700' : 'sticky left-8 bg-white dark:bg-slate-800'}`}
                    onClick={() => column.key !== 'player' ? handleColumnSort(column.key as SortOption) : undefined}
                  >
                    <div className="flex items-center">
                      <span>{column.label}</span>
                      {column.key === sortBy && (
                        <span className="ml-1">
                          {sortDirection === 'desc' ? '↓' : '↑'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentPlayers.map((player, index) => {
                // Get the player image
                const playerImageId = player.code || player.id;
                const imageUrl = imageErrors[player.id] 
                  ? getPremierLeaguePlayerImageUrl(playerImageId)
                  : findPlayerImage(playerImageId.toString(), player.id.toString());
                
                return (
                  <tr 
                    key={player.id} 
                    className="border-t border-gray-200 dark:border-gray-700 text-light-text-primary dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="py-3 px-2 sticky left-0 bg-white dark:bg-slate-800">
                      <span className="font-mono text-light-text-secondary dark:text-dark-text-secondary">{indexOfFirstPlayer + index + 1}</span>
                    </td>
                    {columns.map(column => {
                      if (column.key === 'player') {
                        return (
                          <td key={column.key} className="py-3 px-2 sticky left-8 bg-white dark:bg-slate-800">
                            <div className="flex items-center">
                              <div className="mr-3">
                                <div className="w-10 h-10 overflow-hidden bg-gray-100 dark:bg-gray-700 rounded-full">
                                  <Image
                                    src={imageUrl}
                                    alt={player.web_name}
                                    width={40}
                                    height={40}
                                    className="object-cover"
                                    onError={() => handleImageError(player.id)}
                                    unoptimized={true}
                                  />
                                </div>
                              </div>
                              <div>
                                <div className="font-medium flex items-center">
                                  {player.web_name}
                                </div>
                                <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                  {player.team_short_name} {player.position_name}
                                </div>
                              </div>
                            </div>
                          </td>
                        );
                      } else {
                        const value = player[column.key as keyof Player];
                        const displayValue = column.format ? column.format(value) : value;
                        return (
                          <td key={column.key} className={`py-3 px-2 ${column.className || ''}`}>
                            {/* Handle different data types appropriately */}
                            {typeof displayValue === 'object' && displayValue !== null
                              ? JSON.stringify(displayValue).substring(0, 30) + '...'
                              : displayValue}
                          </td>
                        );
                      }
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <nav className="flex items-center">
              <button 
                onClick={() => paginate(currentPage > 1 ? currentPage - 1 : 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-md mr-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50"
              >
                Prev
              </button>
              
              <div className="flex space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = currentPage;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => paginate(pageNum)}
                      className={`w-8 h-8 flex items-center justify-center rounded-md ${
                        currentPage === pageNum 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button 
                onClick={() => paginate(currentPage < totalPages ? currentPage + 1 : totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-md ml-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50"
              >
                Next
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
} 