'use client';

import { useFplData } from '@/lib/hooks/useFplData';
import Header from '@/components/Header';
import PlaceholderPage from '@/components/PlaceholderPage';
import ErrorDisplay from '@/components/ErrorDisplay';

export default function PointsPage() {
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
      
      <PlaceholderPage 
        title="Points Overview" 
        description="View your Fantasy Premier League points performance and history." 
      />
    </div>
  );
} 