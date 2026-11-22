import React, { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  title?: string;
  subtitle?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({ 
  className, 
  hoverable, 
  title, 
  subtitle, 
  padding, 
  children, 
  ...props 
}) => {
  const paddingClass = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4 sm:p-5',
    lg: 'p-6 sm:p-7',
  }[padding || 'md'];

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-slate-200 shadow-soft transition-all duration-150',
        paddingClass,
        hoverable && 'hover:shadow-card hover:border-slate-300',
        className
      )}
      {...props}
    >
      {(title || subtitle) && (
        <div className="flex flex-col space-y-1 mb-4 pb-3 border-b border-slate-100">
          {title && <h3 className="text-base font-semibold text-slate-900 leading-snug">{title}</h3>}
          {subtitle && <p className="text-xs text-slate-500 leading-normal">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
};

export const CardHeader: React.FC<HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => {
  return (
    <div className={cn('flex flex-col space-y-1 mb-4 pb-3 border-b border-slate-100', className)} {...props}>
      {children}
    </div>
  );
};

export const CardTitle: React.FC<HTMLAttributes<HTMLHeadingElement>> = ({ className, children, ...props }) => {
  return (
    <h3 className={cn('text-base font-semibold text-slate-900 leading-snug', className)} {...props}>
      {children}
    </h3>
  );
};
