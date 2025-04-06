import React, { useState, memo, useEffect, useRef } from 'react';
import { XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import { TeamPlayer } from '@/lib/utils/teamBuilder';
import { isMobile } from '@/lib/utils/deviceUtils';
import { checkIfManager } from '@/lib/utils/playerImages';
import { getManagerByTeam } from '@/lib/utils/managerImages';
import Image from 'next/image';

interface OptimizedPlayerCardProps {
  player: TeamPlayer;
  onSelect: () => void;
  isInTeam: boolean;
  className?: string;
}

interface PlayerWithManagerInfo extends TeamPlayer {
  isManager?: boolean;
  optaId?: string | undefined;
}

// Player row component for the virtualized list
const OptimizedPlayerCard = memo(({
  player,
  onSelect,
  isInTeam,
  className = ''
}: OptimizedPlayerCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [playerWithManagerCheck, setPlayerWithManagerCheck] = useState<PlayerWithManagerInfo>(player);
  
  // Even smaller images on mobile for better performance
  const imageSize = isMobile() ? 30 : 60;
  
  // Setup intersection observer for lazy loading
  useEffect(() => {
    if (!cardRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );
    
    observer.observe(cardRef.current);
    
    return () => {
      observer.disconnect();
    };
  }, []);
  
  // Check if player is actually a manager on component mount - using same approach as PlayerPredictionTable
  useEffect(() => {
    const newManagerInfo: { isManager: boolean; optaId: string | undefined } = { isManager: false, optaId: undefined };
    
    // Method 1: Check if the player's code starts with 'man' (direct Opta ID)
    const playerCode = player.code ? player.code.toString() : '';
    if (playerCode && playerCode.startsWith('man')) {
      newManagerInfo.isManager = true;
      newManagerInfo.optaId = playerCode;
    }
    // Method 2: Check if the player's element_type is set to a manager code (5)
    else if (player.element_type === 5) {
      // Try to find the team and corresponding manager
      let teamName = player.team_name;
      if (!teamName && player.team_short_name) {
        const teamNameMap: Record<string, string> = {
          'ARS': 'Arsenal',
          'AVL': 'Aston Villa',
          'BOU': 'Bournemouth',
          'BRE': 'Brentford',
          'BHA': 'Brighton',
          'CHE': 'Chelsea',
          'CRY': 'Crystal Palace',
          'EVE': 'Everton',
          'FUL': 'Fulham',
          'IPW': 'Ipswich',
          'LEI': 'Leicester',
          'LIV': 'Liverpool',
          'MCI': 'Man City',
          'MUN': 'Man Utd',
          'NEW': 'Newcastle',
          'NFO': 'Nott\'m Forest',
          'SOU': 'Southampton',
          'TOT': 'Spurs',
          'WHU': 'West Ham',
          'WOL': 'Wolves'
        };
        teamName = teamNameMap[player.team_short_name];
      }
      
      if (teamName) {
        const manager = getManagerByTeam(teamName);
        if (manager) {
          newManagerInfo.isManager = true;
          newManagerInfo.optaId = manager.id;
        }
      }
    }
    // Method 3: Name-based matching
    else if (player.web_name && (player.team_name || player.team_short_name)) {
      // Get proper team name for manager lookup
      let teamName = player.team_name;
      
      // If we don't have team_name but have team_short_name, map it to full name
      if (!teamName && player.team_short_name) {
        // Map short names to full names
        const teamNameMap: Record<string, string> = {
          'ARS': 'Arsenal',
          'AVL': 'Aston Villa',
          'BOU': 'Bournemouth',
          'BRE': 'Brentford',
          'BHA': 'Brighton',
          'CHE': 'Chelsea',
          'CRY': 'Crystal Palace',
          'EVE': 'Everton',
          'FUL': 'Fulham',
          'IPW': 'Ipswich',
          'LEI': 'Leicester',
          'LIV': 'Liverpool',
          'MCI': 'Man City',
          'MUN': 'Man Utd',
          'NEW': 'Newcastle',
          'NFO': 'Nott\'m Forest',
          'SOU': 'Southampton',
          'TOT': 'Spurs',
          'WHU': 'West Ham',
          'WOL': 'Wolves'
        };
        
        teamName = teamNameMap[player.team_short_name];
      }
      
      if (teamName) {
        // Get manager data for this team
        const manager = getManagerByTeam(teamName);
        
        // If we found a manager and the player's name includes the manager's name
        if (manager && player.web_name.toLowerCase().includes(manager.name.toLowerCase())) {
          newManagerInfo.isManager = true;
          newManagerInfo.optaId = manager.id;
        }
      }
    }
    
    // Update player with manager info if found
    if (newManagerInfo.isManager && newManagerInfo.optaId) {
      setPlayerWithManagerCheck({
        ...player,
        isManager: true,
        optaId: newManagerInfo.optaId,
        position: 'Manager' // Override position to show as Manager
      });
    }
  }, [player]);
  
  // Determine image URL based on whether this is a manager or player - using only local images
  let playerImageUrl;
  
  if (playerWithManagerCheck.isManager && playerWithManagerCheck.optaId) {
    // For managers, use the local manager image URL
    playerImageUrl = `/images/managers/${playerWithManagerCheck.optaId}.png`;
  } else {
    // For players, use the local player image URL
    const playerCode = player.code?.toString() || '';
    const playerId = player.id.toString();
    playerImageUrl = `/images/players/${playerCode || playerId}.png`;
  }
  
  // Use placeholder until image is loaded
  const placeholderUrl = '/placeholder-player.svg';
  
  return (
    <div 
      ref={cardRef}
      className={`flex items-stretch h-[60px] my-[1px] rounded-md text-xs ${
        isInTeam 
          ? 'bg-blue-600/50 text-white border border-blue-400/50 cursor-not-allowed'
          : 'bg-white/90 dark:bg-slate-700/90 text-gray-800 dark:text-white border border-transparent hover:border-blue-300 cursor-pointer'
      } ${className}`}
      onClick={() => {
        if (!isInTeam) {
          onSelect();
        }
      }}
    >
      <div className="flex-shrink-0 relative w-[60px] h-[60px] overflow-hidden flex items-center justify-center">
        {/* Player image with loading state */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 animate-pulse">
            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700"></div>
          </div>
        )}
        
        {/* Only load image when visible in viewport */}
        {isVisible && (
          <div className="relative w-full h-full">
            <Image
              src={playerImageUrl}
              alt={player.web_name || 'Player'}
              className={`transition-opacity duration-300 ${imageLoaded && !imageError ? 'opacity-100' : 'opacity-0'}`}
              onLoadingComplete={() => setImageLoaded(true)}
              onError={(e) => {
                console.log(`Failed to load image: ${playerImageUrl}`);
                setImageError(true);
                setImageLoaded(true); // Still mark as loaded to remove placeholder
              }}
              fill
              sizes={`${imageSize}px`}
              style={{ objectFit: 'contain' }}
              unoptimized={true} // This is key - bypass Next.js image optimization
            />
          </div>
        )}
        
        {/* Fallback if image fails to load */}
        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
            <span className="text-xs text-gray-500 dark:text-gray-400">No image</span>
          </div>
        )}
      </div>
      
      <div className="flex flex-col justify-center px-2 overflow-hidden flex-1">
        <div className="flex items-center space-x-1">
          <div 
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              playerWithManagerCheck.isManager ? 'bg-purple-500' :
              player.position === 'GKP' ? 'bg-yellow-500' :
              player.position === 'DEF' ? 'bg-blue-500' :
              player.position === 'MID' ? 'bg-green-500' :
              'bg-red-500'
            }`}
          />
          <div className="font-medium truncate">{player.web_name}</div>
        </div>
        <div className="text-gray-500 dark:text-gray-400 text-[9px] ml-2.5">
          {player.team_short_name} • {playerWithManagerCheck.isManager ? 'Manager' : player.position}
        </div>
      </div>
      
      <div className="flex flex-col justify-center items-end gap-0.5 flex-shrink-0 px-2">
        {player.predicted_points !== undefined && (
          <div className={`w-9 py-0.5 rounded text-[10px] text-center ${
            player.predicted_points > 0 
              ? 'bg-green-600/90 text-white' 
              : 'bg-gray-500/80 text-white'
          }`}>
            {player.predicted_points.toFixed(1)}
          </div>
        )}
        <div className={`w-9 py-0.5 rounded text-[10px] text-center bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200`}>
          £{((player.now_cost || 0) / 10).toFixed(1)}m
        </div>
      </div>
    </div>
  );
});

OptimizedPlayerCard.displayName = 'OptimizedPlayerCard';

export default OptimizedPlayerCard; 