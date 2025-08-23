import React from 'react';
import { User } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  user: User | null;
  onLogout: () => void;
  onProfileClick: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, theme, setTheme, user, onLogout, onProfileClick }) => {
  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/60 z-30 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      ></div>
      
      {/* Sidebar Panel */}
      <div
        className={`fixed top-0 left-0 bottom-0 w-72 bg-white dark:bg-slate-800 shadow-xl z-40 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sidebar-title"
      >
        <div className="flex-1">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <h2 id="sidebar-title" className="text-lg font-semibold text-slate-800 dark:text-slate-100">Menu</h2>
            <button onClick={onClose} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Close menu">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          
          {user && (
             <button onClick={onProfileClick} className="w-full text-left p-4 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                <div className="flex items-center gap-3">
                    {user.profilePicture ? (
                        <img src={user.profilePicture} alt="Profile" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center">
                            <span className="text-sm font-bold text-orange-600 dark:text-orange-300">{getInitials(user.name)}</span>
                        </div>
                    )}
                    <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{user.name}</p>
                            {user.role === 'admin' && (
                                <span className="px-2 py-0.5 text-xs font-semibold text-orange-800 bg-orange-200 dark:text-orange-200 dark:bg-orange-800 rounded-full">Admin</span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                    </div>
                </div>
             </button>
          )}

          <div className="p-4">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Theme</h3>
            <div className="mt-2 space-y-2">
              <button
                onClick={() => handleThemeChange('light')}
                className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${theme === 'light' ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                Light
              </button>
              <button
                onClick={() => handleThemeChange('dark')}
                className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${theme === 'dark' ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                Dark
              </button>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <button
                onClick={onLogout}
                className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Logout
            </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;