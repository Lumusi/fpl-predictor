'use client';

import { useState, useEffect } from 'react';
import { 
  getFixturesByGameweek, 
  getAllTeams, 
  Fixture, 
  Team,
  getTeamCrestUrl,
  getDirectTeamId
} from '@/lib/services/fplApi';
import { useFplData } from '@/lib/hooks/useFplData';
import Header from '@/components/Header';
import Image from 'next/image';

// Helper function to get team crest with fallback
const getTeamCrestWithFallback = (team: Team) => {
  try {
    // Special case for Ipswich (IPS)
    if (team.short_name === 'IPS' || team.short_name?.toLowerCase() === 'ips') {
      return `/images/teams/team_40_crest.png`;
    }
    
    // First try using the short_name for correct mapping (lowercase it to be safe)
    if (team.short_name) {
      try {
        return getTeamCrestUrl(team.short_name.toLowerCase());
      } catch (e) {
        // If this specific method fails, continue to next fallback
        console.log(`Fallback for ${team.short_name}: initial getTeamCrestUrl failed`);
      }
    }
    
    // If that fails, try using the full name
    if (team.name) {
      try {
        return getTeamCrestUrl(team.name.toLowerCase());
      } catch (e) {
        // If this specific method fails, continue to next fallback
        console.log(`Fallback for ${team.name}: name-based getTeamCrestUrl failed`);
      }
    }
    
    // Try using getDirectTeamId as fallback
    let directId = null;
    if (team.short_name) {
      directId = getDirectTeamId(team.short_name.toLowerCase());
    } 
    
    if (!directId && team.name) {
      directId = getDirectTeamId(team.name.toLowerCase());
    }
    
    if (directId) {
      return `/images/teams/team_${directId}_crest.png`;
    }
    
    // Manual mapping for known problematic teams
    const manualMap: Record<string, number> = {
      'IPS': 40,
      'ips': 40,
      'ipw': 40,
      'ipswich': 40
    };
    
    if (team.short_name && manualMap[team.short_name]) {
      return `/images/teams/team_${manualMap[team.short_name]}_crest.png`;
    }
    
    // Last resort - use the direct ID
    return `/images/teams/team_${team.id}_crest.png`;
  } catch (error) {
    console.error('Error getting team crest:', error);
    // Absolute fallback - placeholder image
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
            const fixturesData = await getFixturesByGameweek(fplCurrentGameweek);
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
      const fixturesData = await getFixturesByGameweek(gameweek);
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
              className="appearance-none bg-light-card dark:bg-dark-card border border-gray-200 dark:border-gray-700 py-2 pl-4 pr-10 rounded-lg text-light-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" disabled>Select Gameweek</option>
              {gameweeks.map((gw) => (
                <option key={gw} value={gw}>
                  Gameweek {gw}{gw === currentGameweek ? ' (Current)' : ''}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <svg className="h-4 w-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
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
                        <div className="flex flex-col md:flex-row items-center justify-between">
                          <div className="flex-1 text-center md:text-right mb-2 md:mb-0 flex items-center justify-end">
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
                          
                          <div className="mx-4 flex flex-col items-center">
                            {fixture.kickoff_time ? (
                              <>
                                <div className="text-gray-600 dark:text-gray-400 text-xs mb-1">
                                  {new Date(fixture.kickoff_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="bg-gray-200 dark:bg-slate-700 rounded-lg px-3 py-1 font-bold">
                                  vs
                                </div>
                              </>
                            ) : (
                              <div className="bg-gray-200 dark:bg-slate-700 rounded-lg px-3 py-1 font-bold">
                                vs
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 text-center md:text-left flex items-center">
                            {awayTeam && (
                              <div className="w-8 h-8 relative mr-3">
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
                            <span className="font-medium">{awayTeam?.name || 'TBD'}</span>
                          </div>
                        </div>
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