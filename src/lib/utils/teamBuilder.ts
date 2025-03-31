import { Player, Team } from '../services/fplApi';
import { predictPlayerPoints } from './predictions';

// Constants
export const MAX_BUDGET = 100.0; // £100.0m
export const MAX_PLAYERS_FROM_SAME_TEAM = 3;
export const TEAM_SIZE = 15;
export const FORMATION_CONSTRAINTS = {
  GKP: { min: 2, max: 2 },
  DEF: { min: 5, max: 5 },
  MID: { min: 5, max: 5 }, 
  FWD: { min: 3, max: 3 }
};

// Position type mapping
export const POSITION_MAP = {
  1: 'GKP',
  2: 'DEF',
  3: 'MID',
  4: 'FWD'
};

export const POSITION_ID_MAP = {
  'GKP': 1,
  'DEF': 2,
  'MID': 3,
  'FWD': 4
};

// Types
export interface TeamPlayer {
  id: number;
  code?: number;   // The player code used in the Premier League photos URL
  web_name: string;
  first_name?: string; // Player's first name
  second_name?: string; // Player's surname/last name
  now_cost?: number;  // in 0.1m units
  position: string;   // GKP, DEF, MID, FWD
  element_type: number; // 1, 2, 3, 4
  price: number;      // in 1.0m units (now_cost / 10)
  team?: number;       // team ID
  team_short_name?: string; // 3-letter team code
  team_name?: string;  // full team name
  total_points?: number;
  form?: string;
  predicted_points?: number;
  fixtures?: any[];   // upcoming fixtures
  home_game?: boolean; // whether the next fixture is a home game
  chance_of_playing_next_round?: number | null; // player availability
  purchase_price?: number; // Price player was purchased at (in 1.0m units)
  selling_price?: number; // Price player can be sold for (in 1.0m units)
  position_in_team?: number; // Position in team (1-15)
  is_captain?: boolean;      // Whether player is team captain 
  is_vice_captain?: boolean; // Whether player is vice captain
}

export interface TeamSuggestion {
  playerOut: TeamPlayer;
  playerIn: TeamPlayer;
  pointsImprovement: number;
  costDifference: number;
  costDifferenceLabel?: string;
}

// Type definitions for transfer history
export interface PlayerTransfer {
  element_in: number;
  element_in_cost: number;
  element_out: number;
  element_out_cost: number;
  entry: number;
  event: number;
  time: string;
}

// Extended player type that includes selling_price and purchase_price
export interface ExtendedPlayer extends Player {
  selling_price?: number;
  purchase_price?: number;
}

