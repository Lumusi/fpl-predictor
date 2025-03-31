'use client';

import { useState, useEffect } from 'react';
import { getLeagueTable, getTeamCrestUrl, getFixtures, Team, Fixture, getDirectTeamId } from '@/lib/services/fplApi';
import { useFplData } from '@/lib/hooks/useFplData';
import Header from '@/components/Header';
import Image from 'next/image';

// Helper function to determine form display
const getFormIcon = (result: string) => {
  switch (result.toUpperCase()) {
    case 'W':
      return <span className="w-5 h-5 flex items-center justify-center bg-green-500 text-white rounded-sm text-xs font-bold">W</span>;
    case 'L':
      return <span className="w-5 h-5 flex items-center justify-center bg-red-500 text-white rounded-sm text-xs font-bold">L</span>;
    case 'D':
      return <span className="w-5 h-5 flex items-center justify-center bg-yellow-500 text-white rounded-sm text-xs font-bold">D</span>;
    default:
      return <span className="w-5 h-5 flex items-center justify-center bg-gray-300 text-white rounded-sm text-xs font-bold">-</span>;
  }
};

// Get background color based on position
const getPositionStyle = (position: number) => {
  if (position === 1) {
    return 'bg-green-500/20'; // Champion
  } else if (position > 1 && position <= 4) {
    return 'bg-blue-500/20'; // Champions League
  } else if (position === 5) {
    return 'bg-orange-400/20'; // Europa League
  } else if (position >= 18) {
    return 'bg-red-500/20'; // Relegation zone
  }
  return '';
};

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

// Define form result type to include '-'
type FormResult = 'W' | 'L' | 'D' | '-';

