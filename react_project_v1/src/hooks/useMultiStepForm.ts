import { useState, useCallback, useMemo, useEffect } from 'react';
import { useForm, FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  UseMultiStepFormProps,
  UseMultiStepFormReturn,
  FormState,
  FormDirection,
  ValidationResult,
} from '../types/multiStepForm';
import {
  validateStepData,
  validateAllSteps,
  shouldSkipStep,
  isStepValid,
} from '../utils/formValidation';
import { useAutoSave } from './useAutoSave';

export function useMultiStepForm<TFormData extends FieldValues = FieldValues>({
  steps,
  initialData = {},
  autoSave,
  validateOnChange = false,
  onStepChange,
}: UseMultiStepFormProps<TFormData>): UseMultiStepFormReturn<TFormData> {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create a combined schema for form validation
  const combinedSchema = useMemo(() => {
    const schemaObj: Record<string, any> = {};
    steps.forEach(step => {
      const stepSchema = step.schema as z.ZodObject<any>;
      if (stepSchema.shape) {
        Object.assign(schemaObj, stepSchema.shape);
      }
    });
    return z.object(schemaObj).partial();
  }, [steps]);

  const form = useForm<TFormData>({
    resolver: zodResolver(combinedSchema as z.ZodSchema<TFormData>),
    defaultValues: initialData as TFormData,
    mode: validateOnChange ? 'onChange' : 'onSubmit',
  });

  const { watch, getValues, setValue, reset, trigger } = form;
  const formData = watch();

  // Auto-save functionality
  const autoSaveResult = useAutoSave({
    data: formData,
    config: autoSave || {
      enabled: false,
      interval: 30000,
      key: 'multistep-form',
      onSave: async () => {},
      onLoad: () => ({}),
    },
    enabled: autoSave?.enabled || false,
  });

  const formState: FormState<TFormData> = useMemo(() => ({
    currentStep,
    completedSteps,
    visitedSteps,
    isValid: steps.every((step, index) =>
      index > currentStep || isStepValid(formData, step)
    ),
    isDirty: form.formState.isDirty,
    isSubmitting,
    isSaving: autoSaveResult.isSaving,
    data: formData,
    errors: form.formState.errors as Record<string, string>,
    touchedFields: new Set(Object.keys(form.formState.touchedFields || {})),
  }), [
    currentStep,
    completedSteps,
    visitedSteps,
    formData,
    form.formState.isDirty,
    form.formState.errors,
    form.formState.touchedFields,
    isSubmitting,
    autoSaveResult.isSaving,
    steps,
  ]);

  const totalSteps = steps.length;

  const canGoNext = useMemo(() => {
    if (currentStep >= totalSteps - 1) return false;
    return isStepValid(formData, steps[currentStep]);
  }, [currentStep, totalSteps, formData, steps]);

  const canGoPrevious = useMemo(() => {
    return currentStep > 0;
  }, [currentStep]);

  const validateCurrentStep = useCallback(async (): Promise<ValidationResult> => {
    const currentStepConfig = steps[currentStep];
    if (!currentStepConfig) {
      return { isValid: false, errors: { _form: 'Invalid step' } };
    }

    const result = validateStepData(formData, currentStepConfig.schema);

    // Trigger form validation for the current step fields
    const stepFieldNames = currentStepConfig.fields.map(field => field.name);
    await trigger(stepFieldNames);

    return result;
  }, [currentStep, formData, steps, trigger]);

  const validateAllSteps = useCallback(async (): Promise<ValidationResult> => {
    const result = validateAllSteps(formData, steps);
    await trigger(); // Trigger validation for all fields
    return result;
  }, [formData, steps, trigger]);

  const findNextValidStep = useCallback((fromStep: number): number => {
    for (let i = fromStep + 1; i < totalSteps; i++) {
      if (!shouldSkipStep(formData, steps[i])) {
        return i;
      }
    }
    return totalSteps;
  }, [formData, steps, totalSteps]);

  const findPreviousValidStep = useCallback((fromStep: number): number => {
    for (let i = fromStep - 1; i >= 0; i--) {
      if (!shouldSkipStep(formData, steps[i])) {
        return i;
      }
    }
    return 0;
  }, [formData, steps]);

  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex < 0 || stepIndex >= totalSteps) return;

    const previousStep = currentStep;
    setCurrentStep(stepIndex);
    setVisitedSteps(prev => new Set([...prev, stepIndex]));

    const direction: FormDirection = stepIndex > previousStep ? 'next' : 'previous';
    onStepChange?.(stepIndex, direction);
  }, [currentStep, totalSteps, onStepChange]);

  const nextStep = useCallback(async (): Promise<boolean> => {
    const validation = await validateCurrentStep();
    if (!validation.isValid) {
      return false;
    }

    const currentStepConfig = steps[currentStep];

    try {
      // Call step's onNext handler if it exists
      if (currentStepConfig.onNext) {
        await currentStepConfig.onNext(formData);
      }

      // Mark current step as completed
      setCompletedSteps(prev => new Set([...prev, currentStep]));

      // Find next valid step
      const nextStepIndex = findNextValidStep(currentStep);
      if (nextStepIndex < totalSteps) {
        goToStep(nextStepIndex);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error in step onNext handler:', error);
      return false;
    }
  }, [currentStep, formData, steps, validateCurrentStep, findNextValidStep, goToStep]);

  const previousStep = useCallback(async () => {
    const currentStepConfig = steps[currentStep];

    try {
      // Call step's onPrevious handler if it exists
      if (currentStepConfig.onPrevious) {
        await currentStepConfig.onPrevious(formData);
      }

      // Find previous valid step
      const previousStepIndex = findPreviousValidStep(currentStep);
      goToStep(previousStepIndex);
    } catch (error) {
      console.error('Error in step onPrevious handler:', error);
    }
  }, [currentStep, formData, steps, findPreviousValidStep, goToStep]);

  const updateFormData = useCallback((data: Partial<TFormData>) => {
    Object.entries(data).forEach(([key, value]) => {
      setValue(key as keyof TFormData, value, { shouldDirty: true });
    });
  }, [setValue]);

  const getStepData = useCallback((stepIndex?: number): Partial<TFormData> => {
    const targetStep = stepIndex ?? currentStep;
    const stepConfig = steps[targetStep];

    if (!stepConfig) return {};

    const stepFieldNames = stepConfig.fields.map(field => field.name);
    const currentFormData = getValues();

    return stepFieldNames.reduce((acc, fieldName) => {
      if (fieldName in currentFormData) {
        acc[fieldName] = currentFormData[fieldName];
      }
      return acc;
    }, {} as Partial<TFormData>);
  }, [currentStep, steps, getValues]);

  const resetForm = useCallback(() => {
    reset(initialData as TFormData);
    setCurrentStep(0);
    setCompletedSteps(new Set());
    setVisitedSteps(new Set([0]));
    setIsSubmitting(false);
    autoSaveResult.clearSavedData();
  }, [initialData, reset, autoSaveResult]);

  const submitForm = useCallback(async () => {
    setIsSubmitting(true);

    try {
      const validation = await validateAllSteps();
      if (!validation.isValid) {
        setIsSubmitting(false);
        return;
      }

      // Form is valid, proceed with submission
      const finalData = getValues();

      // Clear saved data after successful submission
      autoSaveResult.clearSavedData();

      return finalData;
    } catch (error) {
      console.error('Form submission error:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [validateAllSteps, getValues, autoSaveResult]);

  const saveProgress = useCallback(async () => {
    await autoSaveResult.saveData();
  }, [autoSaveResult]);

  const loadSavedProgress = useCallback(() => {
    const savedData = autoSaveResult.loadSavedData();
    if (savedData) {
      updateFormData(savedData);
    }
  }, [autoSaveResult, updateFormData]);

  const clearSavedProgress = useCallback(() => {
    autoSaveResult.clearSavedData();
  }, [autoSaveResult]);

  // Update completed steps when form data changes
  useEffect(() => {
    const newCompletedSteps = new Set<number>();

    steps.forEach((step, index) => {
      if (index < currentStep && isStepValid(formData, step)) {
        newCompletedSteps.add(index);
      }
    });

    setCompletedSteps(newCompletedSteps);
  }, [formData, steps, currentStep]);

  return {
    // State
    currentStep,
    totalSteps,
    formState,
    form,

    // Navigation
    goToStep,
    nextStep,
    previousStep,
    canGoNext,
    canGoPrevious,

    // Validation
    validateCurrentStep,
    validateAllSteps,

    // Data management
    updateFormData,
    getStepData,
    resetForm,

    // Submission
    submitForm,

    // Auto-save
    saveProgress,
    loadSavedProgress,
    clearSavedProgress,
  };
}
