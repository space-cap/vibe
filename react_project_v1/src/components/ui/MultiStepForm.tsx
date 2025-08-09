import React, { useCallback } from 'react';
import { FieldValues } from 'react-hook-form';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { MultiStepFormProps } from '../../types/multiStepForm';
import { useMultiStepForm } from '../../hooks/useMultiStepForm';
import { shouldSkipStep } from '../../utils/formValidation';
import { StepNavigation, ProgressIndicator, MobileStepNavigation } from './StepNavigation';
import { FormGrid } from './FormField';

export function MultiStepForm<TFormData extends FieldValues = FieldValues>({
  steps,
  initialData = {},
  onSubmit,
  onSave,
  onCancel,

  // Auto-save settings
  autoSave = false,
  autoSaveInterval = 30000,
  autoSaveKey = 'multistep-form',

  // UI customization
  showProgress = true,
  showStepNumbers = true,
  allowStepNavigation = false,
  validateOnChange = false,
  validateOnBlur = true,

  // Navigation
  nextButtonText = 'Next',
  previousButtonText = 'Previous',
  submitButtonText = 'Submit',
  cancelButtonText = 'Cancel',
  saveButtonText = 'Save',

  // Layout
  className = '',
  stepClassName = '',
  fieldClassName = '',

  // Callbacks
  onStepChange,
  onFieldChange,
  onValidationError,

  // Loading states
  isSubmitting: externalIsSubmitting = false,
  isSaving: externalIsSaving = false,

  // Custom components
  stepperComponent,
  loadingComponent,
  errorComponent,
}: MultiStepFormProps<TFormData>) {
  const autoSaveConfig = autoSave ? {
    enabled: true,
    interval: autoSaveInterval,
    key: autoSaveKey,
    onSave: onSave || (async () => {}),
    onLoad: () => initialData,
  } : undefined;

  const {
    currentStep,
    totalSteps,
    formState,
    form,
    goToStep,
    nextStep,
    previousStep,
    canGoNext,
    canGoPrevious,
    validateCurrentStep,
    submitForm,
    saveProgress,
    loadSavedProgress,
    clearSavedProgress,
  } = useMultiStepForm({
    steps,
    initialData: initialData as Partial<TFormData>,
    autoSave: autoSaveConfig,
    validateOnChange,
    onStepChange,
  });

  const { watch } = form;
  const formData = watch();

  const currentStepConfig = steps[currentStep];
  const isSubmitting = externalIsSubmitting || formState.isSubmitting;
  const isSaving = externalIsSaving || formState.isSaving;

  // Handle field changes
  const handleFieldChange = useCallback((fieldName: string, value: any) => {
    onFieldChange?.(fieldName, value, formData);
  }, [onFieldChange, formData]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    try {
      const finalData = await submitForm();
      if (finalData) {
        await onSubmit(finalData);
      }
    } catch (error) {
      console.error('Form submission failed:', error);
    }
  }, [submitForm, onSubmit]);

  // Handle step navigation
  const handleNextStep = useCallback(async () => {
    const validation = await validateCurrentStep();
    if (!validation.isValid) {
      onValidationError?.(validation.errors, currentStep);
      return;
    }

    await nextStep();
  }, [validateCurrentStep, nextStep, onValidationError, currentStep]);

  // Handle step click navigation
  const handleStepClick = useCallback((stepIndex: number) => {
    if (allowStepNavigation) {
      goToStep(stepIndex);
    }
  }, [allowStepNavigation, goToStep]);

  // Handle save progress
  const handleSave = useCallback(async () => {
    try {
      await saveProgress();
      if (onSave) {
        await onSave(formData, currentStep);
      }
    } catch (error) {
      console.error('Save failed:', error);
    }
  }, [saveProgress, onSave, formData, currentStep]);

  if (!currentStepConfig) {
    return (
      <div className="flex items-center justify-center h-64">
        {errorComponent || (
          <div className="text-center">
            <p className="text-red-600">Invalid step configuration</p>
          </div>
        )}
      </div>
    );
  }

  // Skip current step if conditions are met
  const shouldSkipCurrentStep = shouldSkipStep(formData, currentStepConfig);
  if (shouldSkipCurrentStep && canGoNext) {
    nextStep();
    return null;
  }

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      {/* Progress indicator */}
      {showProgress && (
        <div className="mb-8">
          <div className="hidden md:block">
            {stepperComponent || (
              <StepNavigation
                currentStep={currentStep}
                totalSteps={totalSteps}
                completedSteps={formState.completedSteps}
                visitedSteps={formState.visitedSteps}
                steps={steps}
                onStepClick={handleStepClick}
                allowStepNavigation={allowStepNavigation}
                showStepNumbers={showStepNumbers}
              />
            )}
          </div>

          <div className="md:hidden">
            <MobileStepNavigation
              currentStep={currentStep}
              totalSteps={totalSteps}
              completedSteps={formState.completedSteps}
              steps={steps}
            />
          </div>
        </div>
      )}

      {/* Auto-save indicator */}
      {autoSave && (
        <div className="mb-4 flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-2">
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <ClockIcon className="h-4 w-4" />
                <span>Auto-save enabled</span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="text-blue-600 hover:text-blue-500 underline disabled:opacity-50"
          >
            Save now
          </button>
        </div>
      )}

      {/* Form content */}
      <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
        {/* Step header */}
        <div className={`text-center md:text-left ${stepClassName}`}>
          <h2 className="text-2xl font-bold text-gray-900">
            {currentStepConfig.title}
          </h2>
          {currentStepConfig.description && (
            <p className="mt-2 text-gray-600">
              {currentStepConfig.description}
            </p>
          )}
        </div>

        {/* Step fields */}
        <div className={fieldClassName}>
          {currentStepConfig.fields.length > 0 ? (
            <FormGrid
              fields={currentStepConfig.fields}
              form={form}
              formData={formData}
            />
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No fields in this step</p>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <div className="flex space-x-3">
            {canGoPrevious && (
              <button
                type="button"
                onClick={previousStep}
                disabled={isSubmitting || isSaving}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="h-4 w-4 mr-2" />
                {previousButtonText}
              </button>
            )}

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting || isSaving}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XMarkIcon className="h-4 w-4 mr-2" />
                {cancelButtonText}
              </button>
            )}
          </div>

          <div className="flex space-x-3">
            {onSave && !autoSave && (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitting || isSaving}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2" />
                ) : (
                  <ClockIcon className="h-4 w-4 mr-2" />
                )}
                {saveButtonText}
              </button>
            )}

            {currentStep < totalSteps - 1 ? (
              <button
                type="button"
                onClick={handleNextStep}
                disabled={!canGoNext || isSubmitting || isSaving}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {nextButtonText}
                <ChevronRightIcon className="h-4 w-4 ml-2" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!formState.isValid || isSubmitting || isSaving}
                className="flex items-center px-6 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    {loadingComponent || 'Submitting...'}
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-4 w-4 mr-2" />
                    {submitButtonText}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Debug info (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-100 rounded-lg text-xs">
          <details>
            <summary className="cursor-pointer font-semibold">Debug Info</summary>
            <pre className="mt-2 whitespace-pre-wrap">
              {JSON.stringify({
                currentStep,
                totalSteps,
                canGoNext,
                canGoPrevious,
                isValid: formState.isValid,
                completedSteps: Array.from(formState.completedSteps),
                visitedSteps: Array.from(formState.visitedSteps),
                errors: formState.errors,
              }, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
