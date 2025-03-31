import React, { useState } from 'react';
import Image from 'next/image';
import { XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import { TeamPlayer } from '@/lib/utils/teamBuilder';
import { findPlayerImage, getPremierLeaguePlayerImageUrl } from '@/lib/utils/playerImages';

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
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [useExternalImage, setUseExternalImage] = useState(false);
  
  // Function to force refresh the image
  const refreshImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRefreshKey(Date.now());
    setLocalImageError(false);
    setImageLoaded(false);
  };

  // Get the player code for image URLs - this is different from the player.id
  const playerImageId = player.code || player.id;

  // Use the more flexible image finder
  const localPlayerImageUrl = findPlayerImage(player.code || '', player.id);
  
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
  let imageUrl = localPlayerImageUrl;
  
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
            £{
              // Use selling_price if available and not zero
              player.selling_price !== undefined && player.selling_price > 0 
                ? player.selling_price.toFixed(1) 
                // Otherwise use price or now_cost/10
                : player.price 
                  ? player.price.toFixed(1) 
                  : ((player.now_cost || 0) / 10).toFixed(1)
            }m
          </div>
        </div>
        
        {/* Other player info as needed */}
        <div className="text-xs text-gray-500 flex justify-between">
          <div>{player.total_points || 0} points</div>
          {player.predicted_points && (
            <div className="text-green-600 font-medium">
              Predicted: {player.predicted_points.toFixed(1)}
            </div>
          )}
        </div>
        
        {/* Remove button */}
        {showRemove && onRemove && (
          <button
            onClick={onRemove}
            className="mt-2 w-full py-1 bg-red-50 text-red-600 text-xs font-medium rounded border border-red-100 hover:bg-red-100 transition-colors"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
} 