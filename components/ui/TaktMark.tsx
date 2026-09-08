import React from 'react';

interface TaktMarkProps {
  className?: string;
  title?: string;
  monochrome?: boolean;
}

export const TaktMark: React.FC<TaktMarkProps> = ({ className = 'h-8 w-8', title, monochrome = false }) => (
  <svg
    viewBox="0 0 48 48"
    role={title ? 'img' : undefined}
    aria-hidden={title ? undefined : true}
    aria-label={title}
    className={className}
  >
    <rect x="5" y="34" width="18" height="5" rx="2.5" fill={monochrome ? 'currentColor' : '#2FB47C'} />
    <rect x="12" y="26" width="18" height="5" rx="2.5" fill={monochrome ? 'currentColor' : '#3B82F6'} />
    <rect x="19" y="18" width="18" height="5" rx="2.5" fill={monochrome ? 'currentColor' : '#E09A17'} />
    <rect x="26" y="10" width="18" height="5" rx="2.5" fill={monochrome ? 'currentColor' : '#E4515E'} />
  </svg>
);
