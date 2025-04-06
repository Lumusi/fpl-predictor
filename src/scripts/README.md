# FPL Scripts

## Player Photo Downloader

The `download-player-photos.js` script automatically downloads player photos from the Premier League website. It has two modes of operation:

### 1. FPL API Mode (Default)

This mode fetches the current list of player IDs from the Fantasy Premier League API and downloads only those photos. This ensures you only download photos for players currently in the FPL game.

```bash
# Run from the project root
npm run download-player-photos
```

### 2. Range Mode

This mode downloads photos for a range of player IDs, useful for getting historical players or when the API is unavailable.

```bash
# Run from the project root with default range (1-300)
npm run download-player-photos-range

# Run from the project root with custom range
npm run download-player-photos-range 100 200
```

### Running the Script Directly

You can also run the script directly with Node:

```bash
# Default API mode
node src/scripts/download-player-photos.js

# Range mode
node src/scripts/download-player-photos.js --mode=range 100 200
```

## Output

Player photos are saved to the `src/public/images/players/` directory with filenames matching their IDs (e.g., `118342.png`).

## URL Format

The photos are downloaded from the following URL format:
```
https://resources.premierleague.com/premierleague/photos/players/250x250/p{PLAYER_ID}.png
```

## Set Piece Takers Data

The FPL website provides data about set piece takers (penalties, direct free kicks, corners) for each team. We have scripts to fetch this data:

1. **fetchSetPieceData.js** - A simple Node.js script to fetch set piece data directly from the FPL API and save it to `set-piece-data.json`.

   ```
   node src/scripts/fetchSetPieceData.js
   ```

2. **scrapeSetPieceTakers.ts** - A more advanced script that attempts to scrape the FPL website for set piece takers data. Note that this may break if the website structure changes.

   ```
   npx ts-node src/scripts/scrapeSetPieceTakers.ts
   ```

3. **API Endpoint** - The app has an API endpoint to update the set piece data:

   ```
   GET /api/update-set-piece-data
   ```

   This endpoint is also automatically called when a user visits the Scout page, ensuring the data is kept up-to-date.

The set piece data is stored in `set-piece-data.json` at the root of the project. 