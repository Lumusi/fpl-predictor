import React, { useState, useMemo } from 'react';
import { predictFutureGameweeks, calculateTotalPredictedPoints } from '@/lib/utils/predictions';
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
  // State for view mode: 'single' or 'total'
  const [viewMode, setViewMode] = useState<'single' | 'total'>('total');
  const [selectedGameweek, setSelectedGameweek] = useState<number>(currentGameweek);
  const [selectedGameweeks, setSelectedGameweeks] = useState<number[]>([]);
  
  // Get all available gameweeks from predictions
  const availableGameweeks = Object.keys(futurePredictions).map(Number).sort((a, b) => a - b);
  
  // Default to current gameweek if no predictions available for selected gameweek
  const gameweekToShow = availableGameweeks.includes(selectedGameweek) 
    ? selectedGameweek 
    : (availableGameweeks.length > 0 ? availableGameweeks[0] : currentGameweek);
  
  // Toggle gameweek selection for total view
  const toggleGameweekSelection = (gw: number) => {
    if (selectedGameweeks.includes(gw)) {
      setSelectedGameweeks(selectedGameweeks.filter(g => g !== gw));
    } else {
      setSelectedGameweeks([...selectedGameweeks, gw].sort((a, b) => a - b));
    }
  };

  // Initialize with all gameweeks selected when component mounts
  React.useEffect(() => {
    if (selectedGameweeks.length === 0 && availableGameweeks.length > 0) {
      setSelectedGameweeks([...availableGameweeks]);
    }
  }, [availableGameweeks]);

  // Calculate total predictions based on selected gameweeks
  const totalPredictions = useMemo(() => {
    // If no gameweeks selected, show all
    const gwsToUse = selectedGameweeks.length > 0 ? selectedGameweeks : availableGameweeks;
    return calculateTotalPredictedPoints(futurePredictions, gwsToUse);
  }, [futurePredictions, selectedGameweeks, availableGameweeks]);
  
  // Determine which predictions to show based on view mode
  const predictions = viewMode === 'single' 
    ? futurePredictions[gameweekToShow] || []
    : totalPredictions;
  
  return (
    <div className="space-y-4">
      {/* Gameweek selector */}
      <div className="flex flex-wrap gap-2 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-md">
        <div className="font-medium text-gray-700 dark:text-gray-300 flex items-center">
          <span>{viewMode === 'single' ? 'Select Gameweek:' : 'Include Gameweeks:'}</span>
          <ChevronRightIcon className="h-4 w-4 mx-1 text-gray-400 dark:text-gray-500" />
        </div>
        <div className="flex flex-wrap gap-1">
          {viewMode === 'single' ? (
            // Single gameweek selector
            availableGameweeks.map(gw => (
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
            ))
          ) : (
            // Multiple gameweek selector for total view
            <>
              <button
                onClick={() => setSelectedGameweeks([...availableGameweeks])}
                className="px-3 py-1 text-sm bg-green-600 text-white hover:bg-green-700 rounded-md transition-all dark:bg-green-700 dark:hover:bg-green-800"
              >
                Select All
              </button>
              <button
                onClick={() => setSelectedGameweeks([])}
                className="px-3 py-1 text-sm bg-red-600 text-white hover:bg-red-700 rounded-md transition-all dark:bg-red-700 dark:hover:bg-red-800"
              >
                Clear All
              </button>
              {availableGameweeks.map(gw => (
                <button
                  key={gw}
                  onClick={() => toggleGameweekSelection(gw)}
                  className={`px-3 py-1 text-sm rounded-md transition-all ${
                    selectedGameweeks.includes(gw)
                      ? 'bg-blue-600 text-white font-bold shadow-sm dark:bg-blue-700'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600'
                  }`}
                >
                  GW {gw}
                </button>
              ))}
            </>
          )}
        </div>
      </div>
      
      <PlayerPredictionTable 
        predictions={predictions} 
        isTotal={viewMode === 'total'}
        loading={loading}
      />
      
      <div className="p-5 bg-white dark:bg-slate-800 rounded-lg shadow-md">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-3">Prediction Notes:</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <li>Predictions are based on player form, fixtures, home/away advantage, and playing time</li>
          <li>Further gameweeks have less certainty, especially for rotation-risk players</li>
          <li>These predictions don&apos;t account for injuries or team news announced after the last data update</li>
          <li>Double gameweeks are factored into point predictions with higher values</li>
          <li>Total view shows the sum of predicted points across all selected gameweeks</li>
        </ul>
      </div>
    </div>
  );
} 