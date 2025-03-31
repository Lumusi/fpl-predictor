import axios from 'axios';
import * as readline from 'readline';
import { randomUUID } from 'crypto';
import * as querystring from 'querystring';

interface Player {
  id: number;
  web_name: string;
  first_name: string;
  second_name: string;
  now_cost: number; // Current price in 0.1m units
  team: number;
  element_type: number;
}

interface UserTeamPicks {
  active_chip: string | null;
  entry_history: {
    event: number;
    points: number;
    total_points: number;
    rank: number;
    event_transfers: number;
    event_transfers_cost: number;
    bank: number; // in 0.1m units
    value: number; // in 0.1m units
  };
  picks: {
    element: number; // player id
    position: number; // position in team (1-15)
    multiplier: number; // captain (2) or vice-captain (1) or bench (0)
    is_captain: boolean;
    is_vice_captain: boolean;
    purchase_price: number; // Price player was purchased at (in 0.1m units)
    selling_price: number; // Price player can be sold for (in 0.1m units)
  }[];
}

// Store cookies between requests
const cookieJar: { [key: string]: string } = {};

// Create an axios instance with improved headers
const axiosInstance = axios.create({
  withCredentials: true,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive',
    'sec-ch-ua': '"Google Chrome";v="123", "Not:A-Brand";v="8"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"'
  }
});

// Intercept requests to include cookies
axiosInstance.interceptors.request.use(config => {
  if (Object.keys(cookieJar).length > 0) {
    const cookies = Object.entries(cookieJar)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
    
    config.headers['Cookie'] = cookies;
  }
  
  return config;
});

// Intercept responses to save cookies
axiosInstance.interceptors.response.use(response => {
  const setCookieHeaders = response.headers['set-cookie'];
  if (setCookieHeaders) {
    setCookieHeaders.forEach(cookieString => {
      const cookiePart = cookieString.split(';')[0];
      const [key, value] = cookiePart.split('=');
      if (key && value) {
        cookieJar[key] = value;
      }
    });
  }
  
  return response;
});

// Function to prompt for user input
function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Function to mask password input (shows *)
function promptPassword(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    process.stdout.write(question);
    
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    
    let password = '';
    
    stdin.on('data', (data) => {
      const char = data.toString();
      
      // Ctrl+C - exit
      if (char === '\u0003') {
        console.log('\nCancelled');
        process.exit(0);
      }
      
      // Enter - finish input
      if (char === '\r' || char === '\n') {
        stdin.setRawMode(false);
        stdin.pause();
        rl.close();
        console.log('');
        resolve(password);
        return;
      }
      
      // Backspace
      if (char === '\u0008' || char === '\u007f') {
        if (password.length > 0) {
          password = password.substring(0, password.length - 1);
          process.stdout.write('\b \b'); // erase character
        }
        return;
      }
      
      // Add to password and show asterisk
      password += char;
      process.stdout.write('*');
    });
  });
}

