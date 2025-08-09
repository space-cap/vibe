import { useState } from 'react';
import UserProfile from '../../components/ui/UserProfile';
import type { User } from '../../types';

const ProfilePage = () => {
  const [user, setUser] = useState<User>({
    id: '1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    bio: 'Frontend developer passionate about React and TypeScript. Love creating beautiful user interfaces and solving complex problems.',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
  });

  const handleSave = (updatedUser: User) => {
    setUser(updatedUser);
    // Here you would typically save to your backend
    console.log('User updated:', updatedUser);
  };

  const handleCancel = () => {
    console.log('Edit cancelled');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
        User Profile
      </h1>
      <UserProfile
        user={user}
        onSave={handleSave}
        onCancel={handleCancel}
        isEditable={true}
      />
    </div>
  );
};

export default ProfilePage;
