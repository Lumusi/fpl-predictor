'use client';

import { useState, useEffect } from 'react';
import { 
  getFixturesByGameweekWithBroadcasting, 
  getAllTeams, 
  Fixture, 
  Team,
  getDirectTeamId,
  BroadcastingDetails
} from '@/lib/services/fplApi';
import { useFplData } from '@/lib/hooks/useFplData';
import Header from '@/components/Header';
import Image from 'next/image';
import { getBroadcasterInfo } from '@/lib/utils/broadcasterUtils';
import Link from 'next/link';

// Helper function to get correct team ID for crest image
const getTeamImageId = (team: Team): number => {
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

// Helper function to get team crest with fallback
const getTeamCrestWithFallback = (team: Team) => {
  try {
    return `/images/teams/team_${getTeamImageId(team)}_crest.png`;
  } catch (error) {
    console.error('Error getting team crest:', error);
    // Fallback if image fails to load
    return '/images/placeholder-crest.svg';
  }
};

export default function FixturesPage() {
  const { currentGameweek: fplCurrentGameweek } = useFplData();
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMap, setTeamMap] = useState<Record<number, Team>>({});
  const [currentGameweek, setCurrentGameweek] = useState<number>(0);
  const [selectedGameweek, setSelectedGameweek] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Add custom CSS for dark dropdown
  useEffect(() => {
    // Add custom styles to the head
    const style = document.createElement('style');
    style.innerHTML = `
      select option {
        background-color: #1a1a1a !important;
        color: white !important;
      }
    `;
    document.head.appendChild(style);
    
    // Clean up on unmount
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  // Get all gameweeks
  const gameweeks = Array.from({ length: 38 }, (_, i) => i + 1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get all teams
        const teamsData = await getAllTeams();
        setTeams(teamsData);
        
        // Create a map of team IDs to team objects for easy lookup
        const teamMapData = teamsData.reduce((acc, team) => {
          acc[team.id] = team;
          return acc;
        }, {} as Record<number, Team>);
        setTeamMap(teamMapData);
        
        // Get current gameweek from useFplData hook
        if (fplCurrentGameweek > 0) {
          setCurrentGameweek(fplCurrentGameweek);
          
          // If no gameweek is selected, use current gameweek
          if (!selectedGameweek) {
            setSelectedGameweek(fplCurrentGameweek);
            const fixturesData = await getFixturesByGameweekWithBroadcasting(fplCurrentGameweek);
            console.log('Loaded fixtures:', fixturesData);
            
            // Debug broadcasting data
            fixturesData.forEach(fixture => {
              if (fixture.broadcasters && fixture.broadcasters.length > 0) {
                console.log(`Fixture ${fixture.id} has ${fixture.broadcasters.length} broadcasters:`, 
                  fixture.broadcasters.map(b => b.abbreviation));
              }
            });
            
            setFixtures(fixturesData);
          }
        }
      } catch (err) {
        console.error("Failed to fetch fixtures data", err);
        setError("Failed to load fixtures data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [fplCurrentGameweek, selectedGameweek]);

  const handleGameweekChange = async (gameweek: number) => {
    try {
      setLoading(true);
      setSelectedGameweek(gameweek);
      const fixturesData = await getFixturesByGameweekWithBroadcasting(gameweek);
      console.log('Loaded fixtures:', fixturesData);
      
      // Debug broadcasting data
      fixturesData.forEach(fixture => {
        if (fixture.broadcasters && fixture.broadcasters.length > 0) {
          console.log(`Fixture ${fixture.id} has ${fixture.broadcasters.length} broadcasters:`, 
            fixture.broadcasters.map(b => b.abbreviation));
        }
      });
      
      setFixtures(fixturesData);
    } catch (err) {
      console.error(`Failed to fetch fixtures for gameweek ${gameweek}`, err);
      setError(`Failed to load fixtures for gameweek ${gameweek}. Please try again later.`);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Group fixtures by date
  const fixturesByDate = fixtures.reduce((acc, fixture) => {
    const date = fixture.kickoff_time 
      ? new Date(fixture.kickoff_time).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
      : 'Date TBD';
    
    if (!acc[date]) {
      acc[date] = [];
    }
    
    acc[date].push(fixture);
    return acc;
  }, {} as Record<string, Fixture[]>);

  // Sort dates
  const sortedDates = Object.keys(fixturesByDate).sort((a, b) => {
    if (a === 'Date TBD') return 1;
    if (b === 'Date TBD') return -1;
    return new Date(a).getTime() - new Date(b).getTime();
  });

  return (
    <div className="min-h-screen bg-light-background dark:bg-dark-background">
      <Header currentGameweek={currentGameweek} />
      
      <main className="container mx-auto py-8 px-4 text-light-text-primary dark:text-dark-text-primary">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
          <h1 className="text-2xl font-bold mb-4 md:mb-0">Premier League Fixtures</h1>
          
          <div className="relative">
            <select
              value={selectedGameweek || ''}
              onChange={(e) => handleGameweekChange(Number(e.target.value))}
              className="appearance-none bg-dark-card text-white border border-gray-700 py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ colorScheme: 'dark' }}
            >
              <option value="" disabled className="bg-dark-card text-white">Select Gameweek</option>
              {gameweeks.map((gw) => (
                <option key={gw} value={gw} className="bg-dark-card text-white">
                  Gameweek {gw}{gw === currentGameweek ? ' (Current)' : ''}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <svg className="h-4 w-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded-lg shadow">
            {error}
          </div>
        ) : fixtures.length === 0 ? (
          <div className="bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 p-4 rounded-lg shadow">
            No fixtures found for this gameweek.
          </div>
        ) : (
          <div className="space-y-8">
            {sortedDates.map((date) => (
              <div key={date} className="bg-light-card dark:bg-dark-card rounded-lg shadow overflow-hidden">
                <div className="bg-blue-600 text-white py-3 px-4">
                  <h2 className="font-bold">{date}</h2>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {fixturesByDate[date].map((fixture) => {
                    const homeTeam = teamMap[fixture.team_h];
                    const awayTeam = teamMap[fixture.team_a];
                    
                    return (
                      <div 
                        key={fixture.id} 
                        className="p-4 hover:bg-blue-50 dark:hover:bg-slate-700/20 transition-colors"
                      >
                        {/* Main fixture content with fixed structure */}
                        <div className="grid grid-cols-3 items-center">
                          {/* Home team - always in left column */}
                          <div className="flex items-center justify-end">
                            <span className="font-medium mr-3">{homeTeam?.name || 'TBD'}</span>
                            {homeTeam && (
                              <div className="w-8 h-8 relative">
                                <Image 
                                  src={getTeamCrestWithFallback(homeTeam)} 
                                  alt={homeTeam.name}
                                  width={32}
                                  height={32}
                                  className="object-contain"
                                  unoptimized
                                  onError={(e) => {
                                    console.error(`Image load error for team: ${homeTeam.short_name || homeTeam.name}`);
                                    const target = e.target as HTMLImageElement;
                                    target.src = '/images/placeholder-crest.svg';
                                  }}
                                />
                              </div>
                            )}
                          </div>
                          
                          {/* Score and time - always in center column */}
                          <div className="flex flex-col items-center">
                            {fixture.kickoff_time ? (
                              <>
                                <div className="text-gray-600 dark:text-gray-400 text-xs mb-1">
                                  {new Date(fixture.kickoff_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                {fixture.finished ? (
                                  <div className="bg-gray-200 dark:bg-slate-700 rounded-lg px-3 py-1 font-bold">
                                    {fixture.team_h_score} - {fixture.team_a_score}
                                  </div>
                                ) : (
                                  <div className="bg-gray-200 dark:bg-slate-700 rounded-lg px-3 py-1 font-bold">
                                    vs
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="bg-gray-200 dark:bg-slate-700 rounded-lg px-3 py-1 font-bold">
                                vs
                              </div>
                            )}
                          </div>
                          
                          {/* Away team - always in right column */}
                          <div className="flex items-center justify-start">
                            {awayTeam && (
                              <div className="w-8 h-8 relative">
                                <Image 
                                  src={getTeamCrestWithFallback(awayTeam)} 
                                  alt={awayTeam.name}
                                  width={32}
                                  height={32}
                                  className="object-contain"
                                  unoptimized
                                  onError={(e) => {
                                    console.error(`Image load error for team: ${awayTeam.short_name || awayTeam.name}`);
                                    const target = e.target as HTMLImageElement;
                                    target.src = '/images/placeholder-crest.svg';
                                  }}
                                />
                              </div>
                            )}
                            <span className="font-medium ml-3">{awayTeam?.name || 'TBD'}</span>
                          </div>
                        </div>
                        
                        {/* Broadcasting details - in separate row below */}
                        {fixture.broadcasters && fixture.broadcasters.length > 0 && (
                          <div className="mt-2 flex justify-center gap-1">
                            {fixture.broadcasters.map((broadcaster, index) => {
                              // Get the abbreviation, handling both direct abbreviation and tvShows
                              const abbreviation = broadcaster.abbreviation || 
                                (broadcaster.tvShows && broadcaster.tvShows.length > 0 ? broadcaster.tvShows[0].abbreviation : '');
                              
                              const broadcasterInfo = getBroadcasterInfo(abbreviation);
                              
                              // Use the URL from the API if available, otherwise use our default
                              const url = broadcaster.url || broadcasterInfo.url || '#';
                              
                              return (
                                <Link 
                                  key={index}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-block"
                                  title={broadcaster.name || broadcasterInfo.name}
                                >
                                  {broadcasterInfo.logo ? (
                                    <div 
                                      className="h-6 px-2 py-1 rounded flex items-center justify-center border border-gray-700" 
                                      style={{ 
                                        backgroundColor: broadcasterInfo.backgroundColor,
                                        color: broadcasterInfo.textColor
                                      }}
                                    >
                                      <div className="bg-white rounded p-0.5">
                                        <img 
                                          src={broadcasterInfo.logo} 
                                          alt={broadcaster.name || broadcasterInfo.name} 
                                          className="h-4 w-auto"
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    <div 
                                      className="h-6 px-2 py-1 rounded text-xs font-bold flex items-center justify-center border border-gray-700" 
                                      style={{ 
                                        backgroundColor: broadcasterInfo.backgroundColor,
                                        color: broadcasterInfo.textColor
                                      }}
                                    >
                                      {abbreviation}
                                    </div>
                                  )}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
} 