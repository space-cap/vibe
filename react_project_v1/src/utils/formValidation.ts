import { FieldValues } from 'react-hook-form';
import { ZodError, ZodSchema } from 'zod';
import { FormStep, ValidationResult } from '../types/multiStepForm';

export function validateStepData<TFormData extends FieldValues>(
  data: Partial<TFormData>,
  schema: ZodSchema<Partial<TFormData>>
): ValidationResult {
  try {
    schema.parse(data);
    return { isValid: true, errors: {} };
  } catch (error) {
    if (error instanceof ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { isValid: false, errors };
    }
    return { 
      isValid: false, 
      errors: { _form: 'Validation failed' } 
    };
  }
}

export function validateAllSteps<TFormData extends FieldValues>(
  data: Partial<TFormData>,
  steps: FormStep<TFormData>[]
): ValidationResult {
  const allErrors: Record<string, string> = {};
  let isValid = true;

  for (const step of steps) {
    const stepResult = validateStepData(data, step.schema);
    if (!stepResult.isValid) {
      isValid = false;
      Object.assign(allErrors, stepResult.errors);
    }
  }

  return { isValid, errors: allErrors };
}

export function getStepValidationErrors<TFormData extends FieldValues>(
  data: Partial<TFormData>,
  step: FormStep<TFormData>
): Record<string, string> {
  const result = validateStepData(data, step.schema);
  return result.errors;
}

export function isStepValid<TFormData extends FieldValues>(
  data: Partial<TFormData>,
  step: FormStep<TFormData>
): boolean {
  const result = validateStepData(data, step.schema);
  return result.isValid;
}

export function getRequiredFieldsForStep<TFormData extends FieldValues>(
  step: FormStep<TFormData>
): string[] {
  const requiredFields: string[] = [];
  
  step.fields.forEach(field => {
    if (field.required || field.validation?.required) {
      requiredFields.push(field.name);
    }
  });
  
  return requiredFields;
}

export function shouldSkipStep<TFormData extends FieldValues>(
  data: Partial<TFormData>,
  step: FormStep<TFormData>
): boolean {
  if (step.shouldSkip) {
    return step.shouldSkip(data);
  }
  return false;
}

export function filterVisibleFields<TFormData extends FieldValues>(
  fields: FormStep<TFormData>['fields'],
  formData: Partial<TFormData>
) {
  return fields.filter(field => {
    if (!field.conditionalLogic) return true;
    
    const { showWhen, hideWhen } = field.conditionalLogic;
    
    if (hideWhen && hideWhen(formData)) return false;
    if (showWhen && !showWhen(formData)) return false;
    
    return true;
  });
}

export function isFieldDisabled<TFormData extends FieldValues>(
  field: FormStep<TFormData>['fields'][0],
  formData: Partial<TFormData>
): boolean {
  if (field.disabled) return true;
  
  if (field.conditionalLogic?.disableWhen) {
    return field.conditionalLogic.disableWhen(formData);
  }
  
  return false;
}

export function isFieldRequired<TFormData extends FieldValues>(
  field: FormStep<TFormData>['fields'][0],
  formData: Partial<TFormData>
): boolean {
  if (field.required) return true;
  
  if (field.conditionalLogic?.requiredWhen) {
    return field.conditionalLogic.requiredWhen(formData);
  }
  
  return false;
}

export function formatValidationError(error: string, fieldLabel: string): string {
  const commonErrors: Record<string, string> = {
    'Required': `${fieldLabel} is required`,
    'String must contain at least 1 character(s)': `${fieldLabel} is required`,
    'Invalid email': `Please enter a valid email address`,
    'Invalid url': `Please enter a valid URL`,
    'Expected number, received string': `${fieldLabel} must be a number`,
    'Number must be greater than 0': `${fieldLabel} must be greater than 0`,
    'Number must be less than': `${fieldLabel} is too large`,
    'String must contain at least': `${fieldLabel} is too short`,
    'String must contain at most': `${fieldLabel} is too long`,
  };
  
  for (const [key, value] of Object.entries(commonErrors)) {
    if (error.includes(key)) {
      return value;
    }
  }
  
  return error;
}

export function createDynamicSchema<TFormData extends FieldValues>(
  step: FormStep<TFormData>,
  formData: Partial<TFormData>
): ZodSchema<Partial<TFormData>> {
  const visibleFields = filterVisibleFields(step.fields, formData);
  const schemaKeys = visibleFields.reduce((acc, field) => {
    if (isFieldRequired(field, formData)) {
      acc[field.name] = true;
    }
    return acc;
  }, {} as Record<string, boolean>);
  
  return step.schema;
}

export function getFieldError(
  errors: Record<string, string>,
  fieldName: string
): string | undefined {
  return errors[fieldName];
}

export function hasFieldError(
  errors: Record<string, string>,
  fieldName: string
): boolean {
  return Boolean(errors[fieldName]);
}

export function getFormProgress<TFormData extends FieldValues>(
  steps: FormStep<TFormData>[],
  data: Partial<TFormData>
): { completed: number; total: number; percentage: number } {
  const total = steps.length;
  const completed = steps.filter(step => isStepValid(data, step)).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  return { completed, total, percentage };
}