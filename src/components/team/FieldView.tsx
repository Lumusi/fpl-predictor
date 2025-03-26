import React from 'react';
import { TeamPlayer } from '@/lib/utils/teamBuilder';
import PlayerCard from './PlayerCard';
import { XCircleIcon } from '@heroicons/react/24/solid';

interface FieldViewProps {
  team: TeamPlayer[];
  onRemovePlayer?: (playerId: number) => void;
}

export default function FieldView({ team, onRemovePlayer }: FieldViewProps) {
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

  // PlayerPosition component for better organization
  const PlayerPosition = ({ player }: { player: TeamPlayer }) => {
    const positionColor = positionColors[player.position as keyof typeof positionColors] || 'bg-gray-500';
    
    return (
      <div className="relative group player-card-container" style={{ backgroundColor: 'transparent' }}>
        {/* Player image container */}
        <div className="w-28 h-28 relative mx-auto mb-2 bg-transparent" style={{ backgroundColor: 'transparent' }}>
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
              className="absolute -top-2 -right-2 w-7 h-7 bg-white rounded-full shadow-md flex items-center justify-center text-red-500 hover:text-red-700 transition-colors z-10 player-remove-btn"
              title="Remove player"
            >
              <XCircleIcon className="h-6 w-6" />
            </button>
          )}
        </div>
        
        {/* Player info with improved readability */}
        <div className="text-center" style={{ backgroundColor: 'transparent' }}>
          {/* Price with shadow for better visibility */}
          <div className="inline-block bg-black/75 text-white px-2 py-0.5 rounded text-sm font-medium mb-1 player-info-shadow" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
            {player.now_cost && `£${(player.now_cost/10).toFixed(1)}m`}
          </div>
          
          {/* Player name with background for better visibility */}
          <div className="bg-black/75 text-white px-2 py-1 rounded text-sm font-bold mx-auto max-w-[120px] truncate player-info-shadow" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
            {player.web_name}
          </div>
          
          {/* Team and position badges */}
          <div className="flex justify-center gap-1 mt-1" style={{ backgroundColor: 'transparent' }}>
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
  };

  return (
    <div className="w-full h-full rounded-lg overflow-hidden shadow-lg">
      {/* Pitch background with image */}
      <div 
        className="field-gradient relative py-6 px-4" 
        style={{ 
          minHeight: '700px', 
          height: '100%',
          backgroundImage: 'url(/pitch.jpg)',
          backgroundSize: '98% 98%',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Formation badge - no border */}
        <div className="absolute top-2 left-2 bg-transparent text-white font-bold px-3 py-1 rounded-md text-sm z-10">
          Formation: {formation}
        </div>
        
        {/* Player layout - With proper spacing for even distribution */}
        <div className="relative flex flex-col justify-between h-full bg-transparent" style={{ paddingTop: "40px", paddingBottom: "40px", backgroundColor: 'transparent' }}>
          {/* Forward line */}
          <div className="flex justify-evenly items-center mb-20 bg-transparent">
            {forwards.map((player) => (
              <PlayerPosition key={player.id} player={player} />
            ))}
            {forwards.length === 0 && (
              <div className="h-28 bg-transparent"></div> // Placeholder to maintain spacing
            )}
          </div>
          
          {/* Midfield line */}
          <div className="flex justify-evenly items-center mb-20 bg-transparent">
            {midfielders.map((player) => (
              <PlayerPosition key={player.id} player={player} />
            ))}
            {midfielders.length === 0 && (
              <div className="h-28 bg-transparent"></div> // Placeholder to maintain spacing
            )}
          </div>
          
          {/* Defender line - Positioned above penalty area, around 28-30% from bottom */}
          <div className="flex justify-evenly items-center mb-10 bg-transparent" style={{ marginBottom: "10%" }}>
            {defenders.map((player) => (
              <PlayerPosition key={player.id} player={player} />
            ))}
            {defenders.length === 0 && (
              <div className="h-28 bg-transparent"></div> // Placeholder to maintain spacing
            )}
          </div>
          
          {/* Goalkeeper line */}
          <div className="flex justify-center items-center bg-transparent">
            {goalkeepers.map((player) => (
              <PlayerPosition key={player.id} player={player} />
            ))}
            {goalkeepers.length === 0 && (
              <div className="h-28 bg-transparent"></div> // Placeholder to maintain spacing
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 