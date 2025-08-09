import { ReactNode } from 'react';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortState<T = any> {
  column: keyof T | null;
  direction: SortDirection;
}

export interface FilterState {
  [key: string]: string | number | boolean | null;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface SelectionState<T = any> {
  selectedRows: Set<string | number>;
  isAllSelected: boolean;
  isIndeterminate: boolean;
}

export interface Column<T = any> {
  key: keyof T;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string | number;
  minWidth?: string | number;
  maxWidth?: string | number;
  render?: (value: T[keyof T], row: T, index: number) => ReactNode;
  headerRender?: () => ReactNode;
  filterRender?: (value: any, onChange: (value: any) => void) => ReactNode;
  accessor?: (row: T) => any;
  sortFn?: (a: T, b: T) => number;
  className?: string;
  headerClassName?: string;
  cellClassName?: string;
}

export interface BulkAction<T = any> {
  id: string;
  label: string;
  icon?: ReactNode;
  action: (selectedRows: T[]) => void | Promise<void>;
  disabled?: (selectedRows: T[]) => boolean;
  dangerous?: boolean;
}

export interface DataTableProps<T = any> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  error?: string | null;
  
  // Row identification
  rowKey?: keyof T | ((row: T) => string | number);
  
  // Sorting
  sortable?: boolean;
  defaultSort?: SortState<T>;
  onSort?: (sortState: SortState<T>) => void;
  
  // Filtering
  filterable?: boolean;
  filters?: FilterState;
  onFiltersChange?: (filters: FilterState) => void;
  
  // Pagination
  pagination?: boolean;
  paginationState?: PaginationState;
  onPaginationChange?: (pagination: PaginationState) => void;
  
  // Selection
  selectable?: boolean;
  selectedRows?: Set<string | number>;
  onSelectionChange?: (selection: SelectionState<T>) => void;
  bulkActions?: BulkAction<T>[];
  
  // Virtualization
  virtual?: boolean;
  virtualHeight?: number;
  rowHeight?: number;
  
  // Styling
  className?: string;
  tableClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  rowClassName?: string | ((row: T, index: number) => string);
  
  // Empty state
  emptyMessage?: string | ReactNode;
  
  // Accessibility
  ariaLabel?: string;
  ariaLabelledBy?: string;
  
  // Row events
  onRowClick?: (row: T, index: number) => void;
  onRowDoubleClick?: (row: T, index: number) => void;
  onRowHover?: (row: T, index: number) => void;
  
  // Custom components
  loadingComponent?: ReactNode;
  errorComponent?: ReactNode;
  emptyComponent?: ReactNode;
}

export interface VirtualItem {
  index: number;
  start: number;
  size: number;
  end: number;
}

export interface UseVirtualizationProps {
  count: number;
  estimateSize: number;
  containerHeight: number;
  scrollMargin?: number;
  overscan?: number;
}

export interface UseVirtualizationResult {
  virtualItems: VirtualItem[];
  totalSize: number;
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end' | 'auto') => void;
  measure: (index: number, size: number) => void;
  setScrollElement: (element: HTMLElement | null) => void;
}