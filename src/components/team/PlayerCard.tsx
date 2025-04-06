import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import { TeamPlayer } from '@/lib/utils/teamBuilder';
import { getPersonImageUrl, getPremierLeaguePlayerImageUrl, checkIfManager } from '@/lib/utils/playerImages';
import { getManagerImageUrl } from '@/lib/utils/managerImages';

// New interface to handle all required properties including team property
interface PlayerWithTeamDetails {
  id: number;
  code?: number;
  web_name: string;
  first_name?: string;
  second_name?: string;
  now_cost?: number;
  position: string;
  element_type: number;
  price: number;
  // Make team optional to match TeamPlayer interface
  team?: {
    name: string;
    short_name: string;
  } | number;
  team_short_name?: string;
  team_name?: string;
  total_points?: number;
  form?: string;
  predicted_points?: number;
  fixtures?: any[];
  home_game?: boolean;
  chance_of_playing_next_round?: number | null;
  purchase_price?: number;
  news?: string;
  isManager?: boolean;
  optaId?: string;
}

interface PlayerCardProps {
  player: PlayerWithTeamDetails;
  onRemove?: () => void;
  showRemove?: boolean;
  showImage?: boolean;
  compact?: boolean;
  className?: string;
  highlight?: boolean;
}

export default function PlayerCard({ 
  player, 
  onRemove, 
  showRemove = true,
  showImage = false,
  compact = false,
  className = '',
  highlight = false
}: PlayerCardProps) {
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [localImageError, setLocalImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [useExternalImage, setUseExternalImage] = useState(false);
  const [playerWithManagerCheck, setPlayerWithManagerCheck] = useState<PlayerWithTeamDetails>(player);
  
  // Function to force refresh the image
  const refreshImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRefreshKey(Date.now());
    setLocalImageError(false);
    setImageLoaded(false);
  };

  // Check if player is actually a manager on component mount
  useEffect(() => {
    // Only perform check if we have a team object with a name
    if (typeof player.team === 'object' && player.team && player.team.name) {
      const { isManager, optaId } = checkIfManager(player.web_name, player.team.name);
      if (isManager) {
        setPlayerWithManagerCheck({
          ...player,
          isManager: true,
          optaId,
          position: 'Manager' // Override position to show as Manager
        });
      }
    } else if (player.team_name) {
      // Try using team_name if available
      const { isManager, optaId } = checkIfManager(player.web_name, player.team_name);
      if (isManager) {
        setPlayerWithManagerCheck({
          ...player,
          isManager: true,
          optaId,
          position: 'Manager' // Override position to show as Manager
        });
      }
    }
  }, [player]);

  // Get the player code for image URLs - this is different from the player.id
  const playerImageId = player.code || player.id;

  // Determine image URL based on whether this is a manager or player
  let localImageUrl;
  if (playerWithManagerCheck.isManager && playerWithManagerCheck.optaId) {
    localImageUrl = getManagerImageUrl(playerWithManagerCheck.optaId);
  } else {
    // Use the person image finder that handles both players and managers
    localImageUrl = getPersonImageUrl(
      player.web_name, 
      typeof player.team === 'object' && player.team ? player.team.name : (player.team_name || ''), 
      player.code || '', 
      player.id
    );
  }
  
  // Placeholder image for when local image fails
  const placeholderImageUrl = '/images/placeholder-shirt.svg';
  
  // Premier League API image URL as fallback
  const plImageUrl = getPremierLeaguePlayerImageUrl(player.code || player.id);
  
  // Handle local image error - try Premier League API as fallback
  const handleLocalImageError = () => {
    setLocalImageError(true);
    setUseExternalImage(true);
  };
  
  // Determine which image URL to use
  let imageUrl = localImageUrl;
  
  if (localImageError) {
    imageUrl = useExternalImage ? plImageUrl : placeholderImageUrl;
  }
  
  // Add refresh key to prevent caching
  if (imageUrl !== placeholderImageUrl && !imageUrl.startsWith('http')) {
    imageUrl = `${imageUrl}?key=${refreshKey}`;
  }

  // Handle successful image load
  const handleImageLoaded = () => {
    setImageLoaded(true);
  };
  
  // Position-based colors for the warning icons
  const positionColors = {
    GKP: 'bg-yellow-400',
    DEF: 'bg-blue-400',
    MID: 'bg-green-400',
    FWD: 'bg-red-400'
  };
  
  if (compact) {
    // Check if this is being used on the pitch view
    const isPitchView = className.includes('player-pitch-view');
    
    return (
      <div 
        className={`relative ${isPitchView ? 'bg-transparent' : 'bg-white rounded-md shadow-md'} overflow-visible w-24 h-24 ${highlight ? 'ring-2 ring-blue-500' : ''} ${className}`}
        style={{ 
          zIndex: isPitchView ? 4 : 1,
          backgroundColor: isPitchView ? 'transparent' : undefined
        }}
      >
        {/* Player Image */}
        {showImage && (
          <div className={`relative w-full h-full flex justify-center items-start bg-transparent overflow-visible`}>
            <div className={`${imageLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 w-full h-full`}>
              <Image
                src={imageUrl}
                alt={player.web_name}
                width={isPitchView ? 90 : 80}
                height={isPitchView ? 90 : 80}
                className={`${isPitchView ? 'drop-shadow-xl' : ''}`}
                loading="lazy"
                onLoad={handleImageLoaded}
                priority={false}
                unoptimized={true}
                style={{ 
                  height: 'auto', 
                  maxWidth: '100%',
                  marginTop: isPitchView ? '15px' : '0',
                  objectFit: isPitchView ? 'contain' : 'contain',
                  transform: isPitchView ? 'scale(0.95)' : 'none',
                  transformOrigin: 'center center',
                  filter: isPitchView ? 'drop-shadow(2px 2px 4px rgba(0,0,0,0.5))' : 'none',
                  backgroundColor: 'transparent',
                  backgroundImage: 'none'
                }}
                onError={handleLocalImageError}
              />
            </div>
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
              </div>
            )}
            {!isPitchView && (
              <button 
                onClick={refreshImage}
                className="absolute bottom-0 right-0 p-1 text-gray-500 hover:text-blue-500 bg-white bg-opacity-70 rounded-tl-md"
                title="Refresh player image"
              >
                <ArrowPathIcon className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
        
        {/* Player Name - only show if not on pitch view */}
        {!isPitchView && (
          <div className="absolute bottom-0 left-0 right-0 text-center bg-white bg-opacity-70 py-1 text-xs font-medium truncate px-1">
            {player.web_name}
          </div>
        )}
        
        {/* Warning indicator */}
        {player.chance_of_playing_next_round !== undefined && 
          player.chance_of_playing_next_round !== null && 
          player.chance_of_playing_next_round < 100 && (
          <div className="absolute top-0 right-0 w-3 h-3 bg-yellow-400 rounded-full border border-white"></div>
        )}
        
        {/* Remove Button - only if not on pitch view */}
        {showRemove && onRemove && !isPitchView && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute top-0 right-0 w-5 h-5 rounded-full flex items-center justify-center bg-red-500 text-white"
          >
            <XCircleIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
  
  return (
    <div className={`relative bg-white rounded-md shadow-md overflow-hidden ${highlight ? 'ring-2 ring-blue-500' : ''} ${className}`}>
      {/* Player Image */}
      {showImage && (
        <div className="relative w-full h-32 flex justify-center items-center bg-gray-100">
          <div className={`${imageLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 w-full h-full flex items-center justify-center`}>
            <Image
              src={imageUrl}
              alt={player.web_name}
              width={120}
              height={120}
              className="object-contain"
              loading="lazy"
              onLoad={handleImageLoaded}
              priority={false}
              unoptimized={true}
              style={{ height: 'auto', maxWidth: '100%' }}
              onError={handleLocalImageError}
            />
          </div>
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
          )}
          <button 
            onClick={refreshImage}
            className="absolute bottom-0 right-0 p-1 text-gray-500 hover:text-blue-500 bg-white bg-opacity-70 rounded-tl-md"
            title="Refresh player image"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        </div>
      )}
      
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium text-gray-900">{player.web_name}</h3>
            <div className="text-sm text-gray-600 flex items-center space-x-1">
              <span>{typeof player.team === 'object' && player.team ? player.team.short_name : (player.team_short_name || 'Unknown')}</span>
              <span>•</span>
              <span>{playerWithManagerCheck.isManager ? 'Manager' : player.position}</span>
              {player.price !== undefined && (
                <>
                  <span>•</span>
                  <span>£{(player.price / 10).toFixed(1)}m</span>
                </>
              )}
            </div>
          </div>
          
          {showRemove && onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="text-red-500 hover:text-red-700"
            >
              <XCircleIcon className="h-5 w-5" />
            </button>
          )}
        </div>
        
        {/* Injury/Suspension Warning */}
        {player.chance_of_playing_next_round !== undefined && 
          player.chance_of_playing_next_round !== null && 
          player.chance_of_playing_next_round < 100 && (
          <div className="mt-2 text-xs text-yellow-800 bg-yellow-100 px-2 py-1 rounded">
            <span className="font-semibold">Warning: </span>
            {player.chance_of_playing_next_round}% chance of playing
            {player.news ? ` - ${player.news}` : ''}
          </div>
        )}
      </div>
    </div>
  );
}