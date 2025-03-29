'use client';

import { useFplData } from '@/lib/hooks/useFplData';
import Header from '@/components/Header';
import FutureGameweeks from '@/components/FutureGameweeks';
import ErrorDisplay from '@/components/ErrorDisplay';

export default function Home() {
  const { 
    players, 
    teams, 
    fixtures, 
    currentGameweek, 
    predictedPoints, 
    futurePredictions,
    loading, 
    error, 
    refreshData 
  } = useFplData();

  if (error && !loading) {
    return <ErrorDisplay error={error} onRetry={refreshData} />;
  }

  return (
    <div className="min-h-screen bg-light-background dark:bg-dark-background">
      <Header 
        currentGameweek={currentGameweek} 
        onRefresh={refreshData}
        loading={loading}
      />
      
      <main className="container mx-auto py-8 px-4 text-light-text-primary dark:text-dark-text-primary">
        <FutureGameweeks 
          futurePredictions={futurePredictions} 
          currentGameweek={currentGameweek} 
          loading={loading}
        />
        
        <div className="mt-8 bg-light-card dark:bg-dark-card p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary mb-4">About this Tool</h2>
          <div className="space-y-3 text-light-text-secondary dark:text-dark-text-secondary">
            <p>
              This tool uses the official Fantasy Premier League API to analyze player data
              and predict future points based on form, fixture difficulty, home/away advantage,
              and historical performance.
            </p>
            <p>
              The prediction model weighs recent form higher than historical performance and accounts 
              for fixture difficulty, helping you make more informed FPL decisions.
            </p>
            <p>
              <em className="text-sm">Note: Predictions should be used as a guide to help your FPL decisions,
              not as a definitive answer. The actual points depend on many factors including
              injuries, team selection, and in-game events that are impossible to predict with
              perfect accuracy.</em>
            </p>
            <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary pt-2 mt-2 border-t border-gray-200 dark:border-slate-700">
              Data sourced from the official FPL API at fantasy.premierleague.com
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
