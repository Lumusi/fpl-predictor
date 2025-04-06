import React from 'react';

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="container mx-auto py-8 px-4 text-light-text-primary dark:text-dark-text-primary">
      <div className="bg-light-card dark:bg-dark-card p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary mb-4">
          {title}
        </h2>
        <p className="text-light-text-secondary dark:text-dark-text-secondary">
          {description}
        </p>
        <div className="mt-6 p-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            This section is under development and will be available soon.
          </p>
        </div>
      </div>
    </div>
  );
} 