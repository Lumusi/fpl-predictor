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
      <div className="flex flex-wrap gap-2 p-4 bg-light-card dark:bg-dark-card rounded-xl shadow-md border border-slate-200 dark:border-slate-800">
        <div className="font-medium text-light-text-secondary dark:text-dark-text-secondary flex items-center">
          <span>{viewMode === 'single' ? 'Select Gameweek:' : 'Include Gameweeks:'}</span>
          <ChevronRightIcon className="h-4 w-4 mx-1 text-slate-400" />
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
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'bg-slate-100 text-light-text-secondary hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
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
                className="px-3 py-1 text-sm bg-green-600 text-white hover:bg-green-700 rounded-md transition-all"
              >
                Select All
              </button>
              <button
                onClick={() => setSelectedGameweeks([])}
                className="px-3 py-1 text-sm bg-red-600 text-white hover:bg-red-700 rounded-md transition-all"
              >
                Clear All
              </button>
              {availableGameweeks.map(gw => (
                <button
                  key={gw}
                  onClick={() => toggleGameweekSelection(gw)}
                className={`px-3 py-1 text-sm rounded-md transition-all ${
                    selectedGameweeks.includes(gw)
                      ? 'bg-blue-600 text-white font-bold shadow-sm'
                      : 'bg-slate-100 text-light-text-secondary hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
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
      
      <div className="p-5 bg-light-card dark:bg-dark-card rounded-xl shadow-md border border-slate-200 dark:border-slate-800">
        <h2 className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary mb-3">Prediction Notes:</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">
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