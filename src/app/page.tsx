'use client';

import { useState } from 'react';
import { Tab } from '@headlessui/react';
import { useFplData } from '@/lib/hooks/useFplData';
import Header from '@/components/Header';
import PlayerPredictionTable from '@/components/PlayerPredictionTable';
import FutureGameweeks from '@/components/FutureGameweeks';
import ErrorDisplay from '@/components/ErrorDisplay';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function Home() {
  const { 
    loading, 
    error, 
    currentGameweek, 
    predictedPoints,
    futurePredictions, 
    refreshData 
  } = useFplData();

  const [selectedTabIndex, setSelectedTabIndex] = useState(0);

  if (error) {
    return (
      <div className="min-h-screen bg-light-background dark:bg-dark-background transition-colors duration-200">
        <Header 
          currentGameweek={0} 
          loading={loading} 
          onRefresh={refreshData} 
        />
        <main className="container mx-auto py-8 px-4">
          <ErrorDisplay error={error} onRetry={refreshData} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light-background dark:bg-dark-background transition-colors duration-200">
      <Header 
        currentGameweek={currentGameweek} 
        loading={loading} 
        onRefresh={refreshData} 
      />
      
      <main className="container mx-auto py-8 px-4 text-light-text-primary dark:text-dark-text-primary">
        <Tab.Group selectedIndex={selectedTabIndex} onChange={setSelectedTabIndex}>
          <Tab.List className="flex space-x-2 rounded-xl bg-light-accent-secondary/20 dark:bg-dark-card p-1 mb-6 shadow-sm">
            <Tab
              className={({ selected }) =>
                classNames(
                  'w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all',
                  'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                  selected
                    ? 'bg-light-card dark:bg-dark-card text-light-accent-primary dark:text-dark-accent-secondary shadow'
                    : 'text-blue-600 dark:text-blue-400 hover:bg-light-card dark:hover:bg-dark-card hover:text-light-accent-primary dark:hover:text-dark-accent-secondary'
                )
              }
            >
              Next Gameweek
            </Tab>
            <Tab
              className={({ selected }) =>
                classNames(
                  'w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all',
                  'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                  selected
                    ? 'bg-light-card dark:bg-dark-card text-light-accent-primary dark:text-dark-accent-secondary shadow'
                    : 'text-blue-600 dark:text-blue-400 hover:bg-light-card dark:hover:bg-dark-card hover:text-light-accent-primary dark:hover:text-dark-accent-secondary'
                )
              }
            >
              Future Gameweeks
            </Tab>
          </Tab.List>
          
          <Tab.Panels className="mt-2">
            <Tab.Panel>
              <PlayerPredictionTable 
                predictions={predictedPoints} 
                loading={loading}
              />
            </Tab.Panel>
            <Tab.Panel>
              <FutureGameweeks 
                futurePredictions={futurePredictions} 
                currentGameweek={currentGameweek} 
                loading={loading}
              />
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
        
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
