import type { NextApiRequest, NextApiResponse } from 'next';
import { calculatePlayerSellValues, PlayerTransfer } from '@/lib/utils/teamBuilder';
import axios from 'axios';

interface FplTeamPlayer {
  element: number; // player ID
  position: number;
  selling_price: number;
  purchase_price: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
}

interface FplTeamResponse {
  picks: FplTeamPlayer[];
  chips: any[];
  active_chip: string | null;
  entry_history: {
    event: number;
    points: number;
    total_points: number;
    rank: number;
    rank_sort: number;
    overall_rank: number;
    bank: number; // in 0.1m units
    value: number; // in 0.1m units
    event_transfers: number;
    event_transfers_cost: number;
    event_transfers_limit?: number;
  };
  // Keep this for backward compatibility in case the structure changes again
  transfers?: {
    bank: number;
    cost: number;
    status: string;
    value: number;
    limit: number;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { teamId } = req.query;

  if (!teamId || typeof teamId !== 'string') {
    return res.status(400).json({ message: 'Team ID is required' });
  }

  try {
    // Fetch the bootstrap data first - contains gameweek info and all player data
    const bootstrapResponse = await axios.get('https://fantasy.premierleague.com/api/bootstrap-static/');
    
    if (bootstrapResponse.status !== 200) {
      console.error(`[IMPORT_TEAM_API] Bootstrap fetch failed with status: ${bootstrapResponse.status}`);
      return res.status(502).json({ message: 'Failed to fetch FPL data' });
    }
    const bootstrapData = bootstrapResponse.data;
    
    // Find the current gameweek
    const currentGameweek = bootstrapData.events.find((event: any) => event.is_current === true);
    if (!currentGameweek) {
      console.error("[IMPORT_TEAM_API] Could not find current gameweek in bootstrap data");
      return res.status(500).json({ message: 'Could not determine current gameweek' });
    }
    
    // Get all player data from bootstrap
    const allPlayers = bootstrapData.elements;
    
    // Fetch user's current team from FPL API using the correct event/gameweek ID
    const teamResponse = await axios.get(`https://fantasy.premierleague.com/api/entry/${teamId}/event/${currentGameweek.id}/picks/`);
    
    if (teamResponse.status !== 200) {
      console.error(`[IMPORT_TEAM_API] Team fetch failed with status: ${teamResponse.status}`);
      return res.status(502).json({ message: 'Failed to fetch team data' });
    }
    const teamData: FplTeamResponse = teamResponse.data;
    
    // Fetch player transfer history
    const transferHistoryResponse = await axios.get(`https://fantasy.premierleague.com/api/entry/${teamId}/transfers/`);
    
    if (transferHistoryResponse.status !== 200) {
      console.error(`[IMPORT_TEAM_API] Transfer history fetch failed with status: ${transferHistoryResponse.status}`);
      return res.status(502).json({ message: 'Failed to fetch transfer history' });
    }
    const transferHistory: PlayerTransfer[] = transferHistoryResponse.data;
    
    // Process each player from the API response
    const userPlayers = teamData.picks.map(pick => {
      const playerData = allPlayers.find((p: any) => p.id === pick.element);
      if (!playerData) {
        console.error(`[IMPORT_TEAM_API] Could not find player data for ID: ${pick.element}`);
        return null;
      }
      
      // Check for required properties to avoid null reference errors
      if (!playerData.id || playerData.element_type === undefined) {
        console.error(`[IMPORT_TEAM_API] Missing required player data for ID: ${pick.element}`);
        return null;
      }
      
      try {
        // Ensure all price values are in the same format (decimal, e.g., 7.5 rather than 75)
        const currentPrice = playerData.now_cost / 10;
        const purchasePrice = pick.purchase_price / 10;
        const sellingPrice = pick.selling_price / 10;
        
        return {
          ...playerData,
          id: playerData.id,
          now_cost: playerData.now_cost || 0, // Keep original now_cost for compatibility
          // Add in the FPL-provided purchase price and selling price (in decimal format)
          purchase_price: purchasePrice,
          selling_price: sellingPrice,
          // Keep FPL's original values for reference
          fpl_purchase_price: purchasePrice,
          fpl_selling_price: sellingPrice,
          position: pick.position,
          multiplier: pick.multiplier,
          is_captain: pick.is_captain || false,
          is_vice_captain: pick.is_vice_captain || false,
        };
      } catch (error) {
        console.error(`[IMPORT_TEAM_API] Error processing player data for ID: ${pick.element}`, error);
        return null;
      }
    }).filter(player => player !== null);
    
    if (userPlayers.length < teamData.picks.length) {
      console.error(`[IMPORT_TEAM_API] Only found data for ${userPlayers.length} players out of ${teamData.picks.length}`);
    }

    // Calculate more accurate selling prices using our transfer history logic
    const playersWithSellValues = await calculatePlayerSellValues(userPlayers, transferHistory);
    
    // Enrich player data with the pick information
    const userPlayersWithPickData = playersWithSellValues
      .filter(player => teamData.picks.some((pick: any) => pick.element === player.id))
      .map(player => {
        const pick = teamData.picks.find((p: any) => p.element === player.id);
        if (!pick) {
          console.error(`[IMPORT_TEAM_API] Could not find pick data for player ID: ${player.id}`);
          return null;
        }
        
        // Validate that all price values are available and in decimal format
        const finalPlayer = {
          ...player,
          position: pick.position,
          is_captain: pick.is_captain,
          is_vice_captain: pick.is_vice_captain,
          multiplier: pick.multiplier,
          // Ensure all prices are in decimal format
          now_cost: player.now_cost, // Keep original for compatibility
          purchase_price: player.purchase_price, // Already in decimal
          selling_price: player.selling_price, // Already in decimal
        };
        
        return finalPlayer;
      }).filter(player => player !== null);

    // Return full team data with budget information - use entry_history instead of transfers
    return res.status(200).json({
      players: userPlayersWithPickData,
      bank: teamData.entry_history ? teamData.entry_history.bank / 10 : 0, // Convert to decimal format
      teamValue: teamData.entry_history ? teamData.entry_history.value / 10 : 0, // Convert to decimal format
      transfers: {
        limit: teamData.entry_history ? teamData.entry_history.event_transfers_limit || 0 : 0,
        cost: teamData.entry_history ? teamData.entry_history.event_transfers_cost / 10 : 0, // Convert to decimal format
        status: "active" // Default status if not provided
      },
      chips: teamData.chips || [],
    });
  } catch (error) {
    console.error('[IMPORT_TEAM_API] Error importing team:', error);
    return res.status(500).json({ message: 'Error importing team' });
  }
} 