'use client';

import { useState, useEffect } from 'react';
import { useFplData } from '@/lib/hooks/useFplData';
import Header from '@/components/Header';
import ErrorDisplay from '@/components/ErrorDisplay';
import { Tab } from '@headlessui/react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';
import { STATIC_TEAM_ID_MAP, getDirectTeamId, getSetPieceNotes, TeamSetPieceData } from '@/lib/services/fplApi';
import Image from 'next/image';
import scrapeSetPieceTakers from '@/scripts/scrapeSetPieceTakers';

type PlayerStatus = {
  id: number;
  web_name: string;
  team_short_name: string;
  position: string;
  status: string;
  news: string;
  chance_of_playing_next_round: number | null;
};

// Type for formatted set piece data with penalties, corners, etc.
type FormattedSetPieceData = Record<number, {
  penalties: string[];
  directFk: string[];
  corners: string[];
  notes?: string[];
}>;

// Manual mappings for some teams to improve extraction
const manualSetPieceTakers: Record<number, {
  penalties: string[],
  directFk: string[],
  corners: string[]
}> = {
  3: { // Arsenal 
    penalties: ['Saka', 'Ødegaard', 'Havertz', 'Trossard'],
    directFk: ['Ødegaard', 'Rice', 'Sterling'],
    corners: ['Saka', 'Rice', 'Ødegaard', 'Trossard']
  },
  7: { // Aston Villa
    penalties: ['Watkins', 'Tielemans', 'Bailey'],
    directFk: ['Digne', 'McGinn', 'Bailey'],
    corners: ['McGinn', 'Digne', 'Bailey']
  },
  91: { // Bournemouth
    penalties: ['Evanilson', 'Kluivert'],
    directFk: ['Tavernier', 'Kluivert'],
    corners: ['Tavernier', 'Kluivert', 'Christie']
  },
  94: { // Brentford
    penalties: ['Mbeumo', 'Toney', 'Wissa'],
    directFk: ['Toney', 'Mbeumo', 'Jensen'],
    corners: ['Mbeumo', 'Jensen', 'Lewis-Potter']
  },
  36: { // Brighton
    penalties: ['João Pedro', 'Gross', 'Mitoma'],
    directFk: ['Gross', 'March', 'Mitoma'],
    corners: ['Gross', 'March', 'Estupiñán']
  },
  8: { // Chelsea
    penalties: ['Palmer', 'Fernandez', 'Nkunku', 'Madueke'],
    directFk: ['Palmer', 'Chilwell', 'Fernandez'],
    corners: ['Palmer', 'Chilwell', 'Fernandez']
  },
  31: { // Crystal Palace
    penalties: ['Eze', 'Mateta', 'Schlupp'],
    directFk: ['Eze', 'Henderson', 'Mitchell'],
    corners: ['Eze', 'Hughes', 'Mitchell']
  },
  11: { // Everton
    penalties: ['Calvert-Lewin', 'McNeil', 'Doucoure'],
    directFk: ['McNeil', 'Young', 'Garner'],
    corners: ['McNeil', 'Young', 'Garner']
  },
  14: { // Liverpool
    penalties: ['Salah', 'Núñez', 'Mac Allister'],
    directFk: ['Alexander-Arnold', 'Mac Allister', 'Salah'],
    corners: ['Alexander-Arnold', 'Robertson', 'Tsimikas']
  },
  43: { // Man City
    penalties: ['Haaland', 'De Bruyne', 'Foden'],
    directFk: ['De Bruyne', 'Foden', 'Bernardo'],
    corners: ['De Bruyne', 'Foden', 'Bernardo']
  },
  1: { // Man Utd
    penalties: ['Fernandes', 'Rashford', 'Hojlund'],
    directFk: ['Fernandes', 'Eriksen', 'Dalot'],
    corners: ['Fernandes', 'Eriksen', 'Shaw']
  },
  4: { // Newcastle
    penalties: ['Isak', 'Wilson', 'Gordon'],
    directFk: ['Trippier', 'Gordon', 'Almiron'],
    corners: ['Trippier', 'Gordon', 'Tonali']
  },
  6: { // Tottenham
    penalties: ['Son', 'Solanke', 'Maddison'],
    directFk: ['Maddison', 'Son', 'Johnson'],
    corners: ['Maddison', 'Johnson', 'Porro']
  },
  39: { // Wolves
    penalties: ['Hwang', 'Sarabia', 'Matheus Cunha', 'Hwang Hee', 'Pablo Sarabia', 'Cunha'],
    directFk: [], // No data available
    corners: []   // No data available
  },
  21: { // West Ham
    penalties: [],
    directFk: [],
    corners: []
  }
};

