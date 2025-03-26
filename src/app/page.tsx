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
      <div className="min-h-screen bg-gray-50">
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
    <div className="min-h-screen bg-gray-50">
      <Header 
        currentGameweek={currentGameweek} 
        loading={loading} 
        onRefresh={refreshData} 
      />
      
      <main className="container mx-auto py-8 px-4">
        <Tab.Group selectedIndex={selectedTabIndex} onChange={setSelectedTabIndex}>
          <Tab.List className="flex space-x-2 rounded-xl bg-blue-50 p-1 mb-6">
            <Tab
              className={({ selected }) =>
                classNames(
                  'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                  'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                  selected
                    ? 'bg-white text-blue-700 shadow'
                    : 'text-blue-600 hover:bg-white/[0.25] hover:text-blue-700'
                )
              }
            >
              Next Gameweek
            </Tab>
            <Tab
              className={({ selected }) =>
                classNames(
                  'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                  'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                  selected
                    ? 'bg-white text-blue-700 shadow'
                    : 'text-blue-600 hover:bg-white/[0.25] hover:text-blue-700'
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
        
        <div className="mt-8 bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-gray-800 mb-3">About this Tool</h2>
          <p className="text-gray-600">
            This tool uses the official Fantasy Premier League API to analyze player data
            and predict future points based on form, fixture difficulty, home/away advantage,
            and historical performance. The prediction model weighs recent form higher than 
            historical performance and accounts for fixture difficulty.
          </p>
          <p className="text-gray-600 mt-2">
            Note that the predictions should be used as a guide to help your FPL decisions,
            not as a definitive answer. The actual points depend on many factors including
            injuries, team selection, and in-game events that are impossible to predict with
            perfect accuracy.
          </p>
          <p className="text-gray-600 mt-2">
            Data is sourced from the official FPL API at fantasy.premierleague.com.
          </p>
        </div>
      </main>
    </div>
  );
}
