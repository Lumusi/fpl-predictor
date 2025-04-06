import { useState } from 'react';
import Image from 'next/image';
import { Team, getDirectTeamId } from '@/lib/services/fplApi';
import { getManagerByTeam, getManagerImageUrlByTeam } from '@/lib/utils/managerImages';

interface TeamDetailsModalProps {
  team: Team;
  isOpen: boolean;
  onClose: () => void;
}

// Helper function to get correct team ID for crest image (same as in league table)
const getTeamImageId = (team: Team): number => {
  // Try to get ID from short_name using the getDirectTeamId function
  if (team.short_name) {
    const mappedId = getDirectTeamId(team.short_name.toLowerCase());
    if (mappedId) {
      return mappedId;
    }
  }
  
  // Try to get ID from full name
  if (team.name) {
    const mappedId = getDirectTeamId(team.name.toLowerCase());
    if (mappedId) {
      return mappedId;
    }
  }
  
  // Fallback to the team's own ID
  return team.id;
};

export default function TeamDetailsModal({ team, isOpen, onClose }: TeamDetailsModalProps) {
  const [imageError, setImageError] = useState(false);
  
  // Get manager data for the team
  const manager = getManagerByTeam(team.name);
  const managerImageUrl = getManagerImageUrlByTeam(team.name);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-800 rounded-lg shadow-lg max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gray-700 px-4 py-3 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">{team.name}</h3>
          <button 
            onClick={onClose}
            className="text-gray-300 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Team Info */}
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 relative">
                  <Image 
                    src={`/images/teams/team_${getTeamImageId(team)}_crest.png`} 
                    alt={team.name}
                    width={64}
                    height={64}
                    className="object-contain"
                    unoptimized
                    onError={(e) => {
                      console.error(`Image load error for team: ${team.short_name || team.name}`);
                      // Fallback if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.src = '/images/placeholder-crest.svg';
                    }}
                  />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white">{team.name}</h4>
                  <p className="text-gray-300">{team.short_name}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-gray-700 p-3 rounded">
                  <div className="text-gray-400 text-xs">Position</div>
                  <div className="text-white font-bold text-lg">{team.position || '-'}</div>
                </div>
                <div className="bg-gray-700 p-3 rounded">
                  <div className="text-gray-400 text-xs">Points</div>
                  <div className="text-white font-bold text-lg">{team.points || 0}</div>
                </div>
                <div className="bg-gray-700 p-3 rounded">
                  <div className="text-gray-400 text-xs">Form</div>
                  <div className="text-white font-bold text-lg">
                    {team.played ? `${team.win}-${team.draw}-${team.loss}` : '-'}
                  </div>
                </div>
                <div className="bg-gray-700 p-3 rounded">
                  <div className="text-gray-400 text-xs">Goal Diff</div>
                  <div className="text-white font-bold text-lg">
                    {team.goal_difference && team.goal_difference > 0 ? '+' : ''}
                    {team.goal_difference || 0}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Manager Info */}
            {manager && (
              <div className="flex-1 flex flex-col items-center">
                <h4 className="text-lg font-medium text-white mb-2">Manager</h4>
                <div className="relative w-28 h-36 mb-2">
                  <Image
                    src={managerImageUrl}
                    alt={manager.name}
                    width={110}
                    height={140}
                    className="object-cover rounded"
                    unoptimized
                    onError={(e) => {
                      setImageError(true);
                      // Fallback if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.src = '/images/placeholder-manager.svg';
                    }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-white font-medium">{manager.name}</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Team Stats */}
          <div className="mt-6">
            <h4 className="text-lg font-medium text-white mb-2">Team Stats</h4>
            <div className="bg-gray-700 p-4 rounded">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Matches Played</p>
                  <p className="text-white">{team.played || 0}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Goals</p>
                  <p className="text-white">{team.goals_for || 0} scored / {team.goals_against || 0} conceded</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Home Strength</p>
                  <p className="text-white">{team.strength_overall_home || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Away Strength</p>
                  <p className="text-white">{team.strength_overall_away || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Attack (Home/Away)</p>
                  <p className="text-white">{team.strength_attack_home || '-'} / {team.strength_attack_away || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Defense (Home/Away)</p>
                  <p className="text-white">{team.strength_defence_home || '-'} / {team.strength_defence_away || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="bg-gray-700 px-4 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-500 text-white font-medium py-2 px-4 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
