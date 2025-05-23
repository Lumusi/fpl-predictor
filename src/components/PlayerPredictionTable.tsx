import React, { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { PlayerPrediction, getDifficultyColorClass } from '@/lib/utils/predictions';
import PlayerStatsModal from './PlayerStatsModal';
import { findPlayerImage, getPremierLeaguePlayerImageUrl } from '@/lib/utils/playerImages';
import { getManagerByTeam, getManagerImageUrl } from '@/lib/utils/managerImages';

interface PlayerPredictionTableProps {
  predictions: PlayerPrediction[];
  loading: boolean;
  title?: string;
  isTotal?: boolean;
}

export default function PlayerPredictionTable({ 
  predictions, 
  loading, 
  title,
  isTotal = false
}: PlayerPredictionTableProps) {
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerPrediction | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [imagesLoaded, setImagesLoaded] = useState<Record<number, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const playersPerPage = 100;
  const [managersMap, setManagersMap] = useState<Record<number, { isManager: boolean; optaId?: string }>>({});
  
  // Function to get color based on fixture difficulty - using the imported function
  const getDifficultyColor = (difficulty: number) => {
    return getDifficultyColorClass(difficulty) + ' px-2 py-0.5 rounded';
  };
  
  // Handle local image error - use placeholder
  const handleImageError = (playerId: number) => {
    setImageErrors(prev => ({
      ...prev,
      [playerId]: true
    }));
  };
  
  // Handle successful image load
  const handleImageLoaded = (playerId: number) => {
    setImagesLoaded(prev => ({
      ...prev,
      [playerId]: true
    }));
  };
  
  // Check for managers in the predictions data when component mounts or predictions change
  useEffect(() => {
    const newManagersMap: Record<number, { isManager: boolean; optaId?: string }> = {};
    
    // Process each player to identify managers
    predictions.forEach(player => {
      // Method 1: Check if the player's code starts with 'man' (direct Opta ID)
      const playerCode = player.code ? player.code.toString() : '';
      if (playerCode && playerCode.startsWith('man')) {
        console.log(`Identified manager by Opta ID: ${player.web_name} with optaId ${playerCode}`);
        newManagersMap[player.id] = { isManager: true, optaId: playerCode };
        return;
      }
      
      // Method 2: Check if the player's element_type is set to a manager code
      if (player.element_type === 5) { // Assuming 5 might be used for managers
        console.log(`Identified manager by element_type: ${player.web_name}`);
        
        // Try to find the team and corresponding manager
        let teamName = player.team_name;
        if (!teamName && player.team_short_name) {
          const teamNameMap: Record<string, string> = {
            'ARS': 'Arsenal',
            'AVL': 'Aston Villa',
            'BOU': 'Bournemouth',
            'BRE': 'Brentford',
            'BHA': 'Brighton',
            'CHE': 'Chelsea',
            'CRY': 'Crystal Palace',
            'EVE': 'Everton',
            'FUL': 'Fulham',
            'IPW': 'Ipswich',
            'LEI': 'Leicester',
            'LIV': 'Liverpool',
            'MCI': 'Man City',
            'MUN': 'Man Utd',
            'NEW': 'Newcastle',
            'NFO': 'Nott\'m Forest',
            'SOU': 'Southampton',
            'TOT': 'Spurs',
            'WHU': 'West Ham',
            'WOL': 'Wolves'
          };
          teamName = teamNameMap[player.team_short_name];
        }
        
        if (teamName) {
          const manager = getManagerByTeam(teamName);
          if (manager) {
            newManagersMap[player.id] = { isManager: true, optaId: manager.id };
          }
        }
        return;
      }
      
      // Skip players without name or team information for name-based matching
      if (!player.web_name || (!player.team_name && !player.team_short_name)) {
        return;
      }
      
      // Get proper team name for manager lookup
      let teamName = player.team_name;
      
      // If we don't have team_name but have team_short_name, map it to full name
      if (!teamName && player.team_short_name) {
        // Map short names to full names (exact mapping from managers.json)
        const teamNameMap: Record<string, string> = {
          'ARS': 'Arsenal',
          'AVL': 'Aston Villa',
          'BOU': 'Bournemouth',
          'BRE': 'Brentford',
          'BHA': 'Brighton',
          'CHE': 'Chelsea',
          'CRY': 'Crystal Palace',
          'EVE': 'Everton',
          'FUL': 'Fulham',
          'IPW': 'Ipswich',
          'LEI': 'Leicester',
          'LIV': 'Liverpool',
          'MCI': 'Man City',
          'MUN': 'Man Utd',
          'NEW': 'Newcastle',
          'NFO': 'Nott\'m Forest',
          'SOU': 'Southampton',
          'TOT': 'Spurs',
          'WHU': 'West Ham',
          'WOL': 'Wolves'
        };
        
        teamName = teamNameMap[player.team_short_name];
      }
      
      // Method 3: Only proceed if we have a valid team name for name-based matching
      if (teamName) {
        // Get manager data for this team
        const manager = getManagerByTeam(teamName);
        
        // If we found a manager and the player's name includes the manager's name
        if (manager && player.web_name.toLowerCase().includes(manager.name.toLowerCase())) {
          console.log(`Identified manager by name: ${player.web_name} of ${teamName} with optaId ${manager.id}`);
          newManagersMap[player.id] = { isManager: true, optaId: manager.id };
        }
      }
    });
    
    // Update the managers map state
    setManagersMap(newManagersMap);
  }, [predictions]);

  // Function to get player image URL
  const getPlayerImageUrl = (player: PlayerPrediction) => {
    // Check if this is a manager - this takes highest priority
    if (managersMap[player.id]?.isManager && managersMap[player.id]?.optaId) {
      // For managers, use the local path
      const managerImageUrl = `/images/managers/${managersMap[player.id].optaId}.png`;
      console.log(`Using manager image for ${player.web_name}: ${managerImageUrl}`);
      return managerImageUrl;
    }
    
    // For regular players, use the flexible image finder
    const playerImageId = player.code || player.id;
    const localImageUrl = findPlayerImage(playerImageId.toString(), player.id.toString());
    
    // If there's an error loading the player image, use Premier League API fallback
    if (imageErrors[player.id]) {
      return getPremierLeaguePlayerImageUrl(playerImageId);
    }
    
    return localImageUrl;
  };
  
  // Filter predictions by position
  const filteredPredictions = predictions.filter(prediction => {
    // Filter by position if selected
    const matchesPosition = !selectedPosition || prediction.position === selectedPosition;
    
    // Filter by search query (player name or team)
    const matchesSearch = prediction.web_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (prediction.first_name && prediction.first_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (prediction.second_name && prediction.second_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (prediction.team_short_name && prediction.team_short_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (prediction.team_name && prediction.team_name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesPosition && matchesSearch;
  });
  
  // Calculate pagination
  const indexOfLastPlayer = currentPage * playersPerPage;
  const indexOfFirstPlayer = indexOfLastPlayer - playersPerPage;
  const currentPlayers = filteredPredictions.slice(indexOfFirstPlayer, indexOfLastPlayer);
  const totalPages = Math.ceil(filteredPredictions.length / playersPerPage);
  
  // Change page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  
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
  
  const handleViewStats = (player: PlayerPrediction) => {
    setSelectedPlayer(player);
    setStatsModalOpen(true);
  };
  
  return (
    <div className="w-full bg-light-card dark:bg-dark-card rounded-lg shadow-md overflow-hidden">
      {/* Player stats modal */}
      {selectedPlayer && (
        <PlayerStatsModal 
          player={selectedPlayer}
          isOpen={statsModalOpen}
          onClose={() => setStatsModalOpen(false)}
        />
      )}
      
      <div className="p-4">
        {/* Position filter buttons and FDR Key */}
        <div className="flex flex-wrap justify-between mb-4">
          {/* Position filter buttons */}
          <div className="flex flex-wrap gap-2">
            {positionButtons.map(button => (
              <button
                key={button.label}
                onClick={() => {
                  setSelectedPosition(button.value);
                  setCurrentPage(1); // Reset to first page when filter changes
                }}
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
          
          {/* FDR Key */}
          <div className="flex items-center gap-1 text-sm">
            <span className="font-medium mr-1">FDR Key:</span>
            <span className="bg-green-500 text-white px-3 py-0.5 rounded">1</span>
            <span className="bg-teal-500 text-white px-3 py-0.5 rounded">2</span>
            <span className="bg-yellow-500 text-white px-3 py-0.5 rounded">3</span>
            <span className="bg-pink-500 text-white px-3 py-0.5 rounded">4</span>
            <span className="bg-red-500 text-white px-3 py-0.5 rounded">5</span>
          </div>
        </div>
        
        {/* Search input */}
        <div className="mb-4 relative">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1.5 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search by player name or team (full/short name)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1); // Reset to first page when search changes
            }}
            className="w-full pl-10 px-3 py-1 text-sm bg-light-card dark:bg-dark-background text-light-text-primary dark:text-dark-text-primary rounded-md border border-transparent focus:border-light-accent-primary dark:focus:border-dark-accent-primary focus:ring-0 transition-colors"
          />
        </div>
        
        {/* Results count and pagination info */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
            Showing {indexOfFirstPlayer + 1}-{Math.min(indexOfLastPlayer, filteredPredictions.length)} of {filteredPredictions.length} players
          </p>
          {totalPages > 1 && (
            <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
              Page {currentPage} of {totalPages}
            </div>
          )}
        </div>
        
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-light-background dark:bg-dark-card/50">
              <tr>
                <th scope="col" className="px-2 py-3 text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider w-10 text-center">
                  Rank
                </th>
                <th scope="col" className="px-2 py-3 text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider w-14 text-center">
                  Image
                </th>
                <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider">
                  Player
                </th>
                <th scope="col" className="px-2 py-3 text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider w-16 text-center">
                  Pts
                </th>
                <th scope="col" className="px-2 py-3 text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider w-16 text-center">
                  £
                </th>
                <th scope="col" className="px-2 py-3 text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary uppercase tracking-wider w-20 text-center">
                  Form
                </th>
              </tr>
            </thead>
            <tbody className="bg-light-card dark:bg-dark-card divide-y divide-gray-200 dark:divide-slate-700">
              {currentPlayers.map((player, index) => (
                <tr 
                  key={player.id} 
                  className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <td className="px-2 py-4 whitespace-nowrap text-sm text-light-text-secondary dark:text-dark-text-secondary text-center">
                    {indexOfFirstPlayer + index + 1}
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap text-center">
                    <div className="w-10 h-10 mx-auto relative rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
                      <div className={`${imagesLoaded[player.id] ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 w-full h-full flex items-center justify-center`}>
                        <img
                          src={getPlayerImageUrl(player)}
                          alt={player.web_name}
                          className={`h-10 w-10 ${managersMap[player.id]?.isManager ? 'object-contain' : 'rounded-full object-cover'} ${!imagesLoaded[player.id] ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
                          onError={() => handleImageError(player.id)}
                          onLoad={() => handleImageLoaded(player.id)}
                        />
                      </div>
                      {!imagesLoaded[player.id] && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-3 h-3 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-4 w-auto">
                    <div className="flex items-center">
                      <div className="ml-0 w-full">
                        <div className="flex flex-wrap items-center">
                          <div className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                            {player.web_name}
                          </div>
                          {/* Only show home/away and DGW badges in single gameweek view */}
                          {!isTotal && (
                            <>
                              <span className={`ml-1 px-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                player.home_game 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500'
                              }`}>
                                {player.home_game ? 'H' : 'A'}
                              </span>
                            </>
                          )}
                          
                          {player.fixture_count && player.fixture_count > 0 && (
                            <>
                              <span>•</span>
                              <span className="font-medium text-purple-600 dark:text-purple-400">
                                {player.fixture_count} fixture{player.fixture_count > 1 ? 's' : ''}
                              </span>
                            </>
                          )}
                          
                          {isTotal && player.opponents && (
                            <>
                              <span>•</span>
                              <span 
                                className="font-medium break-words overflow-hidden max-w-xs inline-flex flex-wrap gap-1"
                                dangerouslySetInnerHTML={{ __html: player.opponents }}
                              />
                            </>
                          )}
                        </div>
                        <div className="flex items-center mt-1">
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            <span>{player.team_short_name || 'Unknown'}</span>
                            <span className="mx-1">•</span>
                            <span className={`font-medium ${managersMap[player.id]?.isManager ? 'text-purple-600 dark:text-purple-400' : ''}`}>
                              {managersMap[player.id]?.isManager ? 'MNG' : player.position}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap text-center">
                    <div className="text-sm font-bold text-blue-600 dark:text-blue-400">{player.predicted_points.toFixed(1)}</div>
                    <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary">{player.total_points} total</div>
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap text-center">
                    <div className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">£{player.price.toFixed(1)}m</div>
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap text-right pr-2">
                    <button 
                      onClick={() => handleViewStats(player)}
                      className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-slate-700 dark:hover:bg-slate-600 text-blue-600 dark:text-blue-300 rounded-md transition-colors text-sm whitespace-nowrap"
                    >
                      View Stats
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <nav className="flex items-center space-x-2">
              <button
                onClick={() => paginate(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded ${
                  currentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-slate-700 dark:text-blue-300 dark:hover:bg-slate-600'
                }`}
              >
                Prev
              </button>
              
              {/* Dynamic page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
                let pageNumber;
                
                // Logic to show 5 page numbers at most, centered around current page
                if (totalPages <= 5) {
                  pageNumber = idx + 1;
                } else if (currentPage <= 3) {
                  pageNumber = idx + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNumber = totalPages - 4 + idx;
                } else {
                  pageNumber = currentPage - 2 + idx;
                }
                
                return (
                  <button
                    key={pageNumber}
                    onClick={() => paginate(pageNumber)}
                    className={`px-3 py-1 rounded ${
                      currentPage === pageNumber
                      ? 'bg-blue-600 text-white dark:bg-blue-700'
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-slate-700 dark:text-blue-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
              
              <button
                onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded ${
                  currentPage === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-slate-700 dark:text-blue-300 dark:hover:bg-slate-600'
                }`}
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