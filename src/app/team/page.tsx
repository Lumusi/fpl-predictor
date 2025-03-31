'use client';

import { useFplData } from '@/lib/hooks/useFplData';
import TeamBuilder from '@/components/team/TeamBuilder';
import Header from '@/components/Header';
import { useState } from 'react';

export default function TeamPage() {
  const { currentGameweek, loading } = useFplData();
  
  return (
    <div className="min-h-screen bg-light-background dark:bg-dark-background transition-colors duration-200">
      <Header currentGameweek={currentGameweek || 0} loading={loading} />
      
      <main className="container mx-auto py-2 px-4 min-h-[calc(100vh-64px)] relative pb-24">
        <div className="w-full h-[calc(100vh-110px)]">
          <TeamBuilder />
        </div>
      </main>
    </div>
  );
} 