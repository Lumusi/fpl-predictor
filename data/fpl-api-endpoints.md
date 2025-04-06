# Fantasy Premier League API Endpoints

This document outlines the available API endpoints for the Fantasy Premier League (FPL) API at `https://fantasy.premierleague.com/api/`.

## Core Endpoints

### 1. Bootstrap Static
**Endpoint:** `https://fantasy.premierleague.com/api/bootstrap-static/`

This is the main data source containing:
- All teams in the league
- All players in the game
- Game rules and scoring information
- Current gameweek information
- Player statistics (total points, ownership, etc.)
- Element (player) types
- Game phases and seasons

### 2. Fixtures
**Endpoint:** `https://fantasy.premierleague.com/api/fixtures/`

Returns all fixtures for the season. Can be filtered by event (gameweek):
- `https://fantasy.premierleague.com/api/fixtures/?event=1` (returns fixtures for gameweek 1)

Contains information about:
- Match details (teams, scores, kickoff time)
- Team difficulty ratings
- Match statistics

### 3. Element (Player) Summary
**Endpoint:** `https://fantasy.premierleague.com/api/element-summary/{element_id}/`

Detailed information about a specific player where `{element_id}` is the player's ID:
- Upcoming fixtures
- Fixture history
- Player form
- Transfer history
- Detailed statistics

### 4. Event (Gameweek) Status
**Endpoint:** `https://fantasy.premierleague.com/api/event-status/`

Current gameweek status:
- Live bonus points
- Game status (live/finished/etc.)

### 5. Gameweek Data
**Endpoint:** `https://fantasy.premierleague.com/api/event/{event_id}/live/`

Live data for a specific gameweek where `{event_id}` is the gameweek number:
- Real-time player performance
- Bonus point calculations
- Current points for all players

## Team/Manager Specific Endpoints

### 6. Manager Information
**Endpoint:** `https://fantasy.premierleague.com/api/entry/{manager_id}/`

Information about a specific FPL manager:
- Team details
- Overall performance
- Season history
- Manager details

### 7. Manager History
**Endpoint:** `https://fantasy.premierleague.com/api/entry/{manager_id}/history/`

Historical data for a specific manager:
- Gameweek by gameweek performance
- Season-by-season performance
- Chips used

### 8. Manager Team
**Endpoint:** `https://fantasy.premierleague.com/api/entry/{manager_id}/event/{event_id}/picks/`

A manager's team selection for a specific gameweek:
- Players selected
- Captain and vice-captain
- Bench order
- Chips used

### 9. My Team (Requires Authentication)
**Endpoint:** `https://fantasy.premierleague.com/api/my-team/{manager_id}/`

Current team selection (requires login cookies):
- Current squad
- Transfer information
- Bank value
- Team value

## League Endpoints

### 10. League Details
**Endpoint:** `https://fantasy.premierleague.com/api/leagues-classic/{league_id}/standings/`

Standings for a classic league:
- Manager rankings
- Points
- Team names

Can add page parameters:
- `https://fantasy.premierleague.com/api/leagues-classic/{league_id}/standings/?page_standings=2`

### 11. H2H League Details
**Endpoint:** `https://fantasy.premierleague.com/api/leagues-h2h/{league_id}/standings/`

Head-to-head league information:
- Standings
- Match results

### 12. H2H Matches
**Endpoint:** `https://fantasy.premierleague.com/api/leagues-h2h-matches/league/{league_id}/?page=1`

Head-to-head match results in a league.

## Other Useful Endpoints

### 13. Dream Team
**Endpoint:** `https://fantasy.premierleague.com/api/dream-team/{event_id}/`

The highest scoring team for a specific gameweek.

### 14. Set Piece Takers
**Endpoint:** `https://fantasy.premierleague.com/api/team/set-piece-notes/`

Information about which players take set pieces (penalties, free kicks, corners).

### 15. Player Detailed Information
**Endpoint:** `https://fantasy.premierleague.com/api/element-summary/{element_id}/`

Detailed information about a specific player.

## Usage Tips

1. Most endpoints return JSON data.
2. Some endpoints require authentication via cookies (such as my-team).
3. Rate limiting may be applied to prevent excessive requests.
4. Data is typically updated after each gameweek or in real-time during matches.

## Authentication

For endpoints requiring authentication:
1. Log in to the FPL website
2. Get the session cookies (pl_profile, pl_sessioncounter)
3. Include these cookies in your requests

## Example Usage

```python
import requests

# Get bootstrap static data
response = requests.get("https://fantasy.premierleague.com/api/bootstrap-static/")
data = response.json()

# Get player data
players = data["elements"]
teams = data["teams"]
```

## Notes

- The API is not officially documented and may change without notice
- Consider implementing rate limiting in your applications
- Data is typically cached, so real-time data during matches may be delayed by a few minutes 