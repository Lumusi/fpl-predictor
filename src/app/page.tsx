'use client';

import { useFplData } from '@/lib/hooks/useFplData';
import Header from '@/components/Header';
import FutureGameweeks from '@/components/FutureGameweeks';
import ErrorDisplay from '@/components/ErrorDisplay';
import Link from 'next/link';
import Image from 'next/image';

const FEATURES = [
  {
    title: 'Player Predictions',
    description: 'AI-driven points predictions based on form, fixtures, and historical data.',
    href: '/team',
    color: 'from-blue-500 to-indigo-500',
  },
  {
    title: 'Gameweek Highlights',
    description: 'Top performers, dream teams, and key stats from every gameweek.',
    href: '/highlights',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    title: 'The Scout',
    description: 'Set-piece takers, availability status, and team-by-team analysis.',
    href: '/scout',
    color: 'from-violet-500 to-purple-500',
  },
  {
    title: 'Premier League Table',
    description: 'Live standings, form guide, and head-to-head comparisons.',
    href: '/table',
    color: 'from-amber-500 to-orange-500',
  },
];

export default function Home() {
  const {
    players,
    teams,
    fixtures,
    currentGameweek,
    predictedPoints,
    futurePredictions,
    loading,
    error
  } = useFplData();

  if (error && !loading) {
    return <ErrorDisplay error={error} />;
  }

  // Calculate some quick stats
  const totalPlayers = players?.length || 0;
  const totalTeams = teams?.length || 0;
  const totalFixtures = fixtures?.length || 0;
  const topPredicted = predictedPoints?.slice(0, 3) || [];

  return (
    <div className="min-h-screen bg-light-background dark:bg-dark-background">
      <Header
        currentGameweek={currentGameweek}
        loading={loading}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 dark:from-slate-900 dark:via-blue-950 dark:to-indigo-950" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
        <div className="container mx-auto px-4 py-20 md:py-28 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 relative">
                <Image
                  src="/premier-league-logo.svg"
                  alt="Premier League"
                  width={64}
                  height={64}
                  className="object-contain brightness-0 invert"
                  priority
                />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              FPL Predictor
            </h1>
            <p className="text-lg md:text-xl text-blue-100 mb-10 max-w-2xl mx-auto leading-relaxed">
              Predict player performance in Fantasy Premier League for upcoming gameweeks.
              Make data-driven decisions to optimize your team.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/team"
                className="inline-flex items-center justify-center px-8 py-3.5 bg-white text-blue-600 font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
              >
                Build Your Team
                <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/scout"
                className="inline-flex items-center justify-center px-8 py-3.5 bg-white/10 text-white font-semibold rounded-xl border border-white/20 hover:bg-white/20 hover:scale-105 transition-all duration-200 backdrop-blur-sm"
              >
                The Scout Report
              </Link>
            </div>
          </div>
        </div>
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-light-background dark:from-dark-background to-transparent" />
      </section>

      {/* Quick Stats */}
      {!loading && (
        <section className="container mx-auto px-4 -mt-8 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-5 text-center border border-slate-100 dark:border-slate-800">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{totalPlayers}</div>
              <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">Players</div>
            </div>
            <div className="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-5 text-center border border-slate-100 dark:border-slate-800">
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{totalTeams}</div>
              <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">Teams</div>
            </div>
            <div className="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-5 text-center border border-slate-100 dark:border-slate-800">
              <div className="text-3xl font-bold text-violet-600 dark:text-violet-400">{totalFixtures}</div>
              <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">Fixtures</div>
            </div>
            <div className="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-5 text-center border border-slate-100 dark:border-slate-800">
              <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{currentGameweek || '-'}</div>
              <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">Gameweek</div>
            </div>
          </div>
        </section>
      )}

      {/* Predictions */}
      <section className="container mx-auto px-4 py-12">
        <FutureGameweeks
          futurePredictions={futurePredictions}
          currentGameweek={currentGameweek}
          loading={loading}
        />
      </section>

      {/* Top Predicted Players */}
      {!loading && topPredicted.length > 0 && (
        <section className="container mx-auto px-4 pb-12">
          <h2 className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary mb-6">
            Top Predicted Players (GW {currentGameweek})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topPredicted.map((player: any, idx: number) => (
              <div
                key={player.id}
                className="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-5 border border-slate-100 dark:border-slate-800 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                    idx === 0 ? 'bg-amber-400' : idx === 1 ? 'bg-slate-400' : 'bg-amber-700'
                  }`}>
                    {idx + 1}
                  </span>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {player.predictedPoints?.toFixed(1) || '0'}
                  </span>
                </div>
                <div className="font-semibold text-light-text-primary dark:text-dark-text-primary">
                  {player.web_name}
                </div>
                <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  {player.team_name} &middot; {player.position}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Features Grid */}
      <section className="bg-light-background dark:bg-dark-background pb-12">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary mb-6 text-center">
            Explore
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((feature) => (
              <Link
                key={feature.title}
                href={feature.href}
                className="group block bg-light-card dark:bg-dark-card rounded-xl shadow-md p-6 border border-slate-100 dark:border-slate-800 hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${feature.color} mb-4 flex items-center justify-center`}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
                <h3 className="font-semibold text-light-text-primary dark:text-dark-text-primary mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
                  {feature.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section className="bg-light-card dark:bg-dark-card border-t border-slate-200 dark:border-slate-800 py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary mb-6 text-center">
            About This Tool
          </h2>
          <div className="space-y-4 text-light-text-secondary dark:text-dark-text-secondary leading-relaxed">
            <p>
              This tool uses the official Fantasy Premier League API to analyze player data
              and predict future points based on form, fixture difficulty, home/away advantage,
              and historical performance.
            </p>
            <p>
              The prediction model weighs recent form higher than historical performance and accounts
              for fixture difficulty, helping you make more informed FPL decisions.
            </p>
            <div className="bg-light-background dark:bg-dark-background rounded-lg p-4 text-sm border border-slate-200 dark:border-slate-700">
              <p className="italic">
                Predictions should be used as a guide to help your FPL decisions,
                not as a definitive answer. Actual points depend on many factors including
                injuries, team selection, and in-game events that are impossible to predict
                with perfect accuracy.
              </p>
            </div>
            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary pt-2 text-center">
              Data sourced from the official FPL API at fantasy.premierleague.com
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
