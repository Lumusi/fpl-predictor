import React, { memo, useMemo } from 'react';
import { TeamPlayer } from '@/lib/utils/teamBuilder';
import PlayerCard from './PlayerCard';
import { XCircleIcon } from '@heroicons/react/24/solid';
import { ArrowsRightLeftIcon } from '@heroicons/react/24/outline';

interface FieldViewProps {
  team: TeamPlayer[];
  onRemovePlayer?: (playerId: number) => void;
  onSwapPlayer?: (player: TeamPlayer) => void;
}

// Create a memoized version of the PlayerPosition component
const PlayerPosition = memo(({ player, onRemovePlayer, onSwapPlayer, positionColor }: { 
  player: TeamPlayer; 
  onRemovePlayer?: (playerId: number) => void;
  onSwapPlayer?: (player: TeamPlayer) => void;
  positionColor: string;
}) => {
  return (
    <div className="relative group player-card-container" style={{ backgroundColor: 'transparent' }} data-player-id={player.id}>
      {/* Player image container */}
      <div className="w-[4rem] h-[4rem] md:w-24 md:h-24 relative mx-auto mb-1 bg-transparent" style={{ backgroundColor: 'transparent' }}>
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
        
        {/* Player Action Buttons - Reposition buttons */}
        <div className="absolute z-10">
          {/* Swap/Transfer button - positioned at top left */}
          {onSwapPlayer && (
            <button 
              onClick={() => onSwapPlayer(player)}
              className="absolute -top-1 -left-1 md:-top-2 md:-left-2 w-5 h-5 md:w-7 md:h-7 bg-blue-500 rounded-full shadow-md flex items-center justify-center text-white hover:bg-blue-600 transition-colors player-swap-btn z-10"
              aria-label="Find replacements"
            >
              <ArrowsRightLeftIcon className="h-3 w-3 md:h-4 md:w-4" />
            </button>
          )}
        </div>
        
        {/* Remove button positioned at right edge of image */}
        {onRemovePlayer && (
          <button 
            onClick={() => onRemovePlayer(player.id)}
            className="absolute -top-1 right-0 md:-top-2 w-5 h-5 md:w-7 md:h-7 bg-red-500 rounded-full shadow-md flex items-center justify-center text-white hover:bg-red-600 transition-colors player-remove-btn z-20"
            aria-label="Remove player"
          >
            <XCircleIcon className="h-4 w-4 md:h-5 md:w-5 text-white" />
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
        <div className="bg-black/75 text-white px-1 py-0.5 md:px-2 md:py-1 rounded text-xs md:text-sm font-bold mx-auto max-w-[90px] md:max-w-[110px] truncate player-info-shadow" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
          {player.web_name}
        </div>
        
        {/* Predicted points indicator */}
        {player.predicted_points !== undefined && (
          <div className={`mt-1 inline-block px-1 py-0.5 rounded text-xs font-medium ${
            player.predicted_points > 0 
              ? 'bg-green-600/90 text-white' 
              : 'bg-gray-600/90 text-white'
          }`}>
            {player.predicted_points > 0 
              ? `${player.predicted_points.toFixed(1)} pts` 
              : 'No prediction'}
          </div>
        )}
        
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
const FieldView = memo(({ team, onRemovePlayer, onSwapPlayer }: FieldViewProps) => {
  // Count players with and without predictions
  const playersWithPredictions = useMemo(() => {
    return team.filter(player => 
      player.predicted_points !== undefined && player.predicted_points > 0
    ).length;
  }, [team]);
  
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

  // Function to render players in a row with adaptive spacing
  const renderPlayerRow = (players: TeamPlayer[], position: string) => {
    const positionColor = positionColors[position as keyof typeof positionColors] || 'bg-gray-500';
    
    return (
      <div className={`flex flex-wrap justify-center sm:justify-evenly items-center mb-6 md:mb-12 bg-transparent w-full gap-2 sm:gap-1`}>
        {players.map((player) => (
          <div key={player.id} className="flex-grow-0 flex-shrink-0 basis-auto sm:basis-[17%] sm:max-w-[17%] lg:basis-[18.5%] lg:max-w-[18.5%]">
            <PlayerPosition 
              player={player} 
              onRemovePlayer={onRemovePlayer}
              onSwapPlayer={onSwapPlayer}
              positionColor={positionColor}
            />
          </div>
        ))}
        {players.length === 0 && (
          <div className="h-16 md:h-24 bg-transparent"></div> // Placeholder to maintain spacing
        )}
      </div>
    );
  };

  // Calculate how many players have predicted points
  const hasMissingPredictions = playersWithPredictions < team.length;

  return (
    <div className="w-full rounded-lg overflow-hidden shadow-lg">
      {/* Pitch background with optimized image loading */}
      <div 
        className="field-gradient relative py-4 md:py-8 px-2 md:px-6" 
        style={{ 
          minHeight: '580px',
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

        {/* Missing predictions warning */}
        {hasMissingPredictions && (
          <div className="absolute top-2 right-2 bg-yellow-600/90 text-white font-medium px-2 py-1 rounded-md text-xs md:text-sm z-10">
            {playersWithPredictions}/{team.length} players have predictions
          </div>
        )}
        
        {/* Player layout - With proper spacing for even distribution */}
        <div className="relative flex flex-col justify-between h-full bg-transparent" style={{ paddingTop: "20px", paddingBottom: "20px", backgroundColor: 'transparent' }}>
          {/* Forward line */}
          {renderPlayerRow(forwards, 'FWD')}
          
          {/* Midfield line */}
          {renderPlayerRow(midfielders, 'MID')}
          
          {/* Defender line */}
          {renderPlayerRow(defenders, 'DEF')}
          
          {/* Goalkeeper line */}
          <div className="flex justify-center items-center bg-transparent gap-4 md:gap-6">
            {goalkeepers.map((player) => (
              <PlayerPosition 
                key={player.id} 
                player={player} 
                onRemovePlayer={onRemovePlayer}
                onSwapPlayer={onSwapPlayer}
                positionColor={positionColors[player.position as keyof typeof positionColors] || 'bg-gray-500'}
              />
            ))}
            {goalkeepers.length === 0 && (
              <div className="h-16 md:h-24 bg-transparent"></div> // Placeholder to maintain spacing
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