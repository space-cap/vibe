import { ReactNode } from 'react';
import { FieldPath, FieldValues, UseFormReturn } from 'react-hook-form';
import { ZodSchema } from 'zod';

export interface FormStep<TFormData extends FieldValues = FieldValues> {
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  schema: ZodSchema<Partial<TFormData>>;
  fields: FormField<TFormData>[];
  isOptional?: boolean;
  shouldSkip?: (data: Partial<TFormData>) => boolean;
  onNext?: (data: Partial<TFormData>) => void | Promise<void>;
  onPrevious?: (data: Partial<TFormData>) => void | Promise<void>;
}

export interface FormField<TFormData extends FieldValues = FieldValues> {
  name: FieldPath<TFormData>;
  type: FieldType;
  label: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  options?: SelectOption[];
  validation?: FieldValidation;
  conditionalLogic?: ConditionalLogic<TFormData>;
  gridSpan?: 1 | 2 | 3 | 4 | 6 | 12;
  component?: ReactNode | ((props: FieldComponentProps<TFormData>) => ReactNode);
}

export type FieldType = 
  | 'text' 
  | 'email' 
  | 'password' 
  | 'number' 
  | 'tel' 
  | 'url' 
  | 'textarea' 
  | 'select' 
  | 'multiselect' 
  | 'checkbox' 
  | 'radio' 
  | 'date' 
  | 'time' 
  | 'datetime-local' 
  | 'file' 
  | 'range' 
  | 'color'
  | 'custom';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  description?: string;
}

export interface FieldValidation {
  required?: boolean | string;
  min?: number | string;
  max?: number | string;
  minLength?: number | string;
  maxLength?: number | string;
  pattern?: RegExp | string;
  custom?: (value: any) => boolean | string;
}

export interface ConditionalLogic<TFormData extends FieldValues = FieldValues> {
  showWhen?: (values: Partial<TFormData>) => boolean;
  hideWhen?: (values: Partial<TFormData>) => boolean;
  disableWhen?: (values: Partial<TFormData>) => boolean;
  requiredWhen?: (values: Partial<TFormData>) => boolean;
}

export interface FieldComponentProps<TFormData extends FieldValues = FieldValues> {
  field: FormField<TFormData>;
  form: UseFormReturn<TFormData>;
  value?: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
}

export interface MultiStepFormProps<TFormData extends FieldValues = FieldValues> {
  steps: FormStep<TFormData>[];
  initialData?: Partial<TFormData>;
  onSubmit: (data: TFormData) => void | Promise<void>;
  onSave?: (data: Partial<TFormData>, currentStep: number) => void | Promise<void>;
  onCancel?: () => void;
  
  // Auto-save settings
  autoSave?: boolean;
  autoSaveInterval?: number; // milliseconds
  autoSaveKey?: string;
  
  // UI customization
  showProgress?: boolean;
  showStepNumbers?: boolean;
  allowStepNavigation?: boolean;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  
  // Navigation
  nextButtonText?: string;
  previousButtonText?: string;
  submitButtonText?: string;
  cancelButtonText?: string;
  saveButtonText?: string;
  
  // Layout
  className?: string;
  stepClassName?: string;
  fieldClassName?: string;
  
  // Callbacks
  onStepChange?: (step: number, direction: 'next' | 'previous') => void;
  onFieldChange?: (fieldName: string, value: any, allValues: Partial<TFormData>) => void;
  onValidationError?: (errors: Record<string, string>, step: number) => void;
  
  // Loading states
  isSubmitting?: boolean;
  isSaving?: boolean;
  
  // Custom components
  stepperComponent?: ReactNode;
  loadingComponent?: ReactNode;
  errorComponent?: ReactNode;
}

export interface FormState<TFormData extends FieldValues = FieldValues> {
  currentStep: number;
  completedSteps: Set<number>;
  visitedSteps: Set<number>;
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
  isSaving: boolean;
  data: Partial<TFormData>;
  errors: Record<string, string>;
  touchedFields: Set<string>;
}

export interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  completedSteps: Set<number>;
  visitedSteps: Set<number>;
  steps: FormStep[];
  onStepClick?: (stepIndex: number) => void;
  allowStepNavigation?: boolean;
  showStepNumbers?: boolean;
  className?: string;
}

export interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  completedSteps: Set<number>;
  className?: string;
}

export interface AutoSaveConfig {
  enabled: boolean;
  interval: number;
  key: string;
  onSave: (data: any) => void | Promise<void>;
  onLoad: () => any;
  onError?: (error: Error) => void;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export type FormDirection = 'next' | 'previous';

export interface UseMultiStepFormProps<TFormData extends FieldValues = FieldValues> {
  steps: FormStep<TFormData>[];
  initialData?: Partial<TFormData>;
  autoSave?: AutoSaveConfig;
  validateOnChange?: boolean;
  onStepChange?: (step: number, direction: FormDirection) => void;
}

export interface UseMultiStepFormReturn<TFormData extends FieldValues = FieldValues> {
  // State
  currentStep: number;
  totalSteps: number;
  formState: FormState<TFormData>;
  form: UseFormReturn<TFormData>;
  
  // Navigation
  goToStep: (step: number) => void;
  nextStep: () => Promise<boolean>;
  previousStep: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  
  // Validation
  validateCurrentStep: () => Promise<ValidationResult>;
  validateAllSteps: () => Promise<ValidationResult>;
  
  // Data management
  updateFormData: (data: Partial<TFormData>) => void;
  getStepData: (stepIndex?: number) => Partial<TFormData>;
  resetForm: () => void;
  
  // Submission
  submitForm: () => Promise<void>;
  
  // Auto-save
  saveProgress: () => Promise<void>;
  loadSavedProgress: () => void;
  clearSavedProgress: () => void;
}