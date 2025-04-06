/**
 * Script to find manager Opta codes from the bootstrap-static API
 * 
 * This script fetches data from the FPL API and extracts manager Opta codes,
 * then formats URLs for manager images in the Premier League format.
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Types
interface Team {
  id: number;
  name: string;
  short_name: string;
  manager?: string;
  code?: number;
}

interface Manager {
  id: string; // Opta code (e.g., "man52174")
  name: string;
  team: string;
  imageUrl: string;
}

// Base URL for FPL API
const FPL_API_URL = 'https://fantasy.premierleague.com/api';
const IMAGE_BASE_URL = 'https://resources.premierleague.com/premierleague/photos/players/110x140';

// Function to fetch bootstrap-static data
async function fetchBootstrapStatic() {
  try {
    console.log('Fetching data from bootstrap-static API...');
    const response = await axios.get(`${FPL_API_URL}/bootstrap-static/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching bootstrap-static data:', error);
    throw error;
  }
}

// Function to extract manager Opta codes
function extractManagerOptaCodes(data: any): Manager[] {
  const teams: Team[] = data.teams || [];
  const managers: Manager[] = [];
  
  console.log(`Found ${teams.length} teams in the data`);
  
  // Loop through all elements to find manager entries
  const elements = data.elements || [];
  console.log(`Scanning ${elements.length} elements for manager data...`);
  
  for (const element of elements) {
    // Check if the element has an opta_code that starts with "man"
    if (element.code && element.opta_code && element.opta_code.startsWith('man')) {
      const teamId = element.team;
      const team = teams.find(t => t.id === teamId);
      
      if (team) {
        const manager: Manager = {
          id: element.opta_code,
          name: `${element.first_name} ${element.second_name}`,
          team: team.name,
          imageUrl: `${IMAGE_BASE_URL}/${element.opta_code}.png`
        };
        
        managers.push(manager);
        console.log(`Found manager: ${manager.name} (${manager.team}) - Opta code: ${manager.id}`);
      }
    }
  }
  
  // Alternative approach: look for specific manager entries
  console.log('\nLooking for specific manager entries...');
  for (const element of elements) {
    // Some managers might be listed with specific element_type or other indicators
    if (element.element_type === 5) { // Assuming 5 might be used for managers
      console.log(`Potential manager found: ${element.first_name} ${element.second_name}`);
    }
  }
  
  return managers;
}

// Function to save manager data to file
function saveManagerData(managers: Manager[]) {
  const outputDir = path.join(__dirname, '../../public/data');
  const outputFile = path.join(outputDir, 'managers.json');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Save JSON file
  fs.writeFileSync(outputFile, JSON.stringify(managers, null, 2));
  console.log(`\nSaved manager data to ${outputFile}`);
  
  // Generate HTML with image URLs for easy viewing
  const htmlContent = generateHtml(managers);
  const htmlFile = path.join(__dirname, '../../manager-opta-codes.html');
  fs.writeFileSync(htmlFile, htmlContent);
  console.log(`Generated HTML file at ${htmlFile}`);
}

// Function to generate HTML for viewing manager data
function generateHtml(managers: Manager[]) {
  const managerCards = managers.map(manager => `
    <div class="manager-card">
      <h3>${manager.name}</h3>
      <p>Team: ${manager.team}</p>
      <p>Opta Code: ${manager.id}</p>
      <img src="${manager.imageUrl}" alt="${manager.name}" onerror="this.src='https://via.placeholder.com/110x140?text=Not+Found'">
      <div class="url-info">
        <p>Image URL:</p>
        <code>${manager.imageUrl}</code>
        <button onclick="copyToClipboard('${manager.imageUrl}')">Copy URL</button>
      </div>
    </div>
  `).join('');
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Premier League Manager Opta Codes</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        h1, h2 {
          color: #37003c;
        }
        .container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }
        .manager-card {
          background-color: white;
          border-radius: 8px;
          padding: 15px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .manager-card img {
          width: 110px;
          height: 140px;
          object-fit: cover;
          margin: 10px 0;
          border: 1px solid #ddd;
        }
        .url-info {
          margin-top: 10px;
          background-color: #f8f9fa;
          padding: 10px;
          border-radius: 4px;
        }
        code {
          display: block;
          background-color: #eee;
          padding: 8px;
          margin: 5px 0;
          border-radius: 4px;
          word-break: break-all;
          font-size: 12px;
        }
        button {
          background-color: #37003c;
          color: white;
          border: none;
          padding: 5px 10px;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 5px;
        }
        .info-section {
          background-color: #e6f7ff;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          border-left: 5px solid #1890ff;
        }
      </style>
    </head>
    <body>
      <h1>Premier League Manager Opta Codes</h1>
      
      <div class="info-section">
        <h2>About Manager Opta Codes</h2>
        <p>This page displays Premier League managers with their Opta codes extracted from the FPL API.</p>
        <p>Manager image URLs follow the format: <code>https://resources.premierleague.com/premierleague/photos/players/110x140/man[CODE].png</code></p>
        <p>Where <code>man[CODE]</code> is the manager's Opta code (e.g., man52174 for Mikel Arteta).</p>
      </div>
      
      <div class="container">
        ${managerCards}
      </div>
      
      <script>
        function copyToClipboard(text) {
          navigator.clipboard.writeText(text).then(() => {
            alert('URL copied to clipboard!');
          }).catch(err => {
            console.error('Failed to copy URL: ', err);
          });
        }
      </script>
    </body>
    </html>
  `;
}

// Main function
async function main() {
  try {
    console.log('Starting manager Opta code extraction...');
    const data = await fetchBootstrapStatic();
    const managers = extractManagerOptaCodes(data);
    
    if (managers.length > 0) {
      console.log(`\nFound ${managers.length} managers with Opta codes:`);
      managers.forEach(manager => {
        console.log(`- ${manager.name} (${manager.team}): ${manager.id}`);
        console.log(`  Image URL: ${manager.imageUrl}`);
      });
      
      saveManagerData(managers);
    } else {
      console.log('\nNo manager Opta codes found in the API data.');
      console.log('The API might not include manager data or the format has changed.');
      
      // Fallback to the existing manager data from the other script
      console.log('\nUsing fallback manager data from existing script...');
      const fallbackManagers = getFallbackManagerData();
      console.log(`Found ${fallbackManagers.length} managers in fallback data.`);
      saveManagerData(fallbackManagers);
    }
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

// Fallback manager data from existing script
function getFallbackManagerData(): Manager[] {
  return [
    { id: 'man52174', name: 'Mikel Arteta', team: 'Arsenal', imageUrl: 'https://resources.premierleague.com/premierleague/photos/players/110x140/man52174.png' },
    { id: 'man40342', name: 'Unai Emery', team: 'Aston Villa', imageUrl: 'https://resources.premierleague.com/premierleague/photos/players/110x140/man40342.png' },
    { id: 'man37974', name: 'Andoni Iraola', team: 'Bournemouth', imageUrl: 'https://resources.premierleague.com/premierleague/photos/players/110x140/man37974.png' },
    { id: 'man50525', name: 'Thomas Frank', team: 'Brentford', imageUrl: 'https://resources.premierleague.com/premierleague/photos/players/110x140/man50525.png' },
    { id: 'man40383', name: 'Fabian Hürzeler', team: 'Brighton', imageUrl: 'https://resources.premierleague.com/premierleague/photos/players/110x140/man40383.png' },
    { id: 'man279', name: 'Enzo Maresca', team: 'Chelsea', imageUrl: 'https://resources.premierleague.com/premierleague/photos/players/110x140/man279.png' },
    { id: 'man40836', name: 'Oliver Glasner', team: 'Crystal Palace', imageUrl: 'https://resources.premierleague.com/premierleague/photos/players/110x140/man40836.png' },
    { id: 'man1033', name: 'Sean Dyche', team: 'Everton', imageUrl: 'https://resources.premierleague.com/premierleague/photos/players/110x140/man1033.png' },
    { id: 'man40387', name: 'Marco Silva', team: 'Fulham', imageUrl: 'https://resources.premierleague.com/premierleague/photos/players/110x140/man40387.png' },
    { id: 'man51539', name: 'Kieran McKenna', team: 'Ipswich', imageUrl: 'https://resources.premierleague.com/premierleague/photos/players/110x140/man51539.png' },
    { id: 'man51806', name: 'Steve Cooper', team: 'Leicester', imageUrl: 'https://resources.premierleague.com/premierleague/photos/players/110x140/man51806.png' },
    { id: 'man134', name: 'Arne Slot', team: 'Liverpool', imageUrl: 'https://resources.premierleague.com/premierleague/photos/players/110x140/man134.png' },
    { id: 'man37691', name: 'Pep Guardiola', team: 'Man City', imageUrl: 'https://resources.premierleague.com/premierleague/photos/players/110x140/man37691.png' },
    { id: 'man40805', name: 'Erik ten Hag', team: 'Man Utd', imageUrl: 'https://resources.premierleague.com/premierleague/photos/players/110x140/man40805.png' },
    { id: 'man1073', name: 'Eddie Howe', team: 'Newcastle', imageUrl: 'https://resources.premierleague.com/premierleague/photos/players/110x140/man1073.png' },
    { id: 'man40834', name: 'Nuno Espírito Santo', team: 'Nottingham Forest', imageUrl: 'https://resources.premierleague.com/premierleague/photos/players/110x140/man40834.png' },
    { id: 'man51811', name: 'Russell Martin', team: 'Southampton', imageUrl: 'https://resources.premierleague.com/premierleague/photos/players/110x140/man51811.png' },
    { id: 'man40349', name: 'Ange Postecoglou', team: 'Tottenham', imageUrl: 'https://resources.premierleague.com/premierleague/photos/players/110x140/man40349.png' },
    { id: 'man51810', name: 'Julen Lopetegui', team: 'West Ham', imageUrl: 'https://resources.premierleague.com/premierleague/photos/players/110x140/man51810.png' },
    { id: 'man40333', name: 'Gary O\'Neil', team: 'Wolves', imageUrl: 'https://resources.premierleague.com/premierleague/photos/players/110x140/man40333.png' }
  ];
}

// Run the script
main();