export default function LeagueTablePage() {
  const { currentGameweek: fplCurrentGameweek } = useFplData();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<number, FormResult[]>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Get the league table and fixtures
        const [tableData, fixturesData] = await Promise.all([
          getLeagueTable(),
          getFixtures()
        ]);
        
        // Filter only completed fixtures
        const completedFixtures = fixturesData.filter(fixture => 
          fixture.finished === true && 
          fixture.team_h_score !== null && 
          fixture.team_a_score !== null
        );
        
        // Sort fixtures by gameweek (descending to get most recent first)
        completedFixtures.sort((a, b) => {
          if (!a.event || !b.event) return 0;
          return b.event - a.event;
        });
        
        // Calculate form for the last 5 matches for each team
        const teamFormData: Record<number, FormResult[]> = {};
        
        // Initialize empty form arrays for all teams
        tableData.forEach(team => {
          teamFormData[team.id] = [];
        });
        
        // Process fixtures to generate form
        tableData.forEach(team => {
          // Get fixtures where this team played
          const teamFixtures = completedFixtures.filter(fixture => 
            fixture.team_h === team.id || fixture.team_a === team.id
          );
          
          // Take the 5 most recent fixtures
          const recentFixtures = teamFixtures.slice(0, 5);
          
          // Calculate results
          const form = recentFixtures.map(fixture => {
            const isHome = fixture.team_h === team.id;
            const homeScore = fixture.team_h_score || 0;
            const awayScore = fixture.team_a_score || 0;
            
            if (isHome) {
              if (homeScore > awayScore) return 'W' as FormResult;
              if (homeScore < awayScore) return 'L' as FormResult;
              return 'D' as FormResult;
            } else {
              if (homeScore < awayScore) return 'W' as FormResult;
              if (homeScore > awayScore) return 'L' as FormResult;
              return 'D' as FormResult;
            }
          });
          
          // Pad with '-' if we have fewer than 5 matches
          while (form.length < 5) {
            form.push('-' as FormResult);
          }
          
          // Store form (reverse to show oldest to newest, left to right)
          teamFormData[team.id] = form.reverse() as FormResult[];
        });
        
        setFormData(teamFormData);
        setTeams(tableData);
      } catch (err) {
        console.error("Failed to fetch table data", err);
        setError("Failed to load table data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate positions for display (in case API doesn't provide them)
  const teamsWithPositions = teams.map((team, index) => ({
    ...team,
    position: index + 1
  }));

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header currentGameweek={fplCurrentGameweek || 0} />
      
      <main className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6">Premier League Table</h1>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-900/20 text-red-300 p-4 rounded-lg shadow">
            {error}
          </div>
        ) : teamsWithPositions.length === 0 ? (
          <div className="bg-yellow-900/20 text-yellow-300 p-4 rounded-lg shadow">
            No league data available. The season may not have started yet or there was an issue fetching the data.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm bg-gray-800 text-white rounded-lg shadow overflow-hidden border-collapse">
              <thead className="bg-gray-700 text-xs">
                <tr>
                  <th className="py-2 px-2 text-center w-10">#</th>
                  <th className="py-2 px-2 text-left">Team</th>
                  <th className="py-2 px-2 text-center">P</th>
                  <th className="py-2 px-2 text-center">W</th>
                  <th className="py-2 px-2 text-center">D</th>
                  <th className="py-2 px-2 text-center">L</th>
                  <th className="py-2 px-2 text-center">DIFF</th>
                  <th className="py-2 px-2 text-center">Goals</th>
                  <th className="py-2 px-2 text-center">Last 5</th>
                  <th className="py-2 px-2 text-center font-bold">PTS</th>
                </tr>
              </thead>
              <tbody>
                {teamsWithPositions.map((team, index) => (
                  <tr 
                    key={team.id} 
                    className={`
                      border-b border-gray-700 hover:bg-gray-600/40
                      ${getPositionStyle(team.position!)}
                    `}
                  >
                    <td className="py-2 px-2 text-center font-bold">{team.position}</td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 relative">
                          <Image 
                            src={getTeamCrestWithFallback(team)} 
                            alt={team.name}
                            width={24}
                            height={24}
                            className="object-contain"
                            unoptimized
                            priority={index < 10}
                            onError={(e) => {
                              console.error(`Image load error for team: ${team.short_name || team.name}`);
                              // Fallback if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.src = '/images/placeholder-crest.svg';
                            }}
                          />
                        </div>
                        <span className="font-bold">{team.short_name || team.name}</span>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-center">{team.played || 0}</td>
                    <td className="py-2 px-2 text-center">{team.win || 0}</td>
                    <td className="py-2 px-2 text-center">{team.draw || 0}</td>
                    <td className="py-2 px-2 text-center">{team.loss || 0}</td>
                    <td className="py-2 px-2 text-center">
                      <span className={team.goal_difference && team.goal_difference > 0 ? 'text-green-400' : 
                                       team.goal_difference && team.goal_difference < 0 ? 'text-red-400' : ''}>
                        {team.goal_difference && team.goal_difference > 0 ? '+' : ''}{team.goal_difference || 0}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center">{team.goals_for || 0}-{team.goals_against || 0}</td>
                    <td className="py-2 px-2">
                      <div className="flex gap-1 justify-center">
                        {formData[team.id] && formData[team.id].map((result, i) => (
                          <div key={i}>{getFormIcon(result)}</div>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-center font-bold">{team.points || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center mb-2">
              <div className="w-4 h-4 bg-green-500/20 rounded mr-2"></div>
              <span className="font-medium">Champion</span>
            </div>
            <p className="text-gray-400">Top team wins the Premier League.</p>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center mb-2">
              <div className="w-4 h-4 bg-blue-500/20 rounded mr-2"></div>
              <span className="font-medium">UEFA Champions League</span>
            </div>
            <p className="text-gray-400">Top 4 teams qualify for the Champions League group stage.</p>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center mb-2">
              <div className="w-4 h-4 bg-orange-400/20 rounded mr-2"></div>
              <span className="font-medium">UEFA Europa League</span>
            </div>
            <p className="text-gray-400">5th place team qualifies for the Europa League group stage.</p>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center mb-2">
              <div className="w-4 h-4 bg-red-500/20 rounded mr-2"></div>
              <span className="font-medium">Relegation</span>
            </div>
            <p className="text-gray-400">Bottom 3 teams are relegated to the Championship.</p>
          </div>
        </div>
      </main>
    </div>
  );
} 