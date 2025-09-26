
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { View, User } from '../types';

const NavLink: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  isSubItem?: boolean;
}> = ({ icon, label, isActive, onClick, isSubItem = false }) => (
  <a
    href="#"
    onClick={(e) => {
      e.preventDefault();
      onClick();
    }}
    className={`flex items-start gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors w-full text-left text-sm ${
      isActive
        ? 'bg-orange-600 text-white shadow-md'
        : 'text-slate-600 hover:bg-orange-100/60 hover:text-orange-600'
    }`}
  >
    {icon}
    <span className="flex-1">{label}</span>
  </a>
);

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    activeView: View;
    onNavigate: (view: View, state?: any) => void;
    currentUser: User;
    onResize: (newWidth: number) => void;
}

const HoverSubmenuTrigger: React.FC<{ icon: React.ReactNode; label: string; isMenuHovered: boolean; }> = ({ icon, label, isMenuHovered }) => (
    <div className={`flex items-start gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors w-full text-left cursor-default text-sm text-slate-600 ${isMenuHovered ? 'bg-orange-100/60 text-orange-600' : 'hover:bg-orange-100/60 hover:text-orange-600'}`}>
        {icon}
        <span className="flex-1">{label}</span>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-auto" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
    </div>
);

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, activeView, onNavigate, currentUser, onResize }) => {
    const { permissions } = currentUser;
    const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
    const [popupPosition, setPopupPosition] = useState<{ top: number, left: number }>({ top: 0, left: 0 });

    const menuRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const hoverTimeoutRef = useRef<number | null>(null);

    const canViewVisit = permissions.projectVisit.view || permissions.lastVisitedProjects.view;
    const canViewCase = permissions.projectCase.view || permissions.projectCasesList.view;
    const canViewReceive = permissions.materialReceive.view || permissions.materialReceiveList.view;
    const canViewSurveillance = permissions.employeeProjectVisit.view || permissions.monthlyComparisonPrecision.view || permissions.sealPersonProjectVisit.view || permissions.itResponseTimeline.view || permissions.constructionDutyAnalysis.view || permissions.ssvDutyAnalysis.view;
    const canViewSystemManagement = permissions.systemManagement_addProject.view || permissions.systemManagement_projectList.view || permissions.systemManagement_dashboardSettings.view;

    const isResizing = useRef(false);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        isResizing.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isResizing.current) {
            onResize(e.clientX);
        }
    }, [onResize]);

    const handleMouseUp = useCallback(() => {
        isResizing.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    }, [handleMouseMove]);
    
    // Hover logic with timeout for better UX
    const handleMenuEnter = (menuKey: string) => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        
        const rect = menuRefs.current[menuKey]?.getBoundingClientRect();
        if (rect) {
            setPopupPosition({ top: rect.top, left: rect.right + 4 });
            setHoveredMenu(menuKey);
        }
    };

    const handleMenuLeave = () => {
        hoverTimeoutRef.current = window.setTimeout(() => {
            setHoveredMenu(null);
        }, 150);
    };
    
    useEffect(() => {
      return () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      };
    }, []);

    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);
    
    const renderPopup = (menuKey: string, children: React.ReactNode, widthClass: string = 'w-64') => {
        if (hoveredMenu !== menuKey || typeof window === 'undefined') return null;

        return createPortal(
            <div
                className={`fixed ${widthClass} bg-gradient-to-br from-orange-50 via-white to-amber-50 rounded-lg shadow-xl border border-orange-200/70 p-2 z-[9999] transition-opacity duration-150 ease-in-out animate-fade-in-down max-h-[90vh] overflow-y-auto`}
                style={{ top: `${popupPosition.top}px`, left: `${popupPosition.left}px` }}
                onMouseEnter={() => handleMenuEnter(menuKey)}
                onMouseLeave={handleMenuLeave}
            >
                {children}
            </div>,
            document.body
        );
    };

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-30 transition-opacity duration-300 ease-in-out lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      ></div>

      <aside className={`fixed top-0 h-full bg-gradient-to-b from-orange-50 via-amber-50 to-white border-r border-slate-200 flex flex-col z-50 transition-[left] duration-300 ease-in-out lg:left-0 ${isOpen ? 'left-0' : 'left-[calc(-1*var(--sidebar-width))]'} animate-slide-in-left`} style={{ width: 'var(--sidebar-width)', animationDelay: '0.8s' }}>
        {/* New Brand Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-center h-20">
            <button
                onClick={() => onNavigate('dashboard')}
                className="transition-opacity hover:opacity-90"
                aria-label="Go to Dashboard"
            >
                <div className="flex flex-col items-center">
                    <h1 className="font-display text-2xl font-extrabold text-orange-600 uppercase tracking-wider">
                        <span className="text-3xl">P</span>recision
                    </h1>
                    <p className="text-[8px] text-slate-500 tracking-widest uppercase -mt-1">Eyes on Every Site</p>
                </div>
            </button>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
            {permissions.dashboard.view && (
                <NavLink
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>}
                    label="Dashboard"
                    isActive={activeView === 'dashboard'}
                    onClick={() => onNavigate('dashboard')}
                />
            )}
            
            {canViewVisit && (
                 <div ref={el => { menuRefs.current['visit'] = el; }} onMouseEnter={() => handleMenuEnter('visit')} onMouseLeave={handleMenuLeave}>
                    <HoverSubmenuTrigger label="Project Visit" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>} isMenuHovered={hoveredMenu === 'visit'} />
                </div>
            )}

            {canViewCase && (
                <div ref={el => { menuRefs.current['case'] = el; }} onMouseEnter={() => handleMenuEnter('case')} onMouseLeave={handleMenuLeave}>
                    <HoverSubmenuTrigger label="Project Case" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>} isMenuHovered={hoveredMenu === 'case'} />
                </div>
            )}
            
             {canViewReceive && (
                <div ref={el => { menuRefs.current['receive'] = el; }} onMouseEnter={() => handleMenuEnter('receive')} onMouseLeave={handleMenuLeave}>
                    <HoverSubmenuTrigger label="Material Receive" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" /><path fillRule="evenodd" d="M3 4a2 2 0 012-2h10a2 2 0 012 2v5h-2.22l.537 1.253a1 1 0 01-.44 1.22l-1.888.944a1 1 0 01-1.21-.441L10.5 11H5a2 2 0 01-2-2V4zm2 1v4h5.5l1-2H5z" clipRule="evenodd" /></svg>} isMenuHovered={hoveredMenu === 'receive'} />
                </div>
            )}

            {canViewSurveillance && (
                 <div ref={el => { menuRefs.current['surveillance'] = el; }} onMouseEnter={() => handleMenuEnter('surveillance')} onMouseLeave={handleMenuLeave}>
                    <HoverSubmenuTrigger label="Surveillance Report" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>} isMenuHovered={hoveredMenu === 'surveillance'} />
                </div>
            )}

            {permissions.erpCorrectionReport.view && (
                <NavLink
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm11.707 6.293a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 111.414-1.414L9 12.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                    label="ERP Correction Report"
                    isActive={activeView === 'erpCorrectionReport'}
                    onClick={() => onNavigate('erpCorrectionReport')}
                />
            )}

            <hr className="my-2 border-slate-200" />
            
             {permissions.profile.view && (
                 <NavLink
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0012 11z" clipRule="evenodd" /></svg>}
                    label="My Profile"
                    isActive={activeView === 'profile'}
                    onClick={() => onNavigate('profile')}
                />
            )}
            
            {permissions.adminPanel.view && (
                 <NavLink
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>}
                    label="Admin Panel"
                    isActive={activeView === 'adminPanel'}
                    onClick={() => onNavigate('adminPanel')}
                />
            )}

            {canViewSystemManagement && (
                 <NavLink
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01-.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>}
                    label="System Management"
                    isActive={activeView === 'systemManagement'}
                    onClick={() => onNavigate('systemManagement')}
                />
            )}
            
        </nav>
        <div
            onMouseDown={handleMouseDown}
            className="absolute top-0 right-0 h-full w-2 cursor-col-resize group hidden lg:block"
            aria-label="Resize sidebar"
            role="separator"
        >
            <div className="h-full w-0.5 bg-transparent group-hover:bg-orange-300 transition-colors duration-200 mx-auto" />
        </div>
      </aside>

      {/* Popups rendered via Portal */}
       {renderPopup('visit', 
        <div className="space-y-1">
            {permissions.projectVisit.view && <NavLink label="New Visit Report" icon={<div className="w-5 h-5 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div></div>} isActive={activeView === 'projectVisit'} onClick={() => onNavigate('projectVisit')} isSubItem />}
            {permissions.lastVisitedProjects.view && <NavLink label="Visited Projects" icon={<div className="w-5 h-5 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div></div>} isActive={activeView === 'lastVisitedProjects'} onClick={() => onNavigate('lastVisitedProjects')} isSubItem />}
        </div>, 'w-56'
      )}

      {renderPopup('case', 
        <div className="space-y-1">
            {permissions.projectCase.view && <NavLink label="New Case Report" icon={<div className="w-5 h-5 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div></div>} isActive={activeView === 'projectCase'} onClick={() => onNavigate('projectCase')} isSubItem />}
            {permissions.projectCasesList.view && <NavLink label="All Cases" icon={<div className="w-5 h-5 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div></div>} isActive={activeView === 'projectCasesList'} onClick={() => onNavigate('projectCasesList')} isSubItem />}
        </div>, 'w-56'
      )}

      {renderPopup('receive', 
        <div className="space-y-1">
            {permissions.materialReceive.view && <NavLink label="New Entry" icon={<div className="w-5 h-5 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div></div>} isActive={activeView === 'materialReceive'} onClick={() => onNavigate('materialReceive')} isSubItem />}
            {permissions.materialReceiveList.view && <NavLink label="All Receipts" icon={<div className="w-5 h-5 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div></div>} isActive={activeView === 'materialReceiveList'} onClick={() => onNavigate('materialReceiveList')} isSubItem />}
        </div>, 'w-56'
      )}

      {renderPopup('surveillance', 
        <div className="space-y-1">
            {permissions.employeeProjectVisit.view && <NavLink label="Employee Project Visit" icon={<div className="w-5 h-5 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div></div>} isActive={activeView === 'employeeProjectVisit'} onClick={() => onNavigate('employeeProjectVisit')} isSubItem />}
            {permissions.monthlyComparisonPrecision.view && <NavLink label="Monthly Comparison Precision" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L12 11.586l3.293-3.293V7h-1z" clipRule="evenodd" /></svg>} isActive={activeView === 'monthlyComparisonPrecision'} onClick={() => onNavigate('monthlyComparisonPrecision')} isSubItem />}
            {permissions.ssvDutyAnalysis.view && <NavLink label="SSV Duty Analysis" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 011 1v1.333a11.025 11.025 0 013.56 1.396 1 1 0 010 1.742A8.995 8.995 0 0010 17.5a8.995 8.995 0 00-4.56-9.289 1 1 0 010-1.742A11.025 11.025 0 019 4.333V3a1 1 0 011-1z" /></svg>} isActive={activeView === 'ssvDutyAnalysis'} onClick={() => onNavigate('ssvDutyAnalysis')} isSubItem />}
            {permissions.sealPersonProjectVisit.view && <NavLink label="Seal Person Project Visit" icon={<div className="w-5 h-5 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div></div>} isActive={activeView === 'sealPersonProjectVisit'} onClick={() => onNavigate('sealPersonProjectVisit')} isSubItem />}
            {permissions.itResponseTimeline.view && <NavLink label="IT Response Time Reports" icon={<div className="w-5 h-5 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div></div>} isActive={activeView === 'itResponseTimeline'} onClick={() => onNavigate('itResponseTimeline')} isSubItem />}
            {permissions.constructionDutyAnalysis.view && <NavLink label="Construction Duty Analysis" icon={<div className="w-5 h-5 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div></div>} isActive={activeView === 'constructionDutyAnalysis'} onClick={() => onNavigate('constructionDutyAnalysis')} isSubItem />}
        </div>, 'w-64'
      )}
    </>
  );
};

export default Sidebar;