// Format a player object with additional information for team use
export function formatPlayerForTeam(player: Player | ExtendedPlayer, teams: Team[]): TeamPlayer {
  // First determine if we need to format the price from API format (e.g. 75 for £7.5m)
  // or if it's already formatted (e.g. 7.5)
  
  // Get the player price, with detailed validation
  let playerPrice: number;
  let priceSource: string;
  
  // Check if price is directly provided and valid
  if ('price' in player && typeof player.price === 'number' && player.price > 0) {
    // Price is already provided (likely from an imported player)
    // Check if it needs conversion (is it in format like 75 instead of 7.5?)
    playerPrice = player.price > 20 ? player.price / 10 : player.price; // Convert if needed
    priceSource = 'price_property';
    console.log(`[FORMAT_PLAYER] Player ${player.web_name}: Using provided price: ${playerPrice} (original value: ${player.price})`);
  } 
  // Check if now_cost is available
  else if (player.now_cost !== undefined && player.now_cost > 0) {
    // Calculate price from now_cost (standard API format)
    playerPrice = player.now_cost > 20 ? player.now_cost / 10 : player.now_cost;
    priceSource = 'now_cost';
    console.log(`[FORMAT_PLAYER] Player ${player.web_name}: Calculated price from now_cost: ${playerPrice} (original value: ${player.now_cost})`);
  } 
  // Check if selling_price is available for imported players
  else if ('selling_price' in player && typeof player.selling_price === 'number' && player.selling_price > 0) {
    playerPrice = player.selling_price > 20 ? player.selling_price / 10 : player.selling_price;
    priceSource = 'selling_price';
    console.log(`[FORMAT_PLAYER] Player ${player.web_name}: Using selling_price as price: ${playerPrice} (original value: ${player.selling_price})`);
  }
  // If we still have no price, use a default
  else {
    playerPrice = 4.0; // Default minimum price
    priceSource = 'default';
    console.warn(`[FORMAT_PLAYER] WARNING: No valid price found for player ${player.web_name} (ID: ${player.id}), using default of ${playerPrice}`);
  }
  
  // Handle purchase_price
  let purchasePrice: number;
  if ('purchase_price' in player && typeof player.purchase_price === 'number' && player.purchase_price > 0) {
    // Price is already provided (likely from an imported player)
    // Check if it needs conversion
    purchasePrice = player.purchase_price > 20 ? player.purchase_price / 10 : player.purchase_price;
    console.log(`[FORMAT_PLAYER] Player ${player.web_name}: Using provided purchase_price: ${purchasePrice} (original value: ${player.purchase_price})`);
  } else {
    purchasePrice = playerPrice; // Default to regular price if not specified
  }
  
  // Handle selling_price
  let sellingPrice: number;
  if ('selling_price' in player && typeof player.selling_price === 'number' && player.selling_price > 0) {
    // Price is already provided (likely from an imported player)
    // Check if it needs conversion
    sellingPrice = player.selling_price > 20 ? player.selling_price / 10 : player.selling_price;
    console.log(`[FORMAT_PLAYER] Player ${player.web_name}: Using provided selling_price: ${sellingPrice} (original value: ${player.selling_price})`);
  } else {
    sellingPrice = playerPrice; // Default to regular price if not specified
  }
  
  // Extra safety check to make sure we never use a 0 price
  if (playerPrice === 0) {
    console.warn(`[FORMAT_PLAYER] WARNING: Zero price detected for ${player.web_name}, falling back to minimum price`);
    playerPrice = 4.0; // Minimum player price
  }
  
  if (sellingPrice === 0) {
    console.warn(`[FORMAT_PLAYER] WARNING: Zero selling price detected for ${player.web_name}, using price instead: ${playerPrice}`);
    sellingPrice = playerPrice;
  }
  
  if (purchasePrice === 0) {
    console.warn(`[FORMAT_PLAYER] WARNING: Zero purchase price detected for ${player.web_name}, using price instead: ${playerPrice}`);
    purchasePrice = playerPrice;
  }
  
  // Find the player's team details
  const playerTeam = teams.find(team => team.id === player.team);
  
  // Convert element_type to position string (GK, DEF, MID, FWD)
  let position = "UNK";
  switch (player.element_type) {
    case 1:
      position = "GKP";
      break;
    case 2:
      position = "DEF";
      break;
    case 3:
      position = "MID";
      break;
    case 4:
      position = "FWD";
      break;
  }
  
  // Log final player pricing information for debugging
  console.log(`[FORMAT_PLAYER] Final values for ${player.web_name}: price=${playerPrice.toFixed(1)}, purchase=${purchasePrice.toFixed(1)}, selling=${sellingPrice.toFixed(1)} (source: ${priceSource})`);
  
  return {
    ...player,
    team_short_name: playerTeam ? playerTeam.short_name : "UNK",
    team_name: playerTeam ? playerTeam.name : "Unknown",
    position,
    price: playerPrice,
    purchase_price: purchasePrice,
    selling_price: sellingPrice
  };
}

// Calculate the total cost of a team
export function calculateTeamCost(team: TeamPlayer[]): number {
  return team.reduce((total, player) => {
    // Use selling_price if available (for when players are being sold), otherwise use regular price
    const playerValue = player.selling_price !== undefined ? player.selling_price : player.price;
    return total + playerValue;
  }, 0);
}

// Check if a player can be added to the team based on team constraints
export function canAddPlayer(
  player: TeamPlayer, 
  currentTeam: TeamPlayer[]
): { allowed: boolean, reason?: string } {
  // Check position constraints
  const positionCount = currentTeam.filter(p => p.position === player.position).length;
  const positionLimit = FORMATION_CONSTRAINTS[player.position as keyof typeof FORMATION_CONSTRAINTS]?.max || 0;
  
  if (positionCount >= positionLimit) {
    return { 
      allowed: false, 
      reason: `Maximum number of ${player.position} players (${positionLimit}) reached` 
    };
  }
  
  // Check for team constraints (max 3 from same team)
  const teamCount = currentTeam.filter(p => p.team === player.team).length;
  if (teamCount >= MAX_PLAYERS_FROM_SAME_TEAM) {
    return { 
      allowed: false, 
      reason: `Maximum number of players (${MAX_PLAYERS_FROM_SAME_TEAM}) from ${player.team_short_name} reached` 
    };
  }
  
  // Check if player is already in the team
  if (currentTeam.some(p => p.id === player.id)) {
    return { allowed: false, reason: 'Player already in team' };
  }
  
  return { allowed: true };
}

