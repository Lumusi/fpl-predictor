import { NextResponse } from 'next/server';
import axios from 'axios';
import { cookies } from 'next/headers';

// Handle FPL login callback
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    
    // Get all cookies from the request - these should include FPL authentication cookies
    const cookieHeader = request.headers.get('cookie') || '';
    
    // Check for FPL-specific cookies that indicate an authenticated session
    const hasPLProfile = cookieHeader.includes('pl_profile');
    const hasPLAuth = cookieHeader.includes('pl_auth');
    
    // Attempt to verify the login with the cookies
    if (hasPLProfile || hasPLAuth) {
      try {
        // Verify the cookies work by calling the FPL API
        const response = await axios.get('https://fantasy.premierleague.com/api/me/', {
          headers: {
            'Cookie': cookieHeader,
            'Referer': 'https://fantasy.premierleague.com/'
          }
        });
        
        // If we got a valid response, the login was successful
        if (response.data && response.data.player) {
          console.log('FPL Auth Callback: Login successful for user:', 
            response.data.player.first_name, response.data.player.last_name);
          
          // Extract the FPL-specific cookies to save in our app
          const cookiesArray = cookieHeader.split(';').map(c => c.trim());
          const fplCookies = cookiesArray.filter(c => 
            c.startsWith('pl_profile=') || 
            c.startsWith('pl_auth=') || 
            c.startsWith('pl_sessioncounter=') ||
            c.startsWith('pl_sessionid=')
          );
          
          // Store the FPL cookies for our response
          const fplCookieObj: Record<string, string> = {};
          fplCookies.forEach(cookie => {
            const [name, value] = cookie.split('=');
            if (name && value) {
              fplCookieObj[name] = value;
            }
          });
          
          // HTML with a script that will communicate back to the opener window
          const html = `
<!DOCTYPE html>
<html>
<head>
  <title>FPL Login - Successful</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      text-align: center;
    }
    .card {
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      padding: 20px;
      margin-top: 20px;
      background-color: white;
    }
    .success {
      color: #059669;
      font-weight: bold;
    }
    .button {
      display: inline-block;
      background-color: #3B82F6;
      color: white;
      padding: 10px 20px;
      border-radius: 4px;
      text-decoration: none;
      font-weight: 500;
      margin-top: 20px;
      cursor: pointer;
    }
    .button:hover {
      background-color: #2563EB;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Login Successful!</h1>
    <p class="success">You have successfully logged in to Fantasy Premier League</p>
    <p>You can now close this window and return to the application.</p>
    <button class="button" onclick="window.close()">Close Window</button>
  </div>

  <script>
    // Send a message to the parent window
    if (window.opener) {
      window.opener.postMessage({
        type: 'FPL_LOGIN_STATUS',
        success: true,
        user: {
          name: '${response.data.player.first_name} ${response.data.player.last_name}',
          id: ${response.data.player.entry || 0}
        }
      }, '*');
      
      // Auto-close the window after a short delay
      setTimeout(() => window.close(), 2000);
    }
  </script>
</body>
</html>
          `;
          
          // Create the response with cookies included
          const resp = new NextResponse(html, {
            headers: {
              'Content-Type': 'text/html',
            },
          });
          
          // Set cookies in the response
          Object.entries(fplCookieObj).forEach(([name, value]) => {
            resp.cookies.set(name, value, {
              path: '/',
              httpOnly: true,
              secure: true, // Always use secure for cross-site cookies
              maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
              sameSite: 'none'
            });
          });
          
          return resp;
          
        } else {
          console.log('FPL Auth Callback: Login verification returned unexpected data');
          // Generate HTML for error
          return generateErrorResponse('Login verification failed. Please try again.');
        }
      } catch (error: any) {
        console.error('FPL Auth Callback: Error verifying login:', error.message);
        return generateErrorResponse('Error verifying your login. Please try again.');
      }
    } else {
      console.log('FPL Auth Callback: No FPL authentication cookies found');
      return generateErrorResponse('No FPL authentication cookies found. Please log in to FPL and try again.');
    }
  } catch (error: any) {
    console.error('FPL Auth Callback: Error processing callback:', error.message);
    return generateErrorResponse('An error occurred during login. Please try again.');
  }
}

// Helper function to generate error response HTML
function generateErrorResponse(errorMessage: string) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>FPL Login - Error</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      text-align: center;
    }
    .card {
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      padding: 20px;
      margin-top: 20px;
      background-color: white;
    }
    .error {
      color: #DC2626;
      font-weight: bold;
    }
    .button {
      display: inline-block;
      background-color: #3B82F6;
      color: white;
      padding: 10px 20px;
      border-radius: 4px;
      text-decoration: none;
      font-weight: 500;
      margin-top: 20px;
      cursor: pointer;
    }
    .button:hover {
      background-color: #2563EB;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Login Error</h1>
    <p class="error">${errorMessage}</p>
    <p>Please close this window and try again.</p>
    <button class="button" onclick="window.close()">Close Window</button>
  </div>

  <script>
    // Send error message to parent window
    if (window.opener) {
      window.opener.postMessage({
        type: 'FPL_LOGIN_STATUS',
        success: false,
        message: '${errorMessage}'
      }, '*');
    }
  </script>
</body>
</html>
  `;
  
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
} 