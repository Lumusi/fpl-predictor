import fs from 'fs';
import path from 'path';
import axios from 'axios';

const IMAGES_DIR = path.join(process.cwd(), 'public', 'images', 'teams');

// Make sure the directory exists
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Add a 1-second delay between requests to avoid rate limiting
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Known Premier League teams (2023-2024 season)
// Team ID mapping from FPL API
const TEAMS = [
  { id: 3, name: 'Arsenal', short_name: 'ARS' },
  { id: 7, name: 'Aston Villa', short_name: 'AVL' },
  { id: 91, name: 'Bournemouth', short_name: 'BOU' },
  { id: 94, name: 'Brentford', short_name: 'BRE' },
  { id: 36, name: 'Brighton', short_name: 'BHA' }, 
  { id: 8, name: 'Chelsea', short_name: 'CHE' },
  { id: 31, name: 'Crystal Palace', short_name: 'CRY' },
  { id: 11, name: 'Everton', short_name: 'EVE' },
  { id: 54, name: 'Fulham', short_name: 'FUL' },
  { id: 40, name: 'Ipswich', short_name: 'IPW' },
  { id: 13, name: 'Leicester', short_name: 'LEI' },
  { id: 14, name: 'Liverpool', short_name: 'LIV' },
  { id: 43, name: 'Man City', short_name: 'MCI' },
  { id: 1, name: 'Man Utd', short_name: 'MUN' },
  { id: 4, name: 'Newcastle', short_name: 'NEW' },
  { id: 17, name: 'Nott\'m Forest', short_name: 'NFO' },
  { id: 20, name: 'Southampton', short_name: 'SOU' },
  { id: 6, name: 'Spurs', short_name: 'TOT' },
  { id: 21, name: 'West Ham', short_name: 'WHU' },
  { id: 39, name: 'Wolves', short_name: 'WOL' }
];

async function downloadImage(url: string, filepath: string): Promise<void> {
  try {
    console.log(`Downloading ${url}`);
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'arraybuffer',
      headers: {
        'Referer': 'https://fantasy.premierleague.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    fs.writeFileSync(filepath, response.data);
    console.log(`Downloaded: ${filepath}`);
  } catch (error) {
    console.error(`Failed to download ${url}: ${error}`);
  }
}

async function downloadTeamImages() {
  try {
    console.log(`Starting download for ${TEAMS.length} teams...`);
    
    // Special focus on problematic teams
    console.log('\n=== SPECIAL FOCUS ===');
    console.log('Leicester (LEI): ID = 13');
    console.log('Liverpool (LIV): ID = 14');
    console.log('Everton (EVE): ID = 11');
    console.log('====================\n');
    
    for (const team of TEAMS) {
      console.log(`Processing team ${team.id}: ${team.name} (${team.short_name})`);
      
      // Check for problematic teams
      if (team.id === 13 || team.id === 14 || team.id === 11) {
        console.log(`⚠️ SPECIAL ATTENTION: Team ${team.id}: ${team.name} (${team.short_name})`);
      }
      
      // Download home shirt
      const homeUrl = `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${team.id}-110.png`;
      const homeFilepath = path.join(IMAGES_DIR, `team_${team.id}_home.png`);
      await downloadImage(homeUrl, homeFilepath);
      
      // Add delay between requests
      await sleep(1000);
      
      // Try alternative URL format for goalkeepers shirts
      const awayUrl = `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${team.id}_1-220.png`;
      const awayFilepath = path.join(IMAGES_DIR, `team_${team.id}_keeper.png`);
      await downloadImage(awayUrl, awayFilepath);
      
      // Add delay between requests
      await sleep(1000);
      
      // Download team crest
      const crestUrl = `https://resources.premierleague.com/premierleague/badges/t${team.id}.png`;
      const crestFilepath = path.join(IMAGES_DIR, `team_${team.id}_crest.png`);
      await downloadImage(crestUrl, crestFilepath);
      
      // Add delay between teams
      await sleep(1000);
      
      console.log(`Completed downloads for team ${team.id} (${team.name})`);
    }
    
    console.log('All team images downloaded successfully!');
  } catch (error) {
    console.error('Error downloading team images:', error);
  }
}

// Run the download function
downloadTeamImages();