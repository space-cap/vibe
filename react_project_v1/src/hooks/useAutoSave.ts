import { useCallback, useEffect, useRef, useState } from 'react';
import { FieldValues } from 'react-hook-form';
import { AutoSaveConfig } from '../types/multiStepForm';

interface UseAutoSaveProps<TFormData extends FieldValues = FieldValues> {
  data: Partial<TFormData>;
  config: AutoSaveConfig;
  enabled?: boolean;
  debounceMs?: number;
}

export function useAutoSave<TFormData extends FieldValues = FieldValues>({
  data,
  config,
  enabled = true,
  debounceMs = 1000,
}: UseAutoSaveProps<TFormData>) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout>();
  const debounceRef = useRef<NodeJS.Timeout>();
  const lastDataRef = useRef<Partial<TFormData>>(data);

  const saveData = useCallback(async (forceImmediate = false) => {
    if (!enabled || !config.enabled) return;
    
    if (isSaving && !forceImmediate) return;
    
    try {
      setIsSaving(true);
      setSaveError(null);
      
      await config.onSave(data);
      
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      lastDataRef.current = { ...data };
      
      localStorage.setItem(config.key, JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
      
    } catch (error) {
      const saveError = error instanceof Error ? error : new Error('Save failed');
      setSaveError(saveError);
      config.onError?.(saveError);
    } finally {
      setIsSaving(false);
    }
  }, [data, config, enabled, isSaving]);

  const loadSavedData = useCallback(() => {
    try {
      const saved = localStorage.getItem(config.key);
      if (saved) {
        const parsed = JSON.parse(saved);
        return config.onLoad ? config.onLoad() : parsed.data;
      }
    } catch (error) {
      console.warn('Failed to load saved data:', error);
    }
    return null;
  }, [config]);

  const clearSavedData = useCallback(() => {
    localStorage.removeItem(config.key);
    setLastSaved(null);
    setHasUnsavedChanges(false);
    setSaveError(null);
  }, [config.key]);

  const hasDataChanged = useCallback(() => {
    return JSON.stringify(data) !== JSON.stringify(lastDataRef.current);
  }, [data]);

  // Debounced auto-save on data change
  useEffect(() => {
    if (!enabled || !config.enabled) return;

    if (hasDataChanged()) {
      setHasUnsavedChanges(true);
      
      // Clear existing debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      
      // Set new debounce
      debounceRef.current = setTimeout(() => {
        saveData();
      }, debounceMs);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [data, enabled, config.enabled, hasDataChanged, saveData, debounceMs]);

  // Interval-based auto-save
  useEffect(() => {
    if (!enabled || !config.enabled) return;

    intervalRef.current = setInterval(() => {
      if (hasUnsavedChanges) {
        saveData();
      }
    }, config.interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, config.enabled, config.interval, hasUnsavedChanges, saveData]);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && enabled && config.enabled) {
        event.preventDefault();
        saveData(true); // Force immediate save
        return event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && hasUnsavedChanges) {
        saveData(true); // Force immediate save when tab becomes hidden
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [hasUnsavedChanges, enabled, config.enabled, saveData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    lastSaved,
    isSaving,
    saveError,
    hasUnsavedChanges,
    saveData,
    loadSavedData,
    clearSavedData,
  };
}

export function useFormPersistence<TFormData extends FieldValues = FieldValues>(
  key: string,
  defaultData?: Partial<TFormData>
) {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<Partial<TFormData>>(defaultData || {});

  const saveData = useCallback((formData: Partial<TFormData>) => {
    try {
      localStorage.setItem(key, JSON.stringify({
        data: formData,
        timestamp: Date.now(),
      }));
      setData(formData);
    } catch (error) {
      console.error('Failed to save form data:', error);
    }
  }, [key]);

  const loadData = useCallback((): Partial<TFormData> | null => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        const age = Date.now() - parsed.timestamp;
        
        // Consider data stale after 24 hours
        if (age < 24 * 60 * 60 * 1000) {
          return parsed.data;
        } else {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error('Failed to load form data:', error);
    }
    return null;
  }, [key]);

  const clearData = useCallback(() => {
    localStorage.removeItem(key);
    setData(defaultData || {});
  }, [key, defaultData]);

  const hasStoredData = useCallback(() => {
    return localStorage.getItem(key) !== null;
  }, [key]);

  const getStorageInfo = useCallback(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          hasData: true,
          timestamp: new Date(parsed.timestamp),
          age: Date.now() - parsed.timestamp,
        };
      }
    } catch (error) {
      console.error('Failed to get storage info:', error);
    }
    return { hasData: false, timestamp: null, age: 0 };
  }, [key]);

  // Load data on mount
  useEffect(() => {
    const savedData = loadData();
    if (savedData) {
      setData({ ...defaultData, ...savedData });
    }
    setIsLoading(false);
  }, [loadData, defaultData]);

  return {
    data,
    isLoading,
    saveData,
    loadData,
    clearData,
    hasStoredData,
    getStorageInfo,
  };
}