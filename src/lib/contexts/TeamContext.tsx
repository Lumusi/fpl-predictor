'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Player, getAllPlayers, getUserTeamPicks, getUserTransferHistory, TransferHistoryItem } from '../services/fplApi';
import { 
  TeamPlayer, 
  TeamSuggestion, 
  formatPlayerForTeam, 
  calculateTeamCost,
  getRemainingBudget,
  canAddPlayer,
  getSuggestedTransfers,
  MAX_BUDGET,
  TEAM_SIZE,
  FORMATION_CONSTRAINTS,
  MAX_PLAYERS_FROM_SAME_TEAM,
  ExtendedPlayer
} from '../utils/teamBuilder';
import { useFplData } from '../hooks/useFplData';
import { getPlayerPurchaseInfo, getPlayerPriceMap } from '../utils/sellingPriceCalculator';
import logger from '../utils/logger';

interface TeamContextType {
  myTeam: TeamPlayer[];
  addPlayer: (player: Player | ExtendedPlayer) => { success: boolean; message?: string };
  removePlayer: (playerId: number) => void;
  swapPlayer: (playerId: number, newPlayer: Player | ExtendedPlayer) => { success: boolean; message?: string; newBank?: number };
  clearTeam: () => void;
  importTeam: (teamId: number) => Promise<{ success: boolean; message: string }>;
  remainingBudget: number;
  teamCost: number;
  isTeamComplete: boolean;
  suggestions: TeamSuggestion[];
  getSuggestions: () => void;
  loadingTeam: boolean;
  loadingSuggestions: boolean;
  importingTeam: boolean;
  allFormattedPlayers: TeamPlayer[];
  bank: number | null;
  teamValue: number | null;
  actualBudget: number | null;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: ReactNode }) {
  const { players, teams, predictedPoints, loading } = useFplData();
  const [myTeam, setMyTeam] = useState<TeamPlayer[]>([]);
  const [allFormattedPlayers, setAllFormattedPlayers] = useState<TeamPlayer[]>([]);
  const [suggestions, setSuggestions] = useState<TeamSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [importingTeam, setImportingTeam] = useState(false);
  const [bank, setBank] = useState<number | null>(null);
  const [teamValue, setTeamValue] = useState<number | null>(null);
  const [actualBudget, setActualBudget] = useState<number | null>(MAX_BUDGET);
  
  // Format all players when data loads
  useEffect(() => {
    if (players.length > 0 && teams.length > 0) {
      const formatted = players.map(player => {
        // Get predicted points for this player
        const playerPrediction = predictedPoints.find(p => p.id === player.id);
        
        // Format player with all required data
        const formattedPlayer = formatPlayerForTeam(player, teams);
        
        // Add predicted points
        if (playerPrediction) {
          formattedPlayer.predicted_points = playerPrediction.predicted_points;
        }
        
        return formattedPlayer;
      });
      
      setAllFormattedPlayers(formatted);
    }
  }, [players, teams, predictedPoints]);
  
  // Calculate team stats
  const teamCost = calculateTeamCost(myTeam);
  // Ensure bank is initialized to 0 instead of null when manually building a team
  useEffect(() => {
    if (myTeam.length > 0 && bank === null) {
      setBank(MAX_BUDGET - teamCost);
      logger.log("[TEAM_BUDGET] Initializing bank for manual team:", MAX_BUDGET - teamCost);
    }
  }, [myTeam.length, bank, teamCost]);

  // Always calculate remaining budget based on bank (which is now guaranteed to exist)
  const remainingBudget = bank !== null ? bank : MAX_BUDGET - teamCost;
  const isTeamComplete = myTeam.length === TEAM_SIZE;
  
  // Debug logging for budget tracking
  useEffect(() => {
    logger.debug("[TEAM_BUDGET] Budget values updated:", {
      teamCost,
      bank,
      actualBudget,
      remainingBudget,
      teamSize: myTeam.length,
      isImportedTeam: bank !== null
    });
  }, [teamCost, bank, actualBudget, remainingBudget, myTeam.length]);
  
  // Add a player to the team
  const addPlayer = (player: Player | ExtendedPlayer): { success: boolean; message?: string } => {
    // Check if team is already complete
    if (isTeamComplete) {
      return { success: false, message: 'Team is already complete (15 players)' };
    }
    
    // Format player with additional data
    const formattedPlayer = formatPlayerForTeam(player, teams);
    
    // Add predicted points
    const playerPrediction = predictedPoints.find(p => p.id === player.id);
    if (playerPrediction) {
      formattedPlayer.predicted_points = playerPrediction.predicted_points;
    }
    
    // Handle purchase price and selling price calculation
    // First check if specific values were passed in (for imported players)
    let purchasePrice: number;
    let currentPrice: number;
    
    // Get current price - always use the player's current price value
    currentPrice = formattedPlayer.price;
    
    // Get purchase price - use the one from the player object if available, otherwise current price
    if ('purchase_price' in player && typeof player.purchase_price === 'number' && player.purchase_price > 0) {
      purchasePrice = player.purchase_price;
      formattedPlayer.purchase_price = purchasePrice;
    } else {
      // For players added from player selection, purchase price = current price
      purchasePrice = currentPrice;
      formattedPlayer.purchase_price = purchasePrice;
    }
    
    // For a player added from selection, selling price = current price initially
    // This ensures if removed immediately, they give back what they cost
    formattedPlayer.selling_price = currentPrice;
    
    logger.debug("[ADD_PLAYER] Player price details:", {
      playerName: formattedPlayer.web_name,
      currentPrice, 
      purchasePrice,
      sellingPrice: formattedPlayer.selling_price,
      bank
    });
    
    // Check if we can add the player
    const canAdd = canAddPlayer(formattedPlayer, myTeam);
    if (!canAdd.allowed) {
      return { success: false, message: canAdd.reason };
    }
    
    // Check budget
    // If bank is null, initialize it with max budget minus current team cost
    const currentBank = bank !== null ? bank : MAX_BUDGET - teamCost;
    
    // For players added from selection, we deduct their current price (not selling price)
    if (currentPrice > currentBank) {
      return { success: false, message: 'Not enough budget to add this player' };
    }
    
    // Add the player to the team
    setMyTeam(prev => [...prev, formattedPlayer]);
    
    // Always update the bank value, deducting the current price of the added player
    setBank(prevBank => {
      const currentBank = prevBank ?? (MAX_BUDGET - teamCost);
      const updatedBank = currentBank - currentPrice;
      
      logger.debug("[ADD_PLAYER] Bank updated:", { 
        playerName: formattedPlayer.web_name,
        prevBank: currentBank, 
        playerPrice: currentPrice,
        updatedBank,
        calculation: `${currentBank} - ${currentPrice} = ${updatedBank}`
      });
      
      return updatedBank;
    });
    
    return { success: true };
  };
  
  // Remove a player from the team
  const removePlayer = (playerId: number) => {
    // Find the player we're removing to update the bank
    const playerToRemove = myTeam.find(player => player.id === playerId);
    
    if (playerToRemove) {
      // When removing a player, always use selling_price if available
      const playerValue = playerToRemove.selling_price !== undefined 
        ? playerToRemove.selling_price 
        : playerToRemove.price;
      
      logger.debug("[REMOVE_PLAYER] Removing player:", {
        playerName: playerToRemove.web_name,
        playerValue,
        currentBank: bank,
        newBank: bank !== null ? bank + playerValue : null
      });
      
      // Remove the player from the team
      setMyTeam(prev => prev.filter(player => player.id !== playerId));
      
      // Always update the bank when removing a player - add back the selling price
      setBank(prevBank => {
        // If bank is null, initialize it with max budget minus current team cost
        const currentBank = prevBank ?? (MAX_BUDGET - teamCost);
        const updatedBank = currentBank + playerValue;
        
        logger.debug("[REMOVE_PLAYER] Bank updated:", { 
          prevBank: currentBank, 
          playerValue,
          updatedBank,
          calculation: `${currentBank} + ${playerValue} = ${updatedBank}`
        });
        
        return updatedBank;
      });
    }
  };
  
  // Swap a player in the team
  const swapPlayer = (playerId: number, newPlayer: Player | ExtendedPlayer): { success: boolean; message?: string; newBank?: number } => {
    // Find the player in our team to replace
    const oldPlayer = myTeam.find(player => player.id === playerId);
    
    // Format the new player
    const formattedPlayer = formatPlayerForTeam(newPlayer, teams);
    
    // Add predicted points to the new player
    const playerPrediction = predictedPoints.find(p => p.id === newPlayer.id);
    if (playerPrediction) {
      formattedPlayer.predicted_points = playerPrediction.predicted_points;
    }
    
    // Handle purchase price - for transfers, purchase price is the current price
    // Unless a specific purchase price was provided (as in imports)
    if ('purchase_price' in newPlayer && typeof newPlayer.purchase_price === 'number') {
      formattedPlayer.purchase_price = newPlayer.purchase_price;
    } else {
      formattedPlayer.purchase_price = formattedPlayer.price;
    }
    
    // For swapped players, selling price = current price initially
    formattedPlayer.selling_price = formattedPlayer.price;
    
    if (!oldPlayer) {
      return { success: false, message: 'Player to replace not found in team' };
    }
    
    logger.debug("[SWAP_PLAYER] Players involved:", {
      outPlayer: oldPlayer.web_name,
      inPlayer: formattedPlayer.web_name,
      outPlayerCurrentValue: oldPlayer.price,
      inPlayerCurrentValue: formattedPlayer.price,
      outPlayerSellingPrice: oldPlayer.selling_price !== undefined ? oldPlayer.selling_price : oldPlayer.price,
      inPlayerPurchasePrice: formattedPlayer.purchase_price
    });

    // Check position constraints (if the new player has a different position)
    if (oldPlayer.position !== formattedPlayer.position) {
      const positionCount = myTeam.filter(p => p.position === formattedPlayer.position).length;
      const positionLimit = FORMATION_CONSTRAINTS[formattedPlayer.position as keyof typeof FORMATION_CONSTRAINTS]?.max || 0;
      
      if (positionCount >= positionLimit) {
        return { 
          success: false, 
          message: `Maximum number of ${formattedPlayer.position} players (${positionLimit}) reached` 
        };
      }
    }
    
    // Check team constraints (max 3 from same team)
    if (oldPlayer.team !== formattedPlayer.team) {
      const teamCount = myTeam.filter(p => p.team === formattedPlayer.team && p.id !== playerId).length;
      if (teamCount >= MAX_PLAYERS_FROM_SAME_TEAM) {
        return { 
          success: false, 
          message: `Maximum number of players (${MAX_PLAYERS_FROM_SAME_TEAM}) from ${formattedPlayer.team_short_name} reached` 
        };
      }
    }
    
    // Check budget - when swapping:
    // 1. Add old player's selling price back to bank
    // 2. Deduct new player's current price from bank
    const oldPlayerValue = oldPlayer.selling_price !== undefined ? oldPlayer.selling_price : oldPlayer.price;
    const newPlayerValue = formattedPlayer.price; // Always use current price for incoming player
    
    logger.debug("[SWAP_PLAYER] Budget calculation:", {
      outPlayer: oldPlayer.web_name,
      oldPlayerValue,
      inPlayer: formattedPlayer.web_name,
      newPlayerValue,
      priceDifference: oldPlayerValue - newPlayerValue,
      currentBank: bank,
      availableBudget: bank !== null ? bank + oldPlayerValue : null
    });
    
    // Calculate the actual budget available for this transfer
    const availableBudget = bank !== null 
      ? bank + oldPlayerValue  // Add the selling value of the player being replaced to the bank
      : (MAX_BUDGET - teamCost + oldPlayerValue); // Use max budget minus current team cost plus selling value
    
    // Add debugging for budget check
    logger.debug("[SWAP_PLAYER] Budget check:", {
      availableBudget,
      newPlayerValue,
      sufficientBudget: newPlayerValue <= availableBudget,
      difference: availableBudget - newPlayerValue
    });
    
    if (newPlayerValue > availableBudget) {
      return { success: false, message: 'Not enough budget for this transfer' };
    }
    
    // Calculate new bank value and return it in the result
    let newBankValue: number | null = null;
    
    // Perform the swap - remove old player and add new one
    setMyTeam(prev => {
      const filteredTeam = prev.filter(p => p.id !== playerId);
      return [...filteredTeam, formattedPlayer];
    });
    
    // Always update the bank value when making a transfer
    // Formula: new bank = current bank + selling price of old player - current price of new player
    const priceDifference = oldPlayerValue - newPlayerValue;
    
    setBank(prevBank => {
      // If bank is null, initialize it with max budget minus current team cost
      const currentBank = prevBank ?? (MAX_BUDGET - teamCost);
      const updatedBank = currentBank + priceDifference;
      
      newBankValue = updatedBank; // Store for return value
      
      logger.debug("[SWAP_PLAYER] Bank updated:", { 
        prevBank: currentBank, 
        priceDifference,
        updatedBank,
        calculation: `${currentBank} + (${oldPlayerValue} - ${newPlayerValue}) = ${updatedBank}`,
        oldPlayerDetails: {
          name: oldPlayer.web_name,
          currentPrice: oldPlayer.price,
          sellingPrice: oldPlayer.selling_price
        },
        newPlayerDetails: {
          name: formattedPlayer.web_name,
          currentPrice: formattedPlayer.price
        }
      });
      
      return updatedBank;
    });
    
    return { success: true, newBank: newBankValue ?? undefined };
  };
  
  // Clear the entire team
  const clearTeam = () => {
    logger.log("[CLEAR_TEAM] Clearing team and resetting budget values");
    setMyTeam([]);
    setSuggestions([]);
    setBank(null);
    setTeamValue(null);
    setActualBudget(MAX_BUDGET);
  };
  
  // Import a team from FPL API
  const importTeam = async (teamId: number): Promise<{ success: boolean; message: string }> => {
    try {
      setImportingTeam(true);
      
      // Use our new API endpoint that handles all the calculations
      const response = await fetch(`/api/fpl/import-team?teamId=${teamId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        setImportingTeam(false);
        return { 
          success: false, 
          message: errorData.error || 'Failed to import team. Please check the team ID and try again.' 
        };
      }
      
      const data = await response.json();
      logger.log("[IMPORT_TEAM] Team data received:", data);
      
      // Store bank and team value
      setBank(data.bank);
      setTeamValue(data.teamValue);
      
      // Calculate actual budget (team value + bank)
      setActualBudget(data.teamValue + data.bank);
      
      // Clear existing team
      setMyTeam([]);
      
      // Need player data to import the team
      if (players.length === 0) {
        setImportingTeam(false);
        return { success: false, message: 'Failed to import team. Player data not available.' };
      }
      
      const importedTeam: TeamPlayer[] = [];
      
      // Process each player from the API response
      for (const playerData of data.players) {
        // Log detailed player pricing for debugging
        logger.debug(`[IMPORT_TEAM] Processing player ${playerData.web_name} (ID: ${playerData.id}):`, {
          id: playerData.id,
          now_cost: playerData.now_cost,
          now_cost_decimal: playerData.now_cost / 10,
          purchase_price_api: playerData.purchase_price,
          selling_price_api: playerData.selling_price
        });
        
        // Format player with additional data
        const formattedPlayer = formatPlayerForTeam({
          id: playerData.id,
          code: playerData.code || 0,
          web_name: playerData.web_name,
          team: playerData.team || 0,
          element_type: playerData.element_type,
          now_cost: playerData.now_cost || 0, // Ensure now_cost is set correctly
          // Include other required fields or use defaults
          total_points: playerData.total_points || 0,
          goals_scored: 0,
          assists: 0,
          clean_sheets: 0,
          minutes: 0,
          form: playerData.form || "0",
          points_per_game: "0",
          selected_by_percent: "0",
          status: "",
          chance_of_playing_next_round: null
        } as ExtendedPlayer, teams);
        
        // Add predicted points
        const playerPrediction = predictedPoints.find(p => p.id === playerData.id);
        if (playerPrediction) {
          formattedPlayer.predicted_points = playerPrediction.predicted_points;
        }
        
        // Override the automatically calculated price with values from the API
        // These are already in decimal format (e.g., 7.5 not 75)
        formattedPlayer.price = playerData.selling_price;
        formattedPlayer.selling_price = playerData.selling_price;
        formattedPlayer.purchase_price = playerData.purchase_price;
        
        // Add positional data from FPL
        formattedPlayer.position_in_team = playerData.position;
        formattedPlayer.is_captain = playerData.is_captain;
        formattedPlayer.is_vice_captain = playerData.is_vice_captain;
        
        // Log the final formatted player to verify prices
        logger.debug(`[IMPORT_TEAM] Final formatted player ${formattedPlayer.web_name}:`, {
          price: formattedPlayer.price,
          selling_price: formattedPlayer.selling_price,
          purchase_price: formattedPlayer.purchase_price
        });
        
        importedTeam.push(formattedPlayer);
      }
      
      if (importedTeam.length > 0) {
        // Set the imported team
        setMyTeam(importedTeam);
        logger.log(`[IMPORT_TEAM] Team imported with ${importedTeam.length} players`);
        
        setImportingTeam(false);
        return { 
          success: true, 
          message: `Team imported successfully with ${importedTeam.length} players. Bank: £${data.bank.toFixed(1)}m.` 
        };
      } else {
        setImportingTeam(false);
        return { success: false, message: 'Failed to import team. Could not process player data.' };
      }
    } catch (error) {
      logger.error("[IMPORT_TEAM] Error importing team:", error);
      setImportingTeam(false);
      return { success: false, message: 'Failed to import team. An error occurred.' };
    }
  };
  
  // Get transfer suggestions
  const getSuggestions = () => {
    if (myTeam.length > 0 && allFormattedPlayers.length > 0) {
      try {
        setLoadingSuggestions(true);
        logger.log("-----------------------------------------------");
        logger.log("GETTING SUGGESTIONS");
        logger.log("Team size:", myTeam.length);
        logger.log("Available players:", allFormattedPlayers.length);
        logger.log("Remaining budget:", remainingBudget);
        logger.log("-----------------------------------------------");
        
        // Make sure we have predicted points in both myTeam and allFormattedPlayers
        const teamWithPredictions = myTeam.map(player => {
          if (!player) {
            logger.error("Found null player in team");
            return { 
              id: 0,
              web_name: "Unknown",
              position: "UNK",
              element_type: 0,
              price: 0,
              predicted_points: 0
            } as TeamPlayer;
          }
          
          // If player doesn't have predicted points, try to find it or set to 0
          if (player.predicted_points === undefined) {
            const playerWithPrediction = allFormattedPlayers.find(p => p.id === player.id);
            if (playerWithPrediction && playerWithPrediction.predicted_points !== undefined) {
              return { ...player, predicted_points: playerWithPrediction.predicted_points };
            }
          }
          
          return player;
        });
        
        // Make sure all players have at least 0 predicted points
        const safeTeamWithPredictions = teamWithPredictions.map(player => {
          if (!player) return null;
          return {
            ...player,
            predicted_points: player.predicted_points ?? 0
          };
        }).filter(Boolean) as TeamPlayer[];
        
        // Generate suggestions using the optimized function
        setTimeout(() => {
          try {
            const teamSuggestions = getSuggestedTransfers(
              safeTeamWithPredictions,
              allFormattedPlayers,
              0,
              5
            );
            
            if (teamSuggestions.length > 0) {
              logger.log(`Found ${teamSuggestions.length} suggestions`);
              setSuggestions(teamSuggestions);
              setLoadingSuggestions(false);
            } else {
              logger.log("No suggestions found");
              setSuggestions([]);
              setLoadingSuggestions(false);
            }
          } catch (error) {
            logger.error("Error generating suggestions:", error);
            setSuggestions([]);
            setLoadingSuggestions(false);
          }
        }, 100); // Small delay to allow UI to update
      } catch (error) {
        logger.error("Error in getSuggestions:", error);
        setSuggestions([]);
        setLoadingSuggestions(false);
      }
    } else {
      logger.log("Cannot generate suggestions - team or player data missing");
      setLoadingSuggestions(false);
    }
  };
  
  const value = {
    myTeam,
    addPlayer,
    removePlayer,
    swapPlayer,
    clearTeam,
    importTeam,
    remainingBudget,
    teamCost,
    isTeamComplete,
    suggestions,
    getSuggestions,
    loadingTeam: loading,
    loadingSuggestions,
    importingTeam,
    allFormattedPlayers,
    bank,
    teamValue: teamValue ?? teamCost,
    actualBudget: bank !== null ? bank + teamCost : MAX_BUDGET
  };
  
  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
} 