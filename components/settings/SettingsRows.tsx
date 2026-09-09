import React from 'react';
import { ChevronRight, type LucideIcon } from 'lucide-react';

export const SettingsLinkRow: React.FC<{
  icon: LucideIcon;
  title: React.ReactNode;
  description: React.ReactNode;
  onClick: () => void;
}> = ({ icon: Icon, title, description, onClick }) => (
  <button type="button" onClick={onClick} className="settings-row">
    <Icon className="h-5 w-5 flex-shrink-0 text-brand-500" />
    <div className="min-w-0 flex-1">
      <div className="font-semibold text-slate-800">{title}</div>
      <p className="text-sm text-slate-500">{description}</p>
    </div>
    <ChevronRight className="h-5 w-5 flex-shrink-0 text-slate-400" />
  </button>
);

export const SettingsCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`surface-card divide-y divide-line ${className}`}>{children}</div>
);
