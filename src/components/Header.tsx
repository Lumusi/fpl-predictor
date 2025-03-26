import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface HeaderProps {
  currentGameweek: number;
  loading?: boolean;
  onRefresh?: () => void;
}

export default function Header({ currentGameweek, loading = false, onRefresh }: HeaderProps) {
  const pathname = usePathname();
  
  // Determine which navigation link is active
  const isHome = pathname === '/';
  const isTeam = pathname === '/team';
  
  return (
    <header className="bg-gradient-to-r from-blue-700 to-blue-500 text-white p-4 sm:p-6">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between">
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
            FPL Predictor
          </h1>
          <p className="mt-1 text-blue-100">
            Predicting player performance for Fantasy Premier League
          </p>
        </div>
        
        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row items-center gap-4">
          <nav className="flex space-x-1 bg-blue-600 p-1 rounded-md">
            <Link 
              href="/" 
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                isHome 
                  ? 'bg-white text-blue-700' 
                  : 'text-white hover:bg-blue-700/50'
              }`}
            >
              Player Predictions
            </Link>
            <Link 
              href="/team" 
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                isTeam 
                  ? 'bg-white text-blue-700' 
                  : 'text-white hover:bg-blue-700/50'
              }`}
            >
              Team Builder
            </Link>
          </nav>
          
          {currentGameweek > 0 && (
            <div className="bg-white text-blue-700 py-1 px-3 rounded-full text-sm font-bold">
              Current: GW {currentGameweek}
            </div>
          )}
          
          {onRefresh && (
            <button 
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow transition-colors"
            >
              {loading ? (
                <>
                  <svg 
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24"
                  >
                    <circle 
                      className="opacity-25" 
                      cx="12" 
                      cy="12" 
                      r="10" 
                      stroke="currentColor" 
                      strokeWidth="4"
                    ></circle>
                    <path 
                      className="opacity-75" 
                      fill="currentColor" 
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Refreshing...
                </>
              ) : (
                <>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-4 w-4 mr-1" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                    />
                  </svg>
                  Refresh Data
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
} 