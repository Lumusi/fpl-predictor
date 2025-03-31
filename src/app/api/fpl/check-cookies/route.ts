import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // Get all cookies from the request
    const cookieHeader = request.headers.get('cookie') || '';
    
    // Check for FPL-specific cookies
    const hasPLProfile = cookieHeader.includes('pl_profile');
    const hasPLAuth = cookieHeader.includes('pl_auth');
    const hasPLSession = cookieHeader.includes('pl_session');
    const hasPlaySession = cookieHeader.includes('playsession');
    const hasPLOptIn = cookieHeader.includes('pl_opt');
    
    // Consider if any of the relevant cookies exist
    const hasFplCookies = hasPLProfile || hasPLAuth || hasPLSession || hasPlaySession || hasPLOptIn;
    
    console.log('Cookie check headers:', {
      hasPLProfile,
      hasPLAuth,
      hasPLSession,
      hasPlaySession,
      hasPLOptIn,
      hasFplCookies
    });
    
    // If we have cookies, try to get the user's team ID
    let teamId = null;
    let user = null;
    let isLoggedIn = false;
    let debugData = null;
    
    if (hasFplCookies) {
      try {
        // Add appropriate headers to mimic a browser request
        const headers = {
          'Cookie': cookieHeader,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Connection': 'keep-alive',
          'Referer': 'https://fantasy.premierleague.com/',
          'Origin': 'https://fantasy.premierleague.com',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-site'
        };
        
        // Try different API endpoints to extract user data
        // First, try the /me/ endpoint which should work if cookies are valid
        const response = await fetch('https://fantasy.premierleague.com/api/me/', {
          headers,
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          debugData = data;
          
          if (data.player) {
            user = {
              name: data.player.first_name + ' ' + data.player.last_name,
              id: data.player.entry
            };
            
            teamId = data.player.entry;
            isLoggedIn = true;
          }
        } else {
          console.log('FPL /me/ API returned error:', response.status);
          
          // If /me/ fails, try a general endpoint to check if cookies are working
          const bootstrapResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/', {
            headers,
            credentials: 'include'
          });
          
          // If this succeeds, cookies are partially working but not for authentication
          if (bootstrapResponse.ok) {
            console.log('FPL bootstrap API works, but user is likely not authenticated properly');
          } else {
            console.log('FPL bootstrap API also failed:', bootstrapResponse.status);
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    }
    
    // Return the result
    return NextResponse.json({
      hasFplCookies,
      teamId,
      user,
      isLoggedIn,
      cookies: {
        hasPLProfile,
        hasPLAuth,
        hasPLSession,
        hasPlaySession,
        hasPLOptIn
      },
      debugData: process.env.NODE_ENV === 'development' ? debugData : null
    });
    
  } catch (error) {
    console.error('Error checking FPL cookies:', error);
    return NextResponse.json({ 
      hasFplCookies: false,
      error: 'Error checking FPL cookies',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 