import { render, screen } from '@testing-library/react';
import Avatar from './Avatar';

describe('Avatar', () => {
  describe('With Image Source', () => {
    it('renders image when src is provided', () => {
      render(
        <Avatar 
          src="https://example.com/avatar.jpg" 
          alt="User Avatar"
        />
      );

      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
      expect(img).toHaveAttribute('alt', 'User Avatar');
    });

    it('applies correct size classes for image', () => {
      render(
        <Avatar 
          src="https://example.com/avatar.jpg" 
          size="lg"
        />
      );

      const img = screen.getByRole('img');
      expect(img).toHaveClass('w-16', 'h-16');
    });

    it('uses default alt text when not provided', () => {
      render(<Avatar src="https://example.com/avatar.jpg" />);

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt', 'Avatar');
    });
  });

  describe('Without Image Source (Fallback)', () => {
    it('renders fallback when no src is provided', () => {
      render(<Avatar fallback="JD" />);

      expect(screen.getByText('JD')).toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('renders default fallback when no src or fallback provided', () => {
      render(<Avatar />);

      expect(screen.getByText('?')).toBeInTheDocument();
    });

    it('applies correct size classes for fallback', () => {
      render(<Avatar fallback="JD" size="xl" />);

      const fallback = screen.getByText('JD');
      expect(fallback.parentElement).toHaveClass('w-24', 'h-24', 'text-xl');
    });
  });

  describe('Size Variants', () => {
    it.each([
      ['sm', 'w-8', 'h-8', 'text-xs'],
      ['md', 'w-12', 'h-12', 'text-sm'],
      ['lg', 'w-16', 'h-16', 'text-base'],
      ['xl', 'w-24', 'h-24', 'text-xl'],
    ])('applies correct classes for %s size', (size, width, height, textSize) => {
      render(<Avatar fallback="JD" size={size as any} />);

      const fallback = screen.getByText('JD');
      expect(fallback.parentElement).toHaveClass(width, height, textSize);
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className to image', () => {
      render(
        <Avatar 
          src="https://example.com/avatar.jpg"
          className="custom-class"
        />
      );

      const img = screen.getByRole('img');
      expect(img).toHaveClass('custom-class');
    });

    it('applies custom className to fallback', () => {
      render(
        <Avatar 
          fallback="JD"
          className="custom-class"
        />
      );

      const fallback = screen.getByText('JD');
      expect(fallback.parentElement).toHaveClass('custom-class');
    });
  });

  describe('Default Behavior', () => {
    it('uses medium size by default', () => {
      render(<Avatar fallback="JD" />);

      const fallback = screen.getByText('JD');
      expect(fallback.parentElement).toHaveClass('w-12', 'h-12', 'text-sm');
    });
  });
});