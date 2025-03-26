import React, { useState } from 'react';
import { predictFutureGameweeks } from '@/lib/utils/predictions';
import PlayerPredictionTable from './PlayerPredictionTable';

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
      <div className="flex flex-wrap gap-2 p-4 bg-white rounded-lg shadow-md">
        <div className="font-medium text-gray-700">Select Gameweek:</div>
        <div className="flex flex-wrap gap-1">
          {availableGameweeks.map(gw => (
            <button
              key={gw}
              onClick={() => setSelectedGameweek(gw)}
              className={`px-3 py-1 text-sm rounded-md ${
                gw === gameweekToShow
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
      
      <div className="p-4 bg-white rounded-lg shadow-md">
        <h2 className="text-lg font-bold text-gray-800 mb-3">Prediction Notes:</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
          <li>Predictions are based on player form, fixtures, home/away advantage, and playing time</li>
          <li>Further gameweeks have less certainty, especially for rotation-risk players</li>
          <li>These predictions don't account for injuries or team news announced after the last data update</li>
          <li>Refresh data regularly to get the most accurate predictions</li>
        </ul>
      </div>
    </div>
  );
} 