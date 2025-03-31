import { NextResponse } from 'next/server';

// This endpoint handles FPL login flow
export async function GET() {
  // Redirect URL that the user will be sent to after logging in to FPL
  const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/fpl/login/callback`;
  
  // HTML page that will handle the redirection and cookie handling
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>FPL Login - Redirecting</title>
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
    .loading {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 2px solid rgba(0, 0, 0, 0.1);
      border-radius: 50%;
      border-top-color: #3B82F6;
      animation: spin 1s ease-in-out infinite;
      margin-right: 10px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
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
    <h1>FPL Login</h1>
    <p>You'll be redirected to the Fantasy Premier League login page. Please log in with your credentials.</p>
    <p>After logging in, you'll be redirected back to this application automatically.</p>
    <p><div class="loading"></div> Redirecting to FPL login page...</p>
  </div>

  <script>
    // Redirect to FPL login after a short delay
    setTimeout(() => {
      window.location.href = 'https://users.premierleague.com/accounts/login/?redirect_uri=${encodeURIComponent(redirectUrl)}';
    }, 1500);
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