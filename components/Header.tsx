import React, { useState, useRef, useEffect } from 'react';
import { Menu, ChevronDown, Globe, LogOut, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import type { AppUser } from '../types';

interface HeaderProps {
  onMenuClick: () => void;
  onLogout: () => void;
  user: AppUser | null;
}

const getPageTitle = (pathname: string, t: any) => {
  if (pathname === '/') return t.sidebar.analytics;
  if (pathname === '/checker/dashboard') return t.sidebar.checkerDashboard;
  if (pathname === '/checker/include') return t.sidebar.checkerInclude;
  if (pathname === '/checker/monitoring_room') return t.sidebar.checkerMonitoringRoom;
  if (pathname.startsWith('/checker/checks/')) return t.checker.monitoring.detail.historyTitle;
  if (pathname === '/checker/subaccounts' || pathname === '/settings/subaccounts') return t.subaccounts.title;
  if (pathname.startsWith('/matrix/generator')) return t.sidebar.matrixGen;
  if (pathname.startsWith('/matrix/delivery')) return t.sidebar.delivery;
  if (pathname.startsWith('/reports')) return t.sidebar.reports;
  if (pathname.startsWith('/performance')) return t.sidebar.performance;
  if (pathname.startsWith('/customers')) return t.sidebar.customers;
  if (pathname.startsWith('/invoices')) return t.sidebar.invoices;
  if (pathname === '/settings') return t.sidebar.settings;
  if (pathname === '/settings/api-keys') return t.apiKeys.title;
  if (pathname.startsWith('/private-copy')) return t.sidebar.privateCopy;
  if (pathname.match(/^\/data_enrich\/project\/[^/]+$/)) return t.enrichment.detail.title;
  if (pathname.startsWith('/data_enrich/project')) return t.sidebar.enrich_modeProject;
  return t.sidebar.analytics;
};

export const Header: React.FC<HeaderProps> = ({ onMenuClick, onLogout, user }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const title = getPageTitle(location.pathname, t);
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Display Logic: Company Name > Name > Email
  const companyName = user?.user_data?.company_name;
  const displayName = companyName || 'Company';
  
  // Initials Logic
  const getInitials = (name: string) => {
    if (!name) return 'CO';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const initials = getInitials(displayName);

  return (
    <header className="sticky top-0 z-[100] bg-white/80 backdrop-blur-md border-b border-gray-100 h-16 px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2 text-sm text-gray-500">
           <span className="opacity-70">{t.common.pages}</span>
           <span className="opacity-50">/</span>
           <span className="font-medium text-gray-900">{title}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Language Switcher */}
        <button 
          onClick={() => setLanguage(language === 'en' ? 'fr' : 'en')}
          className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm font-medium text-gray-700 transition-colors"
        >
          <Globe size={16} className="text-[#141585]" />
          <span className="uppercase">{language}</span>
        </button>

        <div className="pl-2 border-l border-gray-200 relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 group focus:outline-none"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-[#141585] group-hover:text-indigo-700 transition-colors">
                {displayName}
              </p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#141585] to-indigo-500 p-0.5 shadow-sm">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-xs font-bold text-[#141585]">
                {initials}
              </div>
            </div>
            <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1 animate-in fade-in zoom-in-95 duration-200 overflow-hidden z-[101]">
                <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t.header.account}</p>
                    <p className="text-sm font-bold text-gray-900 truncate mt-0.5">{displayName}</p>
                    <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                </div>
                <div className="p-1">
                    <button 
                        onClick={() => {
                            setIsDropdownOpen(false);
                            navigate('/settings');
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-[#141585] rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <User size={16} /> {t.header.profile}
                    </button>
                    <button 
                        onClick={onLogout}
                        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <LogOut size={16} /> {t.header.logout}
                    </button>
                </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
