/**
 * Script to download manager images from the Premier League website
 * 
 * This script reads the manager data from the JSON file and downloads
 * the images to the public/images/managers directory.
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';

// Define paths
const MANAGERS_JSON_PATH = path.join(__dirname, '../../public/data/managers.json');
const DEST_DIR = path.join(__dirname, '../../public/images/managers');

// Interface for manager data
interface Manager {
  id: string;
  name: string;
  team: string;
  imageUrl: string;
}

// Function to ensure directory exists
function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

// Function to download an image
async function downloadImage(url: string, filePath: string): Promise<boolean> {
  try {
    // Check if file already exists
    if (fs.existsSync(filePath)) {
      console.log(`File already exists: ${filePath}`);
      return true;
    }

    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream'
    });

    // Check if we got a valid image response
    const contentType = response.headers['content-type'];
    if (!contentType || !contentType.startsWith('image/')) {
      console.error(`Invalid content type for ${url}: ${contentType}`);
      return false;
    }

    // Create write stream and pipe the response data
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise<boolean>((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`Downloaded: ${filePath}`);
        resolve(true);
      });
      writer.on('error', (err) => {
        console.error(`Error writing file ${filePath}:`, err);
        reject(false);
      });
    });
  } catch (error) {
    console.error(`Error downloading ${url}:`, error);
    return false;
  }
}

// Main function
async function main() {
  try {
    // Ensure the destination directory exists
    ensureDirectoryExists(DEST_DIR);

    // Read the managers JSON file
    if (!fs.existsSync(MANAGERS_JSON_PATH)) {
      console.error(`Managers JSON file not found: ${MANAGERS_JSON_PATH}`);
      return;
    }

    const managersData = fs.readFileSync(MANAGERS_JSON_PATH, 'utf8');
    const managers: Manager[] = JSON.parse(managersData);

    console.log(`Found ${managers.length} managers to download images for.`);

    // Download each manager image
    const downloadPromises = managers.map(async (manager) => {
      const fileName = `${manager.id}.png`;
      const filePath = path.join(DEST_DIR, fileName);
      
      console.log(`Downloading image for ${manager.name} (${manager.team})...`);
      const success = await downloadImage(manager.imageUrl, filePath);
      
      return {
        manager: manager.name,
        team: manager.team,
        id: manager.id,
        success
      };
    });

    // Wait for all downloads to complete
    const results = await Promise.all(downloadPromises);
    
    // Summary
    const successful = results.filter(r => r.success).length;
    console.log('\nDownload Summary:');
    console.log(`Total: ${results.length}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${results.length - successful}`);
    
    if (successful > 0) {
      console.log(`\nImages saved to: ${DEST_DIR}`);
    }
    
    // List any failures
    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
      console.log('\nFailed downloads:');
      failures.forEach(f => {
        console.log(`- ${f.manager} (${f.team}): ${f.id}`);
      });
    }
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

// Run the script
main();
