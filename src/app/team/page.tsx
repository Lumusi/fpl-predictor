'use client';

import React from 'react';
import TeamBuilder from '@/components/team/TeamBuilder';
import Header from '@/components/Header';

export default function TeamPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentGameweek={0} />
      
      <main className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Team Builder & Transfer Suggestions</h1>
        
        <div className="w-full">
          <TeamBuilder />
        </div>
        
        <div className="mt-8 bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-gray-800 mb-3">How to Use</h2>
          <ol className="list-decimal pl-5 space-y-2 text-gray-600">
            <li>Build your team by adding players from the list below.</li>
            <li>Respect the budget (£100.0m) and team formation rules (2 GKP, 5 DEF, 5 MID, 3 FWD).</li>
            <li>Once you've added some players, click "Generate Suggestions" to see potential transfers.</li>
            <li>Suggestions are based on predicted points for upcoming fixtures and your remaining budget.</li>
          </ol>
          
          <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded-md">
            <p className="text-sm">
              <strong>Note:</strong> This tool doesn't connect to your actual FPL account. It's a simulation to help you plan transfers and build a team based on our predictions.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
} 