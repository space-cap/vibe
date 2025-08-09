import { useState } from 'react';
import type { User } from '../../types';
import Avatar from './Avatar';
import Button from './Button';
import Input from './Input';
import Textarea from './Textarea';
import { cn } from '../../utils';

interface UserProfileProps {
  user: User;
  onSave?: (updatedUser: User) => void;
  onCancel?: () => void;
  isEditable?: boolean;
  className?: string;
}

const UserProfile = ({
  user,
  onSave,
  onCancel,
  isEditable = true,
  className
}: UserProfileProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<User>(user);
  const [errors, setErrors] = useState<Partial<Record<keyof User, string>>>({});

  const handleEdit = () => {
    setIsEditing(true);
    setEditedUser(user);
    setErrors({});
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedUser(user);
    setErrors({});
    onCancel?.();
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof User, string>> = {};

    if (!editedUser.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!editedUser.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editedUser.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    setIsEditing(false);
    onSave?.(editedUser);
  };

  const handleInputChange = (field: keyof User, value: string) => {
    setEditedUser(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  };

  return (
    <div className={cn('bg-white rounded-lg shadow-md p-6', className)}>
      <div className="flex flex-col items-center space-y-4">
        {/* Avatar */}
        <Avatar
          src={isEditing ? editedUser.avatar : user.avatar}
          fallback={getInitials(isEditing ? editedUser.name : user.name)}
          size="xl"
          alt={`${isEditing ? editedUser.name : user.name}'s avatar`}
        />

        {isEditing ? (
          <>
            {/* Edit Mode */}
            <div className="w-full max-w-md space-y-4">
              <Input
                label="Profile Image URL"
                value={editedUser.avatar || ''}
                onChange={(e) => handleInputChange('avatar', e.target.value)}
                placeholder="https://example.com/avatar.jpg"
              />

              <Input
                label="Name"
                value={editedUser.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                error={errors.name}
                required
              />

              <Input
                label="Email"
                type="email"
                value={editedUser.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                error={errors.email}
                required
              />

              <Textarea
                label="Bio"
                value={editedUser.bio || ''}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Tell us about yourself..."
                rows={3}
              />

              <div className="flex space-x-3 pt-2">
                <Button
                  onClick={handleSave}
                  variant="primary"
                  className="flex-1"
                >
                  Save Changes
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* View Mode */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-gray-800">{user.name}</h2>
              <p className="text-gray-600">{user.email}</p>
              {user.bio && (
                <p className="text-gray-700 mt-3 max-w-md">{user.bio}</p>
              )}
            </div>

            {isEditable && (
              <Button
                onClick={handleEdit}
                variant="outline"
                className="mt-4"
              >
                Edit Profile
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
