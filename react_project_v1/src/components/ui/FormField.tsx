import React from 'react';
import { UseFormReturn, FieldValues, Controller } from 'react-hook-form';
import { ExclamationCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { FormField as FormFieldType, FieldComponentProps } from '../../types/multiStepForm';
import { isFieldDisabled, isFieldRequired, filterVisibleFields } from '../../utils/formValidation';

interface FormFieldRendererProps<TFormData extends FieldValues = FieldValues> {
  field: FormFieldType<TFormData>;
  form: UseFormReturn<TFormData>;
  formData: Partial<TFormData>;
  className?: string;
}

export function FormFieldRenderer<TFormData extends FieldValues = FieldValues>({
  field,
  form,
  formData,
  className = '',
}: FormFieldRendererProps<TFormData>) {
  const { control, formState: { errors } } = form;
  const error = errors[field.name]?.message as string;
  const disabled = isFieldDisabled(field, formData) || field.disabled;
  const required = isFieldRequired(field, formData);

  const fieldId = `field-${String(field.name)}`;
  const errorId = `${fieldId}-error`;
  const descriptionId = `${fieldId}-description`;

  if (field.component) {
    return (
      <Controller
        name={field.name}
        control={control}
        render={({ field: controllerField, fieldState }) => {
          const componentProps: FieldComponentProps<TFormData> = {
            field,
            form,
            value: controllerField.value,
            onChange: controllerField.onChange,
            error: fieldState.error?.message,
            disabled,
          };

          return (
            <div className={`form-field ${className}`}>
              {typeof field.component === 'function'
                ? field.component(componentProps)
                : field.component
              }
            </div>
          );
        }}
      />
    );
  }

  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: controllerField }) => (
        <div className={`form-field ${className}`} style={{ gridColumn: `span ${field.gridSpan || 1}` }}>
          <label
            htmlFor={fieldId}
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {field.label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>

          <div className="relative">
            <FormInput
              id={fieldId}
              field={field}
              value={controllerField.value}
              onChange={controllerField.onChange}
              onBlur={controllerField.onBlur}
              disabled={disabled}
              error={!!error}
              aria-invalid={!!error}
              aria-describedby={`${field.description ? descriptionId : ''} ${error ? errorId : ''}`}
            />
          </div>

          {field.description && (
            <div id={descriptionId} className="mt-1 flex items-start space-x-1">
              <InformationCircleIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600">{field.description}</p>
            </div>
          )}

          {error && (
            <div id={errorId} className="mt-1 flex items-start space-x-1">
              <ExclamationCircleIcon className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>
      )}
    />
  );
}

interface FormInputProps {
  id: string;
  field: FormFieldType;
  value: any;
  onChange: (value: any) => void;
  onBlur: () => void;
  disabled?: boolean;
  error?: boolean;
  [key: string]: any;
}

