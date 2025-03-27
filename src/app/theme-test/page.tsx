'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import Link from 'next/link';

export default function ThemeTestPage() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, themes, systemTheme, resolvedTheme } = useTheme();
  
  // Only show the UI once mounted to avoid hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    // Return a placeholder with the same structure to minimize layout shift
    return (
      <div className="min-h-screen p-8 bg-light-background dark:bg-dark-background text-light-text-primary dark:text-dark-text-primary">
        <h1 className="text-3xl font-bold mb-6">Theme Test Page</h1>
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen p-8 bg-light-background dark:bg-dark-background text-light-text-primary dark:text-dark-text-primary">
      <Link 
        href="/" 
        className="inline-block mb-6 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition"
      >
        Back to Home
      </Link>
      
      <h1 className="text-4xl font-bold mb-6 text-light-text-primary dark:text-dark-text-primary">
        Text Readability Test
      </h1>
      
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-light-card dark:bg-dark-card rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-light-text-primary dark:text-dark-text-primary">
            Theme Controls
          </h2>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setTheme('light')}
              className={`px-4 py-2 rounded-md transition-colors ${
                theme === 'light' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-light-text-secondary dark:text-dark-text-secondary hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Light
            </button>
            
            <button
              onClick={() => setTheme('dark')}
              className={`px-4 py-2 rounded-md transition-colors ${
                theme === 'dark' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-light-text-secondary dark:text-dark-text-secondary hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Dark
            </button>
            
            <button
              onClick={() => setTheme('system')}
              className={`px-4 py-2 rounded-md transition-colors ${
                theme === 'system' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-light-text-secondary dark:text-dark-text-secondary hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              System
            </button>
          </div>
          
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            Current theme: <span className="font-medium text-light-text-primary dark:text-dark-text-primary">{theme}</span>
            <br />
            Resolved theme: <span className="font-medium text-light-text-primary dark:text-dark-text-primary">{resolvedTheme}</span>
          </p>
        </div>
        
        <div className="p-6 bg-light-card dark:bg-dark-card rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-light-text-primary dark:text-dark-text-primary">
            Theme Information
          </h2>
          <ul className="space-y-2 text-light-text-secondary dark:text-dark-text-secondary">
            <li>• Using <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded text-light-text-primary dark:text-dark-text-primary">next-themes</span> for theme management</li>
            <li>• Class-based dark mode with Tailwind</li>
            <li>• Custom color variables</li>
            <li>• System preference detection</li>
            <li>• Theme persistence in localStorage</li>
          </ul>
        </div>
      </div>
      
      <div className="mb-10 space-y-6">
        <div className="p-6 bg-light-card dark:bg-dark-card rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4 text-light-text-primary dark:text-dark-text-primary">
            Text Contrast Examples
          </h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2 text-light-text-primary dark:text-dark-text-primary">
                Primary Text
              </h3>
              <p className="text-light-text-primary dark:text-dark-text-primary">
                This is primary text that should be clearly readable in both light and dark modes.
                It uses <span className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-1 rounded">text-light-text-primary</span> in light mode
                and <span className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-1 rounded">dark:text-dark-text-primary</span> in dark mode.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2 text-light-text-primary dark:text-dark-text-primary">
                Secondary Text
              </h3>
              <p className="text-light-text-secondary dark:text-dark-text-secondary">
                This is secondary text with slightly lower contrast but still readable.
                It uses <span className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-1 rounded text-light-text-primary dark:text-dark-text-primary">text-light-text-secondary</span> in light mode
                and <span className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-1 rounded text-light-text-primary dark:text-dark-text-primary">dark:text-dark-text-secondary</span> in dark mode.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-white dark:bg-gray-900 rounded-lg">
                <p className="text-light-text-primary dark:text-dark-text-primary">Text on white/very dark bg</p>
              </div>
              <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <p className="text-light-text-primary dark:text-dark-text-primary">Text on light/dark gray bg</p>
              </div>
              <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <p className="text-light-text-primary dark:text-dark-text-primary">Text on blue bg</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-6 bg-light-card dark:bg-dark-card rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4 text-light-text-primary dark:text-dark-text-primary">
          Component Examples
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-3 text-light-text-primary dark:text-dark-text-primary">
              Card Example
            </h3>
            <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <h4 className="font-medium mb-2 text-light-text-primary dark:text-dark-text-primary">Card Title</h4>
              <p className="text-light-text-secondary dark:text-dark-text-secondary text-sm">
                This is card content with proper text contrast in both light and dark modes.
              </p>
              <div className="mt-3">
                <button className="px-3 py-1 bg-blue-500 text-white text-sm rounded">
                  Action Button
                </button>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-3 text-light-text-primary dark:text-dark-text-primary">
              Data Display
            </h3>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 text-light-text-primary dark:text-dark-text-primary font-medium">
                Player Stats
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                <div className="px-4 py-2 flex justify-between">
                  <span className="text-light-text-secondary dark:text-dark-text-secondary">Goals</span>
                  <span className="text-light-text-primary dark:text-dark-text-primary font-medium">12</span>
                </div>
                <div className="px-4 py-2 flex justify-between">
                  <span className="text-light-text-secondary dark:text-dark-text-secondary">Assists</span>
                  <span className="text-light-text-primary dark:text-dark-text-primary font-medium">8</span>
                </div>
                <div className="px-4 py-2 flex justify-between">
                  <span className="text-light-text-secondary dark:text-dark-text-secondary">Points</span>
                  <span className="text-light-text-primary dark:text-dark-text-primary font-medium">162</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Theme Switcher</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTheme('light')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  theme === 'light' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-light-text-secondary dark:text-dark-text-secondary hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Light
              </button>
              
              <button
                onClick={() => setTheme('dark')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  theme === 'dark' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-light-text-secondary dark:text-dark-text-secondary hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Dark
              </button>
              
              <button
                onClick={() => setTheme('system')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  theme === 'system' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-light-text-secondary dark:text-dark-text-secondary hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                System
              </button>
            </div>
          </div>
          
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow transition-colors"
          >
            Toggle Theme (Light/Dark)
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-800 bg-light-card dark:bg-dark-card shadow-md">
          <h2 className="text-xl font-semibold mb-3">Color Contrast</h2>
          <p className="text-light-text-secondary dark:text-dark-text-secondary mb-4">
            This text uses secondary colors that should change based on the theme.
          </p>
          <div className="h-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg mb-3"></div>
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
            The background is now pure white in light mode and near black in dark mode.
          </p>
        </div>
        
        <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-800 bg-light-card dark:bg-dark-card shadow-md">
          <h2 className="text-xl font-semibold mb-3">UI Elements</h2>
          <div className="space-y-3">
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
              Panel with subtle background
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-blue-500 text-white rounded">Button</button>
              <button className="px-3 py-1 bg-green-500 text-white rounded">Button</button>
              <button className="px-3 py-1 bg-red-500 text-white rounded">Button</button>
            </div>
            <div className="p-2 border border-gray-300 dark:border-gray-700 rounded-lg">
              <p className="text-sm">Border contrast example</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-800 bg-light-card dark:bg-dark-card shadow-md">
          <h2 className="text-xl font-semibold mb-3">next-themes Features</h2>
          <ul className="list-disc list-inside space-y-2 text-light-text-primary dark:text-dark-text-primary">
            <li>System preference detection</li>
            <li>Multiple theme support (light, dark, system)</li>
            <li>Persistence in localStorage</li>
            <li>Hydration-safe implementation</li>
            <li>SSR compatible</li>
            <li>Simple API with useTheme hook</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 