const fs = require('fs');
const path = require('path');
const https = require('https');

// Directory to save player photos
const outputDir = path.join(__dirname, '../public/images/players');

// Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`Created directory: ${outputDir}`);
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

// Some known player IDs as an example - you can replace this with your actual list
// For example, these could be populated from an API call or a JSON file
const PLAYER_IDS = [
  118342,  // Example player ID from the URL you provided
  19760,   // Example player ID
  47431,   // Example player ID
  // Add more player IDs as needed
];

/**
 * Download photos for specific player IDs
 * @param {number[]} playerIds - Array of player IDs to download
 */
async function downloadSpecificPlayers(playerIds) {
  console.log(`Starting download of ${playerIds.length} player photos...`);
  
  for (const id of playerIds) {
    await downloadPlayerPhoto(id);
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('Download completed!');
}

// Start the download process
downloadSpecificPlayers(PLAYER_IDS).catch(err => {
  console.error('Error in download process:', err);
  process.exit(1);
}); 