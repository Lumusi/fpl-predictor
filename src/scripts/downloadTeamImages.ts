import fs from 'fs';
import path from 'path';
import axios from 'axios';

const IMAGES_DIR = path.join(process.cwd(), 'public', 'images', 'teams');
const FPL_API_URL = 'https://fantasy.premierleague.com/api/bootstrap-static/';

// Make sure the directory exists
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Add a 1-second delay between requests to avoid rate limiting
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Directly fetch team data from FPL API (without using proxy)
async function getAllTeamsDirectly() {
  try {
    console.log(`Fetching team data from FPL API: ${FPL_API_URL}`);
    const response = await axios.get(FPL_API_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://fantasy.premierleague.com/',
      }
    });
    return response.data.teams;
  } catch (error) {
    console.error('Error fetching team data:', error);
    throw error;
  }
}

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
    const teams = await getAllTeamsDirectly();
    
    console.log(`Found ${teams.length} teams. Starting download...`);
    
    for (const team of teams) {
      console.log(`Processing team ${team.id}: ${team.name} (${team.short_name})`);
      
      // Download home shirt
      const homeUrl = `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${team.id}-110.png`;
      const homeFilepath = path.join(IMAGES_DIR, `team_${team.id}_home.png`);
      await downloadImage(homeUrl, homeFilepath);
      
      // Add delay between requests
      await sleep(1000);
      
      // Download away shirt
      const awayUrl = `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${team.id}_2-66.png`;
      const awayFilepath = path.join(IMAGES_DIR, `team_${team.id}_away.png`);
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