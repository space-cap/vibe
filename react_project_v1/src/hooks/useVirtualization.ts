import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { VirtualItem, UseVirtualizationProps, UseVirtualizationResult } from '../types/dataTable';

export function useVirtualization({
  count,
  estimateSize,
  containerHeight,
  scrollMargin = 0,
  overscan = 5,
}: UseVirtualizationProps): UseVirtualizationResult {
  const [scrollTop, setScrollTop] = useState(0);
  const measurementsCache = useRef(new Map<number, number>());
  const scrollElementRef = useRef<HTMLElement | null>(null);

  const measure = useCallback((index: number, size: number) => {
    measurementsCache.current.set(index, size);
  }, []);

  const getItemSize = useCallback((index: number) => {
    return measurementsCache.current.get(index) ?? estimateSize;
  }, [estimateSize]);

  const { virtualItems, totalSize } = useMemo(() => {
    if (count === 0) {
      return { virtualItems: [], totalSize: 0 };
    }

    const rangeStart = scrollTop;
    const rangeEnd = scrollTop + containerHeight;

    let totalSize = 0;
    const allItems: VirtualItem[] = [];

    for (let index = 0; index < count; index++) {
      const size = getItemSize(index);
      const start = totalSize;
      const end = start + size;

      allItems.push({
        index,
        start,
        size,
        end,
      });

      totalSize = end;
    }

    const startIndex = allItems.findIndex(item => item.end >= rangeStart);
    const endIndex = allItems.findIndex(item => item.start > rangeEnd);

    const visibleStartIndex = Math.max(0, startIndex - overscan);
    const visibleEndIndex = Math.min(
      count - 1,
      endIndex === -1 ? count - 1 : endIndex + overscan
    );

    const virtualItems = allItems.slice(visibleStartIndex, visibleEndIndex + 1);

    return {
      virtualItems,
      totalSize,
    };
  }, [count, scrollTop, containerHeight, getItemSize, overscan]);

  const scrollToIndex = useCallback(
    (index: number, align: 'start' | 'center' | 'end' | 'auto' = 'auto') => {
      if (!scrollElementRef.current) return;

      const itemSize = getItemSize(index);
      let targetScrollTop = 0;

      for (let i = 0; i < index; i++) {
        targetScrollTop += getItemSize(i);
      }

      switch (align) {
        case 'start':
          break;
        case 'center':
          targetScrollTop -= (containerHeight - itemSize) / 2;
          break;
        case 'end':
          targetScrollTop -= containerHeight - itemSize;
          break;
        case 'auto':
          const currentScrollTop = scrollElementRef.current.scrollTop;
          const itemStart = targetScrollTop;
          const itemEnd = targetScrollTop + itemSize;
          const viewStart = currentScrollTop;
          const viewEnd = currentScrollTop + containerHeight;

          if (itemStart < viewStart) {
            break;
          } else if (itemEnd > viewEnd) {
            targetScrollTop -= containerHeight - itemSize;
          } else {
            return;
          }
          break;
      }

      scrollElementRef.current.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth',
      });
    },
    [containerHeight, getItemSize]
  );

  const handleScroll = useCallback((event: Event) => {
    const target = event.target as HTMLElement;
    setScrollTop(target.scrollTop);
  }, []);

  useEffect(() => {
    const element = scrollElementRef.current;
    if (!element) return;

    element.addEventListener('scroll', handleScroll, { passive: true });
    return () => element.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const setScrollElement = useCallback((element: HTMLElement | null) => {
    scrollElementRef.current = element;
    if (element) {
      setScrollTop(element.scrollTop);
    }
  }, []);

  return {
    virtualItems,
    totalSize,
    scrollToIndex,
    measure,
    setScrollElement,
  };
}
