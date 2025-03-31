import { Fragment, useRef, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useTeam } from '@/lib/contexts/TeamContext';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ImportTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
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
        onClose();
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
      <Dialog as="div" className="relative z-10" initialFocus={cancelButtonRef} onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 pr-4 pt-4">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-xl font-semibold leading-6 text-gray-900">
                      Import Team from FPL
                    </Dialog.Title>
                    <div className="mt-4">
                      <p className="text-sm text-gray-500 mb-4">
                        Enter your Team ID to import your current team from Fantasy Premier League.
                      </p>
                      
                      <div className="mb-4">
                        <label htmlFor="team-id" className="block text-sm font-medium text-gray-700 mb-1">
                          Team ID
                        </label>
                        <input
                          type="text"
                          id="team-id"
                          value={teamId}
                          onChange={(e) => setTeamId(e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                          placeholder="e.g. 12345"
                        />
                      </div>
                      
                      <div className="mb-4 bg-blue-50 rounded-md p-3">
                        <h4 className="text-sm font-medium text-blue-800 mb-1">How to find your Team ID</h4>
                        <ol className="text-sm text-blue-700 list-decimal pl-5">
                          <li>Log in to the <a href="https://fantasy.premierleague.com/" target="_blank" rel="noopener noreferrer" className="underline">FPL website</a></li>
                          <li>Go to the &quot;Points&quot; tab</li>
                          <li>The Team ID is in the URL after &quot;/entry/&quot;</li>
                        </ol>
                      </div>
                      
                      {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                          {error}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:ml-3 sm:w-auto"
                    onClick={handleImport}
                    disabled={loading}
                  >
                    {loading ? 'Importing...' : 'Import Team'}
                  </button>
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                    onClick={onClose}
                    ref={cancelButtonRef}
                  >
                    Cancel
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
} 