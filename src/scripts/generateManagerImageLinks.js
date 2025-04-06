/**
 * Script to generate HTML links for manual manager image downloads
 * 
 * This script creates an HTML file with direct links to Premier League manager images
 * that you can open in your browser to manually download the images.
 */

const fs = require('fs');
const path = require('path');

// Define the destination directory
const DEST_DIR = path.join(__dirname, '../../public/images/managers');
const HTML_FILE = path.join(__dirname, '../../manager-image-links.html');

// Ensure the destination directory exists
if (!fs.existsSync(DEST_DIR)) {
  fs.mkdirSync(DEST_DIR, { recursive: true });
  console.log(`Directory created: ${DEST_DIR}`);
}

// Current Premier League managers (2024-2025 season)
const MANAGERS = [
  { id: 'man52174', name: 'Mikel Arteta', team: 'Arsenal' },
  { id: 'man40342', name: 'Unai Emery', team: 'Aston Villa' },
  { id: 'man37974', name: 'Andoni Iraola', team: 'Bournemouth' },
  { id: 'man50525', name: 'Thomas Frank', team: 'Brentford' },
  { id: 'man40383', name: 'Fabian Hürzeler', team: 'Brighton' },
  { id: 'man279', name: 'Enzo Maresca', team: 'Chelsea' },
  { id: 'man40836', name: 'Oliver Glasner', team: 'Crystal Palace' },
  { id: 'man1033', name: 'Sean Dyche', team: 'Everton' },
  { id: 'man40387', name: 'Marco Silva', team: 'Fulham' },
  { id: 'man51539', name: 'Kieran McKenna', team: 'Ipswich' },
  { id: 'man51806', name: 'Steve Cooper', team: 'Leicester' },
  { id: 'man134', name: 'Arne Slot', team: 'Liverpool' },
  { id: 'man37691', name: 'Pep Guardiola', team: 'Man City' },
  { id: 'man40805', name: 'Erik ten Hag', team: 'Man Utd' },
  { id: 'man1073', name: 'Eddie Howe', team: 'Newcastle' },
  { id: 'man40834', name: 'Nuno Espírito Santo', team: 'Nottingham Forest' },
  { id: 'man51811', name: 'Russell Martin', team: 'Southampton' },
  { id: 'man40349', name: 'Ange Postecoglou', team: 'Tottenham' },
  { id: 'man51810', name: 'Julen Lopetegui', team: 'West Ham' },
  { id: 'man40333', name: 'Gary O\'Neil', team: 'Wolves' }
];

// Generate HTML content
function generateHtml() {
  const managerLinks = MANAGERS.map(manager => {
    const imageUrl = `https://resources.premierleague.com/premierleague/photos/managers/110x140/${manager.id}.png`;
    const localPath = path.join(DEST_DIR, `${manager.id}.png`).replace(/\\/g, '/');
    
    return `
      <div class="manager-card">
        <h3>${manager.name} (${manager.team})</h3>
        <p>ID: ${manager.id}</p>
        <img src="${imageUrl}" alt="${manager.name}" onerror="this.src='https://via.placeholder.com/110x140?text=Not+Found'">
        <div class="buttons">
          <a href="${imageUrl}" download="${manager.id}.png" target="_blank" class="download-btn">Download</a>
          <button onclick="copyToClipboard('${imageUrl}')" class="copy-btn">Copy URL</button>
        </div>
        <p class="save-path">Save to: ${localPath}</p>
      </div>
    `;
  }).join('');
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Premier League Manager Images (2024-2025)</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        h1 {
          color: #37003c;
          text-align: center;
        }
        .instructions {
          background-color: #fff;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
          border-left: 5px solid #37003c;
        }
        .manager-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 20px;
        }
        .manager-card {
          background-color: white;
          border-radius: 8px;
          padding: 15px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .manager-card h3 {
          margin-top: 0;
          color: #37003c;
        }
        .manager-card img {
          width: 110px;
          height: 140px;
          object-fit: cover;
          margin: 10px 0;
          border: 1px solid #ddd;
        }
        .buttons {
          display: flex;
          gap: 10px;
          margin: 10px 0;
        }
        .download-btn, .copy-btn {
          background-color: #00ff85;
          color: #37003c;
          border: none;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          text-decoration: none;
        }
        .copy-btn {
          background-color: #04f5ff;
        }
        .save-path {
          font-size: 12px;
          color: #666;
          word-break: break-all;
          text-align: center;
        }
        .note {
          background-color: #fffde7;
          padding: 10px;
          border-radius: 5px;
          margin-top: 20px;
          border-left: 5px solid #ffc107;
        }
      </style>
    </head>
    <body>
      <h1>Premier League Manager Images (2024-2025)</h1>
      
      <div class="instructions">
        <h2>Instructions:</h2>
        <ol>
          <li>Click on each image to view it in full size</li>
          <li>Right-click and select "Save Image As..." to download the image</li>
          <li>Save each image with the filename shown (e.g., man52174.png)</li>
          <li>Save all images to the directory: <code>${DEST_DIR.replace(/\\/g, '/')}</code></li>
        </ol>
      </div>
      
      <div class="manager-grid">
        ${managerLinks}
      </div>
      
      <div class="note">
        <p><strong>Note:</strong> Some images may not be available yet for the 2024-2025 season. In that case, you might need to check the Premier League website directly or wait until the images are updated.</p>
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

// Write HTML file
try {
  const htmlContent = generateHtml();
  fs.writeFileSync(HTML_FILE, htmlContent);
  console.log(`HTML file created: ${HTML_FILE}`);
  console.log('\nInstructions:');
  console.log('1. Open the HTML file in your browser');
  console.log('2. Right-click on each manager image and select "Save Image As..."');
  console.log(`3. Save the images to: ${DEST_DIR}`);
  console.log('\nAfter downloading the images, you can use them in your application with the managerImages.ts utility.');
} catch (error) {
  console.error('Error creating HTML file:', error);
}
