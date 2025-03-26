# FPL Predictor

A Fantasy Premier League team builder and prediction tool.

## Features

- Fetch real-time data from the FPL API
- Predict player points for the next gameweek based on form, fixtures, and other factors
- View predictions for future gameweeks
- Filter players by position
- Search for specific players or teams

## Player Images

This project supports displaying player photos in the team builder. Here's how to set it up:

### Using Player Photos

1. **Download player photos** using the provided script:

   ```bash
   # From another project
   npm run download-player-photos
   ```

2. **Copy player photos to the public directory**:

   ```bash
   # Copy player images from the root 'players' directory to the public folder
   npm run copy-player-photos
   ```

3. **Restart the dev server** to make sure the images are properly served:

   ```bash
   npm run dev
   ```

### How It Works

- The player photos should be stored in a `players` directory at the project root.
- The photos should be named using the player's ID (e.g., `123456.png`).
- The app will automatically display player photos instead of team kits in the team builder.
- If a player photo is not available, it will fall back to showing the team kit.

### API Endpoints for Player Images

The app provides API endpoints to check if player images exist:

- `GET /api/player-images?id=123456` - Check if a specific player image exists
- `GET /api/player-images?list=true` - List all available player images

## Tech Stack

- Next.js 14 with App Router
- TypeScript
- TailwindCSS for styling
- SWR for data fetching
- Recharts for visualizations
- HeadlessUI for UI components

## Getting Started

### Prerequisites

- Node.js 18.17 or later

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/fpl-predictor.git
cd fpl-predictor
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Usage

This application uses the public Fantasy Premier League API endpoints, primarily:

- `https://fantasy.premierleague.com/api/bootstrap-static/` - Get teams, players, and general data
- `https://fantasy.premierleague.com/api/fixtures/` - Get fixture information
- `https://fantasy.premierleague.com/api/element-summary/{player_id}/` - Get player-specific data

### CORS Handling

The Fantasy Premier League API doesn't have CORS headers that would allow direct browser requests. To address this, the application includes a server-side API proxy using Next.js API routes. The proxy is implemented in `src/app/api/fpl/route.ts`.

If you encounter network errors like:

```
AxiosError: Network Error
```

This is likely due to CORS restrictions when trying to directly access the FPL API from a browser. The built-in proxy handles this for you by making the requests server-side.

## Limitations

- The predictions are based on available statistical data and do not account for unexpected events
- The FPL API may occasionally have rate limits or temporarily go down
- Future gameweek predictions become less accurate the further into the future they go
- Predictions do not account for team news or other factors not available in the API

## License

This project is licensed under the MIT License.

## Development

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application
- `npm run start` - Start the production server
- `npm run lint` - Run linting
- `npm run download-images` - Download team images
- `npm run download-player-photos` - Download player photos from FPL API
- `npm run download-player-photos-range` - Download player photos by ID range
- `npm run copy-player-photos` - Copy player photos from root directory to public folder
