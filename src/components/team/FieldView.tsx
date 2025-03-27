import React, { memo } from 'react';
import { TeamPlayer } from '@/lib/utils/teamBuilder';
import PlayerCard from './PlayerCard';
import { XCircleIcon } from '@heroicons/react/24/solid';

interface FieldViewProps {
  team: TeamPlayer[];
  onRemovePlayer?: (playerId: number) => void;
}

// Create a memoized version of the PlayerPosition component
const PlayerPosition = memo(({ player, onRemovePlayer, positionColor }: { 
  player: TeamPlayer; 
  onRemovePlayer?: (playerId: number) => void;
  positionColor: string;
}) => {
  return (
    <div className="relative group player-card-container" style={{ backgroundColor: 'transparent' }}>
      {/* Player image container */}
      <div className="w-[4.5rem] h-[4.5rem] md:w-28 md:h-28 relative mx-auto mb-1 bg-transparent" style={{ backgroundColor: 'transparent' }}>
        {/* Image with transparent background effect */}
        <div className="absolute inset-0 overflow-hidden flex items-center justify-center bg-transparent" style={{ backgroundColor: 'transparent' }}>
          <PlayerCard
            player={player}
            showRemove={false}
            showImage={true}
            compact={true}
            className="player-pitch-view"
          />
        </div>
        
        {/* Remove button */}
        {onRemovePlayer && (
          <button 
            onClick={() => onRemovePlayer(player.id)}
            className="absolute -top-1 -right-1 md:-top-2 md:-right-2 w-5 h-5 md:w-7 md:h-7 bg-white rounded-full shadow-md flex items-center justify-center text-red-500 hover:text-red-700 transition-colors z-10 player-remove-btn"
            aria-label="Remove player"
          >
            <XCircleIcon className="h-4 w-4 md:h-6 md:w-6" />
          </button>
        )}
      </div>
      
      {/* Player info with improved readability - reduced for mobile */}
      <div className="text-center" style={{ backgroundColor: 'transparent' }}>
        {/* Price with shadow for better visibility */}
        <div className="inline-block bg-black/75 text-white px-1 py-0.5 rounded text-xs md:text-sm font-medium mb-1 player-info-shadow" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
          {player.now_cost && `£${(player.now_cost/10).toFixed(1)}m`}
        </div>
        
        {/* Player name with background for better visibility */}
        <div className="bg-black/75 text-white px-1 py-0.5 md:px-2 md:py-1 rounded text-xs md:text-sm font-bold mx-auto max-w-[100px] md:max-w-[120px] truncate player-info-shadow" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
          {player.web_name}
        </div>
        
        {/* Team and position badges - simpler for mobile */}
        <div className="hidden md:flex justify-center gap-1 mt-1" style={{ backgroundColor: 'transparent' }}>
          <span className="bg-black/75 text-white px-2 py-0.5 rounded text-xs font-medium player-info-shadow" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
            {player.team_short_name}
          </span>
          <span className={`${positionColor} text-white px-2 py-0.5 rounded text-xs font-medium player-info-shadow`}>
            {player.position}
          </span>
        </div>
      </div>
    </div>
  );
});

// Memory optimization - set display name for component
PlayerPosition.displayName = 'PlayerPosition';

// Memoizing the entire FieldView component
const FieldView = memo(({ team, onRemovePlayer }: FieldViewProps) => {
  // Group players by position
  const goalkeepers = team.filter(p => p.position === 'GKP');
  const defenders = team.filter(p => p.position === 'DEF');
  const midfielders = team.filter(p => p.position === 'MID');
  const forwards = team.filter(p => p.position === 'FWD');
  
  // Calculate formation
  const formation = `${defenders.length}-${midfielders.length}-${forwards.length}`;
  
  // Position colors for badges
  const positionColors = {
    'GKP': 'bg-yellow-500',
    'DEF': 'bg-blue-500',
    'MID': 'bg-green-500',
    'FWD': 'bg-red-500'
  };

  return (
    <div className="w-full rounded-lg overflow-hidden shadow-lg">
      {/* Pitch background with optimized image loading */}
      <div 
        className="field-gradient relative py-4 md:py-6 px-2 md:px-4" 
        style={{ 
          minHeight: '550px',
          height: '100%',
          backgroundImage: 'url(/pitch.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Formation badge - no border */}
        <div className="absolute top-2 left-2 bg-transparent text-white font-bold px-2 py-1 rounded-md text-xs md:text-sm z-10">
          Formation: {formation}
        </div>
        
        {/* Player layout - With proper spacing for even distribution */}
        <div className="relative flex flex-col justify-between h-full bg-transparent" style={{ paddingTop: "20px", paddingBottom: "20px", backgroundColor: 'transparent' }}>
          {/* Forward line */}
          <div className="flex justify-evenly items-center mb-8 md:mb-16 bg-transparent">
            {forwards.map((player) => (
              <PlayerPosition 
                key={player.id} 
                player={player} 
                onRemovePlayer={onRemovePlayer}
                positionColor={positionColors[player.position as keyof typeof positionColors] || 'bg-gray-500'}
              />
            ))}
            {forwards.length === 0 && (
              <div className="h-20 md:h-28 bg-transparent"></div> // Placeholder to maintain spacing
            )}
          </div>
          
          {/* Midfield line */}
          <div className="flex justify-evenly items-center mb-8 md:mb-16 bg-transparent">
            {midfielders.map((player) => (
              <PlayerPosition 
                key={player.id} 
                player={player} 
                onRemovePlayer={onRemovePlayer}
                positionColor={positionColors[player.position as keyof typeof positionColors] || 'bg-gray-500'}
              />
            ))}
            {midfielders.length === 0 && (
              <div className="h-20 md:h-28 bg-transparent"></div> // Placeholder to maintain spacing
            )}
          </div>
          
          {/* Defender line - Positioned above penalty area */}
          <div className="flex justify-evenly items-center mb-4 md:mb-10 bg-transparent" style={{ marginBottom: "8%" }}>
            {defenders.map((player) => (
              <PlayerPosition 
                key={player.id} 
                player={player} 
                onRemovePlayer={onRemovePlayer}
                positionColor={positionColors[player.position as keyof typeof positionColors] || 'bg-gray-500'}
              />
            ))}
            {defenders.length === 0 && (
              <div className="h-20 md:h-28 bg-transparent"></div> // Placeholder to maintain spacing
            )}
          </div>
          
          {/* Goalkeeper line */}
          <div className="flex justify-center items-center bg-transparent">
            {goalkeepers.map((player) => (
              <PlayerPosition 
                key={player.id} 
                player={player} 
                onRemovePlayer={onRemovePlayer}
                positionColor={positionColors[player.position as keyof typeof positionColors] || 'bg-gray-500'}
              />
            ))}
            {goalkeepers.length === 0 && (
              <div className="h-20 md:h-28 bg-transparent"></div> // Placeholder to maintain spacing
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

// Memory optimization - set display name for component
FieldView.displayName = 'FieldView';

export default FieldView; 