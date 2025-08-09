import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { PaginationState } from '../../types/dataTable';

interface PaginationProps {
  pagination: PaginationState;
  onPaginationChange: (pagination: PaginationState) => void;
  pageSizeOptions?: number[];
  showPageSizeSelector?: boolean;
  showPageInfo?: boolean;
  className?: string;
}

export function Pagination({
  pagination,
  onPaginationChange,
  pageSizeOptions = [10, 25, 50, 100],
  showPageSizeSelector = true,
  showPageInfo = true,
  className = '',
}: PaginationProps) {
  const { page, pageSize, totalItems, totalPages } = pagination;

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      onPaginationChange({
        ...pagination,
        page: newPage,
      });
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    const newTotalPages = Math.ceil(totalItems / newPageSize);
    const newPage = Math.min(page, Math.max(0, newTotalPages - 1));

    onPaginationChange({
      ...pagination,
      pageSize: newPageSize,
      page: newPage,
      totalPages: newTotalPages,
    });
  };

  const getVisiblePages = (): number[] => {
    const delta = 2;
    const start = Math.max(0, page - delta);
    const end = Math.min(totalPages - 1, page + delta);

    const pages: number[] = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  };

  const visiblePages = getVisiblePages();
  const startItem = page * pageSize + 1;
  const endItem = Math.min((page + 1) * pageSize, totalItems);

  if (totalItems === 0) return null;

  return (
    <div className={`flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 ${className}`}>
      <div className="flex items-center space-x-4">
        {showPageInfo && (
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">{startItem}</span> to{' '}
            <span className="font-medium">{endItem}</span> of{' '}
            <span className="font-medium">{totalItems}</span> results
          </div>
        )}

        {showPageSizeSelector && (
          <div className="flex items-center space-x-2">
            <label htmlFor="page-size" className="text-sm text-gray-700">
              Show:
            </label>
            <select
              id="page-size"
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="block w-auto text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={() => handlePageChange(page - 1)}
          disabled={page === 0}
          className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          <ChevronLeftIcon className="w-5 h-5" aria-hidden="true" />
        </button>

        {visiblePages[0] > 0 && (
          <>
            <button
              onClick={() => handlePageChange(0)}
              className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
            >
              1
            </button>
            {visiblePages[0] > 1 && (
              <span className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300">
                ...
              </span>
            )}
          </>
        )}

        {visiblePages.map((pageNum) => (
          <button
            key={pageNum}
            onClick={() => handlePageChange(pageNum)}
            className={`relative inline-flex items-center px-4 py-2 text-sm font-medium border ${
              pageNum === page
                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
            }`}
          >
            {pageNum + 1}
          </button>
        ))}

        {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
          <>
            {visiblePages[visiblePages.length - 1] < totalPages - 2 && (
              <span className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300">
                ...
              </span>
            )}
            <button
              onClick={() => handlePageChange(totalPages - 1)}
              className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          onClick={() => handlePageChange(page + 1)}
          disabled={page === totalPages - 1}
          className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          <ChevronRightIcon className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
