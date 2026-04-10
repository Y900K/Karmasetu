'use client';

import Link from 'next/link';

interface ButtonProps {
  variant?: 'solid' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  fullWidth?: boolean;
  prefetch?: boolean;
}

export default function Button({
  variant = 'solid',
  size = 'md',
  children,
  href,
  onClick,
  className = '',
  fullWidth = false,
  prefetch,
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded-full transition-all duration-300 cursor-pointer';

  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-base',
  };

  const variantStyles = {
    solid:
      'bg-accent-cyan text-bg-primary hover:brightness-110 hover:scale-105 shadow-lg shadow-accent-cyan/20',
    ghost:
      'border border-border text-text-primary hover:border-accent-cyan hover:text-accent-cyan bg-transparent',
    outline:
      'border border-accent-cyan/30 text-accent-cyan hover:bg-accent-cyan/10 bg-transparent',
  };

  const classes = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${fullWidth ? 'w-full' : ''} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes} prefetch={prefetch}>
        {children}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={classes}>
      {children}
    </button>
  );
}
