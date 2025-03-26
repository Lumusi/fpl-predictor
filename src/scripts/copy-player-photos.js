const fs = require('fs');
const path = require('path');

// Define source and destination directories
const sourceDir = path.join(__dirname, '../../../players');
const destDir = path.join(__dirname, '../../public/players');

// Ensure the destination directory exists
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
  console.log(`Created directory: ${destDir}`);
}

// Copy all player photos from source to destination
try {
  if (!fs.existsSync(sourceDir)) {
    console.error(`Source directory not found: ${sourceDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(sourceDir);
  const playerImages = files.filter(file => file.endsWith('.png'));
  
  console.log(`Found ${playerImages.length} player images to copy.`);
  
  let copyCount = 0;
  for (const file of playerImages) {
    const sourcePath = path.join(sourceDir, file);
    const destPath = path.join(destDir, file);
    
    // Copy the file
    fs.copyFileSync(sourcePath, destPath);
    copyCount++;
    
    // Log progress every 10 files
    if (copyCount % 10 === 0) {
      console.log(`Copied ${copyCount} of ${playerImages.length} files...`);
    }
  }
  
  console.log(`Successfully copied ${copyCount} player images to ${destDir}`);
} catch (error) {
  console.error('Error copying player images:', error);
  process.exit(1);
} 