import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const FPL_LOGIN_URL = 'https://users.premierleague.com/accounts/login/';
const FPL_BASE_URL = 'https://fantasy.premierleague.com';
const FPL_API_URL = `${FPL_BASE_URL}/api`;

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

// Helper function to follow redirects manually and collect cookies along the way
async function followRedirectsAndCollectCookies(initialResponse: Response, maxRedirects = 5): Promise<{finalResponse: Response, allCookies: string[]}> {
  let currentResponse = initialResponse;
  let redirectCount = 0;
  let allCookieHeaders: string[] = [];
  
  // Collect initial cookies
  const initialCookies = currentResponse.headers.getSetCookie();
  if (initialCookies && initialCookies.length > 0) {
    allCookieHeaders = [...initialCookies];
    console.log(`Got ${initialCookies.length} initial cookies`);
  }
  
  // Follow redirects manually
  while (redirectCount < maxRedirects && 
         (currentResponse.status === 301 || currentResponse.status === 302 || currentResponse.status === 303 || currentResponse.status === 307 || currentResponse.status === 308)) {
    
    const location = currentResponse.headers.get('location');
    if (!location) {
      console.log('Redirect with no location header, stopping redirect chain');
      break;
    }
    
    console.log(`Following redirect ${redirectCount + 1} to: ${location}`);
    
    // Build the absolute URL if it's relative
    const redirectUrl = new URL(location, currentResponse.url).toString();
    
    // Extract cookies so far
    const cookieString = allCookieHeaders
      .map(cookie => cookie.split(';')[0])
      .join('; ');
    
    // Make the redirect request, including cookies we've collected
    currentResponse = await fetch(redirectUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': currentResponse.url,
        'Cookie': cookieString,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      redirect: 'manual',
      credentials: 'include'
    });
    
    // Collect any new cookies from this response
    const newCookies = currentResponse.headers.getSetCookie();
    if (newCookies && newCookies.length > 0) {
      console.log(`Got ${newCookies.length} cookies from redirect ${redirectCount + 1}`);
      allCookieHeaders = [...allCookieHeaders, ...newCookies];
    }
    
    redirectCount++;
  }
  
  console.log(`Followed ${redirectCount} redirects, collected ${allCookieHeaders.length} total cookies`);
  return { finalResponse: currentResponse, allCookies: allCookieHeaders };
}

