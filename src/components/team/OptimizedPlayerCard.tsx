import React, { useState, memo, useEffect } from 'react';
import { XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import { TeamPlayer } from '@/lib/utils/teamBuilder';
import { isMobile } from '@/lib/utils/deviceUtils';
import { getOptimizedImageUrl, getOptimizedImageProps } from '@/lib/utils/imageOptimization';

interface OptimizedPlayerCardProps {
  player: TeamPlayer;
  onSelect: () => void;
  isInTeam: boolean;
  className?: string;
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
  
  // Lower quality images on mobile for performance
  const imageSize = isMobile() ? 40 : 60;
  
  const playerImageUrl = player?.code 
    ? `/player-photos/${player.code}.png` 
    : '/player-photos/unknown.png';
  
  // Get optimized image properties with correct sizing for device
  const imageProps = getOptimizedImageProps(playerImageUrl, {
    alt: player.web_name,
    width: imageSize,
    height: imageSize,
    loading: 'lazy',
    // Improve mobile performance with smaller images
    quality: isMobile() ? 60 : 80,
    format: 'webp'
  });
  
  // Use placeholder until image is loaded
  const placeholderUrl = '/placeholder-player.svg';
  
  return (
    <div 
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
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700"></div>
          </div>
        )}
        
        {/* Actual player image */}
        <img
          {...imageProps}
          className={`object-cover transition-opacity duration-300 ${
            imageLoaded && !imageError ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            setImageError(true);
            setImageLoaded(true); // Still mark as loaded to remove placeholder
          }}
        />
        
        {/* Fallback for error state */}
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
              player.position === 'GKP' ? 'bg-yellow-500' :
              player.position === 'DEF' ? 'bg-blue-500' :
              player.position === 'MID' ? 'bg-green-500' :
              'bg-red-500'
            }`}
          />
          <div className="font-medium truncate">{player.web_name}</div>
        </div>
        <div className="text-gray-500 dark:text-gray-400 text-[9px] ml-2.5">
          {player.team_short_name} • {player.position}
        </div>
      </div>
      
      <div className="flex flex-col justify-center items-end gap-0.5 flex-shrink-0 px-2">
        {player.predicted_points !== undefined && (
          <div className={`w-10 py-0.5 rounded text-[10px] text-center ${
            player.predicted_points > 0 
              ? 'bg-green-600/90 text-white' 
              : 'bg-gray-500/80 text-white'
          }`}>
            {player.predicted_points.toFixed(1)}
          </div>
        )}
        <div className={`w-10 py-0.5 rounded text-[10px] text-center bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200`}>
          £{((player.now_cost || 0) / 10).toFixed(1)}m
        </div>
      </div>
    </div>
  );
});

OptimizedPlayerCard.displayName = 'OptimizedPlayerCard';

export default OptimizedPlayerCard; 