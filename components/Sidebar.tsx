import React from 'react';
import { LayoutDashboard, Eye, Newspaper, Activity } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'watchlist', label: 'Watchlist', icon: Eye },
    { id: 'sources', label: 'Media Sources', icon: Newspaper },
  ];

  return (
    <aside className="w-[260px] bg-white border-r-2 border-accent flex flex-col h-screen fixed left-0 top-0 z-50 font-sans shadow-lg">
      <div className="p-8 border-b border-gray-100">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-9 h-9 bg-accent rounded-md flex items-center justify-center text-white shrink-0">
            <Activity size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 font-serif tracking-tight leading-none">Media Intel</h1>
          </div>
        </div>
        <p className="text-xs text-gray-500 ml-[48px]">Iranian Media Monitor</p>
      </div>

      <nav className="flex-1 p-6 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium ${
                isActive
                  ? 'bg-accent-light text-accent border border-red-200 shadow-sm font-semibold'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon size={20} className={isActive ? "stroke-[2.5px]" : "stroke-[2px]"} />
              <span className="text-[15px]">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-8 border-t border-gray-100">
        <div className="flex items-center space-x-3 text-xs font-mono text-gray-500">
          <div className="w-2 h-2 rounded-full bg-emerald-600 animate-[pulse_2s_ease-in-out_infinite]"></div>
          <span>SYSTEM OPERATIONAL</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;