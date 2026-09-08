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

type TaskActionTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

interface TaskIconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  label: string;
  tone?: TaskActionTone;
}

const taskActionToneClass: Record<TaskActionTone, string> = {
  neutral: 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700',
  primary: 'bg-brand-50 text-brand-600 hover:bg-brand-100 hover:text-brand-700',
  success: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800',
  warning: 'bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800',
  danger: 'bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700',
};

export const TaskIconButton: React.FC<TaskIconButtonProps> = ({
  label,
  tone = 'neutral',
  className,
  type = 'button',
  ...props
}) => (
  <button
    type={type}
    title={label}
    aria-label={label}
    className={join(
      'relative z-[1] flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-45',
      taskActionToneClass[tone],
      className,
    )}
    {...props}
  />
);
