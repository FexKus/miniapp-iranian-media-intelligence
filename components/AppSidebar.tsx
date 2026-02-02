import { Activity, LayoutDashboard, Eye, Newspaper, Bookmark, Settings, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';

interface AppSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSignOut?: () => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'watchlist', label: 'Watchlist', icon: Eye },
  { id: 'sources', label: 'Media Sources', icon: Newspaper },
  { id: 'saved-reports', label: 'Saved Reports', icon: Bookmark },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const AppSidebar = ({ activeTab, setActiveTab, onSignOut }: AppSidebarProps) => {
  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-screen fixed left-0 top-0 z-50">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sidebar-accent rounded-lg flex items-center justify-center shadow-glow">
            <Activity className="w-5 h-5 text-sidebar-accent-foreground" />
          </div>
          <h1 className="text-lg font-bold text-sidebar-primary tracking-tight">
            Media Intel
          </h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-glow"
                  : "text-sidebar-foreground hover:bg-sidebar-border/50 hover:text-sidebar-primary"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "stroke-[2.5px]")} />
              <span>{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-accent-foreground animate-pulse" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border space-y-4">
        {/* System Status */}
        <div className="flex items-center gap-2 text-xs font-mono text-sidebar-foreground/60 px-2">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse-subtle" />
          <span>SYSTEM OPERATIONAL</span>
        </div>

        {/* Sign Out */}
        {onSignOut && (
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-border/50 hover:text-sidebar-primary transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        )}
      </div>
    </aside>
  );
};

export default AppSidebar;
