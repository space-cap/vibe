import type { Meta, StoryObj } from '@storybook/react';
import { z } from 'zod';
import { UserIcon, CreditCardIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { MultiStepForm } from './MultiStepForm';
import { FormStep } from '../../types/multiStepForm';

// Sample form data interfaces
interface UserRegistrationData {
  // Personal Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;

  // Account Details
  username: string;
  password: string;
  confirmPassword: string;
  accountType: 'personal' | 'business';

  // Business Information (conditional)
  companyName?: string;
  companySize?: string;
  industry?: string;

  // Preferences
  newsletter: boolean;
  notifications: string[];
  theme: 'light' | 'dark' | 'auto';

  // Payment (if business)
  paymentMethod?: 'credit' | 'debit' | 'bank';
  cardNumber?: string;
  expiryDate?: string;
  cvv?: string;
}

// Zod schemas for each step
const personalInfoSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  birthDate: z.string().min(1, 'Birth date is required'),
});

const accountDetailsSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  accountType: z.enum(['personal', 'business'], {
    required_error: 'Please select an account type',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const businessInfoSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').optional(),
  companySize: z.string().optional(),
  industry: z.string().optional(),
}).refine((data, ctx) => {
  // This would be validated based on accountType in the actual form
  return true;
});

const preferencesSchema = z.object({
  newsletter: z.boolean(),
  notifications: z.array(z.string()),
  theme: z.enum(['light', 'dark', 'auto']),
});

const paymentSchema = z.object({
  paymentMethod: z.enum(['credit', 'debit', 'bank']).optional(),
  cardNumber: z.string().min(16, 'Please enter a valid card number').optional(),
  expiryDate: z.string().optional(),
  cvv: z.string().min(3, 'Please enter a valid CVV').optional(),
});

