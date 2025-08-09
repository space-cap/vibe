import type { Meta, StoryObj } from '@storybook/react';
import UserProfile from './UserProfile';
import type { User } from '../../types';

const meta = {
  title: 'Components/UserProfile',
  component: UserProfile,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A user profile component that displays user information and supports edit mode.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    user: {
      description: 'User data to display',
      control: { type: 'object' },
    },
    onSave: {
      description: 'Callback function called when user saves changes',
    },
    onCancel: {
      description: 'Callback function called when user cancels editing',
    },
    isEditable: {
      description: 'Whether the profile can be edited',
      control: { type: 'boolean' },
    },
    className: {
      description: 'Additional CSS classes',
      control: { type: 'text' },
    },
  },
} satisfies Meta<typeof UserProfile>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleUser: User = {
  id: '1',
  name: 'John Doe',
  email: 'john.doe@example.com',
  bio: 'Frontend developer passionate about React and TypeScript. Love creating beautiful user interfaces.',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
};

const sampleUserWithoutAvatar: User = {
  id: '2',
  name: 'Jane Smith',
  email: 'jane.smith@example.com',
  bio: 'UX designer with 5+ years of experience in creating user-centered designs.',
};

const sampleUserMinimal: User = {
  id: '3',
  name: 'Bob Johnson',
  email: 'bob@example.com',
};

export const Default: Story = {
  args: {
    user: sampleUser,
    onSave: (user) => console.log('Save:', user),
    onCancel: () => console.log('Cancel'),
    isEditable: true,
  },
};

export const WithoutAvatar: Story = {
  args: {
    user: sampleUserWithoutAvatar,
    onSave: (user) => console.log('Save:', user),
    onCancel: () => console.log('Cancel'),
    isEditable: true,
  },
};

export const MinimalProfile: Story = {
  args: {
    user: sampleUserMinimal,
    onSave: (user) => console.log('Save:', user),
    onCancel: () => console.log('Cancel'),
    isEditable: true,
  },
};

export const ReadOnly: Story = {
  args: {
    user: sampleUser,
    onSave: (user) => console.log('Save:', user),
    onCancel: () => console.log('Cancel'),
    isEditable: false,
  },
};

export const LongBio: Story = {
  args: {
    user: {
      ...sampleUser,
      bio: 'I am a passionate frontend developer with over 8 years of experience in building modern web applications. I specialize in React, TypeScript, and modern CSS frameworks. When not coding, I enjoy hiking, photography, and contributing to open source projects. I believe in writing clean, maintainable code and creating exceptional user experiences.',
    },
    onSave: (user) => console.log('Save:', user),
    onCancel: () => console.log('Cancel'),
    isEditable: true,
  },
};

export const CustomStyling: Story = {
  args: {
    user: sampleUser,
    onSave: (user) => console.log('Save:', user),
    onCancel: () => console.log('Cancel'),
    isEditable: true,
    className: 'border-2 border-blue-200 bg-blue-50',
  },
};