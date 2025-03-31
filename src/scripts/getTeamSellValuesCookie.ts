import axios from 'axios';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

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
  }[];
}

interface MyTeamPick {
  element: number;
  position: number;
  selling_price: number;
  purchase_price: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
}

interface MyTeamData {
  picks: MyTeamPick[];
}

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

// Function to load or save cookies to a file
const COOKIE_FILE = path.join(__dirname, '.fpl-cookies.json');

function saveCookies(cookieString: string) {
  try {
    fs.writeFileSync(COOKIE_FILE, JSON.stringify({ cookie: cookieString }));
    console.log('Cookies saved for future use');
  } catch (error) {
    console.error('Failed to save cookies:', error);
  }
}

function loadCookies(): string | null {
  try {
    if (fs.existsSync(COOKIE_FILE)) {
      const data = fs.readFileSync(COOKIE_FILE, 'utf8');
      const cookies = JSON.parse(data);
      return cookies.cookie;
    }
  } catch (error) {
    console.error('Failed to load cookies:', error);
  }
  return null;
}

// Function to fetch all players
async function getAllPlayers(): Promise<Player[]> {
  try {
    const response = await axios.get('https://fantasy.premierleague.com/api/bootstrap-static/');
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
      const bootstrapResponse = await axios.get('https://fantasy.premierleague.com/api/bootstrap-static/');
      const currentEvent = bootstrapResponse.data.events.find((event: any) => event.is_current);
      gameweek = currentEvent ? currentEvent.id : 1;
    }
    
    const response = await axios.get(`https://fantasy.premierleague.com/api/entry/${teamId}/event/${gameweek}/picks/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching team picks for team ${teamId} in gameweek ${gameweek}:`, error);
    throw error;
  }
}

// Function to fetch my-team data using cookies
async function getMyTeamData(teamId: number, cookieString: string): Promise<MyTeamData | null> {
  try {
    console.log(`Fetching my-team data for team ${teamId} using cookies...`);
    
    const response = await axios.get(`https://fantasy.premierleague.com/api/my-team/${teamId}/`, {
      headers: {
        'Cookie': cookieString,
        'Referer': 'https://fantasy.premierleague.com/transfers'
      }
    });
    
    return response.data;
  } catch (error: any) {
    console.error(`Error fetching my-team data:`, error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      
      // If we get a 401/403, cookies might be expired
      if (error.response.status === 401 || error.response.status === 403) {
        console.error('Your cookies appear to be expired or invalid');
      }
    }
    return null;
  }
}

// Function to verify cookies are working by trying to fetch user data
async function verifyCookies(cookieString: string): Promise<boolean> {
  try {
    const response = await axios.get('https://fantasy.premierleague.com/api/me/', {
      headers: {
        'Cookie': cookieString,
        'Referer': 'https://fantasy.premierleague.com/'
      }
    });
    
    if (response.data && response.data.player) {
      console.log(`Cookies valid! Logged in as: ${response.data.player.first_name} ${response.data.player.last_name}`);
      return true;
    }
    
    console.log('Cookies didn\'t return expected user data');
    return false;
  } catch (error: any) {
    console.error('Error verifying cookies:', error.message);
    return false;
  }
}

async function displayPlayerValues(teamId: number) {
  try {
    // First, try to load existing cookies
    let cookieString = loadCookies();
    let cookiesValid = false;
    
    if (cookieString) {
      console.log('Found saved cookies, verifying...');
      cookiesValid = await verifyCookies(cookieString);
    }
    
    // If no cookies or they're invalid, prompt for new ones
    if (!cookiesValid) {
      console.log('\nNo valid cookies found. Please follow these steps:');
      console.log('1. Log in to https://fantasy.premierleague.com/ in your browser');
      console.log('2. Open developer tools (F12)');
      console.log('3. Go to Application tab → Cookies → https://fantasy.premierleague.com');
      console.log('4. Copy ALL cookies (right-click → Copy all as "Name=Value" string)');
      
      cookieString = await prompt('\nPaste your cookies here: ');
      cookiesValid = await verifyCookies(cookieString);
      
      if (cookiesValid) {
        saveCookies(cookieString);
      } else {
        console.error('The provided cookies are not valid. Using public API data only (no selling prices).');
      }
    }
    
    // Fetch team picks and all players
    console.log(`\nFetching data for team ID ${teamId}...`);
    const [teamData, allPlayers] = await Promise.all([
      getUserTeamPicks(teamId),
      getAllPlayers()
    ]);
    
    // Try to get my-team data (includes selling prices) - only works with valid cookies
    let myTeamData = null;
    if (cookiesValid && cookieString) {
      try {
        myTeamData = await getMyTeamData(teamId, cookieString);
        
        if (myTeamData && myTeamData.picks) {
          console.log('Successfully retrieved team data with selling prices!');
        } else {
          console.log('Retrieved my-team data but it doesn\'t contain expected data structure.');
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
    
    if (!cookiesValid || !myTeamData || !myTeamData.picks) {
      console.log(`\nNOTE: To get actual sell values, you need valid cookies from an account that has access to team ID ${teamId}.`);
      console.log('See the instructions above or README-FPL-AUTH.md for details.');
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