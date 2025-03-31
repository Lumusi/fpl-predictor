'use client';

import { useFplData } from '@/lib/hooks/useFplData';
import Header from '@/components/Header';
import dynamic from 'next/dynamic';
import { useState } from 'react';

// Use dynamic import with no SSR for the TeamBuilderLoader
// This helps with both code splitting and preventing hydration errors
const TeamBuilderLoader = dynamic(
  () => import('@/components/TeamBuilderLoader'),
  { ssr: false }
);

export default function TeamPage() {
  const { currentGameweek, loading } = useFplData();
  
  return (
    <div className="min-h-screen bg-light-background dark:bg-dark-background transition-colors duration-200">
      <Header currentGameweek={currentGameweek || 0} loading={loading} />
      
      <main className="container mx-auto py-2 px-4 min-h-[calc(100vh-64px)] relative pb-24">
        <div className="w-full h-[calc(100vh-110px)]">
          <TeamBuilderLoader />
        </div>
      </main>
    </div>
  );
} 