// Get suggestions for team improvements
export function getSuggestedTransfers(
  currentTeam: TeamPlayer[],
  allPlayers: TeamPlayer[],
  budget: number = 0, // Additional budget available
  limit: number = 5
): TeamSuggestion[] {
  try {
    // Reduce logging to prevent console spam
    console.log("getSuggestedTransfers called with:", {
      teamSize: currentTeam.length,
      allPlayersSize: allPlayers.length,
      budget: budget,
      limit: limit
    });

    // Validate inputs to prevent issues
    if (!currentTeam || currentTeam.length === 0 || !allPlayers || allPlayers.length === 0) {
      console.log("Invalid inputs for getSuggestedTransfers");
      return [];
    }

    const suggestions: TeamSuggestion[] = [];
    const alreadySuggestedOutPlayerIds = new Set<number>();
    
    // Sort the team to prioritize players without predictions
    const sortedTeam = [...currentTeam].sort((a, b) => {
      // Players with no predictions come first
      if ((a.predicted_points === undefined || a.predicted_points === 0) && 
          (b.predicted_points !== undefined && b.predicted_points > 0)) {
        return -1;
      }
      if ((b.predicted_points === undefined || b.predicted_points === 0) && 
          (a.predicted_points !== undefined && a.predicted_points > 0)) {
        return 1;
      }
      // Then sort by position for consistency
      return a.position.localeCompare(b.position);
    });
    
    // Limit number of players to check to avoid excessive processing
    const playerLimit = Math.min(sortedTeam.length, 5);
    const playerToCheck = sortedTeam.slice(0, playerLimit);
    
    console.log(`Checking ${playerToCheck.length} players for potential replacements`);
    
    // For each player in the team (prioritizing players without predictions)
    for (const currentPlayer of playerToCheck) {
      // Skip players that have already been suggested for replacement
      if (alreadySuggestedOutPlayerIds.has(currentPlayer.id)) {
        continue;
      }
      
      // Ensure current player has a predicted points value (use 0 if undefined)
      if (currentPlayer.predicted_points === undefined || currentPlayer.predicted_points <= 0) {
        currentPlayer.predicted_points = 0;
      }
      
      // Find potential replacements of the same position - limit to 50 to avoid excessive processing
      const potentialReplacements = allPlayers.filter(player => 
        // Must be same position
        player.position === currentPlayer.position &&
        // Must not be the same player
        player.id !== currentPlayer.id && 
        // Must not already be in the team
        !currentTeam.some(teamPlayer => teamPlayer.id === player.id) &&
        // Ensure the team constraint is maintained
        (player.team === currentPlayer.team || 
          currentTeam.filter(p => p.team === player.team).length < MAX_PLAYERS_FROM_SAME_TEAM)
      ).slice(0, 50); // Limit to 50 players
      
      // Ensure all potential replacements have predicted points
      const replacementsWithPoints = potentialReplacements.map(player => {
        if (player.predicted_points === undefined || player.predicted_points <= 0) {
          if (player.total_points !== undefined && player.total_points > 0) {
            // Use total points as a reasonable fallback divided by 10 for scaling
            player.predicted_points = player.total_points / 10;
          } else {
            // As a last resort, default to 0
            player.predicted_points = 0;
          }
        }
        return player;
      });
      
      // Sort replacements by predicted points
      replacementsWithPoints.sort((a, b) => 
        (b.predicted_points || 0) - (a.predicted_points || 0)
      );
      
      // Limit number of replacements to evaluate to prevent excessive processing
      const topReplacements = replacementsWithPoints.slice(0, 10);
      
      // Find valid replacements within budget
      let foundGoodReplacement = false;
      
      for (const replacement of topReplacements) {
        // Get the selling price (SP) of the outgoing player
        const outgoingPlayerSP = currentPlayer.selling_price !== undefined 
          ? currentPlayer.selling_price 
          : currentPlayer.price;
          
        // Get the current price (PP) of the incoming player
        const incomingPlayerPP = replacement.price;
        
        // Calculate PP - SP to determine if we need to spend or get money back
        const costDifference = incomingPlayerPP - outgoingPlayerSP;
        
        const currentPoints = currentPlayer.predicted_points || 0;
        const replacementPoints = replacement.predicted_points || 0;
        const pointsImprovement = replacementPoints - currentPoints;
        
        // A player is an improvement if it has better predicted points
        const isImprovement = pointsImprovement > 0;
          
        // Check if total team cost would be within MAX_BUDGET after the transfer
        // Use selling_price for the current player when calculating new team cost
        const newTeamCost = calculateTeamCost(currentTeam) - outgoingPlayerSP + incomingPlayerPP;
        const isWithinBudget = newTeamCost <= MAX_BUDGET;
        
        if (isImprovement && isWithinBudget) {
          suggestions.push({
            playerOut: currentPlayer,
            playerIn: replacement,
            pointsImprovement,
            costDifference,
            costDifferenceLabel: costDifference > 0 
              ? `Spend £${costDifference.toFixed(1)}m`
              : `Bank +£${Math.abs(costDifference).toFixed(1)}m`
          });
          
          // Mark this player as already suggested for replacement
          alreadySuggestedOutPlayerIds.add(currentPlayer.id);
          foundGoodReplacement = true;
          
          // Only add one suggestion per player
          break;
        }
      }
    }
    
    // If we have no suggestions, add a fallback one
    if (suggestions.length === 0 && sortedTeam.length > 0) {
      const lowestScoringPlayer = [...sortedTeam].sort((a, b) => 
        (a.predicted_points || 0) - (b.predicted_points || 0)
      )[0];
      
      if (lowestScoringPlayer) {
        // Find a better replacement regardless of improvement
        const replacements = allPlayers.filter(player => 
          player.position === lowestScoringPlayer.position &&
          player.id !== lowestScoringPlayer.id && 
          !sortedTeam.some(p => p.id === player.id)
        ).sort((a, b) => 
          (b.predicted_points || 0) - (a.predicted_points || 0)
        ).slice(0, 5);
        
        for (const replacement of replacements) {
          // Get the selling price (SP) of the outgoing player
          const outgoingPlayerSP = lowestScoringPlayer.selling_price !== undefined 
            ? lowestScoringPlayer.selling_price 
            : lowestScoringPlayer.price;
            
          // Get the current price (PP) of the incoming player  
          const incomingPlayerPP = replacement.price;
          
          // Calculate PP - SP to determine if we need to spend or get money back
          const costDifference = incomingPlayerPP - outgoingPlayerSP;
          
          const newTeamCost = calculateTeamCost(sortedTeam) - outgoingPlayerSP + incomingPlayerPP;
          
          if (newTeamCost <= MAX_BUDGET) {
            suggestions.push({
              playerOut: lowestScoringPlayer,
              playerIn: replacement,
              pointsImprovement: (replacement.predicted_points || 0) - (lowestScoringPlayer.predicted_points || 0),
              costDifference,
              costDifferenceLabel: costDifference > 0 
                ? `Spend £${costDifference.toFixed(1)}m`
                : `Bank +£${Math.abs(costDifference).toFixed(1)}m`
            });
            break;
          }
        }
      }
    }
    
    // Sort by points improvement and return limited number
    return suggestions
      .sort((a, b) => b.pointsImprovement - a.pointsImprovement)
      .slice(0, limit);
  } catch (error) {
    console.error("Error in getSuggestedTransfers:", error);
    return [];
  }
}

