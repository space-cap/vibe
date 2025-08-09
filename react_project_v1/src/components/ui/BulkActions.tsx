import React, { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { BulkAction } from '../../types/dataTable';

interface BulkActionsProps<T = any> {
  selectedCount: number;
  totalCount: number;
  selectedRows: T[];
  bulkActions: BulkAction<T>[];
  onClearSelection: () => void;
  className?: string;
}

export function BulkActions<T = any>({
  selectedCount,
  totalCount,
  selectedRows,
  bulkActions,
  onClearSelection,
  className = '',
}: BulkActionsProps<T>) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [executingAction, setExecutingAction] = useState<string | null>(null);

  const handleActionClick = async (action: BulkAction<T>) => {
    if (action.disabled?.(selectedRows)) return;

    setExecutingAction(action.id);
    setIsDropdownOpen(false);

    try {
      await action.action(selectedRows);
    } catch (error) {
      console.error('Bulk action failed:', error);
    } finally {
      setExecutingAction(null);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <div className={`bg-blue-50 border-b border-blue-200 px-4 py-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="text-sm text-blue-700">
            <span className="font-medium">{selectedCount}</span> of{' '}
            <span className="font-medium">{totalCount}</span> items selected
          </div>

          <button
            onClick={onClearSelection}
            className="text-sm text-blue-600 hover:text-blue-500 underline"
          >
            Clear selection
          </button>
        </div>

        {bulkActions.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              disabled={executingAction !== null}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {executingAction ? (
                <>
                  <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  Actions
                  <ChevronDownIcon className="w-4 h-4 ml-2" />
                </>
              )}
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 z-10 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
                <div className="py-1" role="menu">
                  {bulkActions.map((action) => {
                    const isDisabled = action.disabled?.(selectedRows) || executingAction !== null;

                    return (
                      <button
                        key={action.id}
                        onClick={() => handleActionClick(action)}
                        disabled={isDisabled}
                        className={`flex items-center w-full px-4 py-2 text-sm text-left ${
                          action.dangerous
                            ? 'text-red-700 hover:bg-red-50'
                            : 'text-gray-700 hover:bg-gray-100'
                        } ${
                          isDisabled
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-gray-100'
                        }`}
                        role="menuitem"
                      >
                        {action.icon && (
                          <span className="mr-3 text-gray-400">
                            {action.icon}
                          </span>
                        )}
                        {action.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Click outside to close dropdown */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
}
