'use client';

import { useFplData } from '@/lib/hooks/useFplData';
import Header from '@/components/Header';
import ErrorDisplay from '@/components/ErrorDisplay';
import PlayerStatsModal from '@/components/PlayerStatsModal';
import { useState } from 'react';
import Image from 'next/image';
import { findPlayerImage } from '@/lib/utils/playerImages';

export default function PointsPage() {
  const { currentGameweek, players, teams, loading, error } = useFplData();
  const [sortBy, setSortBy] = useState<'total_points' | 'points_per_game' | 'form'>('total_points');
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [statsModalOpen, setStatsModalOpen] = useState(false);

  if (error && !loading) {
    return <ErrorDisplay error={error} />;
  }

  const sortedPlayers = [...(players || [])]
    .sort((a, b) => {
      if (sortBy === 'total_points') return b.total_points - a.total_points;
      if (sortBy === 'points_per_game') return parseFloat(b.points_per_game || '0') - parseFloat(a.points_per_game || '0');
      return parseFloat(b.form || '0') - parseFloat(a.form || '0');
    })
    .slice(0, 50);

  const getPositionColor = (elementType: number) => {
    const colors = ['', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500'];
    return colors[elementType] || 'bg-gray-500';
  };

  const getPositionLabel = (elementType: number) => {
    const labels = ['', 'GKP', 'DEF', 'MID', 'FWD'];
    return labels[elementType] || '';
  };

  return (
    <div className="min-h-screen bg-light-background dark:bg-dark-background">
      <Header currentGameweek={currentGameweek} loading={loading} />

      <main className="container mx-auto py-8 px-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
            Player Points
          </h1>

          <div className="flex gap-2 mt-4 md:mt-0">
            {(['total_points', 'points_per_game', 'form'] as const).map((key) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  sortBy === key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {key === 'total_points' ? 'Total' : key === 'points_per_game' ? 'PPG' : 'Form'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="bg-light-card dark:bg-dark-card rounded-xl shadow-md border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="py-3 px-3 text-left font-semibold text-slate-500 dark:text-slate-400">#</th>
                  <th className="py-3 px-3 text-left font-semibold text-slate-500 dark:text-slate-400">Player</th>
                  <th className="py-3 px-3 text-center font-semibold text-slate-500 dark:text-slate-400">Team</th>
                  <th className="py-3 px-3 text-center font-semibold text-slate-500 dark:text-slate-400">Pos</th>
                  <th className="py-3 px-3 text-center font-semibold text-slate-500 dark:text-slate-400">Cost</th>
                  <th className="py-3 px-3 text-center font-semibold text-slate-500 dark:text-slate-400">Total</th>
                  <th className="py-3 px-3 text-center font-semibold text-slate-500 dark:text-slate-400">PPG</th>
                  <th className="py-3 px-3 text-center font-semibold text-slate-500 dark:text-slate-400">Form</th>
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map((player, idx) => {
                  const team = teams?.find(t => t.id === player.team);
                  return (
                    <tr
                      key={player.id}
                      className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedPlayer(player);
                        setStatsModalOpen(true);
                      }}
                    >
                      <td className="py-3 px-3 text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                            <Image
                              src={findPlayerImage(player.code?.toString(), player.id?.toString())}
                              alt={player.web_name}
                              width={32}
                              height={32}
                              className="object-cover w-full h-full"
                              unoptimized
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/premier-league-logo.svg';
                              }}
                            />
                          </div>
                          <span className="font-medium text-light-text-primary dark:text-dark-text-primary">
                            {player.web_name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center text-light-text-secondary dark:text-dark-text-secondary">
                        {team?.short_name || ''}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex justify-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${getPositionColor(player.element_type)}`}>
                            {getPositionLabel(player.element_type)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center text-light-text-secondary dark:text-dark-text-secondary">
                        £{(player.now_cost / 10).toFixed(1)}m
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-blue-600 dark:text-blue-400">
                        {player.total_points}
                      </td>
                      <td className="py-3 px-3 text-center text-light-text-secondary dark:text-dark-text-secondary">
                        {player.points_per_game}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`font-semibold ${
                          parseFloat(player.form) >= 5 ? 'text-green-600 dark:text-green-400' :
                          parseFloat(player.form) >= 3 ? 'text-amber-600 dark:text-amber-400' :
                          'text-red-600 dark:text-red-400'
                        }`}>
                          {player.form}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {selectedPlayer && (
        <PlayerStatsModal
          player={{
            id: selectedPlayer.id,
            web_name: selectedPlayer.web_name,
            code: selectedPlayer.code,
            now_cost: selectedPlayer.now_cost,
            element_type: selectedPlayer.element_type,
            position: ['', 'GKP', 'DEF', 'MID', 'FWD'][selectedPlayer.element_type] || '',
            price: (selectedPlayer.now_cost || 0) / 10,
            team: selectedPlayer.team,
            total_points: selectedPlayer.total_points,
            form: selectedPlayer.form,
            team_short_name: teams?.find(t => t.id === selectedPlayer.team)?.short_name || '',
          }}
          isOpen={statsModalOpen}
          onClose={() => setStatsModalOpen(false)}
        />
      )}
    </div>
  );
}
