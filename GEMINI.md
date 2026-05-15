# FPL Predictor - Project Overview for Gemini

This document provides a comprehensive overview of the FPL Predictor project, intended for use as instructional context for the Gemini CLI.

## Project Overview

The FPL Predictor is a web application designed to assist Fantasy Premier League (FPL) managers by providing a team builder and prediction tool. It fetches real-time data from the official FPL API to offer insights and predictions for upcoming gameweeks.

**Key Features:**
*   **Real-time FPL Data:** Fetches and displays current data for teams, players, and fixtures directly from the FPL API.
*   **Player Point Prediction:** Predicts player points for future gameweeks based on various factors including form, fixture difficulty, and historical performance.
*   **Future Gameweek Analysis:** Allows users to view predictions for multiple upcoming gameweeks.
*   **Player Filtering and Search:** Provides functionality to filter players by position and search for specific players or teams.
*   **Player Image Support:** Displays player photos (if available) in the team builder, falling back to team kits if photos are not present.

**Technology Stack:**
*   **Frontend Framework:** Next.js 14 with App Router
*   **Language:** TypeScript
*   **Styling:** TailwindCSS
*   **Data Fetching:** SWR (Stale-While-Revalidate)
*   **Charting:** Recharts
*   **UI Components:** HeadlessUI

**Architecture Highlights:**
*   The application utilizes the Next.js App Router for efficient routing and layout management.
*   It employs a server-side API proxy (`src/app/api/fpl/route.ts`) to overcome Cross-Origin Resource Sharing (CORS) restrictions when interacting with the FPL API, ensuring seamless data retrieval.
*   Player images are managed through dedicated scripts that download and copy them to the public directory, named by player ID for easy access.

## Building and Running

This section outlines the necessary steps to set up, build, and run the FPL Predictor project.

**Prerequisites:**
*   Node.js 18.17 or later

**Installation:**
1.  Clone the repository:
    ```bash
    git clone https://github.com/yourusername/fpl-predictor.git
    cd fpl-predictor
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```

**Development Server:**
To run the application in development mode:
```bash
npm run dev
```
The application will be accessible at `http://localhost:3000`.

**Building for Production:**
To build the application for production deployment:
```bash
npm run build
```
*Note: The Vercel deployment configuration uses `next build --no-lint`.*

**Starting Production Server:**
To start the production server after building:
```bash
npm run start
```

**Linting:**
To run ESLint checks for code quality:
```bash
npm run lint
```

**Image Management Scripts:**
*   `npm run download-images`: Downloads team images.
*   `npm run download-player-photos`: Downloads player photos from the FPL API.
*   `npm run download-player-photos-range`: Downloads player photos by a specified ID range.
*   `npm run copy-player-photos`: Copies player photos from the root directory to the public folder.

## Development Conventions

*   **Language:** All new code should be written in TypeScript, adhering to strict type checking.
*   **Code Style:** ESLint is configured to enforce code style and best practices. Developers should run `npm run lint` regularly.
*   **Component Structure:** React components are organized within the `src/components` directory, following a modular approach.
*   **Data Handling:** SWR is the preferred library for client-side data fetching and caching.
*   **API Interaction:** All interactions with the external FPL API should go through the internal Next.js API proxy to manage CORS and centralize data fetching logic.
*   **Styling:** TailwindCSS is used for utility-first CSS styling.
