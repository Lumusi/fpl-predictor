import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const FPL_API_URL = 'https://fantasy.premierleague.com/api';
const COOKIE_NAME = 'fpl_auth_cookies';

export async function GET(
  request: Request,
  context: { params: { teamId: string } }
) {
  try {
    const teamId = context.params.teamId;
    
    // Validate team ID
    if (!teamId || isNaN(parseInt(teamId))) {
      return NextResponse.json(
        { error: 'Invalid team ID' },
        { status: 400 }
      );
    }
    
    try {
      // Work around the TypeScript issues with Next.js cookies API
      // @ts-ignore - Next.js typing issue
      const fplCookiesData = cookies().get(COOKIE_NAME);
      
      if (!fplCookiesData) {
        return NextResponse.json(
          { error: 'Not authenticated with FPL. Please log in first.' },
          { status: 401 }
        );
      }
      
      // Parse stored cookies
      const storedCookies = JSON.parse(fplCookiesData.value) as string[];
      
      // Make authenticated request to FPL API
      const response = await fetch(`${FPL_API_URL}/my-team/${teamId}/`, {
        headers: {
          'Cookie': storedCookies.join('; '),
          'Referer': 'https://fantasy.premierleague.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
      });
      
      if (!response.ok) {
        return NextResponse.json(
          { 
            error: `FPL API error: ${response.status}`,
            details: await response.text()
          },
          { status: response.status }
        );
      }
      
      const data = await response.json();
      
      // Check if we have picks with purchase/selling prices
      if (data && data.picks && data.picks.length > 0) {
        const firstPick = data.picks[0];
        const hasPurchasePrice = 'purchase_price' in firstPick;
        const hasSellingPrice = 'selling_price' in firstPick;
      }
      
      return NextResponse.json(data);
    } catch (error) {
      console.error('Error accessing cookies or parsing stored cookies:', error);
      return NextResponse.json(
        { error: 'Invalid cookie data. Please re-authenticate.' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error fetching authenticated team data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team data' },
      { status: 500 }
    );
  }
} 