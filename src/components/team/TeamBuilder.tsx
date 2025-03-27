import React, { useState } from 'react';
import { useTeam } from '@/lib/contexts/TeamContext';
import { FORMATION_CONSTRAINTS, POSITION_ID_MAP } from '@/lib/utils/teamBuilder';
import PlayerCard from './PlayerCard';
import { Tab } from '@headlessui/react';
import FieldView from './FieldView';

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
  
  // Group players by position
  const teamByPosition = Object.keys(FORMATION_CONSTRAINTS).reduce((acc, position) => {
    acc[position] = myTeam.filter(player => player.position === position);
    return acc;
  }, {} as Record<string, typeof myTeam>);
  
  // Handle player selection
  const handleAddPlayer = (playerId: number) => {
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
  };
  
  // Filter players for the selector
  const filteredPlayers = allFormattedPlayers.filter(player => {
    const matchesSearch = 
      player.web_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.team_short_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Fix position filtering by checking element_type and position
    const matchesPosition = !selectedPosition || 
      player.position === selectedPosition || 
      player.element_type === POSITION_ID_MAP[selectedPosition as keyof typeof POSITION_ID_MAP];
    
    // Filter by cost constraint
    const matchesCost = (player.now_cost || 0) / 10 <= maxCost;
    
    return matchesSearch && matchesPosition && matchesCost;
  });
  
  // Sort the filtered players
  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    if (sortBy === 'predicted_points') {
      return (b.predicted_points || 0) - (a.predicted_points || 0);
    } else if (sortBy === 'price') {
      return ((b.now_cost || 0) / 10) - ((a.now_cost || 0) / 10);
    } else {
      return (b.total_points || 0) - (a.total_points || 0);
    }
  });
  
  // Group players by position for selection panel
  const playersByPosition = {
    GKP: sortedPlayers.filter(p => p.position === 'GKP'),
    DEF: sortedPlayers.filter(p => p.position === 'DEF'),
    MID: sortedPlayers.filter(p => p.position === 'MID'),
    FWD: sortedPlayers.filter(p => p.position === 'FWD')
  };
  
  // Function to render the player selection sidebar
  const renderPlayerSelection = () => {
    return (
      <div className="p-4 bg-gradient-to-b from-teal-400 to-teal-500 dark:from-blue-700 dark:to-blue-800 rounded-lg h-full">
        <div className="mb-4">
          <h3 className="text-white font-semibold text-lg mb-3">Player Selection</h3>
          <div className="flex flex-col gap-3">
            <select 
              className="w-full p-2.5 rounded-md border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-white dark:bg-slate-700"
              value={selectedPosition || ''}
              onChange={(e) => setSelectedPosition(e.target.value || null)}
            >
              <option value="">All players</option>
              <option value="GKP">Goalkeepers</option>
              <option value="DEF">Defenders</option>
              <option value="MID">Midfielders</option>
              <option value="FWD">Forwards</option>
            </select>
            
            <select 
              className="w-full p-2.5 rounded-md border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-white dark:bg-slate-700"
              value={sortBy}
              onChange={(e) => setSelectBy(e.target.value as any)}
            >
              <option value="total_points">Total points</option>
              <option value="predicted_points">Predicted points</option>
              <option value="price">Price</option>
            </select>
            
            <div className="flex flex-col">
              <label className="text-white text-sm mb-1">Max cost: £{maxCost}m</label>
              <div className="w-full">
                <input 
                  type="range" 
                  min="0.5" 
                  max="15" 
                  step="0.1" 
                  value={maxCost} 
                  onChange={(e) => setMaxCost(parseFloat(e.target.value))}
                  className="w-full h-2 bg-white dark:bg-slate-600 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-white mt-1">
                  <span>£0.5m</span>
                  <span>£15m</span>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <input
                type="text"
                placeholder="Search for player..."
                className="w-full p-2.5 pl-9 rounded-md border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-white dark:bg-slate-700"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-2.5 top-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-teal-100 dark:bg-blue-900/30 rounded-md p-2.5 text-center font-medium text-teal-800 dark:text-blue-200">
          {sortedPlayers.length} players shown
        </div>
        
        <div className="mt-4 overflow-y-auto max-h-[calc(100vh-250px)] scrollbar-thin scrollbar-thumb-white scrollbar-track-transparent">
          {Object.entries(playersByPosition).map(([position, players]) => (
            players.length > 0 && (
              <div key={position} className="mb-4">
                <div className="bg-purple-700 dark:bg-blue-800 text-white px-3 py-2 rounded-t-md font-medium flex justify-between items-center">
                  <span>
                    {position === 'GKP' ? 'Goalkeepers' : 
                     position === 'DEF' ? 'Defenders' : 
                     position === 'MID' ? 'Midfielders' : 'Forwards'}
                  </span>
                  <span className="text-xs bg-purple-600 dark:bg-blue-700 px-2 py-0.5 rounded-full">
                    {players.length}
                  </span>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-b-md overflow-hidden">
                  {players.slice(0, 15).map(player => (
                    <div 
                      key={player.id} 
                      className="border-b border-gray-100 dark:border-slate-700 p-2.5 flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700"
                      onClick={() => handleAddPlayer(player.id)}
                    >
                      <div className="flex-1 min-w-0 mr-2">
                        <div className="font-medium text-gray-900 dark:text-white truncate">
                          {player.web_name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {player.team_short_name}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-800 dark:text-gray-200">
                          £{((player.now_cost || 0) / 10).toFixed(1)}m
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {player.total_points} pts
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      </div>
    );
  };
  
  // Function to render the transfer suggestions section
  const renderTransferSuggestions = () => {
    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-blue-500 text-white p-3 flex justify-between items-center">
          <h2 className="text-lg font-bold">Transfer Suggestions</h2>
          <button 
            onClick={getSuggestions}
            className="bg-white text-blue-600 hover:bg-blue-50 px-4 py-1.5 rounded text-sm font-medium transition-colors"
          >
            Generate Suggestions
          </button>
        </div>
        
        <div className="p-3">
          {suggestions && suggestions.length > 0 ? (
            <div className="space-y-3">
              {suggestions.map((suggestion, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm font-medium text-gray-500">Suggested Transfer #{index + 1}</div>
                    <div className="flex items-center gap-2">
                      <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-medium">
                        +{suggestion.pointsImprovement.toFixed(1)} pts
                      </span>
                      <span className={`${suggestion.costDifference > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'} px-2 py-0.5 rounded text-xs font-medium`}>
                        {suggestion.costDifference > 0 ? '+' : ''}{suggestion.costDifference.toFixed(1)}m
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white rounded-md p-2 border border-red-200">
                      <div className="text-red-600 text-xs font-semibold uppercase mb-1">TRANSFER OUT</div>
                      <div className="flex items-center">
                        <div className="w-8 h-8 mr-2 relative overflow-hidden">
                          <PlayerCard 
                            player={suggestion.playerOut} 
                            showRemove={false}
                            showImage={true}
                            compact={true}
                          />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{suggestion.playerOut.web_name}</div>
                          <div className="text-xs text-gray-500">
                            {suggestion.playerOut.team_short_name} • {suggestion.playerOut.position} • 
                            £{((suggestion.playerOut.now_cost || 0) / 10).toFixed(1)}m • 
                            {suggestion.playerOut.predicted_points?.toFixed(1) || 0} pts
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-gray-400">→</div>
                    
                    <div className="flex-1 bg-white rounded-md p-2 border border-green-200">
                      <div className="text-green-600 text-xs font-semibold uppercase mb-1">TRANSFER IN</div>
                      <div className="flex items-center">
                        <div className="w-8 h-8 mr-2 relative overflow-hidden">
                          <PlayerCard 
                            player={suggestion.playerIn} 
                            showRemove={false}
                            showImage={true}
                            compact={true}
                          />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{suggestion.playerIn.web_name}</div>
                          <div className="text-xs text-gray-500">
                            {suggestion.playerIn.team_short_name} • {suggestion.playerIn.position} • 
                            £{((suggestion.playerIn.now_cost || 0) / 10).toFixed(1)}m • 
                            {suggestion.playerIn.predicted_points?.toFixed(1) || 0} pts
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              Click the button above to generate transfer suggestions based on predicted points.
            </div>
          )}
        </div>
      </div>
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
      
      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Your Team</h2>
          <div className="flex space-x-2">
            <button
              onClick={clearTeam}
              className="px-3 py-1.5 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600 rounded-md text-sm transition-colors"
            >
              Clear Team
            </button>
            <button
              onClick={getSuggestions}
              disabled={myTeam.length < 1}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                myTeam.length < 1
                ? 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
                : 'bg-purple-600 dark:bg-blue-600 text-white hover:bg-purple-700 dark:hover:bg-blue-700'
              }`}
            >
              Generate Suggestions
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
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
                  <FieldView team={myTeam} onRemovePlayer={removePlayer} />
                </Tab.Panel>
                <Tab.Panel>
                  <div className="space-y-6">
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
                        <div className="space-y-2">
                          {players.map(player => (
                            <div 
                              key={player.id}
                              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-md"
                            >
                              <div>
                                <div className="font-medium text-gray-800 dark:text-white">{player.web_name}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">{player.team_short_name}</div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <div className="font-semibold text-gray-800 dark:text-gray-200">£{((player.now_cost || 0) / 10).toFixed(1)}m</div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">{player.total_points} pts</div>
                                </div>
                                <button
                                  onClick={() => removePlayer(player.id)}
                                  className="p-1 rounded-full bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 text-gray-500 dark:text-gray-300"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))}
                          {players.length === 0 && (
                            <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded-md text-gray-500 dark:text-gray-400 text-center">
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
            
            {suggestions.length > 0 && (
              <div className="mt-6">
                <h3 className="font-bold text-gray-800 dark:text-white mb-3">Transfer Suggestions</h3>
                <div className="space-y-3">
                  {suggestions.map((suggestion, index) => (
                    <div key={index} className="p-3 bg-green-50 dark:bg-green-900/30 rounded-md">
                      <div className="text-sm text-green-800 dark:text-green-300 mb-2">
                        <span className="font-semibold">Suggested Transfer:</span> {`+${suggestion.pointsImprovement.toFixed(1)} points (${suggestion.costDifference > 0 ? '+' : ''}${suggestion.costDifference.toFixed(1)}m)`}
                      </div>
                      <div className="flex items-center">
                        <div className="flex-1 flex items-center">
                          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded mr-2">
                            <span className="text-red-800 dark:text-red-300 font-medium">OUT</span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-800 dark:text-gray-200">{suggestion.playerOut.web_name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{suggestion.playerOut.team_short_name}</div>
                          </div>
                        </div>
                        <div className="px-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                        </div>
                        <div className="flex-1 flex items-center">
                          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded mr-2">
                            <span className="text-green-800 dark:text-green-300 font-medium">IN</span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-800 dark:text-gray-200">{suggestion.playerIn.web_name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{suggestion.playerIn.team_short_name}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="bg-gray-50 dark:bg-slate-900 rounded-lg">
            {renderPlayerSelection()}
          </div>
        </div>
      </div>
    </div>
  );
} 