// Calculate remaining budget
export function getRemainingBudget(team: TeamPlayer[]): number {
  const teamCost = calculateTeamCost(team);
  return Number((MAX_BUDGET - teamCost).toFixed(1));
}

/**
 * Calculate player sell values based on the FPL transfer history
 * @param players Current team players
 * @param transferHistory Transfer history from the FPL API
 * @returns Promise resolving to players with updated selling_price
 */
export const calculatePlayerSellValues = (
  players: any[],
  transferHistory: PlayerTransfer[]
): Promise<any[]> => {
  // Create a map to track the purchase prices for players
  const purchasePricesMap: Record<number, number> = {};
  
  // Process the transfer history to find when players were bought
  transferHistory.forEach(transfer => {
    // Convert from FPL cost format (e.g. 70 -> 7.0)
    const buyPrice = transfer.element_in_cost / 10;
    purchasePricesMap[transfer.element_in] = buyPrice;
  });
  
  console.log("Transfer history map created");
  
  // We'll need to fetch the start price for players not in transfer history
  const playerPromises = players.map(async player => {
    try {
      const playerId = player.id;
      const currentPrice = player.now_cost / 10;
      let purchasePrice;
      let sellingPrice;
      
      // 1. First check if we have this player in our transfer history
      // This provides the most accurate purchase price data
      if (purchasePricesMap[playerId] !== undefined) {
        purchasePrice = purchasePricesMap[playerId];
        console.log(`${player.web_name}: Using transfer history purchase price: ${purchasePrice}`);
      }
      // 2. For original team members not in transfer history, get their starting price from element-summary
      else {
        try {
          console.log(`${player.web_name}: Fetching start price from element-summary API`);
          const response = await fetch(`https://fantasy.premierleague.com/api/element-summary/${playerId}/`);
          if (response.ok) {
            const data = await response.json();
            if (data.history && data.history.length > 0) {
              // Find price from gameweek 1
              const gameweek1Data = data.history.find((h: any) => h.round === 1);
              if (gameweek1Data) {
                purchasePrice = gameweek1Data.value / 10;
                console.log(`${player.web_name}: Using gameweek 1 price as purchase price: ${purchasePrice}`);
              } else {
                // If no gameweek 1 data (player might have been added to FPL later)
                // use the earliest available gameweek
                const earliestGameweek = data.history.sort((a: any, b: any) => a.round - b.round)[0];
                if (earliestGameweek) {
                  purchasePrice = earliestGameweek.value / 10;
                  console.log(`${player.web_name}: Using earliest gameweek (${earliestGameweek.round}) price: ${purchasePrice}`);
                } else {
                  purchasePrice = currentPrice;
                  console.log(`${player.web_name}: No history found, using current price as purchase price: ${purchasePrice}`);
                }
              }
            } else {
              purchasePrice = currentPrice;
              console.log(`${player.web_name}: No history data found, using current price as purchase price: ${purchasePrice}`);
            }
          } else {
            purchasePrice = currentPrice;
            console.log(`${player.web_name}: Failed to fetch element-summary, using current price as purchase price: ${purchasePrice}`);
          }
        } catch (error) {
          console.error(`Error fetching element-summary for player ${playerId} (${player.web_name}):`, error);
          purchasePrice = currentPrice;
          console.log(`${player.web_name}: Error fetching start price, using current price as purchase price: ${purchasePrice}`);
        }
      }
      
      // Now calculate the selling price based on FPL rules
      
      // If current price is lower than purchase price, selling price equals current price
      if (currentPrice < purchasePrice) {
        sellingPrice = currentPrice;
        console.log(`${player.web_name}: CP (${currentPrice}) < PP (${purchasePrice}) => SP = CP (${sellingPrice})`);
      } 
      // If player has increased in value, apply FPL's 50% rule (rounded down to nearest 0.1)
      else if (currentPrice > purchasePrice) {
        // Fix precision issue by rounding to 1 decimal place first
        const priceIncrease = parseFloat((currentPrice - purchasePrice).toFixed(1));
        // Calculate 50% of the increase and round down to nearest 0.1
        const sellValueIncrease = Math.floor(priceIncrease * 5) / 10; 
        sellingPrice = purchasePrice + sellValueIncrease;
        console.log(`${player.web_name}: CP (${currentPrice}) > PP (${purchasePrice}), Increase: ${priceIncrease}, 50%: ${sellValueIncrease} => SP = ${sellingPrice}`);
      }
      // If current price equals purchase price
      else {
        sellingPrice = purchasePrice;
        console.log(`${player.web_name}: CP (${currentPrice}) = PP (${purchasePrice}) => SP = PP (${sellingPrice})`);
      }
      
      // Compare with FPL-provided selling price for verification if available
      if (player.fpl_selling_price !== undefined && Math.abs(sellingPrice - player.fpl_selling_price) > 0.01) {
        console.log(`${player.web_name}: WARNING - Our calculated SP (${sellingPrice}) differs from FPL's SP (${player.fpl_selling_price})`);
      }
      
      // Add purchase_price and selling_price to the player
      return {
        ...player,
        purchase_price: purchasePrice,
        selling_price: sellingPrice
      };
    } catch (error) {
      console.error(`Error calculating sell value for player ${player.id} (${player.web_name}):`, error);
      // Return player with current price as both purchase and selling price as a fallback
      const safePrice = (player.now_cost || 0) / 10;
      return {
        ...player,
        purchase_price: safePrice,
        selling_price: safePrice
      };
    }
  });
  
  // Wait for all promises to resolve and return the players with calculated values
  return Promise.all(playerPromises);
};