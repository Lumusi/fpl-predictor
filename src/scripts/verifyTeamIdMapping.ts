import fs from 'fs';
import path from 'path';

// Team mappings from downloadTeamImagesSimple.ts
const TEAM_MAPPINGS = [
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

function verifyTeamMappings() {
  console.log('=== Verifying Team ID Mappings ===');
  
  // Get the path to the team images directory
  const teamsDir = path.join(process.cwd(), 'public', 'images', 'teams');
  
  // Check if the directory exists
  if (!fs.existsSync(teamsDir)) {
    console.error(`Team images directory not found: ${teamsDir}`);
    return;
  }
  
  // Read all files in the directory
  const files = fs.readdirSync(teamsDir);
  
  // Extract team IDs from the file names
  const teamIdPattern = /team_(\d+)_(\w+)\.png/;
  const availableTeamImages: Record<string, string[]> = {};
  
  files.forEach(file => {
    const match = file.match(teamIdPattern);
    if (match && match[1] && match[2]) {
      const teamId = match[1];
      const imageType = match[2]; // home, away, keeper, crest
      
      if (!availableTeamImages[teamId]) {
        availableTeamImages[teamId] = [];
      }
      
      availableTeamImages[teamId].push(imageType);
    }
  });
  
  // Print all available team IDs and their image types
  console.log('\nAvailable Team IDs in image directory:');
  Object.entries(availableTeamImages).forEach(([teamId, imageTypes]) => {
    console.log(`Team ID ${teamId}: ${imageTypes.join(', ')}`);
  });
  
  // Check for missing team IDs in the TEAM_MAPPINGS
  console.log('\nChecking team ID mappings:');
  TEAM_MAPPINGS.forEach(team => {
    if (availableTeamImages[team.id]) {
      console.log(`✅ Team ${team.name} (${team.short_name}): ID ${team.id} - Images found: ${availableTeamImages[team.id].join(', ')}`);
    } else {
      console.log(`❌ Team ${team.name} (${team.short_name}): ID ${team.id} - No images found!`);
    }
  });
  
  // Check for team IDs in images that are not in TEAM_MAPPINGS
  console.log('\nUnexpected team IDs in image directory:');
  Object.keys(availableTeamImages).forEach(teamId => {
    const matchingTeam = TEAM_MAPPINGS.find(team => team.id.toString() === teamId);
    if (!matchingTeam) {
      console.log(`❓ Team ID ${teamId} has images but is not in the team mappings`);
    }
  });
  
  // Check for duplicate team IDs in TEAM_MAPPINGS
  console.log('\nChecking for duplicate team IDs in mappings:');
  const teamIds = TEAM_MAPPINGS.map(team => team.id);
  const duplicateIds = teamIds.filter((id, index) => teamIds.indexOf(id) !== index);
  
  if (duplicateIds.length > 0) {
    console.log(`❌ Duplicate team IDs found: ${[...new Set(duplicateIds)].join(', ')}`);
    
    // Print details about the duplicates
    duplicateIds.forEach(id => {
      const teamsWithId = TEAM_MAPPINGS.filter(team => team.id === id);
      console.log(`  ID ${id} is used by: ${teamsWithId.map(t => `${t.name} (${t.short_name})`).join(', ')}`);
    });
  } else {
    console.log('✅ No duplicate team IDs found in mappings');
  }
  
  console.log('\n=== Team ID Mapping Verification Complete ===');
}

// Run the verification
verifyTeamMappings(); 