// Store FPL cookies for later use
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      const errorResponse = NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
      
      // Set CORS headers
      const origin = request.headers.get('origin') || '*';
      errorResponse.headers.set('Access-Control-Allow-Origin', origin);
      errorResponse.headers.set('Access-Control-Allow-Credentials', 'true');
      
      return errorResponse;
    }
    
    // Include any existing cookies from the browser in our initial request
    const existingCookies = request.headers.get('cookie') || '';
    console.log('Existing cookies from browser:', existingCookies ? 'Present (not shown for security)' : 'None');
    
    // Improved FPL authentication flow
    try {
      console.log('Attempting FPL authentication');
      
      // Step 1: Initial login request with redirect follow
      const requestHeaders = new Headers();
      requestHeaders.append('Content-Type', 'application/x-www-form-urlencoded');
      requestHeaders.append('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
      requestHeaders.append('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7');
      requestHeaders.append('Accept-Language', 'en-US,en;q=0.9');
      requestHeaders.append('Origin', 'https://users.premierleague.com');
      requestHeaders.append('Referer', 'https://users.premierleague.com/accounts/login/');
      requestHeaders.append('Sec-Fetch-Dest', 'document');
      requestHeaders.append('Sec-Fetch-Mode', 'navigate');
      requestHeaders.append('Sec-Fetch-Site', 'same-origin');
      requestHeaders.append('Sec-Fetch-User', '?1');
      requestHeaders.append('Sec-Ch-Ua', '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"');
      requestHeaders.append('Sec-Ch-Ua-Mobile', '?0');
      requestHeaders.append('Sec-Ch-Ua-Platform', '"Windows"');
      requestHeaders.append('Upgrade-Insecure-Requests', '1');
      requestHeaders.append('Pragma', 'no-cache');
      requestHeaders.append('Cache-Control', 'no-cache');
      
      // Include existing cookies if available
      if (existingCookies) {
        requestHeaders.append('Cookie', existingCookies);
      }
      
      // Use URLSearchParams with required fields that FPL expects 
      const formData = new URLSearchParams({
        'login': email,
        'password': password,
        'app': 'plfpl-web',
        'redirect_uri': 'https://fantasy.premierleague.com/',
        // Add additional fields expected by the form
        'state': '',
        'scope': '',
        'response_type': 'code'
      });

      console.log('Sending login request to:', FPL_LOGIN_URL);
      
      // Making the initial login request - this should redirect to the redirect_uri
      const loginResponse = await fetch(FPL_LOGIN_URL, {
        method: 'POST',
        headers: requestHeaders, 
        body: formData.toString(),
        redirect: 'manual',  // Important: manual redirect handling
        credentials: 'include',
      });
      
      console.log('Initial login response status:', loginResponse.status);
      
      // Handle Cloudflare bot check (status 403) by notifying the user
      if (loginResponse.status === 403) {
        console.log('FPL authentication failed: Cloudflare protection detected');
        
        try {
          const responseText = await loginResponse.text();
          if (responseText.includes('Please enable JS') || responseText.includes('captcha')) {
            console.log('Cloudflare bot protection or captcha detected');
            
            const errorResponse = NextResponse.json(
              { 
                success: false, 
                error: 'FPL is blocking automated login attempts. Please use the "Login via FPL Site" option instead of direct login.' 
              },
              { status: 403 }
            );
            
            // Set CORS headers
            const origin = request.headers.get('origin') || '*';
            errorResponse.headers.set('Access-Control-Allow-Origin', origin);
            errorResponse.headers.set('Access-Control-Allow-Credentials', 'true');
            
            return errorResponse;
          }
        } catch (e) {
          console.log('Could not read login response body');
        }
      }
      
      // Check for a redirect status (302) which indicates successful login
      if (loginResponse.status !== 302) {
        console.log('FPL authentication failed: No redirect, status:', loginResponse.status);
        
        // Try to get response body for debugging
        try {
          const responseText = await loginResponse.text();
          console.log('Login response text preview:', responseText.substring(0, 500));
        } catch (e) {
          console.log('Could not read login response body');
        }
        
        const errorResponse = NextResponse.json(
          { 
            success: false, 
            error: 'Authentication failed. Please try the "Login via FPL Site" option instead.' 
          },
          { status: 401 }
        );
        
        // Set CORS headers
        const origin = request.headers.get('origin') || '*';
        errorResponse.headers.set('Access-Control-Allow-Origin', origin);
        errorResponse.headers.set('Access-Control-Allow-Credentials', 'true');
        
        return errorResponse;
      }
      
      // Get redirect location
      const redirectLocation = loginResponse.headers.get('location');
      console.log('Redirect location:', redirectLocation);
      
      // Extract all cookies from the initial response
      const initialCookieHeaders = loginResponse.headers.getSetCookie();
      console.log(`Got ${initialCookieHeaders.length} cookies from initial login response`);
      
      // Follow redirects and collect all cookies along the way
      console.log('Following redirects to collect all cookies...');
      const { allCookies } = await followRedirectsAndCollectCookies(loginResponse);
      
      if (!allCookies || allCookies.length === 0) {
        console.log('FPL authentication failed: No cookies collected from the entire flow');
        
        const errorResponse = NextResponse.json(
          { success: false, error: 'Authentication failed. No cookies received from FPL.' },
          { status: 401 }
        );
        
        // Set CORS headers
        const origin = request.headers.get('origin') || '*';
        errorResponse.headers.set('Access-Control-Allow-Origin', origin);
        errorResponse.headers.set('Access-Control-Allow-Credentials', 'true');
        
        return errorResponse;
      }
      
      // Process cookies - ensure each has a secure attribute and make them frontend-accessible
      const processedCookies = allCookies.map(cookie => {
        // Extract the name and value from the cookie
        const cookieParts = cookie.split(';');
        const nameValuePair = cookieParts[0].trim();
        const [name, ...valueParts] = nameValuePair.split('=');
        const value = valueParts.join('=');
        
        // Add attributes that ensure the cookie will be accessible to the frontend
        // and properly sent back to FPL.com
        let processed = nameValuePair;
        
        // Only add Path if not already present
        if (!cookie.includes('Path=')) {
          processed += '; Path=/';
        }
        
        // Add SameSite=None to allow cross-site requests
        if (!cookie.includes('SameSite=')) {
          processed += '; SameSite=None';
        }
        
        // Ensure Secure is set for cross-site cookies
        if (!cookie.includes('Secure')) {
          processed += '; Secure';
        }
        
        // Important: Do NOT set HttpOnly as it prevents JavaScript access
        // If it's already set to HttpOnly, we need to remove it
        if (cookie.includes('HttpOnly')) {
          processed = processed.replace('HttpOnly', '').replace(';;', ';');
        }
        
        return { name, value, processed };
      });
      
      // Step 3: Now try to validate by fetching user data with cookies
      console.log('Validating authentication by fetching user profile data...');
      
      // Combine all processed cookies into a single header
      const cookieString = processedCookies
        .map(c => c.processed.split(';')[0]) // Just use name=value part
        .join('; ');
      
      try {
        // Make a request to FPL API to get user info
        const meResponse = await fetch('https://fantasy.premierleague.com/api/me/', {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cookie': cookieString,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          credentials: 'include'
        });
        
        if (!meResponse.ok) {
          console.log(`Failed to validate FPL login: ${meResponse.status} ${meResponse.statusText}`);
          
          // Create error response
          const errorResponse = NextResponse.json(
            { success: false, error: 'Login failed: Could not access FPL API with cookies.' },
            { status: 401 }
          );
          
          // Set CORS headers
          const origin = request.headers.get('origin') || '*';
          errorResponse.headers.set('Access-Control-Allow-Origin', origin);
          errorResponse.headers.set('Access-Control-Allow-Credentials', 'true');
          
          return errorResponse;
        }
        
        const meData = await meResponse.json();
        
        if (meData && meData.player) {
          // We have successful authentication!
          const teamId = meData.player.entry;
          console.log(`Successfully authenticated as ${meData.player.first_name} ${meData.player.last_name}, Team ID: ${teamId}`);
          
          // Create success response
          const successResponse = NextResponse.json({
            success: true,
            message: `Successfully authenticated as ${meData.player.first_name} ${meData.player.last_name}`,
            teamId: teamId
          });
          
          // Add all the cookies to the response to be stored in the browser
          for (const cookieObj of processedCookies) {
            const { name, value } = cookieObj;
            
            // Add cookie to the response with correct attributes 
            successResponse.cookies.set({
              name,
              value, 
              path: '/',
              sameSite: 'none',
              secure: true,
              httpOnly: false  // Must be false so browser JS can access it
            });
            
            console.log(`Added cookie to response: ${name}`);
          }
          
          // Set CORS headers
          const origin = request.headers.get('origin') || '*';
          successResponse.headers.set('Access-Control-Allow-Origin', origin);
          successResponse.headers.set('Access-Control-Allow-Credentials', 'true');
          
          return successResponse;
        } else {
          console.log('Failed to validate FPL login: No player data in response');
          
          // Create error response
          const errorResponse = NextResponse.json(
            { success: false, error: 'Login failed: Invalid user data in FPL API response.' },
            { status: 401 }
          );
          
          // Set CORS headers
          const origin = request.headers.get('origin') || '*';
          errorResponse.headers.set('Access-Control-Allow-Origin', origin);
          errorResponse.headers.set('Access-Control-Allow-Credentials', 'true');
          
          return errorResponse;
        }
      } catch (validationError) {
        console.error('Error validating FPL login:', validationError);
        
        // Create error response
        const errorResponse = NextResponse.json(
          { success: false, error: 'Error validating FPL login' },
          { status: 500 }
        );
        
        // Set CORS headers
        const origin = request.headers.get('origin') || '*';
        errorResponse.headers.set('Access-Control-Allow-Origin', origin);
        errorResponse.headers.set('Access-Control-Allow-Credentials', 'true');
        
        return errorResponse;
      }
    } catch (error: any) {
      console.error('FPL authentication error:', error);
      
      // Create error response
      const errorResponse = NextResponse.json(
        { success: false, error: 'Authentication error: ' + (error.message || 'Unknown error') },
        { status: 500 }
      );
      
      // Set CORS headers
      const origin = request.headers.get('origin') || '*';
      errorResponse.headers.set('Access-Control-Allow-Origin', origin);
      errorResponse.headers.set('Access-Control-Allow-Credentials', 'true');
      
      return errorResponse;
    }
  } catch (e: any) {
    console.error('Unexpected error in fpl-auth POST:', e);
    
    // Create error response for unexpected errors
    const errorResponse = NextResponse.json(
      { success: false, error: 'Unexpected error: ' + (e.message || 'Unknown error') },
      { status: 500 }
    );
    
    // Set CORS headers
    const origin = request.headers.get('origin') || '*';
    errorResponse.headers.set('Access-Control-Allow-Origin', origin);
    errorResponse.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return errorResponse;
  }
}

