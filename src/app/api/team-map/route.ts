import { NextResponse } from 'next/server';
import axios from 'axios';

// Define a type for the team data
interface FplTeam {
  id: number;
  short_name: string;
  name: string;
}

// Cache for team data
let teamCache: Record<number, string> | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export async function GET() {
  try {
    const currentTime = Date.now();
    
    // Check if cache is valid
    if (teamCache && (currentTime - cacheTime) < CACHE_DURATION) {
      return NextResponse.json(teamCache);
    }
    
    // Fetch team data from FPL API
    const response = await axios.get('https://fantasy.premierleague.com/api/bootstrap-static/');
    const teams = response.data.teams;
    
    // Create a mapping of team IDs to team short names
    const teamMap = teams.reduce((map: Record<number, string>, team: FplTeam) => {
      map[team.id] = team.short_name;
      return map;
    }, {});
    
    // Update cache
    teamCache = teamMap;
    cacheTime = currentTime;
    
    return NextResponse.json(teamMap);
  } catch (error) {
    console.error('Error fetching team mapping data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team mapping data' }, 
      { status: 500 }
    );
  }
} 