// Helper function to get team colors for jerseys
const getTeamColors = (teamShortName: string): string => {
  switch (teamShortName.toUpperCase()) {
    case 'MUN': return 'bg-red-600';
    case 'MCI': return 'bg-sky-500';
    case 'LEI': return 'bg-blue-500';
    case 'BOU': return 'bg-red-700';
    case 'BHA': return 'bg-blue-400';
    case 'NFO': return 'bg-red-500';
    case 'ARS': return 'bg-red-500';
    case 'CHE': return 'bg-blue-600';
    case 'LIV': return 'bg-red-600';
    case 'TOT': return 'bg-white border border-gray-300';
    case 'NEW': return 'bg-black';
    default: return 'bg-gray-300';
  }
};

// Helper function to get correct team ID for crest image
const getTeamImageId = (team: any): number => {
  // Try to get ID from short_name using the getDirectTeamId function
  if (team.short_name) {
    const mappedId = getDirectTeamId(team.short_name.toLowerCase());
    if (mappedId) {
      return mappedId;
    }
  }
  
  // Try to get ID from full name
  if (team.name) {
    const mappedId = getDirectTeamId(team.name.toLowerCase());
    if (mappedId) {
      return mappedId;
    }
  }
  
  // Fallback to the team's own ID
  return team.id;
};

// Function to extract player names from set piece notes
const extractPlayerNames = (notes: string[] | undefined): { 
  penalties: string[], 
  directFk: string[], 
  corners: string[] 
} => {
  const result = {
    penalties: [] as string[],
    directFk: [] as string[],
    corners: [] as string[]
  };
  
  if (!notes || notes.length === 0) return result;
  
  // Process each note
  notes.forEach(note => {
    // Look for player names in the note
    const lowerNote = note.toLowerCase();
    
    // Extract names that appear before "took" and "scored" and other key phrases
    const nameBeforeAction = /([A-Z][a-z]+ [A-Z][a-z]+|[A-Z][a-z]+)(?= (took|scored|stepped up))/g;
    const nameMatches = note.match(nameBeforeAction) || [];
    
    // Identify if this is about penalties
    if (lowerNote.includes('penalties') || lowerNote.includes('penalty') || 
        lowerNote.includes('spot-kick') || lowerNote.includes('spot kick')) {
      
      // Extract specific player names mentioned for penalties
      nameMatches.forEach(name => {
        if (!result.penalties.includes(name)) {
          result.penalties.push(name);
        }
      });
      
      // Also look for explicitly mentioned players
      const explicitNames = extractExplicitNames(note);
      explicitNames.forEach(name => {
        if (!result.penalties.includes(name)) {
          result.penalties.push(name);
        }
      });
    }
  });
  
  // If we couldn't extract specific names, add some defaults based on common patterns
  if (result.penalties.length === 0 && notes.length > 0) {
    const potentialNames = extractAllPlayerNames(notes.join(' '));
    result.penalties = potentialNames.slice(0, 3); // Take up to 3 names
  }
  
  return result;
};

// Helper to extract explicitly mentioned player names
const extractExplicitNames = (text: string): string[] => {
  const names: string[] = [];
  
  // Common words that might match the pattern but aren't player names
  const commonWords = ['the', 'and', 'then', 'with', 'first', 'last', 'second', 'third', 'fourth'];
  
  // Common patterns like "X, Y and Z" or "X and Y"
  const listPattern = /([A-Z][a-z]+ [A-Z][a-z]+|[A-Z][a-z]+)(?:, ([A-Z][a-z]+ [A-Z][a-z]+|[A-Z][a-z]+))+(?:, and |, | and )([A-Z][a-z]+ [A-Z][a-z]+|[A-Z][a-z]+)/g;
  const listMatches = text.match(listPattern);
  
  if (listMatches) {
    listMatches.forEach(match => {
      const splitNames = match.split(/,|and/).map(n => n.trim()).filter(n => n);
      names.push(...splitNames);
    });
  }
  
  // Also check for single names
  const namePattern = /([A-Z][a-z]+ [A-Z][a-z]+|[A-Z][a-z]+)/g;
  const nameMatches = text.match(namePattern) || [];
  
  nameMatches.forEach(name => {
    if (!names.includes(name) && !commonWords.includes(name.toLowerCase())) {
      names.push(name);
    }
  });
  
  return names;
};

