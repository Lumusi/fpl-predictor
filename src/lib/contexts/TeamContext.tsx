'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Player } from '../services/fplApi';
import { 
  TeamPlayer, 
  TeamSuggestion, 
  formatPlayerForTeam, 
  calculateTeamCost,
  getRemainingBudget,
  canAddPlayer,
  getSuggestedTransfers,
  MAX_BUDGET,
  TEAM_SIZE
} from '../utils/teamBuilder';
import { useFplData } from '../hooks/useFplData';

interface TeamContextType {
  myTeam: TeamPlayer[];
  addPlayer: (player: Player) => { success: boolean; message?: string };
  removePlayer: (playerId: number) => void;
  clearTeam: () => void;
  remainingBudget: number;
  teamCost: number;
  isTeamComplete: boolean;
  suggestions: TeamSuggestion[];
  getSuggestions: () => void;
  loadingTeam: boolean;
  loadingSuggestions: boolean;
  allFormattedPlayers: TeamPlayer[];
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: ReactNode }) {
  const { players, teams, predictedPoints, loading } = useFplData();
  const [myTeam, setMyTeam] = useState<TeamPlayer[]>([]);
  const [allFormattedPlayers, setAllFormattedPlayers] = useState<TeamPlayer[]>([]);
  const [suggestions, setSuggestions] = useState<TeamSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  
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
  const remainingBudget = getRemainingBudget(myTeam);
  const isTeamComplete = myTeam.length === TEAM_SIZE;
  
  // Add a player to the team
  const addPlayer = (player: Player): { success: boolean; message?: string } => {
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
    
    // Check if player can be added
    const canAdd = canAddPlayer(formattedPlayer, myTeam);
    if (!canAdd.allowed) {
      return { success: false, message: canAdd.reason };
    }
    
    // Check budget constraints
    const newCost = teamCost + formattedPlayer.price;
    if (newCost > MAX_BUDGET) {
      return { success: false, message: 'Not enough budget to add this player' };
    }
    
    // Add player to team
    setMyTeam(prev => [...prev, formattedPlayer]);
    return { success: true };
  };
  
  // Remove a player from the team
  const removePlayer = (playerId: number) => {
    setMyTeam(prev => prev.filter(player => player.id !== playerId));
  };
  
  // Clear the entire team
  const clearTeam = () => {
    setMyTeam([]);
    setSuggestions([]);
  };
  
  // Get transfer suggestions
  const getSuggestions = () => {
    if (myTeam.length > 0 && allFormattedPlayers.length > 0) {
      try {
        setLoadingSuggestions(true);
        console.log("-----------------------------------------------");
        console.log("GETTING SUGGESTIONS");
        console.log("Team size:", myTeam.length);
        console.log("Available players:", allFormattedPlayers.length);
        console.log("Remaining budget:", remainingBudget);
        console.log("-----------------------------------------------");
        
        // Make sure we have predicted points in both myTeam and allFormattedPlayers
        const teamWithPredictions = myTeam.map(player => {
          if (!player) {
            console.error("Found null player in team");
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
              console.log(`Found ${teamSuggestions.length} suggestions`);
              setSuggestions(teamSuggestions);
              setLoadingSuggestions(false);
            } else {
              console.log("No suggestions found");
              setSuggestions([]);
              setLoadingSuggestions(false);
            }
          } catch (error) {
            console.error("Error generating suggestions:", error);
            setSuggestions([]);
            setLoadingSuggestions(false);
          }
        }, 100); // Small delay to allow UI to update
      } catch (error) {
        console.error("Error in getSuggestions:", error);
        setSuggestions([]);
        setLoadingSuggestions(false);
      }
    } else {
      console.log("Cannot generate suggestions - team or player data missing");
      setLoadingSuggestions(false);
    }
  };
  
  const value = {
    myTeam,
    addPlayer,
    removePlayer,
    clearTeam,
    remainingBudget,
    teamCost,
    isTeamComplete,
    suggestions,
    getSuggestions,
    loadingTeam: loading,
    loadingSuggestions,
    allFormattedPlayers
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