// Check if we have valid FPL authentication cookies
export async function GET(request: Request) {
  try {
    // Get cookies from the HTTP request
    const cookieHeader = request.headers.get('cookie') || '';
    
    // First, check for the cookie header
    if (!cookieHeader) {
      console.log('FPL Auth GET: No cookies found in request');
      return NextResponse.json({ authenticated: false, message: 'No cookies found' });
    }
    
    // Log all cookies for debugging (without showing values)
    const allCookies = cookieHeader.split(';').map(c => c.trim().split('=')[0]);
    
    // Check for any of the possible FPL authentication cookies
    const hasPLProfile = cookieHeader.includes('pl_profile');
    const hasPLAuth = cookieHeader.includes('pl_auth');
    const hasPLSession = cookieHeader.includes('pl_session');
    const hasPLOpt = cookieHeader.includes('pl_opt');
    const hasPlaySession = cookieHeader.includes('playsession');
    
    // Determine if the user is authenticated based on presence of required cookies
    const hasAuthCookies = hasPLProfile || hasPLAuth || hasPLSession;
    
    // Return authentication status
    return NextResponse.json({ 
      authenticated: hasAuthCookies,
      message: hasAuthCookies ? 'Authenticated with FPL' : 'Not authenticated with FPL'
    });
  } catch (error) {
    console.error('Error checking FPL authentication status:', error);
    return NextResponse.json({ 
      authenticated: false, 
      message: 'Error checking authentication status'
    }, { status: 500 });
  }
} 