// Function to authenticate with FPL - improved version
async function authenticate(email: string, password: string): Promise<boolean> {
  try {
    console.log('Step 1: Getting initial cookies...');
    
    // First visit the main site to get cookies
    const initialResponse = await axiosInstance.get('https://fantasy.premierleague.com/', {
      maxRedirects: 5
    });
    
    console.log('Step 2: Accessing login page...');
    
    // Visit the login page
    const loginPageUrl = 'https://users.premierleague.com/accounts/login/';
    const loginPageResponse = await axiosInstance.get(loginPageUrl, {
      headers: {
        'Referer': 'https://fantasy.premierleague.com/'
      }
    });
    
    // Check if we can extract CSRF token
    let csrfToken = '';
    const csrfMatch = loginPageResponse.data.match(/name="csrfmiddlewaretoken" value="([^"]+)"/);
    if (csrfMatch && csrfMatch[1]) {
      csrfToken = csrfMatch[1];
      console.log('Found CSRF token');
    } else {
      console.log('CSRF token not found, proceeding without it');
    }
    
    console.log('Step 3: Submitting login credentials...');
    
    // Now login
    const loginUrl = 'https://users.premierleague.com/accounts/login/';
    
    // Create a payload with all the fields a browser would send
    const payload = {
      'csrfmiddlewaretoken': csrfToken,
      'login': email,
      'password': password,
      'redirect_uri': 'https://fantasy.premierleague.com/',
      'app': 'plfpl-web'
    };
    
    // Set proper headers for the login form
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': 'https://users.premierleague.com/accounts/login/',
      'Origin': 'https://users.premierleague.com'
    };
    
    // Perform the login
    const loginResponse = await axiosInstance.post(
      loginUrl, 
      querystring.stringify(payload),
      { 
        headers, 
        maxRedirects: 5,
        validateStatus: status => status < 500 // Accept any status code below 500
      }
    );
    
    // Check response data for potential error messages
    if (loginResponse.data && typeof loginResponse.data === 'string') {
      if (loginResponse.data.includes('Your username and password do not match')) {
        console.error('Authentication failed: Invalid username or password');
        return false;
      }
    }
    
    console.log(`Login response status: ${loginResponse.status}`);
    console.log('Step 4: Verifying login success...');
    
    // Verify login success - try to access authenticated endpoint
    try {
      const testResponse = await axiosInstance.get('https://fantasy.premierleague.com/api/me/', {
        headers: {
          'Referer': 'https://fantasy.premierleague.com/'
        }
      });
      
      if (testResponse.data && testResponse.data.player) {
        console.log(`Successfully logged in as user: ${testResponse.data.player.first_name} ${testResponse.data.player.last_name}`);
        return true;
      }
      
      console.error('Login verification failed: Me endpoint returned unexpected data');
      return false;
    } catch (error: any) {
      console.error('Login verification failed:', error.message);
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
      }
      return false;
    }
  } catch (error: any) {
    console.error('Authentication process failed:', error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
    }
    return false;
  }
}

// Function to fetch all players
async function getAllPlayers(): Promise<Player[]> {
  try {
    const response = await axiosInstance.get('https://fantasy.premierleague.com/api/bootstrap-static/');
    return response.data.elements;
  } catch (error) {
    console.error('Error fetching all players:', error);
    throw error;
  }
}

// Function to fetch user team picks for a specific gameweek
async function getUserTeamPicks(teamId: number, gameweek?: number): Promise<UserTeamPicks> {
  try {
    // If no gameweek is provided, get the current gameweek
    if (!gameweek) {
      const bootstrapResponse = await axiosInstance.get('https://fantasy.premierleague.com/api/bootstrap-static/');
      const currentEvent = bootstrapResponse.data.events.find((event: any) => event.is_current);
      gameweek = currentEvent ? currentEvent.id : 1;
    }
    
    const response = await axiosInstance.get(`https://fantasy.premierleague.com/api/entry/${teamId}/event/${gameweek}/picks/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching team picks for team ${teamId} in gameweek ${gameweek}:`, error);
    throw error;
  }
}

// Function to fetch the my-team data which contains selling prices
async function getMyTeamData(teamId: number): Promise<any> {
  try {
    console.log(`Fetching my-team data for team ${teamId}...`);
    
    // We need to visit the team page first to ensure cookies are set correctly
    await axiosInstance.get(`https://fantasy.premierleague.com/entry/${teamId}/event/9`);
    
    // This endpoint is only available when authenticated
    const response = await axiosInstance.get(`https://fantasy.premierleague.com/api/my-team/${teamId}/`, {
      headers: {
        'Referer': `https://fantasy.premierleague.com/entry/${teamId}/event/9`
      }
    });
    
    return response.data;
  } catch (error: any) {
    console.error(`Error fetching my-team data for team ${teamId}:`, error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
    }
    return null;
  }
}

