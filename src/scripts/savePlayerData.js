// Save this as src/scripts/savePlayerData.js

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Function to fetch all player data
async function getAllPlayers() {
  try {
    console.log('Fetching all player data...');
    const response = await axios.get('https://fantasy.premierleague.com/api/bootstrap-static/');
    console.log(`Retrieved ${response.data.elements.length} players from API`);
    return response.data.elements;
  } catch (error) {
    console.error('Error fetching all players:', error.message);
    throw error;
  }
}

// Function to fetch team picks (requires team ID)
async function getUserTeamPicks(teamId, gameweek) {
  try {
    console.log(`Fetching team data for team ID ${teamId}...`);
    // If no gameweek is provided, use the current gameweek
    if (!gameweek) {
      const bootstrapResponse = await axios.get('https://fantasy.premierleague.com/api/bootstrap-static/');
      const currentEvent = bootstrapResponse.data.events.find(event => event.is_current);
      gameweek = currentEvent ? currentEvent.id : 1;
      console.log(`Using current gameweek: ${gameweek}`);
    }
    
    const response = await axios.get(`https://fantasy.premierleague.com/api/entry/${teamId}/event/${gameweek}/picks/`);
    console.log('Team data retrieved successfully');
    return response.data;
  } catch (error) {
    console.error(`Error fetching team picks for team ${teamId} in gameweek ${gameweek}:`, error.message);
    if (error.response) {
      console.error(`Status code: ${error.response.status}`);
      console.error(`Response data:`, error.response.data);
    }
    throw error;
  }
}

// Save data to file
async function saveDataToFile() {
  try {
    console.log('Starting to save data...');
    console.log('Current working directory:', process.cwd());
    
    // Get all player data
    const players = await getAllPlayers();
    
    // Save players to file - create absolute path
    const outputDir = path.join(process.cwd(), 'data');
    console.log(`Output directory: ${outputDir}`);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      console.log(`Creating directory: ${outputDir}`);
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Save players data
    const playersFilePath = path.join(outputDir, 'players_data.json');
    console.log(`Writing player data to: ${playersFilePath}`);
    fs.writeFileSync(
      playersFilePath, 
      JSON.stringify(players, null, 2)
    );
    console.log(`Saved data for ${players.length} players to ${playersFilePath}`);
    
    // Optionally fetch team data if you have a team ID
    try {
      const teamId = 159122;
      console.log(`Attempting to fetch data for team ID: ${teamId}`);
      const teamData = await getUserTeamPicks(teamId);
      
      const teamFilePath = path.join(outputDir, 'team_data.json');
      console.log(`Writing team data to: ${teamFilePath}`);
      fs.writeFileSync(
        teamFilePath, 
        JSON.stringify(teamData, null, 2)
      );
      console.log(`Saved team data for team ${teamId} to ${teamFilePath}`);
    } catch (teamError) {
      console.error('Error with team data:', teamError.message);
      console.log('Continuing with player data only');
    }
  } catch (error) {
    console.error('Error in saveDataToFile function:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the script
console.log('Script started');
saveDataToFile().then(() => {
  console.log('Script completed successfully');
}).catch((error) => {
  console.error('Script failed:', error);
});