import { NextResponse } from 'next/server';
import axios from 'axios';

const FPL_API_URL = 'https://fantasy.premierleague.com/api';

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: Request) {
  const response = new NextResponse(null, { status: 200 });
  
  // Set CORS headers with credentials support
  const origin = request.headers.get('origin') || '*';
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  
  return response;
}

export async function GET(request: Request) {
  try {
    // Get the path parameter from the URL
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    
    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400 });
    }
    
    console.log(`FPL API request: ${FPL_API_URL}/${endpoint}`);
    
    // Get authentication cookies from the browser request
    const cookieHeader = request.headers.get('cookie') || '';
    
    // Log all cookies for debugging (without showing values)
    const allCookies = cookieHeader.split(';').map(c => c.trim().split('=')[0]);
    
    // Check for any of the possible FPL authentication cookies
    const hasPLProfile = cookieHeader.includes('pl_profile');
    const hasPLAuth = cookieHeader.includes('pl_auth');
    const hasPLSession = cookieHeader.includes('pl_session');
    const hasPLOpt = cookieHeader.includes('pl_opt');
    const hasPlaySession = cookieHeader.includes('playsession');
    
    const hasFplCookies = hasPLProfile || hasPLAuth || hasPLSession || hasPLOpt || hasPlaySession;
    
    // Require cookies for authenticated endpoints
    const isAuthEndpoint = endpoint.includes('/my-team/') || 
                           endpoint.includes('/entry/') || 
                           endpoint.includes('/me/');
    
    if (isAuthEndpoint && !hasFplCookies) {
      console.log('Authenticated endpoint requested without FPL cookies');
      return NextResponse.json({ 
        error: 'Authentication required. Please log in to the FPL website first.' 
      }, { status: 401 });
    }
    
    // Use fetch with explicit cookie handling instead of axios
    const headers = new Headers({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Connection': 'keep-alive',
      'Referer': 'https://fantasy.premierleague.com/',
      'Origin': 'https://fantasy.premierleague.com',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-site',
      'Pragma': 'no-cache',
      'Cache-Control': 'no-cache',
    });
    
    // Only add cookie header if we have cookies
    if (cookieHeader) {
      headers.set('Cookie', cookieHeader);
    }
    
    // Make the request to FPL API
    console.log(`Making request to ${FPL_API_URL}/${endpoint}`);
    const response = await fetch(`${FPL_API_URL}/${endpoint}`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });
    
    console.log(`FPL API response status: ${response.status}`);
    
    // Check for authentication errors
    if (response.status === 401 || response.status === 403) {
      console.error(`FPL API authentication failed with status ${response.status}`);
      
      // Try to read response body for better error details
      let errorDetails = '';
      try {
        const errorText = await response.text();
        errorDetails = errorText.substring(0, 100);
        console.log(`Error response: ${errorDetails}`);
      } catch (e) {
        console.log('Could not read error response body');
      }
      
      return NextResponse.json({ 
        error: 'Authentication required. Please log in to the FPL website first and ensure cookies are enabled.',
        details: errorDetails
      }, { status: response.status });
    }
    
    // Check for other errors
    if (response.status !== 200) {
      console.error(`FPL API returned status ${response.status}`);
      let errorMessage = 'Failed to fetch data from FPL API';
      
      if (response.status === 404) {
        errorMessage = 'FPL API endpoint not found';
      } else if (response.status >= 500) {
        errorMessage = 'FPL API server error';
      }
      
      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }
    
    // Parse the response JSON
    const responseData = await response.json();
    
    // If this is a team picks request, check for selling prices
    if (endpoint.includes('/picks/')) {
      console.log('Team picks response received');
      
      // Check if we have picks data
      if (responseData && responseData.picks && responseData.picks.length > 0) {
        console.log(`Number of picks: ${responseData.picks.length}`);
        
        // Log the first pick to check structure
        const firstPick = responseData.picks[0];
        console.log('First pick data: ' + JSON.stringify(firstPick));
        
        // Check for purchase_price and selling_price
        const hasPurchasePrice = 'purchase_price' in firstPick;
        const hasSellingPrice = 'selling_price' in firstPick;
        
        console.log(`Has purchase_price: ${hasPurchasePrice}`);
        console.log(`Has selling_price: ${hasSellingPrice}`);
        
        // If missing prices, we likely don't have proper authentication
        if (!hasPurchasePrice || !hasSellingPrice) {
          console.log('Warning: Team picks data is missing price information. Authentication failed.');
          return NextResponse.json({ 
            error: 'Could not retrieve selling prices. This usually means your FPL cookies are not working correctly.',
            rawData: responseData
          }, { status: 200 }); // Return 200 with error message and raw data so client can still use it
        }
      }
    }
    
    // Forward any new cookies from FPL API
    const newCookies = response.headers.getSetCookie();
    if (newCookies && newCookies.length > 0) {
      console.log(`Forwarding ${newCookies.length} new cookies from FPL API`);
    }
    
    // Create response with the data
    const nextResponse = NextResponse.json(responseData);
    
    // Forward any new cookies from the FPL API response
    if (newCookies && newCookies.length > 0) {
      for (const cookie of newCookies) {
        const cookieNameValue = cookie.split(';')[0];
        const [name, ...valueParts] = cookieNameValue.split('=');
        const value = valueParts.join('=');
        
        nextResponse.cookies.set({
          name,
          value,
          path: '/',
          httpOnly: false,
          secure: true,
          sameSite: 'none'
        });
      }
    }
    
    // Set CORS headers for the actual response
    const origin = request.headers.get('origin') || '*';
    nextResponse.headers.set('Access-Control-Allow-Origin', origin);
    nextResponse.headers.set('Access-Control-Allow-Credentials', 'true');
    
    // Return the data
    return nextResponse;
  } catch (error: any) {
    console.error('Error proxying request to FPL API:', error.message);
    
    let status = 500;
    let errorMessage = 'Failed to fetch data from FPL API';
    
    // More detailed error output
    return NextResponse.json({
      error: errorMessage,
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : null
    }, { status });
  }
} 