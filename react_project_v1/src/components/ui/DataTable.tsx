import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import {
  DataTableProps,
  SortState,
  FilterState,
  SelectionState,
  PaginationState,
} from '../../types/dataTable';
import {
  sortData,
  filterData,
  paginateData,
  getNextSortDirection,
  getRowKey,
  createFilterState,
  isRowSelected,
  toggleRowSelection,
  toggleAllRowsSelection,
} from '../../utils/dataTableUtils';
import { useVirtualization } from '../../hooks/useVirtualization';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';
import { Pagination } from './Pagination';
import { BulkActions } from './BulkActions';

export function DataTable<T = any>({
  data,
  columns,
  loading = false,
  error = null,

  rowKey,

  sortable = true,
  defaultSort,
  onSort,

  filterable = true,
  filters: externalFilters,
  onFiltersChange,

  pagination = false,
  paginationState: externalPagination,
  onPaginationChange,

  selectable = false,
  selectedRows: externalSelectedRows,
  onSelectionChange,
  bulkActions = [],

  virtual = false,
  virtualHeight = 400,
  rowHeight = 48,

  className = '',
  tableClassName = '',
  headerClassName = '',
  bodyClassName = '',
  rowClassName = '',

  emptyMessage = 'No data available',

  ariaLabel = 'Data table',
  ariaLabelledBy,

  onRowClick,
  onRowDoubleClick,
  onRowHover,

  loadingComponent,
  errorComponent,
  emptyComponent,
}: DataTableProps<T>) {
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const [internalSort, setInternalSort] = useState<SortState<T>>(
    defaultSort || { column: null, direction: null }
  );
  const [internalFilters, setInternalFilters] = useState<FilterState>(
    externalFilters || createFilterState(columns)
  );
  const [internalPagination, setInternalPagination] = useState<PaginationState>({
    page: 0,
    pageSize: 10,
    totalItems: data.length,
    totalPages: Math.ceil(data.length / 10),
    ...externalPagination,
  });
  const [internalSelection, setInternalSelection] = useState<Set<string | number>>(
    externalSelectedRows || new Set()
  );

  const sortState = onSort ? internalSort : internalSort;
  const filtersState = onFiltersChange ? externalFilters || internalFilters : internalFilters;
  const paginationState = onPaginationChange ? externalPagination || internalPagination : internalPagination;
  const selectedRowsState = onSelectionChange ? externalSelectedRows || internalSelection : internalSelection;

  const getRowKeyFn = useCallback(
    (row: T, index: number) => getRowKey(row, index, rowKey),
    [rowKey]
  );

  const processedData = useMemo(() => {
    let result = [...data];

    if (filterable && filtersState) {
      result = filterData(result, filtersState, columns);
    }

    if (sortable && sortState.column && sortState.direction) {
      result = sortData(result, sortState, columns);
    }

    return result;
  }, [data, filtersState, sortState, columns, filterable, sortable]);

  const paginatedData = useMemo(() => {
    if (!pagination) return { items: processedData, totalPages: 1 };

    return paginateData(processedData, paginationState.page, paginationState.pageSize);
  }, [processedData, pagination, paginationState.page, paginationState.pageSize]);

  const finalData = pagination ? paginatedData.items : processedData;

  const {
    virtualItems,
    totalSize,
    setScrollElement,
  } = useVirtualization({
    count: finalData.length,
    estimateSize: rowHeight,
    containerHeight: virtual ? virtualHeight : 0,
    overscan: 5,
  });

  const displayData = virtual ? virtualItems.map(item => finalData[item.index]) : finalData;

  const {
    tableRef: setTableRef,
    focusCell,
    getCellProps,
    getRowProps,
  } = useKeyboardNavigation({
    rowCount: displayData.length,
    columnCount: columns.length + (selectable ? 1 : 0),
    onRowSelect: (rowIndex) => {
      if (selectable) {
        const row = displayData[rowIndex];
        const key = getRowKeyFn(row, rowIndex);
        handleRowSelection(key);
      }
    },
    onSelectAll: selectable ? handleSelectAll : undefined,
    disabled: loading || displayData.length === 0,
  });

  const selectionState: SelectionState<T> = useMemo(() => {
    const allRowKeys = finalData.map((row, index) => getRowKeyFn(row, index));
    const selectedCount = allRowKeys.filter(key => selectedRowsState.has(key)).length;

    return {
      selectedRows: selectedRowsState,
      isAllSelected: selectedCount === allRowKeys.length && allRowKeys.length > 0,
      isIndeterminate: selectedCount > 0 && selectedCount < allRowKeys.length,
    };
  }, [selectedRowsState, finalData, getRowKeyFn]);

  const handleSort = useCallback((columnKey: keyof T) => {
    const column = columns.find(col => col.key === columnKey);
    if (!column?.sortable && !sortable) return;

    const currentDirection = sortState.column === columnKey ? sortState.direction : null;
    const newDirection = getNextSortDirection(currentDirection);
    const newSortState = { column: newDirection ? columnKey : null, direction: newDirection };

    if (onSort) {
      onSort(newSortState);
    } else {
      setInternalSort(newSortState);
    }
  }, [sortState, columns, sortable, onSort]);

  const handleFilterChange = useCallback((columnKey: string, value: any) => {
    const newFilters = { ...filtersState, [columnKey]: value };

    if (onFiltersChange) {
      onFiltersChange(newFilters);
    } else {
      setInternalFilters(newFilters);
    }
  }, [filtersState, onFiltersChange]);

  const handleRowSelection = useCallback((rowKey: string | number) => {
    const newSelection = toggleRowSelection(rowKey, selectedRowsState, finalData);
    const newSelectionState = {
      selectedRows: newSelection,
      isAllSelected: newSelection.size === finalData.length && finalData.length > 0,
      isIndeterminate: newSelection.size > 0 && newSelection.size < finalData.length,
    };

    if (onSelectionChange) {
      onSelectionChange(newSelectionState);
    } else {
      setInternalSelection(newSelection);
    }
  }, [selectedRowsState, finalData, onSelectionChange]);

  const handleSelectAll = useCallback(() => {
    const newSelection = toggleAllRowsSelection(selectedRowsState, finalData, getRowKeyFn);
    const newSelectionState = {
      selectedRows: newSelection,
      isAllSelected: newSelection.size === finalData.length && finalData.length > 0,
      isIndeterminate: false,
    };

    if (onSelectionChange) {
      onSelectionChange(newSelectionState);
    } else {
      setInternalSelection(newSelection);
    }
  }, [selectedRowsState, finalData, getRowKeyFn, onSelectionChange]);

  const handlePaginationChange = useCallback((newPagination: PaginationState) => {
    if (onPaginationChange) {
      onPaginationChange(newPagination);
    } else {
      setInternalPagination(newPagination);
    }
  }, [onPaginationChange]);

  const clearSelection = useCallback(() => {
    const newSelectionState = {
      selectedRows: new Set<string | number>(),
      isAllSelected: false,
      isIndeterminate: false,
    };

    if (onSelectionChange) {
      onSelectionChange(newSelectionState);
    } else {
      setInternalSelection(new Set());
    }
  }, [onSelectionChange]);

  useEffect(() => {
    if (virtual && scrollElementRef.current) {
      setScrollElement(scrollElementRef.current);
    }
  }, [virtual, setScrollElement]);

  useEffect(() => {
    if (pagination && !onPaginationChange) {
      const totalItems = processedData.length;
      const totalPages = Math.ceil(totalItems / paginationState.pageSize);
      const currentPage = Math.min(paginationState.page, Math.max(0, totalPages - 1));

      if (
        totalItems !== internalPagination.totalItems ||
        totalPages !== internalPagination.totalPages ||
        currentPage !== internalPagination.page
      ) {
        setInternalPagination(prev => ({
          ...prev,
          totalItems,
          totalPages,
          page: currentPage,
        }));
      }
    }
  }, [processedData.length, paginationState.pageSize, pagination, onPaginationChange, internalPagination, paginationState.page]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-32 text-red-600">
        {errorComponent || error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        {loadingComponent || (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        )}
      </div>
    );
  }

  const selectedRowsData = finalData.filter((row, index) =>
    selectedRowsState.has(getRowKeyFn(row, index))
  );

  return (
    <div className={`bg-white shadow overflow-hidden sm:rounded-lg ${className}`}>
      {selectable && bulkActions.length > 0 && (
        <BulkActions
          selectedCount={selectedRowsState.size}
          totalCount={finalData.length}
          selectedRows={selectedRowsData}
          bulkActions={bulkActions}
          onClearSelection={clearSelection}
        />
      )}

      <div
        ref={virtual ? scrollElementRef : undefined}
        className={virtual ? 'overflow-auto' : ''}
        style={virtual ? { height: virtualHeight } : undefined}
      >
        <table
          ref={setTableRef}
          className={`min-w-full divide-y divide-gray-200 ${tableClassName}`}
          role="grid"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-rowcount={displayData.length + 1}
          aria-colcount={columns.length + (selectable ? 1 : 0)}
        >
          <thead className={`bg-gray-50 ${headerClassName}`}>
            <tr role="row" aria-rowindex={1}>
              {selectable && (
                <th className="px-6 py-3 text-left" role="columnheader" aria-colindex={1}>
                  <input
                    type="checkbox"
                    checked={selectionState.isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = selectionState.isIndeterminate;
                    }}
                    onChange={handleSelectAll}
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    aria-label="Select all rows"
                  />
                </th>
              )}

              {columns.map((column, columnIndex) => (
                <th
                  key={String(column.key)}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.headerClassName || ''
                  }`}
                  style={{
                    width: column.width,
                    minWidth: column.minWidth,
                    maxWidth: column.maxWidth,
                  }}
                  role="columnheader"
                  aria-colindex={columnIndex + (selectable ? 2 : 1)}
                  aria-sort={
                    sortState.column === column.key
                      ? sortState.direction === 'asc' ? 'ascending' : 'descending'
                      : 'none'
                  }
                >
                  <div className="flex items-center space-x-1">
                    {column.headerRender ? (
                      column.headerRender()
                    ) : (
                      <button
                        onClick={() => handleSort(column.key)}
                        className={`group inline-flex ${
                          (column.sortable !== false && sortable)
                            ? 'cursor-pointer hover:text-gray-900'
                            : 'cursor-default'
                        }`}
                        disabled={column.sortable === false && !sortable}
                      >
                        {column.header}
                        {(column.sortable !== false && sortable) && (
                          <span className="ml-2 flex-none rounded">
                            {sortState.column === column.key && sortState.direction === 'asc' ? (
                              <ChevronUpIcon className="h-4 w-4 text-gray-900" />
                            ) : sortState.column === column.key && sortState.direction === 'desc' ? (
                              <ChevronDownIcon className="h-4 w-4 text-gray-900" />
                            ) : (
                              <ChevronUpIcon className="h-4 w-4 text-gray-400 group-hover:text-gray-900" />
                            )}
                          </span>
                        )}
                      </button>
                    )}

                    {(column.filterable !== false && filterable) && (
                      <div className="relative">
                        {column.filterRender ? (
                          column.filterRender(
                            filtersState[String(column.key)],
                            (value) => handleFilterChange(String(column.key), value)
                          )
                        ) : (
                          <div className="group">
                            <FunnelIcon className="h-4 w-4 text-gray-400 cursor-pointer hover:text-gray-600" />
                            <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-10">
                              <div className="p-2">
                                <input
                                  type="text"
                                  placeholder={`Filter ${column.header}...`}
                                  value={filtersState[String(column.key)] || ''}
                                  onChange={(e) =>
                                    handleFilterChange(String(column.key), e.target.value)
                                  }
                                  className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody
            className={`bg-white divide-y divide-gray-200 ${bodyClassName}`}
            style={virtual ? { height: totalSize } : undefined}
          >
            {displayData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-6 py-8 text-center text-gray-500"
                >
                  {emptyComponent || emptyMessage}
                </td>
              </tr>
            ) : (
              displayData.map((row, index) => {
                const actualIndex = virtual
                  ? virtualItems.find(item => finalData[item.index] === row)?.index || index
                  : index;
                const key = getRowKeyFn(row, actualIndex);
                const isSelected = isRowSelected(key, selectedRowsState);
                const rowClass = typeof rowClassName === 'function'
                  ? rowClassName(row, actualIndex)
                  : rowClassName;

                return (
                  <tr
                    key={key}
                    {...getRowProps(index)}
                    className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''} ${rowClass}`}
                    onClick={() => onRowClick?.(row, actualIndex)}
                    onDoubleClick={() => onRowDoubleClick?.(row, actualIndex)}
                    onMouseEnter={() => onRowHover?.(row, actualIndex)}
                    aria-selected={isSelected}
                    style={virtual ? {
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualItems.find(item => finalData[item.index] === row)?.start}px)`,
                    } : undefined}
                  >
                    {selectable && (
                      <td className="px-6 py-4" {...getCellProps(index, 0)}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleRowSelection(key)}
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                          aria-label={`Select row ${actualIndex + 1}`}
                        />
                      </td>
                    )}

                    {columns.map((column, columnIndex) => {
                      const value = column.accessor ? column.accessor(row) : row[column.key];
                      const cellIndex = columnIndex + (selectable ? 1 : 0);

                      return (
                        <td
                          key={String(column.key)}
                          {...getCellProps(index, cellIndex)}
                          className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${
                            column.cellClassName || column.className || ''
                          }`}
                        >
                          {column.render ? column.render(value, row, actualIndex) : String(value)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <Pagination
          pagination={paginationState}
          onPaginationChange={handlePaginationChange}
        />
      )}
    </div>
  );
}