// Helper to extract all player-like names from text
const extractAllPlayerNames = (text: string): string[] => {
  const names: string[] = [];
  const namePattern = /([A-Z][a-z]+ [A-Z][a-z]+|[A-Z][a-z]+)/g;
  const nameMatches = text.match(namePattern) || [];
  
  // Common words that might match the pattern but aren't player names
  const commonWords = ['the', 'and', 'then', 'with', 'first', 'last', 'second', 'third', 'fourth'];
  
  nameMatches.forEach(name => {
    if (!names.includes(name) && !commonWords.includes(name.toLowerCase())) {
      names.push(name);
    }
  });
  
  return names;
};

// Function to map FPL API team IDs to our team IDs
const mapApiTeamId = (teamId: number): number => {
  // This mapping converts from FPL API IDs to our sequential team IDs
  const apiToLocalMap: Record<number, number> = {
    1: 12,  // Man Utd
    3: 1,   // Arsenal
    4: 15,  // Newcastle
    6: 18,  // Tottenham
    7: 2,   // Aston Villa
    8: 6,   // Chelsea
    11: 8,  // Everton
    13: 10, // Leicester
    14: 14, // Liverpool
    17: 16, // Nottingham Forest
    20: 17, // Southampton
    21: 19, // West Ham
    31: 7,  // Crystal Palace
    36: 5,  // Brighton
    39: 20, // Wolves
    40: 9,  // Ipswich
    43: 13, // Man City
    54: 11, // Fulham
    91: 3,  // Bournemouth
    94: 4   // Brentford
  };
  return apiToLocalMap[teamId] || teamId;
};

