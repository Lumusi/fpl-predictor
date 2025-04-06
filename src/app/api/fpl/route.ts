import { NextResponse } from 'next/server';
import axios from 'axios';

const FPL_API_URL = 'https://fantasy.premierleague.com/api';
const PL_API_URL = 'https://footballapi.pulselive.com/football';

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
    
    // Special handling for broadcasting-schedule endpoint
    if (endpoint.startsWith('broadcasting-schedule/')) {
      // Extract the full URL parameters
      const fullEndpoint = endpoint;
      console.log(`Direct broadcasting API request: ${PL_API_URL}/${fullEndpoint}`);
      
      // Get the original request headers to forward
      const requestHeaders = request.headers;
      
      // Create a more browser-like set of headers
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
        'Referer': 'https://www.premierleague.com/',
        'Origin': 'https://www.premierleague.com',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site',
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache',
      };
      
      // Forward any cookies from the original request
      const cookieHeader = requestHeaders.get('cookie');
      if (cookieHeader) {
        headers['Cookie'] = cookieHeader;
      }
      
      // Parse the URL to extract and validate date parameters
      const urlParams = new URLSearchParams(fullEndpoint.split('?')[1] || '');
      const startDate = urlParams.get('startDate');
      const endDate = urlParams.get('endDate');
      
      // Log the date parameters for debugging
      console.log(`Broadcasting request date parameters: startDate=${startDate}, endDate=${endDate}`);
      
      // Validate that we have date parameters and they are in the correct format
      if (startDate && endDate) {
        try {
          // Check if the dates are valid
          const startDateObj = new Date(startDate);
          const endDateObj = new Date(endDate);
          
          // Log the parsed dates for debugging
          console.log(`Parsed dates: startDate=${startDateObj.toISOString()}, endDate=${endDateObj.toISOString()}`);
          
          // Ensure the dates are for the current season (2024/2025)
          const currentSeasonStart = new Date('2024-07-01');
          if (startDateObj < currentSeasonStart) {
            console.warn(`Warning: startDate ${startDate} is before the current season start (2024-07-01)`);
          }
        } catch (e) {
          console.error(`Error parsing date parameters: ${e}`);
        }
      } else {
        console.warn('Warning: Broadcasting request missing date parameters');
      }
      
      // Log the full URL and headers for debugging
      console.log(`Making request to: ${PL_API_URL}/${fullEndpoint}`);
      console.log('Request headers:', JSON.stringify(headers));
      
      // Make direct request to the Premier League API
      const response = await fetch(`${PL_API_URL}/${fullEndpoint}`, {
        method: 'GET',
        headers,
        credentials: 'include',
      });
      
      console.log(`Broadcasting API response status: ${response.status}`);
      
      if (response.status !== 200) {
        console.error(`Broadcasting API returned status ${response.status}`);
        return NextResponse.json({ 
          error: 'Failed to fetch broadcasting data',
          url: `${PL_API_URL}/${fullEndpoint}`,
        }, { status: response.status });
      }
      
      const responseData = await response.json();
      
      // Log the full response data for debugging (truncated for brevity)
      console.log('Broadcasting API response:', JSON.stringify(responseData).substring(0, 200) + '...');
      
      // Check if we have content and it's an array
      if (responseData && responseData.content && Array.isArray(responseData.content) && responseData.content.length > 0) {
        // Log the first fixture date to verify we're getting the correct data
        const firstItem = responseData.content[0];
        if (firstItem.fixture && firstItem.fixture.kickoff && firstItem.fixture.kickoff.millis) {
          const fixtureDate = new Date(firstItem.fixture.kickoff.millis);
          console.log(`First fixture date in response: ${fixtureDate.toISOString()}`);
          
          // Check if this fixture is from a previous season
          const currentSeasonStart = new Date('2024-07-01');
          if (fixtureDate < currentSeasonStart) {
            console.warn(`WARNING: API returned historical data from ${fixtureDate.toISOString()}`);
            
            // Log all fixture dates to see the range
            const allDates = responseData.content
              .filter((item: any) => item.fixture && item.fixture.kickoff && item.fixture.kickoff.millis)
              .map((item: any) => new Date(item.fixture.kickoff.millis));
            
            if (allDates.length > 0) {
              const minDate = new Date(Math.min(...allDates.map((d: Date) => d.getTime())));
              const maxDate = new Date(Math.max(...allDates.map((d: Date) => d.getTime())));
              console.warn(`API returned fixtures from ${minDate.toISOString()} to ${maxDate.toISOString()}`);
              
              // Check if we have any fixtures from the current season
              const currentSeasonFixtures = allDates.filter((d: Date) => d >= currentSeasonStart);
              console.log(`Found ${currentSeasonFixtures.length} fixtures from current season out of ${allDates.length} total`);
            }
          }
        }
      }
      
      // Create response with the data
      const nextResponse = NextResponse.json(responseData);
      
      // Forward any cookies from the API response
      const newCookies = response.headers.getSetCookie();
      if (newCookies && newCookies.length > 0) {
        console.log(`Forwarding ${newCookies.length} cookies from broadcasting API`);
        for (const cookie of newCookies) {
          const cookieNameValue = cookie.split(';')[0];
          const [name, ...valueParts] = cookieNameValue.split('=');
          const value = valueParts.join('=');
          
          nextResponse.cookies.set({
            name,
            value,
            path: '/',
            httpOnly: false,
          });
        }
      }
      
      // Set CORS headers
      nextResponse.headers.set('Access-Control-Allow-Origin', '*');
      nextResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      nextResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      return nextResponse;
    }
    
    // Determine if this is a Premier League API request or FPL API request
    const isPLRequest = endpoint.startsWith('broadcasting-schedule/');
    const baseUrl = isPLRequest ? PL_API_URL : FPL_API_URL;
    const apiEndpoint = isPLRequest ? endpoint : endpoint;
    
    console.log(`API request: ${baseUrl}/${apiEndpoint}`);
    
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
      'Referer': isPLRequest ? 'https://www.premierleague.com/' : 'https://fantasy.premierleague.com/',
      'Origin': isPLRequest ? 'https://www.premierleague.com' : 'https://fantasy.premierleague.com',
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
    
    // Make the request to the API
    console.log(`Making request to ${baseUrl}/${apiEndpoint}`);
    const response = await fetch(`${baseUrl}/${apiEndpoint}`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });
    
    console.log(`API response status: ${response.status}`);
    
    // Check for authentication errors
    if (response.status === 401 || response.status === 403) {
      console.error(`API authentication failed with status ${response.status}`);
      
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
        error: 'Authentication required. Please log in to the website first and ensure cookies are enabled.',
        details: errorDetails
      }, { status: response.status });
    }
    
    // Check for other errors
    if (response.status !== 200) {
      console.error(`API returned status ${response.status}`);
      let errorMessage = 'Failed to fetch data from API';
      
      if (response.status === 404) {
        errorMessage = 'API endpoint not found';
      } else if (response.status >= 500) {
        errorMessage = 'API server error';
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
    
    // Forward any new cookies from API
    const newCookies = response.headers.getSetCookie();
    if (newCookies && newCookies.length > 0) {
      console.log(`Forwarding ${newCookies.length} new cookies from API`);
    }
    
    // Create response with the data
    const nextResponse = NextResponse.json(responseData);
    
    // Forward any new cookies from the API response
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
    console.error('Error proxying request to API:', error.message);
    
    let status = 500;
    let errorMessage = 'Failed to fetch data from API';
    
    // More detailed error output
    return NextResponse.json({
      error: errorMessage,
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : null
    }, { status });
  }
}