function FormInput({
  id,
  field,
  value,
  onChange,
  onBlur,
  disabled = false,
  error = false,
  ...props
}: FormInputProps) {
  const baseClasses = `block w-full rounded-md shadow-sm transition-colors focus:ring-2 focus:ring-offset-2 ${
    error
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
  } ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'}`;

  switch (field.type) {
    case 'textarea':
      return (
        <textarea
          id={id}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={field.placeholder}
          disabled={disabled}
          rows={4}
          className={baseClasses}
          {...props}
        />
      );

    case 'select':
      return (
        <select
          id={id}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          className={baseClasses}
          {...props}
        >
          <option value="">{field.placeholder || 'Select an option'}</option>
          {field.options?.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
      );

    case 'multiselect':
      return (
        <select
          id={id}
          value={Array.isArray(value) ? value : []}
          onChange={(e) => {
            const selectedValues = Array.from(e.target.selectedOptions, option => option.value);
            onChange(selectedValues);
          }}
          onBlur={onBlur}
          disabled={disabled}
          multiple
          className={baseClasses}
          {...props}
        >
          {field.options?.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
      );

    case 'radio':
      return (
        <div className="space-y-2">
          {field.options?.map((option) => (
            <label key={option.value} className="flex items-center">
              <input
                type="radio"
                name={String(field.name)}
                value={option.value}
                checked={value === option.value}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                disabled={disabled || option.disabled}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">{option.label}</span>
              {option.description && (
                <span className="ml-1 text-xs text-gray-500">({option.description})</span>
              )}
            </label>
          ))}
        </div>
      );

    case 'checkbox':
      if (field.options && field.options.length > 1) {
        // Multiple checkboxes
        const checkedValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {field.options.map((option) => (
              <label key={option.value} className="flex items-center">
                <input
                  type="checkbox"
                  value={option.value}
                  checked={checkedValues.includes(option.value)}
                  onChange={(e) => {
                    const newValues = e.target.checked
                      ? [...checkedValues, option.value]
                      : checkedValues.filter(v => v !== option.value);
                    onChange(newValues);
                  }}
                  onBlur={onBlur}
                  disabled={disabled || option.disabled}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        );
      } else {
        // Single checkbox
        return (
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => onChange(e.target.checked)}
              onBlur={onBlur}
              disabled={disabled}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">
              {field.options?.[0]?.label || field.label}
            </span>
          </label>
        );
      }

    case 'file':
      return (
        <input
          id={id}
          type="file"
          onChange={(e) => onChange(e.target.files)}
          onBlur={onBlur}
          disabled={disabled}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          {...props}
        />
      );

    case 'range':
      return (
        <div className="flex items-center space-x-4">
          <input
            id={id}
            type="range"
            value={value || 0}
            onChange={(e) => onChange(Number(e.target.value))}
            onBlur={onBlur}
            disabled={disabled}
            className="flex-1"
            {...props}
          />
          <span className="text-sm text-gray-600 min-w-[3rem]">{value || 0}</span>
        </div>
      );

    case 'color':
      return (
        <div className="flex items-center space-x-2">
          <input
            id={id}
            type="color"
            value={value || '#000000'}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            disabled={disabled}
            className="h-10 w-20 rounded border border-gray-300"
            {...props}
          />
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#000000"
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      );

    case 'number':
      return (
        <input
          id={id}
          type="number"
          value={value || ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
          onBlur={onBlur}
          placeholder={field.placeholder}
          disabled={disabled}
          className={baseClasses}
          {...props}
        />
      );

    default:
      return (
        <input
          id={id}
          type={field.type}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={field.placeholder}
          disabled={disabled}
          className={baseClasses}
          {...props}
        />
      );
  }
}

interface FormGridProps<TFormData extends FieldValues = FieldValues> {
  fields: FormFieldType<TFormData>[];
  form: UseFormReturn<TFormData>;
  formData: Partial<TFormData>;
  className?: string;
}

export function FormGrid<TFormData extends FieldValues = FieldValues>({
  fields,
  form,
  formData,
  className = '',
}: FormGridProps<TFormData>) {
  const visibleFields = filterVisibleFields(fields, formData);

  return (
    <div className={`grid grid-cols-12 gap-4 ${className}`}>
      {visibleFields.map((field) => (
        <FormFieldRenderer
          key={String(field.name)}
          field={field}
          form={form}
          formData={formData}
        />
      ))}
    </div>
  );
}

export function FieldError({ error, className = '' }: { error?: string; className?: string }) {
  if (!error) return null;

  return (
    <div className={`mt-1 flex items-start space-x-1 ${className}`}>
      <ExclamationCircleIcon className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
      <p className="text-sm text-red-600">{error}</p>
    </div>
  );
}

export function FieldDescription({ description, className = '' }: { description?: string; className?: string }) {
  if (!description) return null;

  return (
    <div className={`mt-1 flex items-start space-x-1 ${className}`}>
      <InformationCircleIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}
