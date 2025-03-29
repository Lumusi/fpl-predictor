'use client';

import React, { useEffect, useState } from 'react';
import { logAllFplTeamIds, getAllTeams, Team } from '@/lib/services/fplApi';
import { ArrowPathIcon, ArrowsRightLeftIcon, DocumentDuplicateIcon } from '@heroicons/react/24/solid';

export default function TeamIdDebugPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [internalTeams, setInternalTeams] = useState<{id: number, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [mappings, setMappings] = useState<Record<number, number>>({});
  const [draggedTeam, setDraggedTeam] = useState<Team | null>(null);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  // Map of internal team IDs to names for the current Premier League season
  const currentPremierLeagueTeams = {
    1: 'Arsenal',
    2: 'Aston Villa',
    3: 'Bournemouth',
    4: 'Brentford',
    5: 'Brighton',
    6: 'Ipswich Town',
    7: 'Chelsea',
    8: 'Crystal Palace',
    9: 'Everton',
    10: 'Fulham',
    11: 'Liverpool',
    12: 'Man City',
    13: 'Man Utd',
    14: 'Newcastle',
    15: 'Nottingham Forest',
    16: 'Leicester City',
    17: 'Tottenham',
    18: 'West Ham',
    19: 'Wolves',
    20: 'Southampton'
  };

  // Convert to array for easier rendering
  useEffect(() => {
    const teamArray = Object.entries(currentPremierLeagueTeams).map(([id, name]) => ({
      id: parseInt(id),
      name
    }));
    setInternalTeams(teamArray);
  }, [currentPremierLeagueTeams]);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        // Log team IDs to console
        await logAllFplTeamIds();
        
        // Get teams for display
        const teamData = await getAllTeams();
        setTeams(teamData.sort((a, b) => a.id - b.id));
        
        // Initialize mappings with auto-matches
        const initialMappings: Record<number, number> = {};
        teamArray.forEach(internal => {
          const matchingFplTeam = teamData.find(t => 
            t.name.includes(internal.name) || 
            internal.name.includes(t.name) ||
            t.short_name === internal.name.substring(0, 3).toUpperCase()
          );
          if (matchingFplTeam) {
            initialMappings[internal.id] = matchingFplTeam.id;
          }
        });
        setMappings(initialMappings);
      } catch (error) {
        console.error('Error fetching teams:', error);
      } finally {
        setLoading(false);
      }
    };

    const teamArray = Object.entries(currentPremierLeagueTeams).map(([id, name]) => ({
      id: parseInt(id),
      name
    }));
    
    fetchTeams();
  }, [currentPremierLeagueTeams]);

  const refreshImages = () => {
    setRefreshKey(Date.now());
  };

  const handleDragStart = (team: Team) => {
    setDraggedTeam(team);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, internalTeamId: number) => {
    e.preventDefault();
    if (draggedTeam) {
      // Update mappings
      setMappings(prev => ({
        ...prev,
        [internalTeamId]: draggedTeam.id
      }));
      setDraggedTeam(null);
    }
  };

  const removeMappingForTeam = (internalTeamId: number) => {
    setMappings(prev => {
      const newMappings = { ...prev };
      delete newMappings[internalTeamId];
      return newMappings;
    });
  };

  const copyMappingToClipboard = () => {
    const mappingCode = `const DIRECT_TEAM_ID_MAP: Record<number, number> = {
${internalTeams.map(team => `  ${team.id}: ${mappings[team.id] || '??'},    // ${team.name}`).join('\n')}
};`;
    
    navigator.clipboard.writeText(mappingCode)
      .then(() => {
        setCopiedToClipboard(true);
        setTimeout(() => setCopiedToClipboard(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">FPL Team ID Mappings</h1>
      <p className="mb-4">Drag FPL teams to map them to our internal teams</p>
      
      <button 
        onClick={refreshImages}
        className="mb-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2"
      >
        <ArrowPathIcon className="h-5 w-5 inline mr-1" />
        Refresh Images
      </button>
      
      {loading ? (
        <div className="flex justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left column: FPL Teams (draggable) */}
          <div className="bg-white p-4 rounded shadow-md">
            <h2 className="text-xl font-bold mb-4">FPL API Teams (Drag to map)</h2>
            <div className="grid grid-cols-2 gap-2">
              {teams.map((team) => (
                <div 
                  key={team.id}
                  className="p-2 bg-gray-100 rounded cursor-move flex items-center hover:bg-blue-50 border border-gray-300"
                  draggable
                  onDragStart={() => handleDragStart(team)}
                >
                  <img 
                    src={`/api/image?type=crest&id=${team.id}&refresh=true&t=${refreshKey}`}
                    alt={`${team.name} crest`}
                    width={24}
                    height={24}
                    className="mr-2"
                    style={{ height: 'auto' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{team.name}</div>
                    <div className="text-xs text-gray-500">ID: {team.id}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Right column: Internal Teams (drop targets) */}
          <div className="bg-white p-4 rounded shadow-md">
            <h2 className="text-xl font-bold mb-4">Our Internal Teams (Drop to map)</h2>
            <div className="space-y-2">
              {internalTeams.map((team) => (
                <div 
                  key={team.id}
                  className={`p-2 rounded border ${mappings[team.id] ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-gray-50'}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, team.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gray-200 flex items-center justify-center rounded mr-2">
                        {team.id}
                      </div>
                      <div className="font-medium">{team.name}</div>
                    </div>
                    
                    {mappings[team.id] && (
                      <div className="flex items-center">
                        <ArrowsRightLeftIcon className="h-4 w-4 text-green-600 mx-2" />
                        
                        <div className="flex items-center bg-green-100 px-2 py-1 rounded">
                          <img 
                            src={`/api/image?type=crest&id=${mappings[team.id]}&refresh=true&t=${refreshKey}`}
                            alt="Team crest"
                            width={20}
                            height={20}
                            className="mr-1"
                            style={{ height: 'auto' }}
                          />
                          <span className="text-sm">
                            {teams.find(t => t.id === mappings[team.id])?.name || `ID: ${mappings[team.id]}`}
                          </span>
                          <button 
                            onClick={() => removeMappingForTeam(team.id)}
                            className="ml-2 text-red-500 hover:text-red-700"
                            title="Remove mapping"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {!mappings[team.id] && (
                      <div className="text-gray-400 text-sm italic">Drop a team here</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mapping preview and copy button */}
      <div className="mt-8 bg-white p-4 rounded shadow-md">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold">Updated Mapping Code</h2>
          <button 
            onClick={copyMappingToClipboard}
            className={`px-3 py-1 rounded flex items-center ${copiedToClipboard ? 'bg-green-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            <DocumentDuplicateIcon className="h-4 w-4 mr-1" />
            {copiedToClipboard ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>
        
        <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
          {`const DIRECT_TEAM_ID_MAP: Record<number, number> = {
${internalTeams.map(team => `  ${team.id}: ${mappings[team.id] || '??'},    // ${team.name}`).join('\n')}
};`}
        </pre>
        
        <div className="mt-4">
          <h3 className="font-bold mb-2">Validation</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {internalTeams.map((team) => (
              <div 
                key={team.id}
                className={`p-2 rounded ${mappings[team.id] ? 'bg-green-100' : 'bg-red-100'}`}
              >
                <div className="text-sm font-medium">{team.name}</div>
                <div className="flex space-x-1 mt-1">
                  {mappings[team.id] ? (
                    <>
                      <img 
                        src={`/api/image?type=shirt&id=${team.id}&shirtType=home&refresh=true&t=${refreshKey}`}
                        alt="Home kit"
                        width={30}
                        height={30}
                        style={{ height: 'auto' }}
                      />
                      <img 
                        src={`/api/image?type=shirt&id=${team.id}&shirtType=away&refresh=true&t=${refreshKey}`}
                        alt="Away kit"
                        width={30}
                        height={30}
                        style={{ height: 'auto' }}
                      />
                      <img 
                        src={`/api/image?type=crest&id=${team.id}&refresh=true&t=${refreshKey}`}
                        alt="Crest"
                        width={30}
                        height={30}
                        style={{ height: 'auto' }}
                      />
                    </>
                  ) : (
                    <span className="text-red-500 text-xs">No mapping</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 