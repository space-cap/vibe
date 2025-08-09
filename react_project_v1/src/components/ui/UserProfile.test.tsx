import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import UserProfile from './UserProfile';
import type { User } from '../../types';

const mockUser: User = {
  id: '1',
  name: 'John Doe',
  email: 'john.doe@example.com',
  bio: 'Frontend developer',
  avatar: 'https://example.com/avatar.jpg',
};

const mockUserMinimal: User = {
  id: '2',
  name: 'Jane Smith',
  email: 'jane@example.com',
};

describe('UserProfile', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('View Mode', () => {
    it('renders user information correctly', () => {
      render(<UserProfile user={mockUser} onSave={mockOnSave} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
      expect(screen.getByText('Frontend developer')).toBeInTheDocument();
      expect(screen.getByAltText("John Doe's avatar")).toBeInTheDocument();
    });

    it('renders user without bio correctly', () => {
      render(<UserProfile user={mockUserMinimal} onSave={mockOnSave} />);

      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      expect(screen.queryByText('Frontend developer')).not.toBeInTheDocument();
    });

    it('shows Edit Profile button when editable', () => {
      render(<UserProfile user={mockUser} onSave={mockOnSave} isEditable={true} />);

      expect(screen.getByText('Edit Profile')).toBeInTheDocument();
    });

    it('hides Edit Profile button when not editable', () => {
      render(<UserProfile user={mockUser} onSave={mockOnSave} isEditable={false} />);

      expect(screen.queryByText('Edit Profile')).not.toBeInTheDocument();
    });

    it('displays user initials when no avatar is provided', () => {
      render(<UserProfile user={mockUserMinimal} onSave={mockOnSave} />);

      expect(screen.getByText('JS')).toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    it('enters edit mode when Edit Profile is clicked', async () => {
      const user = userEvent.setup();
      render(<UserProfile user={mockUser} onSave={mockOnSave} />);

      await user.click(screen.getByText('Edit Profile'));

      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('john.doe@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Frontend developer')).toBeInTheDocument();
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('updates form fields correctly', async () => {
      const user = userEvent.setup();
      render(<UserProfile user={mockUser} onSave={mockOnSave} />);

      await user.click(screen.getByText('Edit Profile'));

      const nameInput = screen.getByDisplayValue('John Doe');
      await user.clear(nameInput);
      await user.type(nameInput, 'John Updated');

      expect(screen.getByDisplayValue('John Updated')).toBeInTheDocument();
    });

    it('validates required fields', async () => {
      const user = userEvent.setup();
      render(<UserProfile user={mockUser} onSave={mockOnSave} />);

      await user.click(screen.getByText('Edit Profile'));

      const nameInput = screen.getByDisplayValue('John Doe');
      await user.clear(nameInput);
      
      await user.click(screen.getByText('Save Changes'));

      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('validates email format', async () => {
      const user = userEvent.setup();
      render(<UserProfile user={mockUser} onSave={mockOnSave} />);

      await user.click(screen.getByText('Edit Profile'));

      const emailInput = screen.getByDisplayValue('john.doe@example.com');
      await user.clear(emailInput);
      await user.type(emailInput, 'invalid-email');
      
      await user.click(screen.getByText('Save Changes'));

      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('calls onSave with updated user data on valid save', async () => {
      const user = userEvent.setup();
      render(<UserProfile user={mockUser} onSave={mockOnSave} />);

      await user.click(screen.getByText('Edit Profile'));

      const nameInput = screen.getByDisplayValue('John Doe');
      await user.clear(nameInput);
      await user.type(nameInput, 'John Updated');

      const bioTextarea = screen.getByDisplayValue('Frontend developer');
      await user.clear(bioTextarea);
      await user.type(bioTextarea, 'Senior Frontend developer');

      await user.click(screen.getByText('Save Changes'));

      expect(mockOnSave).toHaveBeenCalledWith({
        ...mockUser,
        name: 'John Updated',
        bio: 'Senior Frontend developer',
      });
    });

    it('cancels edit mode and resets form', async () => {
      const user = userEvent.setup();
      render(<UserProfile user={mockUser} onSave={mockOnSave} onCancel={mockOnCancel} />);

      await user.click(screen.getByText('Edit Profile'));

      const nameInput = screen.getByDisplayValue('John Doe');
      await user.clear(nameInput);
      await user.type(nameInput, 'John Updated');

      await user.click(screen.getByText('Cancel'));

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('John Updated')).not.toBeInTheDocument();
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('clears validation errors when user starts typing', async () => {
      const user = userEvent.setup();
      render(<UserProfile user={mockUser} onSave={mockOnSave} />);

      await user.click(screen.getByText('Edit Profile'));

      // Clear name to trigger validation error
      const nameInput = screen.getByDisplayValue('John Doe');
      await user.clear(nameInput);
      await user.click(screen.getByText('Save Changes'));

      expect(screen.getByText('Name is required')).toBeInTheDocument();

      // Start typing to clear error
      await user.type(nameInput, 'J');

      expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper labels for form inputs in edit mode', async () => {
      const user = userEvent.setup();
      render(<UserProfile user={mockUser} onSave={mockOnSave} />);

      await user.click(screen.getByText('Edit Profile'));

      expect(screen.getByLabelText('Profile Image URL')).toBeInTheDocument();
      expect(screen.getByLabelText('Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Bio')).toBeInTheDocument();
    });

    it('has proper alt text for avatar image', () => {
      render(<UserProfile user={mockUser} onSave={mockOnSave} />);

      expect(screen.getByAltText("John Doe's avatar")).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <UserProfile user={mockUser} onSave={mockOnSave} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});