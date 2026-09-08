import React from 'react';

const join = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  hideTitleOnMobile?: boolean;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  children,
  hideTitleOnMobile = true,
  className,
}) => (
  <header className={join('page-context', className)}>
    <h1 className={join('page-title', hideTitleOnMobile && 'page-title-mobile-hidden')}>{title}</h1>
    {subtitle && <div className="page-subtitle">{subtitle}</div>}
    {children}
  </header>
);

interface EmptyStateProps {
  children: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ children, className }) => (
  <div className={join('empty-state', className)}>{children}</div>
);

type ButtonVariant = 'primary' | 'secondary' | 'subtle' | 'success' | 'danger';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const buttonVariantClass: Record<ButtonVariant, string> = {
  primary: 'button-primary',
  secondary: 'button-secondary',
  subtle: 'button-subtle',
  success: 'button-success',
  danger: 'button-danger',
};

export const Button: React.FC<ButtonProps> = ({ variant = 'secondary', className, type = 'button', ...props }) => (
  <button type={type} className={join(buttonVariantClass[variant], className)} {...props} />
);

interface SurfaceProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'article' | 'div' | 'section';
  padded?: boolean;
}

export const Surface: React.FC<SurfaceProps> = ({ as: Element = 'section', padded = false, className, ...props }) => (
  <Element className={join(padded ? 'section-card' : 'surface-card', className)} {...props} />
);

export const TaskCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={join('task-card', className)} {...props} />,
);

TaskCard.displayName = 'TaskCard';
