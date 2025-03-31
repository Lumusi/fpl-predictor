import { Player } from '../services/fplApi';
import { TransferHistoryItem } from '../services/fplApi';

// Interface for player with purchase info
export interface PlayerWithPurchaseInfo {
  id: number;
  current_price: number;  // Current price in 0.1m units
  purchase_price: number; // Purchase price in 0.1m units
  selling_price: number;  // Calculated selling price in 0.1m units
}

/**
 * Calculate selling price based on FPL rules:
 * - If player has increased in value, owner gets 50% of the profit (rounded down)
 * - If player has decreased in value, owner gets current price
 */
export function calculateSellingPrice(purchasePrice: number, currentPrice: number): number {
  // If player price dropped or stayed the same, selling price = current price
  if (currentPrice <= purchasePrice) {
    return currentPrice;
  }
  
  // If player price increased, selling price = purchase price + 50% of profit (rounded down)
  const profit = currentPrice - purchasePrice;
  const profitShare = Math.floor(profit / 2);
  return purchasePrice + profitShare;
}

/**
 * Determine player purchase prices from transfer history
 * For players without transfer history (e.g., initial team selection),
 * we'll use the earliest available price or current price if unavailable.
 */
export function getPlayerPurchaseInfo(
  currentPlayers: Player[], 
  transferHistory: TransferHistoryItem[]
): PlayerWithPurchaseInfo[] {
  // Create a map of player IDs to their latest purchase price from transfer history
  const latestTransferInByPlayer = new Map<number, TransferHistoryItem>();
  
  // Sort transfer history with most recent transfers last
  const sortedTransfers = [...transferHistory].sort((a, b) => {
    return new Date(a.time).getTime() - new Date(b.time).getTime();
  });
  
  // Go through all transfers to find the most recent transfer in for each player
  for (const transfer of sortedTransfers) {
    latestTransferInByPlayer.set(transfer.element_in, transfer);
  }
  
  // Process each current player
  return currentPlayers.map(player => {
    const playerId = player.id;
    const currentPrice = player.now_cost;
    let purchasePrice: number;
    
    // Check if player has transfer history
    const transferInfo = latestTransferInByPlayer.get(playerId);
    
    if (transferInfo) {
      // Player was transferred in, use that price
      purchasePrice = transferInfo.element_in_cost;
    } else {
      // Player was likely part of initial team selection
      // Use current price as fallback
      purchasePrice = currentPrice;
    }
    
    // Calculate selling price based on FPL rules
    const sellingPrice = calculateSellingPrice(purchasePrice, currentPrice);
    
    return {
      id: playerId,
      current_price: currentPrice,
      purchase_price: purchasePrice,
      selling_price: sellingPrice
    };
  });
}

/**
 * Get a map of player IDs to their purchase and selling prices
 */
export function getPlayerPriceMap(playerPurchaseInfo: PlayerWithPurchaseInfo[]): Map<number, PlayerWithPurchaseInfo> {
  const priceMap = new Map<number, PlayerWithPurchaseInfo>();
  
  for (const info of playerPurchaseInfo) {
    priceMap.set(info.id, info);
  }
  
  return priceMap;
} 