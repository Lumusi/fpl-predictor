'use client';

import { useState } from 'react';
import { useFplData } from '@/lib/hooks/useFplData';
import Header from '@/components/Header';
import ErrorDisplay from '@/components/ErrorDisplay';
import Image from 'next/image';
import { findPlayerImage } from '@/lib/utils/playerImages';

export default function TransfersPage() {
  const { currentGameweek, players, teams, loading, error } = useFplData();
  const [searchQuery, setSearchQuery] = useState('');

  if (error && !loading) {
    return <ErrorDisplay error={error} />;
  }

  // Build a simple value picker: players sorted by value (points per cost)
  const sortedByValue = [...(players || [])]
    .map(p => ({
      ...p,
      valueScore: p.now_cost > 0 ? p.total_points / (p.now_cost / 10) : 0,
      teamShort: teams?.find(t => t.id === p.team)?.short_name || '',
    }))
    .sort((a, b) => b.valueScore - a.valueScore)
    .slice(0, 20);

  // Top transfers in
  const topTransfersIn = [...(players || [])]
    .sort((a, b) => (b.transfers_in_event || 0) - (a.transfers_in_event || 0))
    .slice(0, 20);

  const getPositionLabel = (et: number) => ['', 'GKP', 'DEF', 'MID', 'FWD'][et] || '';

  return (
    <div className="min-h-screen bg-light-background dark:bg-dark-background">
      <Header currentGameweek={currentGameweek} loading={loading} />

      <main className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary mb-8">
          Transfer Planning
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Best Value Players */}
          <div className="bg-light-card dark:bg-dark-card rounded-xl shadow-md border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 py-3 px-5">
              <h2 className="font-bold text-white">Best Value Players</h2>
              <p className="text-emerald-100 text-xs mt-0.5">Points per £1m spent</p>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {loading
                ? [...Array(5)].map((_, i) => (
                    <div key={i} className="p-4">
                      <div className="h-6 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
                    </div>
                  ))
                : sortedByValue.map((player, idx) => (
                    <div key={player.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <span className="text-sm font-bold text-slate-400 w-6">{idx + 1}</span>
                      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                        <Image
                          src={findPlayerImage(player.code?.toString(), player.id?.toString())}
                          alt={player.web_name}
                          width={40}
                          height={40}
                          className="object-cover w-full h-full"
                          unoptimized
                          onError={(e) => { (e.target as HTMLImageElement).src = '/premier-league-logo.svg'; }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-light-text-primary dark:text-dark-text-primary truncate">
                          {player.web_name}
                        </div>
                        <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                          {player.teamShort} &middot; {getPositionLabel(player.element_type)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                          {player.valueScore.toFixed(1)}
                        </div>
                        <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                          £{player.now_cost / 10}m &middot; {player.total_points}pts
                        </div>
                      </div>
                    </div>
                  ))}
            </div>
          </div>

          {/* Most Transferred In */}
          <div className="bg-light-card dark:bg-dark-card rounded-xl shadow-md border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 py-3 px-5">
              <h2 className="font-bold text-white">Most Transferred In</h2>
              <p className="text-blue-100 text-xs mt-0.5">Popular picks this gameweek</p>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {loading
                ? [...Array(5)].map((_, i) => (
                    <div key={i} className="p-4">
                      <div className="h-6 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
                    </div>
                  ))
                : topTransfersIn.map((player, idx) => {
                    const team = teams?.find(t => t.id === player.team);
                    return (
                      <div key={player.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <span className="text-sm font-bold text-slate-400 w-6">{idx + 1}</span>
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                          <Image
                            src={findPlayerImage(player.code?.toString(), player.id?.toString())}
                            alt={player.web_name}
                            width={40}
                            height={40}
                            className="object-cover w-full h-full"
                            unoptimized
                            onError={(e) => { (e.target as HTMLImageElement).src = '/premier-league-logo.svg'; }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-light-text-primary dark:text-dark-text-primary truncate">
                            {player.web_name}
                          </div>
                          <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                            {team?.short_name} &middot; {getPositionLabel(player.element_type)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-blue-600 dark:text-blue-400">
                            {(player.transfers_in_event || 0).toLocaleString()}
                          </div>
                          <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                            transfers in
                          </div>
                        </div>
                      </div>
                    );
                  })}
            </div>
          </div>
        </div>

        {/* Info card */}
        <div className="mt-8 bg-light-card dark:bg-dark-card rounded-xl shadow-md border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="font-bold text-light-text-primary dark:text-dark-text-primary mb-3">Transfer Tips</h3>
          <ul className="space-y-2 text-sm text-light-text-secondary dark:text-dark-text-secondary list-disc pl-5">
            <li>Look for players with good upcoming fixtures (green on the fixture difficulty chart)</li>
            <li>Consider players in form — check the Form column on the Stats page</li>
            <li>Don&apos;t take point hits unnecessarily; a -4 hit costs 4 points</li>
            <li>Use your free transfer each week — they don&apos;t roll over indefinitely</li>
            <li>Target players from teams with double gameweeks for maximum points</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