// Form steps configuration
const registrationSteps: FormStep<UserRegistrationData>[] = [
  {
    id: 'personal-info',
    title: 'Personal Information',
    description: 'Tell us about yourself',
    icon: <UserIcon className="w-6 h-6" />,
    schema: personalInfoSchema,
    fields: [
      {
        name: 'firstName',
        type: 'text',
        label: 'First Name',
        placeholder: 'Enter your first name',
        required: true,
        gridSpan: 6,
      },
      {
        name: 'lastName',
        type: 'text',
        label: 'Last Name',
        placeholder: 'Enter your last name',
        required: true,
        gridSpan: 6,
      },
      {
        name: 'email',
        type: 'email',
        label: 'Email Address',
        placeholder: 'Enter your email address',
        required: true,
        gridSpan: 12,
      },
      {
        name: 'phone',
        type: 'tel',
        label: 'Phone Number',
        placeholder: '+1 (555) 123-4567',
        required: true,
        gridSpan: 6,
      },
      {
        name: 'birthDate',
        type: 'date',
        label: 'Date of Birth',
        required: true,
        gridSpan: 6,
      },
    ],
  },
  {
    id: 'account-details',
    title: 'Account Details',
    description: 'Set up your account credentials',
    schema: accountDetailsSchema,
    fields: [
      {
        name: 'username',
        type: 'text',
        label: 'Username',
        placeholder: 'Choose a username',
        required: true,
        description: 'This will be your unique identifier',
        gridSpan: 12,
      },
      {
        name: 'password',
        type: 'password',
        label: 'Password',
        placeholder: 'Enter a secure password',
        required: true,
        gridSpan: 6,
      },
      {
        name: 'confirmPassword',
        type: 'password',
        label: 'Confirm Password',
        placeholder: 'Confirm your password',
        required: true,
        gridSpan: 6,
      },
      {
        name: 'accountType',
        type: 'radio',
        label: 'Account Type',
        required: true,
        gridSpan: 12,
        options: [
          { value: 'personal', label: 'Personal', description: 'For individual use' },
          { value: 'business', label: 'Business', description: 'For business and teams' },
        ],
      },
    ],
  },
  {
    id: 'business-info',
    title: 'Business Information',
    description: 'Tell us about your business',
    schema: businessInfoSchema,
    shouldSkip: (data) => data.accountType !== 'business',
    fields: [
      {
        name: 'companyName',
        type: 'text',
        label: 'Company Name',
        placeholder: 'Enter your company name',
        required: true,
        gridSpan: 12,
        conditionalLogic: {
          showWhen: (data) => data.accountType === 'business',
        },
      },
      {
        name: 'companySize',
        type: 'select',
        label: 'Company Size',
        placeholder: 'Select company size',
        gridSpan: 6,
        options: [
          { value: '1-10', label: '1-10 employees' },
          { value: '11-50', label: '11-50 employees' },
          { value: '51-200', label: '51-200 employees' },
          { value: '201-1000', label: '201-1000 employees' },
          { value: '1000+', label: '1000+ employees' },
        ],
        conditionalLogic: {
          showWhen: (data) => data.accountType === 'business',
        },
      },
      {
        name: 'industry',
        type: 'select',
        label: 'Industry',
        placeholder: 'Select your industry',
        gridSpan: 6,
        options: [
          { value: 'technology', label: 'Technology' },
          { value: 'healthcare', label: 'Healthcare' },
          { value: 'finance', label: 'Finance' },
          { value: 'education', label: 'Education' },
          { value: 'retail', label: 'Retail' },
          { value: 'manufacturing', label: 'Manufacturing' },
          { value: 'other', label: 'Other' },
        ],
        conditionalLogic: {
          showWhen: (data) => data.accountType === 'business',
        },
      },
    ],
  },
  {
    id: 'preferences',
    title: 'Preferences',
    description: 'Customize your experience',
    schema: preferencesSchema,
    fields: [
      {
        name: 'theme',
        type: 'radio',
        label: 'Theme Preference',
        required: true,
        gridSpan: 12,
        options: [
          { value: 'light', label: 'Light', description: 'Clean and bright interface' },
          { value: 'dark', label: 'Dark', description: 'Easy on the eyes' },
          { value: 'auto', label: 'Auto', description: 'Match system preference' },
        ],
      },
      {
        name: 'newsletter',
        type: 'checkbox',
        label: 'Email Newsletter',
        gridSpan: 12,
        options: [
          { value: 'true', label: 'Subscribe to our newsletter and product updates' },
        ],
      },
      {
        name: 'notifications',
        type: 'checkbox',
        label: 'Notification Types',
        gridSpan: 12,
        options: [
          { value: 'email', label: 'Email notifications' },
          { value: 'sms', label: 'SMS notifications' },
          { value: 'push', label: 'Push notifications' },
          { value: 'marketing', label: 'Marketing communications' },
        ],
      },
    ],
  },
  {
    id: 'payment',
    title: 'Payment Information',
    description: 'Set up billing for business accounts',
    icon: <CreditCardIcon className="w-6 h-6" />,
    schema: paymentSchema,
    shouldSkip: (data) => data.accountType !== 'business',
    fields: [
      {
        name: 'paymentMethod',
        type: 'radio',
        label: 'Payment Method',
        required: true,
        gridSpan: 12,
        options: [
          { value: 'credit', label: 'Credit Card' },
          { value: 'debit', label: 'Debit Card' },
          { value: 'bank', label: 'Bank Transfer' },
        ],
        conditionalLogic: {
          showWhen: (data) => data.accountType === 'business',
        },
      },
      {
        name: 'cardNumber',
        type: 'text',
        label: 'Card Number',
        placeholder: '1234 5678 9012 3456',
        required: true,
        gridSpan: 12,
        conditionalLogic: {
          showWhen: (data) =>
            data.accountType === 'business' &&
            (data.paymentMethod === 'credit' || data.paymentMethod === 'debit'),
        },
      },
      {
        name: 'expiryDate',
        type: 'text',
        label: 'Expiry Date',
        placeholder: 'MM/YY',
        required: true,
        gridSpan: 6,
        conditionalLogic: {
          showWhen: (data) =>
            data.accountType === 'business' &&
            (data.paymentMethod === 'credit' || data.paymentMethod === 'debit'),
        },
      },
      {
        name: 'cvv',
        type: 'text',
        label: 'CVV',
        placeholder: '123',
        required: true,
        gridSpan: 6,
        conditionalLogic: {
          showWhen: (data) =>
            data.accountType === 'business' &&
            (data.paymentMethod === 'credit' || data.paymentMethod === 'debit'),
        },
      },
    ],
  },
  {
    id: 'review',
    title: 'Review & Submit',
    description: 'Review your information before submitting',
    icon: <CheckCircleIcon className="w-6 h-6" />,
    schema: z.object({}),
    fields: [],
  },
];

const meta: Meta<typeof MultiStepForm> = {
  title: 'Components/MultiStepForm',
  component: MultiStepForm,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    steps: { control: { disable: true } },
    onSubmit: { action: 'submitted' },
    onSave: { action: 'saved' },
    onCancel: { action: 'cancelled' },
    onStepChange: { action: 'step changed' },
    onFieldChange: { action: 'field changed' },
    onValidationError: { action: 'validation error' },
  },
};

export default meta;

type Story = StoryObj<typeof MultiStepForm>;

export const Default: Story = {
  args: {
    steps: registrationSteps,
    onSubmit: async (data) => {
      console.log('Form submitted:', data);
      await new Promise(resolve => setTimeout(resolve, 2000));
    },
  },
};

export const WithInitialData: Story = {
  args: {
    steps: registrationSteps,
    initialData: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      accountType: 'business',
    },
    onSubmit: async (data) => {
      console.log('Form submitted:', data);
      await new Promise(resolve => setTimeout(resolve, 1000));
    },
  },
};

