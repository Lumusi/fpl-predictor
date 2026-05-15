/**
 * Utility functions for team images
 */

/**
 * Get the URL for a team's logo from the official Premier League website.
 * @param teamId - The team's ID
 * @returns The URL to the team's logo
 */
export function getPremierLeagueTeamImageUrl(teamId: number | string): string {
  if (!teamId) {
    return '/images/placeholder-crest.svg';
  }
  
  return `https://resources.premierleague.com/premierleague25/badges-alt/${teamId}.svg`;
}
