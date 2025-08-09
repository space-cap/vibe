import React from 'react';
import { CheckIcon } from '@heroicons/react/24/solid';
import { StepNavigationProps } from '../../types/multiStepForm';

export function StepNavigation({
  currentStep,
  totalSteps,
  completedSteps,
  visitedSteps,
  steps,
  onStepClick,
  allowStepNavigation = false,
  showStepNumbers = true,
  className = '',
}: StepNavigationProps) {
  const handleStepClick = (stepIndex: number) => {
    if (!allowStepNavigation || !onStepClick) return;

    // Only allow navigation to visited steps or the next immediate step
    if (visitedSteps.has(stepIndex) || stepIndex === currentStep + 1) {
      onStepClick(stepIndex);
    }
  };

  const getStepStatus = (stepIndex: number) => {
    if (completedSteps.has(stepIndex)) return 'completed';
    if (stepIndex === currentStep) return 'current';
    if (visitedSteps.has(stepIndex)) return 'visited';
    return 'pending';
  };

  const isStepClickable = (stepIndex: number) => {
    if (!allowStepNavigation || !onStepClick) return false;
    return visitedSteps.has(stepIndex) || stepIndex === currentStep + 1;
  };

  return (
    <div className={`w-full ${className}`}>
      <nav aria-label="Progress" className="mb-8">
        <ol className="flex items-center justify-between">
          {steps.map((step, index) => {
            const status = getStepStatus(index);
            const isClickable = isStepClickable(index);

            return (
              <li key={step.id} className="relative flex-1">
                <div className="flex items-center">
                  {/* Step connector line (except for last step) */}
                  {index < totalSteps - 1 && (
                    <div
                      className={`absolute left-full top-1/2 h-0.5 w-full -translate-y-1/2 ${
                        completedSteps.has(index)
                          ? 'bg-blue-600'
                          : 'bg-gray-200'
                      }`}
                      style={{ zIndex: -1 }}
                    />
                  )}

                  {/* Step button */}
                  <button
                    type="button"
                    onClick={() => handleStepClick(index)}
                    disabled={!isClickable}
                    className={`group relative flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors ${
                      status === 'completed'
                        ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
                        : status === 'current'
                        ? 'border-blue-600 bg-white text-blue-600'
                        : status === 'visited'
                        ? 'border-gray-300 bg-white text-gray-500 hover:border-gray-400'
                        : 'border-gray-300 bg-white text-gray-400'
                    } ${
                      isClickable
                        ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                        : 'cursor-not-allowed'
                    }`}
                    aria-current={status === 'current' ? 'step' : undefined}
                    aria-label={`Step ${index + 1}: ${step.title}${
                      status === 'completed' ? ' (completed)' : ''
                    }${status === 'current' ? ' (current)' : ''}`}
                  >
                    {status === 'completed' ? (
                      <CheckIcon className="h-6 w-6" aria-hidden="true" />
                    ) : showStepNumbers ? (
                      <span>{index + 1}</span>
                    ) : (
                      step.icon || <span>{index + 1}</span>
                    )}
                  </button>
                </div>

                {/* Step label */}
                <div className="mt-3 text-center">
                  <div
                    className={`text-sm font-medium ${
                      status === 'current'
                        ? 'text-blue-600'
                        : status === 'completed'
                        ? 'text-green-600'
                        : 'text-gray-500'
                    }`}
                  >
                    {step.title}
                  </div>
                  {step.description && (
                    <div className="text-xs text-gray-400 mt-1">
                      {step.description}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}

export function ProgressIndicator({
  currentStep,
  totalSteps,
  completedSteps,
  className = '',
}: {
  currentStep: number;
  totalSteps: number;
  completedSteps: Set<number>;
  className?: string;
}) {
  const progress = ((completedSteps.size + (currentStep + 1)) / totalSteps) * 100;
  const completedProgress = (completedSteps.size / totalSteps) * 100;

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between text-sm text-gray-600 mb-2">
        <span>Step {currentStep + 1} of {totalSteps}</span>
        <span>{Math.round(completedProgress)}% Complete</span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className="flex h-full rounded-full overflow-hidden">
          {/* Completed progress */}
          <div
            className="bg-green-500 transition-all duration-300 ease-out"
            style={{ width: `${completedProgress}%` }}
          />
          {/* Current step progress */}
          <div
            className="bg-blue-500 transition-all duration-300 ease-out"
            style={{ width: `${Math.max(0, progress - completedProgress)}%` }}
          />
        </div>
      </div>

      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{completedSteps.size} completed</span>
        <span>{totalSteps - completedSteps.size - 1} remaining</span>
      </div>
    </div>
  );
}

export function CompactStepIndicator({
  currentStep,
  totalSteps,
  steps,
  className = '',
}: {
  currentStep: number;
  totalSteps: number;
  steps: { title: string }[];
  className?: string;
}) {
  return (
    <div className={`flex items-center space-x-2 text-sm text-gray-600 ${className}`}>
      <span className="font-medium">
        {currentStep + 1}/{totalSteps}:
      </span>
      <span className="text-gray-900 font-medium">
        {steps[currentStep]?.title}
      </span>
    </div>
  );
}

export function MobileStepNavigation({
  currentStep,
  totalSteps,
  completedSteps,
  steps,
  className = '',
}: {
  currentStep: number;
  totalSteps: number;
  completedSteps: Set<number>;
  steps: { title: string; description?: string }[];
  className?: string;
}) {
  const progress = ((completedSteps.size + 1) / totalSteps) * 100;

  return (
    <div className={`w-full ${className}`}>
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-1 mb-4">
        <div
          className="bg-blue-600 h-1 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step info */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="text-sm text-gray-500">
            Step {currentStep + 1} of {totalSteps}
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {steps[currentStep]?.title}
          </div>
          {steps[currentStep]?.description && (
            <div className="text-sm text-gray-600 mt-1">
              {steps[currentStep].description}
            </div>
          )}
        </div>

        <div className="ml-4">
          <div className="flex space-x-1">
            {Array.from({ length: totalSteps }, (_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full ${
                  completedSteps.has(index)
                    ? 'bg-green-500'
                    : index === currentStep
                    ? 'bg-blue-500'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
