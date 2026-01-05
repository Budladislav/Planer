import React from 'react';
import { useAppStore } from '../store';
import { ViewState } from '../types';
import { 
  Target, Calendar, List, Inbox, Settings, CheckCircle, CheckSquare
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate }) => {
  const { state } = useAppStore();
  const isFocusMode = currentView === 'today' && state.activeTaskId !== null;

  const navItems: Array<{ view: ViewState; icon: any; label: string }> = [
    { view: 'settings', icon: Settings, label: 'Settings' },
    { view: 'inbox', icon: Inbox, label: 'Inbox' },
    { view: 'events', icon: Calendar, label: 'Events' },
    { view: 'done', icon: CheckSquare, label: 'Done' }, // swapped
    { view: 'week', icon: List, label: 'Week' }, // swapped
    { view: 'today', icon: Target, label: 'Today' },
  ];

  const getIconColor = (view: ViewState, isActive: boolean) => {
    if (isActive) {
      switch (view) {
        case 'today': return 'text-indigo-600';
        case 'week': return 'text-indigo-500';
        case 'events': return 'text-amber-600';
        case 'done': return 'text-green-600';
        case 'inbox': return 'text-purple-600';
        case 'settings': return 'text-slate-600';
        default: return 'text-slate-600';
      }
    } else {
      switch (view) {
        case 'today': return 'text-indigo-400';
        case 'week': return 'text-indigo-400';
        case 'events': return 'text-amber-500';
        case 'done': return 'text-green-500';
        case 'inbox': return 'text-purple-500';
        case 'settings': return 'text-slate-400';
        default: return 'text-slate-400';
      }
    }
  };

  const NavItem = ({ view, icon: Icon, label }: { view: ViewState; icon: any; label: string }) => {
    const isActive = currentView === view;
    return (
      <button
        onClick={() => onNavigate(view)}
        className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
          isActive
            ? 'bg-slate-200 text-slate-900'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        <Icon className={`w-5 h-5 mr-3 ${getIconColor(view, isActive)}`} />
        <span className="flex-1 text-left">{label}</span>
      </button>
    );
  };

  const IconNavItem = ({ view, icon: Icon }: { view: ViewState; icon: any }) => {
    const isActive = currentView === view;
    return (
      <button
        onClick={() => onNavigate(view)}
        className={`flex flex-col items-center justify-center flex-1 aspect-square rounded-lg transition-colors ${
          isActive
            ? 'text-slate-900 bg-slate-100'
            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
        }`}
        title={navItems.find(item => item.view === view)?.label}
      >
        <Icon className={`w-7 h-7 ${getIconColor(view, isActive)}`} />
      </button>
    );
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 lg:flex-row">
      {/* Desktop Sidebar (Left) */}
      {!isFocusMode && (
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:bg-white lg:border-r lg:border-slate-200">
          <div className="flex items-center justify-between h-16 px-6 border-b border-slate-100">
            <span className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
              <div className="w-6 h-6 bg-slate-900 rounded-md flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
              MonoFocus
            </span>
          </div>

          <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
            {navItems.map(item => (
              <NavItem key={item.view} view={item.view} icon={item.icon} label={item.label} />
            ))}
          </nav>
        </aside>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full">
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 max-w-5xl mx-auto w-full pb-24 lg:pb-8">
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar */}
        {!isFocusMode && (
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-10 bg-slate-50">
            <div className="flex items-center w-full">
              {navItems.map(item => (
                <IconNavItem key={item.view} view={item.view} icon={item.icon} />
              ))}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
};
