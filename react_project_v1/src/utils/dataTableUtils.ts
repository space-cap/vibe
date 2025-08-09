import { SortDirection, SortState, FilterState, Column } from '../types/dataTable';

export function sortData<T>(
  data: T[],
  sortState: SortState<T>,
  columns: Column<T>[]
): T[] {
  if (!sortState.column || !sortState.direction) {
    return data;
  }

  const column = columns.find(col => col.key === sortState.column);
  const sortFn = column?.sortFn;

  return [...data].sort((a, b) => {
    let aVal: any;
    let bVal: any;

    if (column?.accessor) {
      aVal = column.accessor(a);
      bVal = column.accessor(b);
    } else {
      aVal = a[sortState.column!];
      bVal = b[sortState.column!];
    }

    if (sortFn) {
      const result = sortFn(a, b);
      return sortState.direction === 'desc' ? -result : result;
    }

    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      const result = aVal.localeCompare(bVal);
      return sortState.direction === 'desc' ? -result : result;
    }

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      const result = aVal - bVal;
      return sortState.direction === 'desc' ? -result : result;
    }

    if (aVal instanceof Date && bVal instanceof Date) {
      const result = aVal.getTime() - bVal.getTime();
      return sortState.direction === 'desc' ? -result : result;
    }

    const result = String(aVal).localeCompare(String(bVal));
    return sortState.direction === 'desc' ? -result : result;
  });
}

export function filterData<T>(
  data: T[],
  filters: FilterState,
  columns: Column<T>[]
): T[] {
  if (!Object.keys(filters).length) {
    return data;
  }

  return data.filter(row => {
    return Object.entries(filters).every(([key, filterValue]) => {
      if (filterValue === null || filterValue === undefined || filterValue === '') {
        return true;
      }

      const column = columns.find(col => String(col.key) === key);
      let rowValue: any;

      if (column?.accessor) {
        rowValue = column.accessor(row);
      } else {
        rowValue = row[key as keyof T];
      }

      if (rowValue === null || rowValue === undefined) {
        return false;
      }

      if (typeof filterValue === 'string') {
        return String(rowValue).toLowerCase().includes(filterValue.toLowerCase());
      }

      if (typeof filterValue === 'number') {
        return Number(rowValue) === filterValue;
      }

      if (typeof filterValue === 'boolean') {
        return Boolean(rowValue) === filterValue;
      }

      return String(rowValue) === String(filterValue);
    });
  });
}

export function paginateData<T>(
  data: T[],
  page: number,
  pageSize: number
): { items: T[]; totalPages: number } {
  const startIndex = page * pageSize;
  const endIndex = startIndex + pageSize;
  const items = data.slice(startIndex, endIndex);
  const totalPages = Math.ceil(data.length / pageSize);

  return {
    items,
    totalPages,
  };
}

export function getNextSortDirection(currentDirection: SortDirection): SortDirection {
  switch (currentDirection) {
    case null:
      return 'asc';
    case 'asc':
      return 'desc';
    case 'desc':
      return null;
    default:
      return 'asc';
  }
}

export function getRowKey<T>(row: T, index: number, rowKeyProp?: keyof T | ((row: T) => string | number)): string | number {
  if (typeof rowKeyProp === 'function') {
    return rowKeyProp(row);
  }

  if (rowKeyProp && row[rowKeyProp] !== undefined) {
    return String(row[rowKeyProp]);
  }

  if ('id' in row && row.id !== undefined) {
    return String(row.id);
  }

  return index;
}

export function createFilterState(columns: Column[]): FilterState {
  const filterState: FilterState = {};

  columns.forEach(column => {
    if (column.filterable) {
      filterState[String(column.key)] = '';
    }
  });

  return filterState;
}

export function isRowSelected(
  rowKey: string | number,
  selectedRows: Set<string | number>
): boolean {
  return selectedRows.has(rowKey);
}

export function toggleRowSelection<T>(
  rowKey: string | number,
  selectedRows: Set<string | number>,
  data: T[]
): Set<string | number> {
  const newSelection = new Set(selectedRows);

  if (newSelection.has(rowKey)) {
    newSelection.delete(rowKey);
  } else {
    newSelection.add(rowKey);
  }

  return newSelection;
}

export function toggleAllRowsSelection<T>(
  currentSelection: Set<string | number>,
  data: T[],
  getRowKey: (row: T, index: number) => string | number
): Set<string | number> {
  const allRowKeys = data.map((row, index) => getRowKey(row, index));
  const allSelected = allRowKeys.every(key => currentSelection.has(key));

  if (allSelected) {
    return new Set();
  } else {
    return new Set(allRowKeys);
  }
}
