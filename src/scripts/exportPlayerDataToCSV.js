const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Base URL for FPL API
const FPL_API_URL = 'https://fantasy.premierleague.com/api';

// Function to fetch all data from the FPL API
async function fetchFplData() {
  try {
    console.log('Fetching data from FPL API...');
    const response = await axios.get(`${FPL_API_URL}/bootstrap-static/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching data from FPL API:', error);
    throw error;
  }
}

// Function to process player data and export to CSV
async function exportPlayersToCSV() {
  // Fetch data from FPL API
  const data = await fetchFplData();
  
  // Extract teams, positions and players
  const teams = data.teams;
  const positions = data.element_types;
  const players = data.elements;
  
  console.log(`Retrieved ${players.length} players, ${teams.length} teams, and ${positions.length} positions from the API`);
  
  // Create position map
  const positionMap = {};
  positions.forEach((pos) => {
    positionMap[pos.id] = pos.singular_name;
  });
  
  // Create team map
  const teamMap = {};
  teams.forEach((team) => {
    teamMap[team.id] = team.name;
  });
  
  // Enhance player data with team name and position
  const enhancedPlayers = players.map((player) => {
    return {
      ...player,
      team_name: teamMap[player.team],
      position: positionMap[player.element_type],
      price: (player.now_cost / 10).toFixed(1) // Convert to decimal format (e.g., 5.5)
    };
  });
  
  // Prepare CSV headers
  const headers = [
    'id',
    'first_name',
    'second_name',
    'web_name',
    'team',
    'team_name',
    'position',
    'price',
    'total_points',
    'minutes',
    'goals_scored',
    'assists',
    'clean_sheets',
    'bonus',
    'bps',
    'form',
    'points_per_game',
    'selected_by_percent',
    'ict_index',
    'influence',
    'creativity',
    'threat',
    'expected_goals',
    'expected_assists',
    'expected_goal_involvements',
    'expected_goals_conceded',
    'yellow_cards',
    'red_cards',
    'saves',
    'penalties_saved',
    'penalties_missed',
    'status',
    'chance_of_playing_next_round',
    'code'
  ];
  
  // Create CSV content
  let csvContent = headers.join(',') + '\n';
  
  enhancedPlayers.forEach((player) => {
    const row = headers.map(header => {
      const value = player[header];
      
      // Handle different data types for CSV formatting
      if (value === null || value === undefined) {
        return '';
      } else if (typeof value === 'string') {
        // Escape quotes and wrap in quotes to handle commas in text
        return `"${value.replace(/"/g, '""')}"`;
      } else {
        return value;
      }
    });
    
    csvContent += row.join(',') + '\n';
  });
  
  // Write to file
  const outputDir = path.join(process.cwd(), '..', '..', 'data');
  const outputFile = path.join(outputDir, 'fpl_players.csv');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(outputFile, csvContent);
  
  console.log(`Successfully exported ${enhancedPlayers.length} players to ${outputFile}`);
  console.log('You can now import this CSV file into Google Sheets.');
}

// Execute the script
exportPlayersToCSV().catch(error => {
  console.error('Error exporting players:', error);
  process.exit(1);
}); 