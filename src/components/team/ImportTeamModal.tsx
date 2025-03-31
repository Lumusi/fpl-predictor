import { Fragment, useRef, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useTeam } from '@/lib/contexts/TeamContext';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

interface ImportTeamModalProps {
  isOpen: boolean;
  onClose: (importSuccessful?: boolean) => void;
}

export default function ImportTeamModal({ isOpen, onClose }: ImportTeamModalProps) {
  const [teamId, setTeamId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelButtonRef = useRef(null);
  const { importTeam, clearTeam } = useTeam();

  const handleImport = async () => {
    if (!teamId) {
      setError('Please enter a team ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Clear any existing team data
      clearTeam();
      
      // Attempt to import team
      const result = await importTeam(parseInt(teamId));
      
      if (result.success) {
        // Call onClose with success flag to trigger budget update in parent
        onClose(true);
      } else {
        setError(result.message || 'Error importing team');
      }
    } catch (error) {
      console.error('Error importing team:', error);
      setError('Failed to import team. Please check your team ID and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" initialFocus={cancelButtonRef} onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-xl bg-white dark:bg-slate-800 shadow-xl transition-all">
                {/* Header with title and close button */}
                <div className="bg-blue-600 dark:bg-blue-700 text-white px-6 py-4 flex items-center justify-between">
                  <Dialog.Title as="h3" className="text-lg font-semibold">
                    Import Team from FPL
                  </Dialog.Title>
                  <button 
                    onClick={() => onClose(false)} 
                    className="text-white hover:text-blue-100"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="p-6 dark:bg-slate-800">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    Enter your Team ID to import your current team from Fantasy Premier League.
                  </p>
                  
                  <div className="mb-5">
                    <label htmlFor="team-id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Team ID
                    </label>
                    <input
                      type="text"
                      id="team-id"
                      value={teamId}
                      onChange={(e) => setTeamId(e.target.value)}
                      className="block w-full rounded-lg border-gray-300 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2.5"
                      placeholder="e.g. 12345"
                    />
                  </div>
                  
                  <div className="mb-5 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border-l-4 border-blue-500">
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">How to find your Team ID</h4>
                    <ol className="text-sm text-blue-700 dark:text-blue-300 list-decimal ml-5 space-y-1">
                      <li className="flex items-start">
                        <span>Log in to the </span>
                        <a 
                          href="https://fantasy.premierleague.com/" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center mx-1 text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          FPL website
                          <ArrowTopRightOnSquareIcon className="h-3 w-3 ml-0.5" />
                        </a>
                      </li>
                      <li>Go to the "Points" tab</li>
                      <li>The Team ID is in the URL after "/entry/"</li>
                    </ol>
                  </div>
                  
                  {error && (
                    <div className="mb-5 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-lg">
                      <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                    </div>
                  )}
                
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onClick={() => onClose(false)}
                      ref={cancelButtonRef}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-700 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      onClick={handleImport}
                      disabled={loading}
                    >
                      {loading ? 'Importing...' : 'Import Team'}
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
} 