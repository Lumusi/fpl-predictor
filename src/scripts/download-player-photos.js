const fs = require('fs');
const path = require('path');
const https = require('https');

// Directory to save player photos
const outputDir = path.join(__dirname, '../public/images/players');

// FPL API URL for bootstrap-static data
const FPL_API_URL = 'https://fantasy.premierleague.com/api/bootstrap-static/';

// Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`Created directory: ${outputDir}`);
}

/**
 * Fetch current player IDs from the FPL API
 * @returns {Promise<number[]>} Array of player IDs
 */
async function fetchPlayerIds() {
  console.log('Fetching current player IDs from FPL API...');
  
  return new Promise((resolve, reject) => {
    https.get(FPL_API_URL, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to fetch FPL data: HTTP status ${response.statusCode}`));
        return;
      }
      
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const fplData = JSON.parse(data);
          
          if (!fplData.elements || !Array.isArray(fplData.elements)) {
            reject(new Error('Invalid FPL data format: elements array not found'));
            return;
          }
          
          // Extract player IDs and code (photo ID) from the elements array
          const playerIds = fplData.elements.map(player => player.code);
          console.log(`Found ${playerIds.length} current players in FPL`);
          
          resolve(playerIds);
        } catch (error) {
          reject(new Error(`Failed to parse FPL data: ${error.message}`));
        }
      });
    }).on('error', (err) => {
      reject(new Error(`Failed to connect to FPL API: ${err.message}`));
    });
  });
}

/**
 * Download a player photo by player ID
 * @param {number} playerId - The Premier League player ID
 * @returns {Promise<void>}
 */
async function downloadPlayerPhoto(playerId) {
  const url = `https://resources.premierleague.com/premierleague/photos/players/250x250/p${playerId}.png`;
  const outputPath = path.join(outputDir, `${playerId}.png`);
  
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      // Check if the resource exists (200 status code)
      if (response.statusCode !== 200) {
        console.error(`Failed to download player ${playerId}: HTTP status ${response.statusCode}`);
        return resolve(); // Continue with the next player even if this one fails
      }
      
      const fileStream = fs.createWriteStream(outputPath);
      response.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`Downloaded player ${playerId} photo to ${outputPath}`);
        resolve();
      });
      
      fileStream.on('error', (err) => {
        fs.unlinkSync(outputPath); // Clean up partial file
        reject(err);
      });
    }).on('error', (err) => {
      console.error(`Error downloading player ${playerId}:`, err.message);
      resolve(); // Continue with the next player even if this one fails
    });
  });
}

/**
 * Download photos for specific player IDs
 * @param {number[]} playerIds - Array of player IDs to download
 */
async function downloadPlayerPhotos(playerIds) {
  console.log(`Starting download of ${playerIds.length} player photos...`);
  
  let successCount = 0;
  let failureCount = 0;
  
  for (const id of playerIds) {
    try {
      await downloadPlayerPhoto(id);
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
      successCount++;
    } catch (error) {
      console.error(`Error downloading player ${id}:`, error.message);
      failureCount++;
    }
  }
  
  console.log(`Download completed! Successfully downloaded: ${successCount}, Failed: ${failureCount}`);
}

/**
 * Main function to orchestrate the process
 */
async function main() {
  try {
    // Check for a mode flag
    const args = process.argv.slice(2);
    const modeFlag = args.find(arg => arg.startsWith('--mode='));
    
    if (modeFlag && modeFlag === '--mode=range') {
      // Original range-based mode
      const startId = parseInt(args[0]) || 1;
      const endId = parseInt(args[1]) || 300;
      console.log(`Running in range mode: IDs ${startId} to ${endId}`);
      
      const playerIds = [];
      for (let id = startId; id <= endId; id++) {
        playerIds.push(id);
      }
      
      await downloadPlayerPhotos(playerIds);
    } else {
      // Default mode - fetch current player IDs from FPL API
      console.log('Running in FPL API mode: fetching current player IDs');
      const playerIds = await fetchPlayerIds();
      await downloadPlayerPhotos(playerIds);
    }
  } catch (error) {
    console.error('Error in download process:', error.message);
    process.exit(1);
  }
}

// Start the process
main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});