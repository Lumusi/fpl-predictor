# FPL Predictor

A Fantasy Premier League team builder and prediction tool built with Next.js, React, and Tailwind CSS.

## Features

- **Player Predictions** — AI-driven points predictions based on form, fixtures, and historical data
- **Gameweek Highlights** — Top performers, dream teams, and key stats from every gameweek
- **Pick Team** — Interactive team builder with pitch view, formation selector, and budget management
- **Fixtures** — Browse Premier League fixtures by gameweek with broadcasting info
- **The Scout** — Set-piece takers analysis, player availability status, and team-by-team breakdown
- **Stats** — Full player stats table with sortable columns (total points, PPG, form, etc.)
- **Premier League Table** — Live standings with form guide and head-to-head comparison
- **Transfer Planning** — Best value players and most-transferred-in tracking

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4 + CSS Variables (light/dark mode)
- **Data Fetching:** SWR with caching
- **Charts:** Recharts
- **UI Components:** Headless UI + Heroicons
- **Data Source:** Official Fantasy Premier League API

## Getting Started

### Prerequisites

- Node.js 18.17 or later

### Installation

```bash
# Clone the repository
git clone https://github.com/Lumusi/fpl-predictor.git
cd fpl-predictor

# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## API Usage

This application uses the public Fantasy Premier League API endpoints:

- `https://fantasy.premierleague.com/api/bootstrap-static/` — Teams, players, and general data
- `https://fantasy.premierleague.com/api/fixtures/` — Fixture information
- `https://fantasy.premierleague.com/api/element-summary/{player_id}/` — Player-specific data

### CORS Handling

The FPL API doesn't include CORS headers. The application includes a server-side API proxy via Next.js API routes in `src/app/api/fpl/route.ts`.

## Player Photos

```bash
# Download player photos from FPL API
npm run download-player-photos

# Download player photos by ID range
npm run download-player-photos-range

# Copy player photos to public directory
npm run copy-player-photos
```

Photos should be stored in a `players` directory at the project root, named by player ID (e.g., `123456.png`).

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run download-images` | Download team images |
| `npm run download-player-photos` | Download player photos |
| `npm run download-player-photos-range` | Download player photos by range |
| `npm run copy-player-photos` | Copy photos to public folder |

## Limitations

- Predictions are based on available statistical data and do not account for unexpected events
- The FPL API may occasionally have rate limits or temporarily go down
- Future gameweek predictions become less accurate the further into the future they go
- Predictions do not account for team news or other factors not available in the API

## License

MIT License
