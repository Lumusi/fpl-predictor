import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import querystring from 'querystring';

const FPL_API_URL = 'https://fantasy.premierleague.com/api';

// Function to try different endpoints to get authenticated team data
const tryGetTeamData = async (teamId: string, cookieHeader: string) => {
  // Try different endpoints that might work
  const endpoints = [
    `/my-team/${teamId}/`,
    `/entry/${teamId}/`,
    `/entry/${teamId}/event/1/picks/`, // Directly try picks for event 1
  ];
  
  let lastError: any = null;
  
  for (const endpoint of endpoints) {
    try {
      console.log(`FPL Auth: Trying endpoint ${FPL_API_URL}${endpoint}`);
      
      const response = await fetch(`${FPL_API_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Cookie': cookieHeader,
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
        },
        credentials: 'include',
      });
      
      // If we got a valid response
      if (response.ok) {
        const data = await response.json();
        console.log(`FPL Auth: Successfully fetched data from ${endpoint}`);
        return { success: true, data, endpoint, response };
      }
    } catch (err: any) {
      console.error(`FPL Auth: Error with endpoint ${endpoint}:`, err.message);
      lastError = err;
      
      // If we get 401/403, no point in trying other endpoints
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        console.log(`FPL Auth: Authentication error (${err.response.status}), stopping endpoint attempts`);
        break;
      }
    }
  }
  
  throw lastError;
};

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: Request) {
  const response = new NextResponse(null, { status: 200 });
  
  // Set CORS headers
  const origin = request.headers.get('origin') || '*';
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  
  return response;
}

// New endpoint to verify existing session
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const action = searchParams.get('action');
    
    // Special endpoint to check if the user is logged in with a valid FPL session
    if (action === 'verify') {
      console.log('FPL Auth: Verifying session from browser cookies');
      
      // Get cookies directly from request
      const cookieHeader = request.headers.get('cookie') || '';
      
      // Log all cookies for debugging (without showing values)
      const allCookies = cookieHeader.split(';').map(c => c.trim().split('=')[0]);
      
      // Check for any of the possible FPL authentication cookies
      const hasPLProfile = cookieHeader.includes('pl_profile');
      const hasPLAuth = cookieHeader.includes('pl_auth');
      const hasPLSession = cookieHeader.includes('pl_session');
      const hasPLOpt = cookieHeader.includes('pl_opt');
      const hasPlaySession = cookieHeader.includes('playsession');
      
      const hasAnyCookie = hasPLProfile || hasPLAuth || hasPLSession || hasPLOpt || hasPlaySession;
      
      if (!hasAnyCookie) {
        console.log('FPL Auth: No FPL authentication cookies found in browser');
        
        // Create response with CORS and cookie policies
        const origin = request.headers.get('origin') || '*';
        const response = NextResponse.json({
          success: false,
          isLoggedIn: false,
          message: 'Not logged in to FPL. Please use the login form to authenticate.'
        });
        
        // Set CORS headers
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Credentials', 'true');
        
        return response;
      }
      
      // Verify the session by making a request to the FPL me endpoint
      try {
        console.log('FPL Auth: Making request to verify session');
        
        // Direct fetch request to better handle cookies
        const response = await fetch('https://fantasy.premierleague.com/api/me/', {
          method: 'GET',
          headers: {
            'Cookie': cookieHeader,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Referer': 'https://fantasy.premierleague.com/',
            'Origin': 'https://fantasy.premierleague.com',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          credentials: 'include',
        });
        
        if (!response.ok) {
          console.log(`FPL Auth: Verification response not OK: ${response.status}`);
          
          const origin = request.headers.get('origin') || '*';
          const nextResponse = NextResponse.json({
            success: false,
            isLoggedIn: false,
            message: 'Your FPL session couldn\'t be verified. Please try logging in again.'
          });
          
          // Set CORS headers
          nextResponse.headers.set('Access-Control-Allow-Origin', origin);
          nextResponse.headers.set('Access-Control-Allow-Credentials', 'true');
          
          return nextResponse;
        }
        
        const userData = await response.json();
        
        if (userData && userData.player) {
          console.log('FPL Auth: Valid session verified for user:', 
            userData.player.first_name, userData.player.last_name);
          
          const origin = request.headers.get('origin') || '*';
          const nextResponse = NextResponse.json({
            success: true,
            isLoggedIn: true,
            message: `Logged in as ${userData.player.first_name} ${userData.player.last_name}`,
            user: {
              name: `${userData.player.first_name} ${userData.player.last_name}`,
              id: userData.player.entry
            }
          });
          
          // Set CORS headers
          nextResponse.headers.set('Access-Control-Allow-Origin', origin);
          nextResponse.headers.set('Access-Control-Allow-Credentials', 'true');
          
          // Forward any cookies from the API response
          const responseCookies = response.headers.getSetCookie();
          if (responseCookies && responseCookies.length > 0) {
            console.log(`FPL Auth: Forwarding ${responseCookies.length} cookies from API response`);
            
            responseCookies.forEach(cookie => {
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
            });
          }
          
          return nextResponse;
        } else {
          console.log('FPL Auth: Session verification returned unexpected data');
          
          const origin = request.headers.get('origin') || '*';
          const nextResponse = NextResponse.json({
            success: false,
            isLoggedIn: false,
            message: 'Invalid response from FPL. Please try logging in again.'
          });
          
          // Set CORS headers
          nextResponse.headers.set('Access-Control-Allow-Origin', origin);
          nextResponse.headers.set('Access-Control-Allow-Credentials', 'true');
          
          return nextResponse;
        }
      } catch (error: any) {
        console.error('FPL Auth: Error during verification request:', error.message);
        
        const origin = request.headers.get('origin') || '*';
        const response = NextResponse.json({
          success: false,
          isLoggedIn: false,
          message: `Error verifying session: ${error.message?.substring(0, 100) || 'Unknown error'}`
        });
        
        // Set CORS headers
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Credentials', 'true');
        
        return response;
      }
    }
    
    // Handle team data request
    if (!teamId) {
      return NextResponse.json({ success: false, error: 'Team ID is required' }, { status: 400 });
    }
    
    console.log(`FPL Auth: Fetching authenticated data for team ${teamId}`);
    
    // Get the cookie from the request headers
    const cookieHeader = request.headers.get('cookie') || '';
    
    try {
      const result = await tryGetTeamData(teamId, cookieHeader);
      
      // Create the response
      const apiResponse = NextResponse.json({ 
        success: true, 
        data: result.data,
        endpoint: result.endpoint
      });
      
      // Forward any cookies from the API response if available
      if (result.response && result.response.headers.getSetCookie) {
        const responseCookies = result.response.headers.getSetCookie();
        if (responseCookies && responseCookies.length > 0) {
          console.log(`FPL Auth: Forwarding ${responseCookies.length} cookies from API response`);
          
          responseCookies.forEach(cookie => {
            const cookieNameValue = cookie.split(';')[0];
            const [name, ...valueParts] = cookieNameValue.split('=');
            const value = valueParts.join('=');
            
            apiResponse.cookies.set({
              name,
              value,
              path: '/',
              httpOnly: false,
              secure: true,
              sameSite: 'none'
            });
          });
        }
      }
      
      // Set CORS headers
      const origin = request.headers.get('origin') || '*';
      apiResponse.headers.set('Access-Control-Allow-Origin', origin);
      apiResponse.headers.set('Access-Control-Allow-Credentials', 'true');
      
      return apiResponse;
    } catch (error: any) {
      console.error('FPL Auth: Failed to fetch team data:', error);
      
      // Handle error responses based on status code
      let status = 500;
      let message = 'Failed to fetch team data';
      
      if (error.response) {
        status = error.response.status;
        
        if (status === 401 || status === 403) {
          message = 'Authentication required. Please log in to access team data.';
        } else if (status === 404) {
          message = `Team ID ${teamId} not found.`;
        }
      }
      
      const errorResponse = NextResponse.json(
        { success: false, error: message },
        { status }
      );
      
      // Set CORS headers
      const origin = request.headers.get('origin') || '*';
      errorResponse.headers.set('Access-Control-Allow-Origin', origin);
      errorResponse.headers.set('Access-Control-Allow-Credentials', 'true');
      
      return errorResponse;
    }
  } catch (error: any) {
    console.error('FPL Auth: Unexpected error:', error);
    
    const errorResponse = NextResponse.json(
      { success: false, error: 'Unexpected error occurred' },
      { status: 500 }
    );
    
    // Set CORS headers
    const origin = request.headers.get('origin') || '*';
    errorResponse.headers.set('Access-Control-Allow-Origin', origin);
    errorResponse.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return errorResponse;
  }
}

export async function POST(request: Request) {
  try {
    const { teamId } = await request.json();
    
    if (!teamId) {
      return NextResponse.json({ success: false, error: 'Team ID is required' }, { status: 400 });
    }
    
    console.log(`FPL Auth: Fetching team data for team ${teamId} via POST`);
    
    // Get the cookie from the request headers
    const cookieHeader = request.headers.get('cookie') || '';
    
    try {
      const result = await tryGetTeamData(teamId, cookieHeader);
      
      // Create the response
      const apiResponse = NextResponse.json({ 
        success: true, 
        data: result.data,
        endpoint: result.endpoint
      });
      
      // Forward any cookies from the API response if available
      if (result.response && result.response.headers.getSetCookie) {
        const responseCookies = result.response.headers.getSetCookie();
        if (responseCookies && responseCookies.length > 0) {
          console.log(`FPL Auth: Forwarding ${responseCookies.length} cookies from API response`);
          
          responseCookies.forEach(cookie => {
            const cookieNameValue = cookie.split(';')[0];
            const [name, ...valueParts] = cookieNameValue.split('=');
            const value = valueParts.join('=');
            
            apiResponse.cookies.set({
              name,
              value,
              path: '/',
              httpOnly: false,
              secure: true,
              sameSite: 'none'
            });
          });
        }
      }
      
      // Set CORS headers
      const origin = request.headers.get('origin') || '*';
      apiResponse.headers.set('Access-Control-Allow-Origin', origin);
      apiResponse.headers.set('Access-Control-Allow-Credentials', 'true');
      
      return apiResponse;
    } catch (error: any) {
      console.error('FPL Auth: Failed to fetch team data:', error);
      
      // Handle error responses based on status code
      let status = 500;
      let message = 'Failed to fetch team data';
      
      if (error.response) {
        status = error.response.status;
        
        if (status === 401 || status === 403) {
          message = 'Authentication required. Please log in to access team data.';
        } else if (status === 404) {
          message = `Team ID ${teamId} not found.`;
        }
      }
      
      const errorResponse = NextResponse.json(
        { success: false, error: message },
        { status }
      );
      
      // Set CORS headers
      const origin = request.headers.get('origin') || '*';
      errorResponse.headers.set('Access-Control-Allow-Origin', origin);
      errorResponse.headers.set('Access-Control-Allow-Credentials', 'true');
      
      return errorResponse;
    }
  } catch (error: any) {
    console.error('FPL Auth: Unexpected error:', error);
    
    const errorResponse = NextResponse.json(
      { success: false, error: 'Unexpected error occurred' },
      { status: 500 }
    );
    
    // Set CORS headers
    const origin = request.headers.get('origin') || '*';
    errorResponse.headers.set('Access-Control-Allow-Origin', origin);
    errorResponse.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return errorResponse;
  }
} 