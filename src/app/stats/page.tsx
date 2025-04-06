'use client';

import { useState } from 'react';
import { useFplData } from '@/lib/hooks/useFplData';
import Header from '@/components/Header';
import ErrorDisplay from '@/components/ErrorDisplay';
import StatsTable from '@/components/StatsTable';

export default function StatsPage() {
  const { currentGameweek, loading, error } = useFplData();

  if (error && !loading) {
    return <ErrorDisplay error={error} />;
  }

  return (
    <div className="min-h-screen bg-light-background dark:bg-dark-background">
      <Header 
        currentGameweek={currentGameweek} 
        loading={loading}
      />
      
      <div className="container mx-auto py-8 px-4">
        <StatsTable />
      </div>
    </div>
  );
} 