export default function ScoutPage() {
  const { currentGameweek, players, teams, loading, error } = useFplData();
  const [selectedTab, setSelectedTab] = useState(0);
  const [view, setView] = useState("All players");
  const [sortBy, setSortBy] = useState("Most recently added");
  
  // Initialize expanded teams with all teams expanded by default
  const [expandedTeams, setExpandedTeams] = useState<Record<number, boolean>>(() => {
    const expanded: Record<number, boolean> = {};
    
    // Set all possible team IDs to expanded by default (cover any potential ID from 1-100)
    for (let i = 1; i <= 100; i++) {
      expanded[i] = true;
    }
    
    return expanded;
  });
  
  const [setPieceData, setSetPieceData] = useState<FormattedSetPieceData>({});
  const [setPieceLoading, setSetPieceLoading] = useState(true);
  const [setPieceError, setSetPieceError] = useState<string | null>(null);

  // Fetch set piece data from API and try to update from website
  useEffect(() => {
    const fetchSetPieceData = async () => {
      try {
        setSetPieceLoading(true);
        
        // Try to update set piece data via our API endpoint
        try {
          const updateResponse = await fetch('/api/update-set-piece-data');
          if (updateResponse.ok) {
            console.log('Successfully updated set piece data from FPL website');
          } else {
            console.warn('Failed to update set piece data:', await updateResponse.text());
          }
        } catch (err) {
          console.error('Error updating set piece data:', err);
          // Continue with existing data if update fails
        }
        
        // Get the set piece data (possibly updated)
        const data = await getSetPieceNotes();
        
        // Format the data into the structure we need
        const formattedData: FormattedSetPieceData = {};
        
        // Process each team's data
        data.teams.forEach((team: TeamSetPieceData) => {
          // Get team ID using same method as crest images
          const teamImageId = getTeamImageId(team);
          
          // Use manual mapping if available
          const manualData = manualSetPieceTakers[teamImageId];
          
          // Notes data - could be empty array
          const notes = team.notes ? team.notes.map(note => note.info_message) : [];
          const extractedPlayers = extractPlayerNames(notes);
          
          // Add all teams, even those without notes
          formattedData[teamImageId] = {
            penalties: manualData?.penalties || extractedPlayers.penalties || [],
            directFk: manualData?.directFk || extractedPlayers.directFk || [],
            corners: manualData?.corners || extractedPlayers.corners || [],
            notes: notes
          };
        });
        
        setSetPieceData(formattedData);
        setSetPieceLoading(false);
      } catch (err) {
        console.error('Error fetching set piece data:', err);
        setSetPieceError('Failed to load set piece taker data');
        setSetPieceLoading(false);
      }
    };

    fetchSetPieceData();
  }, []);

  if (error && !loading) {
    return <ErrorDisplay error={error} />;
  }

  // Process player data for the Scout page
  const playersWithStatus: PlayerStatus[] = players?.map(player => {
    const team = teams?.find(t => t.id === player.team);
    return {
      id: player.id,
      web_name: player.web_name,
      team_short_name: team?.short_name || '',
      position: ['GKP', 'DEF', 'MID', 'FWD'][player.element_type - 1],
      status: player.status || '',
      news: player.status || '', // Using status as news since news property isn't available
      chance_of_playing_next_round: player.chance_of_playing_next_round
    };
  }) || [];

  // Filter players with news/injury
  const playersWithNews = playersWithStatus.filter(p => p.status);

  // Helper to toggle team expansion in set pieces view
  const toggleTeamExpansion = (teamId: number) => {
    setExpandedTeams(prev => ({
      ...prev,
      [teamId]: !prev[teamId]
    }));
  };

  // Filter players by availability status
  const filterPlayersByStatus = () => {
    if (view === "All players") return playersWithNews;
    return playersWithNews.filter(p => p.position === view.split(' ')[0]);
  };

  // Sort players by selected sorting option
  const sortedPlayers = () => {
    const filtered = filterPlayersByStatus();
    if (sortBy === "Most recently added") {
      return filtered;
    }
    return filtered;
  };

  // Get status icon and class based on chance of playing
  const getStatusIcon = (chance: number | null) => {
    if (chance === null) return '!';
    if (chance <= 25) return '!';
    if (chance <= 75) return 'i';
    return '✓';
  };

  const getStatusClass = (chance: number | null) => {
    if (chance === null || chance <= 25) return 'bg-red-500';
    if (chance <= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="min-h-screen bg-light-background dark:bg-dark-background">
      <Header 
        currentGameweek={currentGameweek} 
        loading={loading}
      />
      
      <main className="container mx-auto px-4 py-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700">
            <h1 className="text-2xl font-bold text-blue-800 dark:text-blue-400">The Scout</h1>
            {setPieceError && (
              <div className="mt-2 text-red-500">{setPieceError}</div>
            )}
            {setPieceLoading && (
              <div className="mt-2 text-gray-500">Loading set piece data...</div>
            )}
          </div>
          
          <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
            <Tab.List className="flex border-b border-gray-200 dark:border-slate-700 px-4">
              <Tab className={({ selected }) => 
                `py-3 px-6 text-sm font-medium transition-colors ${
                  selected 
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                Set-Pieces
              </Tab>
              <Tab className={({ selected }) => 
                `py-3 px-6 text-sm font-medium transition-colors ${
                  selected 
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                Availability
              </Tab>
            </Tab.List>
            
            <Tab.Panels>
              {/* Set-Pieces Panel */}
              <Tab.Panel className="p-4">
                {setPieceLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {teams?.map(team => {
                      const teamImageId = getTeamImageId(team);
                      const teamSetPieces = setPieceData[teamImageId];
                      const isExpanded = expandedTeams[teamImageId] || false;
                      
                      // Skip teams with no set piece data
                      if (!teamSetPieces && !isExpanded) return null;
                      
                      return (
                        <div key={teamImageId} className="bg-white dark:bg-slate-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
                          <div 
                            className="p-3 bg-gradient-to-r from-teal-400 to-blue-500 flex justify-between items-center cursor-pointer"
                            onClick={() => toggleTeamExpansion(teamImageId)}
                          >
                            <div className="flex items-center">
                              <div className="w-8 h-8 mr-3 relative">
                                <Image 
                                  src={`/images/teams/team_${teamImageId}_crest.png`}
                                  alt={team.name || 'Team crest'}
                                  width={28}
                                  height={28}
                                  className="object-contain w-full h-full"
                                  unoptimized
                                  priority={teamImageId < 10}
                                  onError={(e) => {
                                    console.error(`Image load error for team: ${team.short_name || team.name}`);
                                    // Fallback if image fails to load
                                    const target = e.target as HTMLImageElement;
                                    target.src = '/images/placeholder-crest.svg';
                                  }}
                                />
                              </div>
                              <h3 className="font-medium text-white">{team.name}</h3>
                            </div>
                            {isExpanded ? 
                              <ChevronUpIcon className="h-5 w-5 text-white" /> : 
                              <ChevronDownIcon className="h-5 w-5 text-white" />
                            }
                          </div>
                          
                          {isExpanded && teamSetPieces && (
                            <div className="p-3 bg-slate-800 text-white">
                              <div>
                                <div className="grid grid-cols-3 gap-2 mb-4">
                                  <div>
                                    <h4 className="font-medium mb-2">Penalties</h4>
                                    <ul className="space-y-2">
                                      {teamSetPieces.penalties && teamSetPieces.penalties.length > 0 ? (
                                        teamSetPieces.penalties.map((player, idx) => (
                                          <li key={idx} className="flex items-center">
                                            <span className="w-2 h-2 bg-white rounded-full mr-2"></span>
                                            <span className="text-sm text-gray-300">{player}</span>
                                          </li>
                                        ))
                                      ) : (
                                        <li className="text-sm text-gray-400">Not available</li>
                                      )}
                                    </ul>
                                  </div>
                                  
                                  <div>
                                    <h4 className="font-medium mb-2">Direct free-kicks</h4>
                                    <ul className="space-y-2">
                                      {teamSetPieces.directFk && teamSetPieces.directFk.length > 0 ? (
                                        teamSetPieces.directFk.map((player, idx) => (
                                          <li key={idx} className="flex items-center">
                                            <span className="w-2 h-2 bg-white rounded-full mr-2"></span>
                                            <span className="text-sm text-gray-300">{player}</span>
                                          </li>
                                        ))
                                      ) : (
                                        <li className="text-sm text-gray-400">Not available</li>
                                      )}
                                    </ul>
                                  </div>
                                  
                                  <div>
                                    <h4 className="font-medium mb-2">Corners & indirect free-kicks</h4>
                                    <ul className="space-y-2">
                                      {teamSetPieces.corners && teamSetPieces.corners.length > 0 ? (
                                        teamSetPieces.corners.map((player, idx) => (
                                          <li key={idx} className="flex items-center">
                                            <span className="w-2 h-2 bg-white rounded-full mr-2"></span>
                                            <span className="text-sm text-gray-300">{player}</span>
                                          </li>
                                        ))
                                      ) : (
                                        <li className="text-sm text-gray-400">Not available</li>
                                      )}
                                    </ul>
                                  </div>
                                </div>
                                
                                {teamSetPieces.notes && teamSetPieces.notes.length > 0 && (
                                  <div className="mt-4 pt-3 border-t border-gray-600">
                                    <h4 className="font-medium mb-2">Notes</h4>
                                    <ul className="list-disc pl-5 space-y-2">
                                      {teamSetPieces.notes.map((note, idx) => (
                                        <li key={idx} className="text-sm text-gray-300">{note}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {isExpanded && !teamSetPieces && (
                            <div className="p-3 bg-slate-800 text-white">
                              <div className="text-sm text-gray-400 italic">No set piece information available.</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Tab.Panel>

              {/* Availability Panel */}
              <Tab.Panel className="p-4">
                <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <label htmlFor="positionFilter" className="text-sm text-gray-600 dark:text-gray-400 mr-2">Position:</label>
                    <select 
                      id="positionFilter"
                      value={view}
                      onChange={(e) => setView(e.target.value)}
                      className="p-2 border rounded text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    >
                      <option value="All players">All players</option>
                      <option value="GKP players">Goalkeepers</option>
                      <option value="DEF players">Defenders</option>
                      <option value="MID players">Midfielders</option>
                      <option value="FWD players">Forwards</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="sortBy" className="text-sm text-gray-600 dark:text-gray-400 mr-2">Sort by:</label>
                    <select 
                      id="sortBy"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="p-2 border rounded text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    >
                      <option value="Most recently added">Most recent news</option>
                    </select>
                  </div>
                </div>
                
                {loading ? (
                  <div className="text-center py-8">Loading player data...</div>
                ) : (
                  <div className="space-y-3">
                    {sortedPlayers().map(player => (
                      <div key={player.id} className="bg-white dark:bg-slate-700 rounded-lg p-3 shadow border border-gray-200 dark:border-slate-600">
                        <div className="flex items-center">
                          <div className={`w-8 h-8 rounded-full ${getTeamColors(player.team_short_name)} flex items-center justify-center mr-3 text-white font-semibold`}>
                            {player.position}
                          </div>
                          <div>
                            <div className="font-medium text-gray-800 dark:text-white flex items-center">
                              {player.web_name}
                              <span className={`ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-xs font-medium ${getStatusClass(player.chance_of_playing_next_round)}`}>
                                {getStatusIcon(player.chance_of_playing_next_round)}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">{player.team_short_name}</div>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 pl-4 border-l-2 border-gray-300 dark:border-gray-600">
                          {player.news || 'No details available'}
                          {player.chance_of_playing_next_round !== null && (
                            <div className="mt-1 font-semibold">
                              Chance of playing: {player.chance_of_playing_next_round}%
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {sortedPlayers().length === 0 && (
                      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                        No players found with injury news
                      </div>
                    )}
                  </div>
                )}
              </Tab.Panel>
            </Tab.Panels>
          </Tab.Group>
        </div>
      </main>
    </div>
  );
} 