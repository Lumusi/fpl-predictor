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
  allFormattedPlayers: TeamPlayer[];
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: ReactNode }) {
  const { players, teams, predictedPoints, loading } = useFplData();
  const [myTeam, setMyTeam] = useState<TeamPlayer[]>([]);
  const [allFormattedPlayers, setAllFormattedPlayers] = useState<TeamPlayer[]>([]);
  const [suggestions, setSuggestions] = useState<TeamSuggestion[]>([]);
  
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
      const teamSuggestions = getSuggestedTransfers(
        myTeam,
        allFormattedPlayers,
        remainingBudget
      );
      setSuggestions(teamSuggestions);
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