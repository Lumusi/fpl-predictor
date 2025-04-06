// scripts/update-set-piece-data.js
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function scrapeSetPieceTakers() {
  console.log('Starting scraper...');
  
  const browser = await puppeteer.launch({
    headless: true,
  });
  
  try {
    const page = await browser.newPage();
    await page.goto('https://fantasy.premierleague.com/the-scout/set-piece-takers', {
      waitUntil: 'networkidle2',
    });
    
    console.log('Page loaded, extracting data...');
    
    // Extract all team sections
    const teamData = await page.evaluate(() => {
      const result = {};
      const teams = [
        "Arsenal", "Aston Villa", "Bournemouth", "Brentford", "Brighton", 
        "Chelsea", "Crystal Palace", "Everton", "Fulham", "Ipswich", 
        "Leicester", "Liverpool", "Man City", "Man Utd", "Newcastle", 
        "Nott'm Forest", "Southampton", "Spurs", "West Ham", "Wolves"
      ];
      
      for (const team of teams) {
        const teamSection = document.evaluate(
          `//text()[contains(., '${team}')]/following::*[contains(text(), 'Penalties')]`,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue?.parentElement;
        
        if (!teamSection) continue;
        
        result[team] = {
          penalties: [],
          direct_free_kicks: [],
          corners_indirect_free_kicks: [],
          notes: []
        };
        
        // Get all divs after team heading
        let currentSection = 'penalties';
        let noteStarted = false;
        
        // Extract takers
        const elements = teamSection.querySelectorAll('div');
        elements.forEach(el => {
          const text = el.textContent.trim();
          
          if (text === 'Penalties') {
            currentSection = 'penalties';
            noteStarted = false;
          } else if (text === 'Direct free-kicks') {
            currentSection = 'direct_free_kicks';
            noteStarted = false;
          } else if (text === 'Corners & indirect free-kicks') {
            currentSection = 'corners_indirect_free_kicks';
            noteStarted = false;
          } else if (text && text.length > 0) {
            // Likely a player name or note
            if (text.length > 30 || noteStarted) {
              // Probably a note
              result[team].notes.push(text);
              noteStarted = true;
            } else {
              // Probably a player name
              result[team][currentSection].push(text);
            }
          }
        });
      }
      
      return result;
    });
    
    console.log('Data extracted, saving to file...');
    
    const dataPath = path.join(__dirname, '..', 'src', 'data', 'set_piece_data.json');
    
    // Create directory if it doesn't exist
    const dir = path.dirname(dataPath);
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Save data
    fs.writeFileSync(
      dataPath,
      JSON.stringify(teamData, null, 2)
    );
    
    console.log(`Set piece data saved to ${dataPath}`);
    
  } catch (error) {
    console.error('Error scraping set piece data:', error);
  } finally {
    await browser.close();
  }
}

// Run the scraper
scrapeSetPieceTakers();