import React, { useState } from 'react';
import Image from 'next/image';
import { XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import { TeamPlayer } from '@/lib/utils/teamBuilder';
import { getPlayerImageUrl, getPremierLeaguePlayerImageUrl } from '@/lib/utils/playerImages';

interface PlayerCardProps {
  player: TeamPlayer;
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
  const [plImageError, setPlImageError] = useState(false);
  
  // Function to force refresh the image
  const refreshImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRefreshKey(Date.now());
    setLocalImageError(false);
    setPlImageError(false);
  };

  // Get the player code for image URLs - this is different from the player.id
  // The code is used in the Premier League player photo URLs and our /players directory
  const playerImageId = player.code || player.id;

  // Local player image URL (from /players directory)
  const localPlayerImageUrl = getPlayerImageUrl(playerImageId);
  
  // Premier League official image URL (as fallback)
  const plPlayerImageUrl = getPremierLeaguePlayerImageUrl(playerImageId);
  
  // Placeholder image for when both local and PL images fail
  const placeholderImageUrl = '/images/placeholder-shirt.svg';
  
  // Handle local image error - try PL image instead
  const handleLocalImageError = () => {
    setLocalImageError(true);
  };
  
  // Handle PL image error - use placeholder
  const handlePlImageError = () => {
    setPlImageError(true);
  };
  
  // Determine which image URL to use
  let imageUrl = localPlayerImageUrl;
  
  if (localImageError) {
    imageUrl = plPlayerImageUrl;
  }
  
  if (localImageError && plImageError) {
    imageUrl = placeholderImageUrl;
  }
  
  // Add refresh key to prevent caching
  if (imageUrl !== placeholderImageUrl) {
    imageUrl = `${imageUrl}?key=${refreshKey}`;
  }
  
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
        className={`relative ${isPitchView ? 'bg-transparent' : 'bg-white rounded-md shadow-md'} overflow-hidden w-24 h-24 ${highlight ? 'ring-2 ring-blue-500' : ''} ${className}`}
        style={{ 
          zIndex: isPitchView ? 4 : 1,
          backgroundColor: isPitchView ? 'transparent' : undefined
        }}
      >
        {/* Player Image */}
        {showImage && (
          <div className={`relative w-full h-full flex justify-center items-center bg-transparent`}>
            <Image
              src={imageUrl}
              alt={player.web_name}
              width={isPitchView ? 100 : 80}
              height={isPitchView ? 100 : 80}
              className={`object-contain ${isPitchView ? 'drop-shadow-xl' : ''}`}
              priority={isPitchView}
              unoptimized={true}
              style={{ 
                height: 'auto', 
                maxWidth: '100%',
                filter: isPitchView ? 'drop-shadow(2px 2px 4px rgba(0,0,0,0.5))' : 'none',
                backgroundColor: 'transparent',
                backgroundImage: 'none'
              }}
              onError={localImageError ? handlePlImageError : handleLocalImageError}
            />
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
          <Image
            src={imageUrl}
            alt={player.web_name}
            width={120}
            height={120}
            className="object-contain"
            priority={false}
            unoptimized={true}
            style={{ height: 'auto', maxWidth: '100%' }}
            onError={localImageError ? handlePlImageError : handleLocalImageError}
          />
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
        {/* Player Name and Team */}
        <div className="flex justify-between items-center mb-2">
          <div>
            <div className="text-sm font-medium text-gray-800">
              {player.web_name}
            </div>
            <div className="text-xs text-gray-500 flex items-center">
              <span className="mr-1">{player.team_short_name}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100`}>
                {player.position}
              </span>
            </div>
          </div>
          <div className="text-sm font-bold">
            £{player.now_cost && (player.now_cost / 10).toFixed(1)}m
          </div>
        </div>
        
        {/* Player Stats */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className="font-medium text-gray-500">Points</div>
            <div className="font-bold">{player.total_points || '-'}</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-500">Form</div>
            <div className="font-bold">{player.form || '-'}</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-500">Predicted</div>
            <div className="font-bold text-blue-600">
              {player.predicted_points ? player.predicted_points.toFixed(1) : '-'}
            </div>
          </div>
        </div>
      </div>
      
      {/* Remove Button */}
      {showRemove && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-0 right-0 p-1.5 text-red-500 hover:text-red-700"
        >
          <XCircleIcon className="h-5 w-5" />
        </button>
      )}
    </div>
  );
} 