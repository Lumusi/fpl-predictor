import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  
  // Use resolvedTheme which is more reliable, and fallback during SSR
  const currentTheme = mounted ? (resolvedTheme || theme) : 'light';
  
  // Calculate active tab
  const getActiveClass = (path: string) => {
    return pathname === path ? 
      'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-300 font-bold' : 
      'text-white hover:bg-blue-600/50 dark:hover:bg-slate-700/50';
  };
  
  return (
    <header className="bg-gradient-to-r from-cyan-500 to-blue-500 dark:from-slate-800 dark:to-slate-700 text-white shadow-lg">
      {/* Logo and Title Bar */}
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {/* Premier League Logo */}
            <div className="w-10 h-10 mr-3 relative">
              <Image 
                src="/premier-league-logo.svg" 
                alt="Premier League Logo"
                width={40}
                height={40}
                className="text-white"
                priority
              />
            </div>
            
            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-bold">
              <span className="text-white">FPL Predictor</span>
            </h1>
          </div>

          {/* Right side content */}
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
      
      {/* Navigation Tabs */}
      <div className="bg-blue-600 dark:bg-slate-700 px-4">
        <div className="container mx-auto">
          <div className="flex overflow-x-auto scrollbar-hide">
            <Link 
              href="/" 
              className={`px-4 py-2 text-sm font-medium transition-all ${getActiveClass('/')}`}
            >
              Status
            </Link>
            <Link 
              href="/highlights" 
              className={`px-4 py-2 text-sm font-medium transition-all ${getActiveClass('/highlights')}`}
            >
              Gameweek Highlights
            </Link>
            <Link 
              href="/team" 
              className={`px-4 py-2 text-sm font-medium transition-all ${getActiveClass('/team')}`}
            >
              Pick Team
            </Link>
            <Link 
              href="/fixtures" 
              className={`px-4 py-2 text-sm font-medium transition-all ${getActiveClass('/fixtures')}`}
            >
              Fixtures
            </Link>
            <Link 
              href="/scout" 
              className={`px-4 py-2 text-sm font-medium transition-all ${getActiveClass('/scout')}`}
            >
              The Scout
            </Link>
            <Link 
              href="/stats" 
              className={`px-4 py-2 text-sm font-medium transition-all ${getActiveClass('/stats')}`}
            >
              Stats
            </Link>
            <Link 
              href="/table" 
              className={`px-4 py-2 text-sm font-medium transition-all ${getActiveClass('/table')}`}
            >
              Table
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
} 