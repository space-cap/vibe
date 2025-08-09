import { useCallback, useEffect, useRef } from 'react';

interface UseKeyboardNavigationProps {
  rowCount: number;
  columnCount: number;
  onCellFocus?: (rowIndex: number, columnIndex: number) => void;
  onRowSelect?: (rowIndex: number) => void;
  onSelectAll?: () => void;
  disabled?: boolean;
}

export function useKeyboardNavigation({
  rowCount,
  columnCount,
  onCellFocus,
  onRowSelect,
  onSelectAll,
  disabled = false,
}: UseKeyboardNavigationProps) {
  const currentFocusRef = useRef({ row: -1, column: -1 });
  const tableRef = useRef<HTMLTableElement>(null);

  const focusCell = useCallback((rowIndex: number, columnIndex: number) => {
    if (disabled || !tableRef.current) return;

    const clampedRow = Math.max(0, Math.min(rowIndex, rowCount - 1));
    const clampedColumn = Math.max(0, Math.min(columnIndex, columnCount - 1));

    currentFocusRef.current = { row: clampedRow, column: clampedColumn };

    const rows = tableRef.current.querySelectorAll('tbody tr');
    const targetRow = rows[clampedRow] as HTMLTableRowElement;

    if (targetRow) {
      const cells = targetRow.querySelectorAll('td, th');
      const targetCell = cells[clampedColumn] as HTMLTableCellElement;

      if (targetCell) {
        targetCell.focus();
        onCellFocus?.(clampedRow, clampedColumn);
      }
    }
  }, [rowCount, columnCount, onCellFocus, disabled]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (disabled || !tableRef.current) return;

    const { row, column } = currentFocusRef.current;
    let handled = false;

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        if (row > 0) {
          focusCell(row - 1, column);
        }
        handled = true;
        break;

      case 'ArrowDown':
        event.preventDefault();
        if (row < rowCount - 1) {
          focusCell(row + 1, column);
        }
        handled = true;
        break;

      case 'ArrowLeft':
        event.preventDefault();
        if (column > 0) {
          focusCell(row, column - 1);
        }
        handled = true;
        break;

      case 'ArrowRight':
        event.preventDefault();
        if (column < columnCount - 1) {
          focusCell(row, column + 1);
        }
        handled = true;
        break;

      case 'Home':
        event.preventDefault();
        if (event.ctrlKey) {
          focusCell(0, 0);
        } else {
          focusCell(row, 0);
        }
        handled = true;
        break;

      case 'End':
        event.preventDefault();
        if (event.ctrlKey) {
          focusCell(rowCount - 1, columnCount - 1);
        } else {
          focusCell(row, columnCount - 1);
        }
        handled = true;
        break;

      case 'PageUp':
        event.preventDefault();
        focusCell(Math.max(0, row - 10), column);
        handled = true;
        break;

      case 'PageDown':
        event.preventDefault();
        focusCell(Math.min(rowCount - 1, row + 10), column);
        handled = true;
        break;

      case ' ':
        event.preventDefault();
        if (row >= 0) {
          onRowSelect?.(row);
        }
        handled = true;
        break;

      case 'a':
      case 'A':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          onSelectAll?.();
          handled = true;
        }
        break;

      case 'Escape':
        event.preventDefault();
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement) {
          activeElement.blur();
        }
        currentFocusRef.current = { row: -1, column: -1 };
        handled = true;
        break;
    }

    return handled;
  }, [disabled, rowCount, columnCount, focusCell, onRowSelect, onSelectAll]);

  useEffect(() => {
    const table = tableRef.current;
    if (!table || disabled) return;

    table.addEventListener('keydown', handleKeyDown);

    return () => {
      table.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, disabled]);

  const setTableRef = useCallback((element: HTMLTableElement | null) => {
    tableRef.current = element;

    if (element) {
      element.setAttribute('tabindex', '0');
      element.setAttribute('role', 'grid');
      element.setAttribute('aria-label', 'Data table with keyboard navigation');
    }
  }, []);

  const getCellProps = useCallback((rowIndex: number, columnIndex: number) => ({
    tabIndex: currentFocusRef.current.row === rowIndex && currentFocusRef.current.column === columnIndex ? 0 : -1,
    role: 'gridcell',
    onFocus: () => {
      currentFocusRef.current = { row: rowIndex, column: columnIndex };
      onCellFocus?.(rowIndex, columnIndex);
    },
    'aria-rowindex': rowIndex + 1,
    'aria-colindex': columnIndex + 1,
  }), [onCellFocus]);

  const getRowProps = useCallback((rowIndex: number) => ({
    role: 'row',
    'aria-rowindex': rowIndex + 1,
    'aria-selected': false, // This should be set based on selection state
  }), []);

  return {
    tableRef: setTableRef,
    focusCell,
    getCellProps,
    getRowProps,
    currentFocus: currentFocusRef.current,
  };
}
