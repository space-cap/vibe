import type { ImgHTMLAttributes } from 'react';
import { cn } from '../../utils';

interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
}

const Avatar = ({ size = 'md', fallback, className, alt, ...props }: AvatarProps) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-xl',
  };

  if (props.src) {
    return (
      <img
        className={cn(
          'rounded-full object-cover border-2 border-gray-200',
          sizes[size],
          className
        )}
        alt={alt || 'Avatar'}
        {...props}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full bg-gray-300 flex items-center justify-center border-2 border-gray-200',
        sizes[size],
        textSizes[size],
        className
      )}
    >
      <span className="font-medium text-gray-600">
        {fallback || '?'}
      </span>
    </div>
  );
};

export default Avatar;