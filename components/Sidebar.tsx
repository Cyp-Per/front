import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Settings, Grid2x2Check, X, FileText, ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Logo, LogoIcon } from './Logo';

type MatchMode = 'exact' | 'prefix';

interface MenuItem {
  key: string;
  icon: any;
  label: string;
  path?: string;
  matchMode?: MatchMode;
  subItems?: { label: string; path: string; matchMode?: MatchMode }[];
  disabled?: boolean;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, isCollapsed, toggleCollapse }) => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { t } = useLanguage();

  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  useEffect(() => {
    // Auto-expand menus based on current path, but only if sidebar is not collapsed
    if (!isCollapsed) {
      if (currentPath.startsWith('/checker')) {
        setExpandedMenu('checker');
      } else if (currentPath.startsWith('/settings')) {
        setExpandedMenu('settings');
      }
    } else {
      setExpandedMenu(null); // Collapse submenus when sidebar collapses
    }
  }, [currentPath, isCollapsed]);

  const menuItems: MenuItem[] = [
    { 
      key: 'checker',
      icon: Grid2x2Check, 
      label: t.sidebar.checker, 
      subItems: [
        { label: t.sidebar.checkerDashboard, path: '/checker/dashboard', matchMode: 'exact' },
        { label: t.sidebar.checkerInclude, path: '/checker/include', matchMode: 'exact' },
        { label: t.sidebar.checkerMonitoringRoom, path: '/checker/monitoring_room', matchMode: 'exact' },
        { label: t.sidebar.subaccounts, path: '/checker/subaccounts', matchMode: 'exact' }
      ]
    },
    { key: 'invoices', icon: FileText, label: t.sidebar.invoices, path: '/invoices', matchMode: 'prefix', disabled: true },
    { 
      key: 'settings',
      icon: Settings, 
      label: t.sidebar.settings, 
      subItems: [
        { label: t.sidebar.general, path: '/settings', matchMode: 'exact' },
        { label: t.sidebar.apiKeys, path: '/settings/api-keys', matchMode: 'prefix' }
      ]
    },
  ];

  const toggleSubmenu = (key: string) => {
    if (isCollapsed) {
      toggleCollapse(); // Expand sidebar if user clicks a submenu trigger while collapsed
      setTimeout(() => setExpandedMenu(key), 100);
    } else {
      setExpandedMenu(expandedMenu === key ? null : key);
    }
  };

  const normalizePath = (path: string) => {
    if (path.length > 1 && path.endsWith('/')) {
      return path.slice(0, -1);
    }
    return path;
  };

  const normalizedCurrentPath = normalizePath(currentPath || '/');

  const isActive = (path?: string, matchMode: MatchMode = 'prefix') => {
    if (!path) {
      return false;
    }

    if (path === '#' || path === '') return false;

    const normalizedPath = normalizePath(path);

    if (matchMode === 'exact') {
      return normalizedCurrentPath === normalizedPath;
    }

    return (
      normalizedCurrentPath === normalizedPath ||
      normalizedCurrentPath.startsWith(`${normalizedPath}/`)
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-20 lg:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={onClose}
      />
      
      {/* Sidebar Container */}
      <div className={`fixed top-0 left-0 bottom-0 bg-white border-r border-gray-100 z-30 transform transition-all duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0 
        ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
      `}>
        {/* Header / Logo */}
        <div className={`h-20 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-5'}`}>
          <Link to="/" className="flex items-center gap-3" onClick={onClose}>
            {isCollapsed ? (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#141585] to-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-900/20 shrink-0 border border-white/10">
                  <LogoIcon className="w-5 h-5 text-white" />
                </div>
            ) : (
                <Logo className="w-40 text-[#141585]" />
            )}
          </Link>
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-2 px-3 space-y-1">
          {menuItems.map((item) => {
            const isExpanded = expandedMenu === item.key;
            const itemActive =
              isActive(item.path, item.matchMode) ||
              (item.subItems?.some((sub) => isActive(sub.path, sub.matchMode ?? 'prefix')) ?? false);
            
            const ItemContent = () => (
              <>
                 <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center w-full' : ''}`}>
                    <item.icon size={20} className={`shrink-0 ${item.disabled ? 'text-gray-300' : itemActive ? 'text-[#141585]' : 'text-gray-400'}`} />
                    {!isCollapsed && <span className="whitespace-nowrap overflow-hidden">{item.label}</span>}
                  </div>
                  {!isCollapsed && item.subItems && (
                    isExpanded ? <ChevronDown size={14} className="shrink-0" /> : <ChevronRight size={14} className="shrink-0" />
                  )}
              </>
            );

            const commonClasses = `w-full flex items-center py-2 rounded-lg transition-all text-sm font-medium ${
              isCollapsed ? 'justify-center px-0' : 'justify-between px-3'
            } ${
              item.disabled 
                ? 'opacity-50 cursor-not-allowed pointer-events-none text-gray-400 bg-gray-50/50'
                : itemActive 
                  ? 'bg-indigo-50 text-[#141585] ring-1 ring-indigo-100' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            }`;

            return (
              <div key={item.key} className="relative group">
                {item.subItems ? (
                  <button 
                    onClick={() => !item.disabled && toggleSubmenu(item.key)} 
                    className={commonClasses} 
                    title={isCollapsed ? item.label : undefined}
                    disabled={item.disabled}
                  >
                    <ItemContent />
                  </button>
                ) : (
                  <Link 
                    to={item.path || '#'} 
                    className={commonClasses} 
                    onClick={(e) => { if (item.disabled) e.preventDefault(); else onClose(); }} 
                    title={isCollapsed ? item.label : undefined}
                    aria-disabled={item.disabled}
                  >
                    <ItemContent />
                  </Link>
                )}
                
                {/* Submenu */}
                {!isCollapsed && item.subItems && (
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-40 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                    <div className="pl-9 pr-2 space-y-1">
                      {item.subItems.map((sub) => {
                        const isMatch = isActive(sub.path, sub.matchMode ?? 'prefix');
                        return (
                          <Link 
                            key={sub.path} 
                            to={sub.path}
                            onClick={(e) => { if (item.disabled) e.preventDefault(); else onClose(); }}
                            className={`block py-1.5 px-2 text-sm rounded transition-colors whitespace-nowrap overflow-hidden text-ellipsis ${
                              item.disabled ? 'text-gray-300 pointer-events-none' :
                              isMatch
                              ? 'text-[#141585] bg-indigo-50/80 font-semibold' 
                              : 'text-gray-500 hover:text-[#141585] hover:bg-indigo-50/50'
                            }`}
                          >
                            {sub.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Toggle Collapse Button (Desktop Only) */}
        <div className="hidden lg:flex absolute bottom-4 left-0 right-0 justify-center">
            <button 
              onClick={toggleCollapse}
              className="p-2 text-gray-400 hover:text-[#141585] hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </button>
        </div>
      </div>
    </>
  );
};
