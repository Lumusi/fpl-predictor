import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import { useTheme } from 'next-themes';

interface HeaderProps {
  currentGameweek: number;
  loading?: boolean;
  onRefresh?: () => void;
}

export default function Header({ currentGameweek, loading = false, onRefresh }: HeaderProps) {
  const pathname = usePathname();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // After mounting, we can safely show the UI that depends on the theme
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Determine which navigation link is active
  const isHome = pathname === '/';
  const isTeam = pathname === '/team';
  const isTable = pathname === '/table';
  const isFixtures = pathname === '/fixtures';
  
  // Use resolvedTheme which is more reliable, and fallback during SSR
  const currentTheme = mounted ? (resolvedTheme || theme) : 'light';
  
  return (
    <header className="bg-gradient-to-r from-blue-700 to-blue-500 dark:from-slate-800 dark:to-slate-700 text-white p-4 sm:p-6 shadow-lg">
      <div className="container mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="currentColor" 
                className="w-8 h-8 mr-2"
              >
                <path d="M21.721 12.752a9.711 9.711 0 00-.945-5.003 12.754 12.754 0 01-4.339 2.708 18.991 18.991 0 01-.214 4.772 17.165 17.165 0 005.498-2.477zM14.634 15.55a17.324 17.324 0 00.332-4.647c-.952.227-1.945.347-2.966.347-1.021 0-2.014-.12-2.966-.347a17.515 17.515 0 00.332 4.647 17.385 17.385 0 005.268 0zM9.772 17.119a18.963 18.963 0 004.456 0A17.182 17.182 0 0112 21.724a17.18 17.18 0 01-2.228-4.605zM7.777 15.23a18.87 18.87 0 01-.214-4.774 12.753 12.753 0 01-4.34-2.708 9.711 9.711 0 00-.944 5.004 17.165 17.165 0 005.498 2.477zM21.356 14.752a9.765 9.765 0 01-7.478 6.817 18.64 18.64 0 001.988-4.718 18.627 18.627 0 005.49-2.098zM2.644 14.752c1.682.971 3.53 1.688 5.49 2.099a18.64 18.64 0 001.988 4.718 9.765 9.765 0 01-7.478-6.816zM13.878 2.43a9.755 9.755 0 016.116 3.986 11.267 11.267 0 01-3.746 2.504 18.63 18.63 0 00-2.37-6.49zM12 2.276a17.152 17.152 0 012.805 7.121c-.897.23-1.837.353-2.805.353-.968 0-1.908-.122-2.805-.353A17.151 17.151 0 0112 2.276zM10.122 2.43a18.629 18.629 0 00-2.37 6.49 11.266 11.266 0 01-3.746-2.504 9.754 9.754 0 016.116-3.985z" />
              </svg>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-100 dark:from-white dark:to-blue-200">
                FPL Predictor
              </span>
            </h1>
            <p className="mt-1 text-blue-100 dark:text-slate-300">
              Predicting player performance for Fantasy Premier League
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <nav className="flex space-x-1 bg-blue-600/50 dark:bg-slate-700/50 backdrop-blur-sm p-1 rounded-md shadow-sm">
              <Link 
                href="/" 
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  isHome 
                    ? 'bg-white text-blue-700 dark:bg-slate-900 dark:text-white shadow-sm' 
                    : 'text-white hover:bg-blue-500/20 dark:hover:bg-slate-600/50'
                }`}
              >
                Player Predictions
              </Link>
              <Link 
                href="/team" 
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  isTeam 
                    ? 'bg-white text-blue-700 dark:bg-slate-900 dark:text-white shadow-sm' 
                    : 'text-white hover:bg-blue-500/20 dark:hover:bg-slate-600/50'
                }`}
              >
                Team Builder
              </Link>
              <Link 
                href="/table" 
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  isTable 
                    ? 'bg-white text-blue-700 dark:bg-slate-900 dark:text-white shadow-sm' 
                    : 'text-white hover:bg-blue-500/20 dark:hover:bg-slate-600/50'
                }`}
              >
                Table
              </Link>
              <Link 
                href="/fixtures" 
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  isFixtures 
                    ? 'bg-white text-blue-700 dark:bg-slate-900 dark:text-white shadow-sm' 
                    : 'text-white hover:bg-blue-500/20 dark:hover:bg-slate-600/50'
                }`}
              >
                Fixtures
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              {currentGameweek > 0 && (
                <div className="bg-white/90 dark:bg-slate-900/90 text-blue-700 dark:text-blue-300 py-1 px-3 rounded-full text-sm font-bold shadow-sm">
                  GW {currentGameweek}
                </div>
              )}
              
              {mounted && (
                <button
                  onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
                  className={`flex items-center gap-2 py-1.5 px-3 rounded-full transition-colors ${
                    currentTheme === 'dark' 
                      ? 'bg-slate-700 text-yellow-300 hover:bg-slate-600' 
                      : 'bg-blue-600/50 text-white hover:bg-blue-600/70'
                  }`}
                  aria-label={currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {currentTheme === 'dark' ? (
                    <>
                      <SunIcon className="h-4 w-4" />
                      <span className="text-xs font-medium">Light</span>
                    </>
                  ) : (
                    <>
                      <MoonIcon className="h-4 w-4" />
                      <span className="text-xs font-medium">Dark</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
} 