export const WithAutoSave: Story = {
  args: {
    steps: registrationSteps,
    autoSave: true,
    autoSaveInterval: 5000,
    autoSaveKey: 'registration-form',
    onSubmit: async (data) => {
      console.log('Form submitted:', data);
    },
    onSave: async (data, step) => {
      console.log('Auto-saved:', { data, step });
      await new Promise(resolve => setTimeout(resolve, 500));
    },
  },
};

export const WithStepNavigation: Story = {
  args: {
    steps: registrationSteps,
    allowStepNavigation: true,
    showProgress: true,
    showStepNumbers: true,
    onSubmit: async (data) => {
      console.log('Form submitted:', data);
    },
  },
};

export const SimpleForm: Story = {
  args: {
    steps: [
      {
        id: 'contact',
        title: 'Contact Information',
        description: 'How can we reach you?',
        schema: z.object({
          name: z.string().min(1, 'Name is required'),
          email: z.string().email('Please enter a valid email'),
          message: z.string().min(10, 'Message must be at least 10 characters'),
        }),
        fields: [
          {
            name: 'name',
            type: 'text',
            label: 'Full Name',
            placeholder: 'Enter your full name',
            required: true,
            gridSpan: 12,
          },
          {
            name: 'email',
            type: 'email',
            label: 'Email Address',
            placeholder: 'Enter your email',
            required: true,
            gridSpan: 12,
          },
          {
            name: 'message',
            type: 'textarea',
            label: 'Message',
            placeholder: 'Tell us how we can help...',
            required: true,
            gridSpan: 12,
          },
        ],
      },
      {
        id: 'preferences',
        title: 'Contact Preferences',
        description: 'How would you like us to respond?',
        schema: z.object({
          contactMethod: z.enum(['email', 'phone']),
          urgency: z.enum(['low', 'medium', 'high']),
        }),
        fields: [
          {
            name: 'contactMethod',
            type: 'radio',
            label: 'Preferred Contact Method',
            required: true,
            gridSpan: 12,
            options: [
              { value: 'email', label: 'Email' },
              { value: 'phone', label: 'Phone' },
            ],
          },
          {
            name: 'urgency',
            type: 'select',
            label: 'Urgency Level',
            required: true,
            gridSpan: 12,
            options: [
              { value: 'low', label: 'Low - General inquiry' },
              { value: 'medium', label: 'Medium - Need response within 24 hours' },
              { value: 'high', label: 'High - Urgent matter' },
            ],
          },
        ],
      },
    ],
    onSubmit: async (data) => {
      console.log('Contact form submitted:', data);
    },
  },
};

export const ConditionalFields: Story = {
  args: {
    steps: [
      {
        id: 'survey',
        title: 'Product Survey',
        description: 'Help us understand your needs',
        schema: z.object({
          hasProduct: z.boolean(),
          currentProduct: z.string().optional(),
          satisfaction: z.number().optional(),
          improvements: z.string().optional(),
        }),
        fields: [
          {
            name: 'hasProduct',
            type: 'checkbox',
            label: 'Current User',
            gridSpan: 12,
            options: [
              { value: 'true', label: 'I currently use this product' },
            ],
          },
          {
            name: 'currentProduct',
            type: 'select',
            label: 'Which product do you use?',
            required: true,
            gridSpan: 12,
            options: [
              { value: 'basic', label: 'Basic Plan' },
              { value: 'pro', label: 'Pro Plan' },
              { value: 'enterprise', label: 'Enterprise Plan' },
            ],
            conditionalLogic: {
              showWhen: (data) => data.hasProduct === true,
              requiredWhen: (data) => data.hasProduct === true,
            },
          },
          {
            name: 'satisfaction',
            type: 'range',
            label: 'How satisfied are you? (1-10)',
            gridSpan: 12,
            conditionalLogic: {
              showWhen: (data) => data.hasProduct === true,
            },
          },
          {
            name: 'improvements',
            type: 'textarea',
            label: 'What improvements would you like to see?',
            placeholder: 'Share your suggestions...',
            gridSpan: 12,
            conditionalLogic: {
              showWhen: (data) => data.hasProduct === true,
            },
          },
        ],
      },
    ],
    validateOnChange: true,
    onSubmit: async (data) => {
      console.log('Survey submitted:', data);
    },
  },
};

export const LoadingStates: Story = {
  args: {
    steps: registrationSteps.slice(0, 2),
    isSubmitting: true,
    onSubmit: async (data) => {
      console.log('Form submitted:', data);
    },
  },
};

export const WithCustomButtons: Story = {
  args: {
    steps: registrationSteps.slice(0, 3),
    nextButtonText: 'Continue →',
    previousButtonText: '← Go Back',
    submitButtonText: 'Create Account',
    cancelButtonText: 'Cancel Setup',
    saveButtonText: 'Save Progress',
    onSubmit: async (data) => {
      console.log('Form submitted:', data);
    },
    onCancel: () => {
      console.log('Form cancelled');
    },
    onSave: async (data, step) => {
      console.log('Progress saved:', { data, step });
    },
  },
};
