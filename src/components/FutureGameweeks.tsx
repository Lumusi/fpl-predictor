import React, { useState } from 'react';
import { predictFutureGameweeks } from '@/lib/utils/predictions';
import PlayerPredictionTable from './PlayerPredictionTable';
import { ChevronRightIcon } from '@heroicons/react/24/outline';

interface FutureGameweeksProps {
  futurePredictions: ReturnType<typeof predictFutureGameweeks>;
  currentGameweek: number;
  loading?: boolean;
}

export default function FutureGameweeks({ 
  futurePredictions, 
  currentGameweek,
  loading = false 
}: FutureGameweeksProps) {
  const [selectedGameweek, setSelectedGameweek] = useState<number>(currentGameweek);
  
  // Get all available gameweeks from predictions
  const availableGameweeks = Object.keys(futurePredictions).map(Number).sort((a, b) => a - b);
  
  // Default to current gameweek if no predictions available for selected gameweek
  const gameweekToShow = availableGameweeks.includes(selectedGameweek) 
    ? selectedGameweek 
    : (availableGameweeks.length > 0 ? availableGameweeks[0] : currentGameweek);
  
  const predictions = futurePredictions[gameweekToShow] || [];
  
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-md">
        <div className="font-medium text-gray-700 dark:text-gray-300 flex items-center">
          <span>Select Gameweek:</span>
          <ChevronRightIcon className="h-4 w-4 mx-1 text-gray-400 dark:text-gray-500" />
        </div>
        <div className="flex flex-wrap gap-1">
          {availableGameweeks.map(gw => (
            <button
              key={gw}
              onClick={() => setSelectedGameweek(gw)}
              className={`px-3 py-1 text-sm rounded-md transition-all ${
                gw === gameweekToShow
                  ? 'bg-blue-600 text-white font-bold shadow-sm dark:bg-blue-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'
              }`}
            >
              GW {gw}
            </button>
          ))}
        </div>
      </div>
      
      <PlayerPredictionTable 
        predictions={predictions} 
        title={`Predicted Points for Gameweek ${gameweekToShow}`}
        loading={loading}
      />
      
      <div className="p-5 bg-white dark:bg-slate-800 rounded-lg shadow-md">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-3">Prediction Notes:</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <li>Predictions are based on player form, fixtures, home/away advantage, and playing time</li>
          <li>Further gameweeks have less certainty, especially for rotation-risk players</li>
          <li>These predictions don&apos;t account for injuries or team news announced after the last data update</li>
          <li>Refresh data regularly to get the most accurate predictions</li>
        </ul>
      </div>
    </div>
  );
} 