async function displayPlayerValues(teamId: number) {
  try {
    // Get login credentials
    const email = await prompt('Enter your FPL email: ');
    const password = await promptPassword('Enter your FPL password: ');
    
    // Authenticate
    console.log('\nAuthenticating with the FPL website...');
    const authenticated = await authenticate(email, password);
    
    if (!authenticated) {
      console.error('Authentication failed. Using public API data only (no selling prices).');
    } else {
      console.log('Successfully authenticated!');
    }
    
    // Fetch team picks and all players
    console.log(`\nFetching data for team ID ${teamId}...`);
    const [teamData, allPlayers] = await Promise.all([
      getUserTeamPicks(teamId),
      getAllPlayers()
    ]);
    
    // Try to get my-team data (includes selling prices) - only works if authenticated
    let myTeamData = null;
    if (authenticated) {
      try {
        myTeamData = await getMyTeamData(teamId);
        
        if (myTeamData && myTeamData.picks) {
          console.log('Successfully retrieved team data with selling prices!');
        } else {
          console.log('Retrieved my-team data but it does not contain selling prices.');
        }
      } catch (error) {
        console.log('Could not retrieve my-team data with selling prices.');
      }
    }
    
    console.log(`\nTeam ID: ${teamId}`);
    console.log('Bank: £' + (teamData.entry_history?.bank / 10).toFixed(1) + 'm');
    console.log('Team Value: £' + (teamData.entry_history?.value / 10).toFixed(1) + 'm');
    console.log('\n==== PLAYER PRICES ====');
    
    // Sort players by position (GK -> DEF -> MID -> FWD)
    const sortedPicks = [...teamData.picks].sort((a, b) => {
      const playerA = allPlayers.find(p => p.id === a.element);
      const playerB = allPlayers.find(p => p.id === b.element);
      if (!playerA || !playerB) return 0;
      return playerA.element_type - playerB.element_type;
    });
    
    // Position map
    const positionMap: { [key: number]: string } = {
      1: "GK",
      2: "DEF",
      3: "MID",
      4: "FWD"
    };
    
    // Create a table of player data with prices
    const starters = sortedPicks.filter(pick => pick.position <= 11);
    const bench = sortedPicks.filter(pick => pick.position > 11);
    
    // Function to display a player row
    const displayPlayer = (pick: any, player: Player) => {
      const currentPrice = (player.now_cost / 10).toFixed(1);
      const captainLabel = pick.is_captain ? " (C)" : pick.is_vice_captain ? " (VC)" : "";
      const posLabel = positionMap[player.element_type] || "";
      
      // Get selling price from my-team data if available
      let sellPrice = "Not available";
      let purchasePrice = "Not available";
      
      if (myTeamData && myTeamData.picks) {
        const myTeamPick = myTeamData.picks.find((p: any) => p.element === player.id);
        if (myTeamPick) {
          if (myTeamPick.selling_price !== undefined) {
            sellPrice = `£${(myTeamPick.selling_price / 10).toFixed(1)}m`;
          }
          if (myTeamPick.purchase_price !== undefined) {
            purchasePrice = `£${(myTeamPick.purchase_price / 10).toFixed(1)}m`;
          }
        }
      }
      
      console.log(
        `${posLabel.padEnd(4)} ${player.web_name.padEnd(20)}${captainLabel.padEnd(5)} | ` +
        `Current: £${currentPrice}m | Purchase: ${purchasePrice} | Selling: ${sellPrice}`
      );
    };
    
    console.log('\n--- STARTING XI ---');
    starters.forEach(pick => {
      const player = allPlayers.find(p => p.id === pick.element);
      if (player) {
        displayPlayer(pick, player);
      }
    });
    
    console.log('\n--- BENCH ---');
    bench.forEach(pick => {
      const player = allPlayers.find(p => p.id === pick.element);
      if (player) {
        displayPlayer(pick, player);
      }
    });
    
    if (!authenticated || !myTeamData || !myTeamData.picks) {
      console.log(`\nNOTE: To get actual sell values, you need to authenticate with the account that owns team ID ${teamId}.`);
      console.log('The authentication may fail due to security measures implemented by the FPL website.');
      console.log('Try the following troubleshooting steps:');
      console.log('1. Make sure you\'re using the correct email and password');
      console.log('2. Use the actual team owner\'s credentials');
      console.log('3. Check if your account has 2FA enabled (script doesn\'t support 2FA)');
    }
    console.log('==============================\n');
  } catch (error: any) {
    console.error('Error fetching data:', error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
    }
  }
}

// Parse command line arguments
function parseArgs() {
  // Default team ID
  let teamId = 159122;
  
  // Check if team ID was provided via command line args
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--team' || args[i] === '-t') {
      if (i + 1 < args.length) {
        const parsedId = parseInt(args[i + 1], 10);
        if (!isNaN(parsedId)) {
          teamId = parsedId;
        }
      }
    }
  }
  
  return teamId;
}

// Get team ID from command line args or use default
const teamId = parseArgs();
console.log(`Fetching data for team ID: ${teamId}`);
displayPlayerValues(teamId); 