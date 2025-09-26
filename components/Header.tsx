import React, { useState, useRef, useEffect } from 'react';
import { View, User, EmployeeVisitTab, SealPersonVisitTab, ITResponseTimelineTab, ERPCorrectionTab, ConstructionDutyAnalysisTab, MonthlyComparisonPrecisionTab, SSVDutyAnalysisTab } from '../types';

interface HeaderProps {
    onMenuClick: () => void;
    isSidebarOpen: boolean;
    title: string;
    activeView: View;
    onNavigate: (view: View, state?: any) => void;
    currentUser: User;
    onLogout: () => void;
    // Props for admin account switching
    allUsers: User[];
    originalAdminUser: User | null;
    onSwitchAccount: (targetUserId: number) => void;
    onSwitchBack: () => void;
    // Props for integrated EPV tabs
    epvActiveTab: EmployeeVisitTab;
    onSetEpvActiveTab: (tab: EmployeeVisitTab) => void;
    // Props for integrated SPPV tabs
    sppvActiveTab: SealPersonVisitTab;
    onSetSppvActiveTab: (tab: SealPersonVisitTab) => void;
    // Props for integrated ITRT tabs
    itrtActiveTab: ITResponseTimelineTab;
    onSetItrtActiveTab: (tab: ITResponseTimelineTab) => void;
    // Props for integrated ERP tabs
    erpActiveTab: ERPCorrectionTab;
    onSetErpActiveTab: (tab: ERPCorrectionTab) => void;
    // Props for integrated CDA tabs
    cdaActiveTab: ConstructionDutyAnalysisTab;
    onSetCdaActiveTab: (tab: ConstructionDutyAnalysisTab) => void;
    // Props for new MCP tabs
    mcpActiveTab: MonthlyComparisonPrecisionTab;
    onSetMcpActiveTab: (tab: MonthlyComparisonPrecisionTab) => void;
    // Props for new SSV Duty Analysis tabs
    ssvDaActiveTab: SSVDutyAnalysisTab;
    onSetSsvDaActiveTab: (tab: SSVDutyAnalysisTab) => void;
}

const Header: React.FC<HeaderProps> = ({ 
    onMenuClick, 
    isSidebarOpen, 
    title, 
    activeView, 
    onNavigate, 
    currentUser, 
    onLogout, 
    allUsers, 
    originalAdminUser, 
    onSwitchAccount, 
    onSwitchBack,
    epvActiveTab,
    onSetEpvActiveTab,
    sppvActiveTab,
    onSetSppvActiveTab,
    itrtActiveTab,
    onSetItrtActiveTab,
    erpActiveTab,
    onSetErpActiveTab,
    cdaActiveTab,
    onSetCdaActiveTab,
    mcpActiveTab,
    onSetMcpActiveTab,
    ssvDaActiveTab,
    onSetSsvDaActiveTab,
}) => {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);
    const initials = currentUser.name.match(/\b(\w)/g)?.join('').slice(0, 2).toUpperCase() || '??';
    const isDashboard = activeView === 'dashboard';
    const isEPV = activeView === 'employeeProjectVisit';
    const isSPPV = activeView === 'sealPersonProjectVisit';
    const isITRT = activeView === 'itResponseTimeline';
    const isERP = activeView === 'erpCorrectionReport';
    const isCDA = activeView === 'constructionDutyAnalysis';
    const isMCP = activeView === 'monthlyComparisonPrecision';
    const isSsvDa = activeView === 'ssvDutyAnalysis';
    
    // --- ACCESSIBILITY & UX HOOKS ---
    useEffect(() => {
        // Close dropdown on click outside
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        };
        // Close dropdown on 'Escape' key press
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isProfileOpen && e.key === 'Escape') {
                setIsProfileOpen(false);
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);

        // Focus trap for keyboard navigation
        if (isProfileOpen) {
            const dropdownElement = profileRef.current?.querySelector<HTMLElement>('[role="menu"]');
            if (dropdownElement) {
                const focusableElements = Array.from(dropdownElement.querySelectorAll<HTMLElement>('button, a[href]'));
                if (focusableElements.length > 0) {
                    const firstElement = focusableElements[0];
                    const lastElement = focusableElements[focusableElements.length - 1];

                    const trapFocus = (e: KeyboardEvent) => {
                        if (e.key !== 'Tab') return;
                        if (e.shiftKey) { // Shift + Tab
                            if (document.activeElement === firstElement) {
                                (lastElement as HTMLElement).focus();
                                e.preventDefault();
                            }
                        } else { // Tab
                            if (document.activeElement === lastElement) {
                                (firstElement as HTMLElement).focus();
                                e.preventDefault();
                            }
                        }
                    };
                    dropdownElement.addEventListener('keydown', trapFocus);
                    return () => {
                        document.removeEventListener('mousedown', handleClickOutside);
                        document.removeEventListener('keydown', handleKeyDown);
                        dropdownElement.removeEventListener('keydown', trapFocus);
                    };
                }
            }
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isProfileOpen]);

    // --- HANDLER FUNCTIONS ---
    const handleProfileNav = (view: View, state?: any) => {
        onNavigate(view, state);
        setIsProfileOpen(false);
    };

    const handleLogout = () => {
        onLogout();
        setIsProfileOpen(false);
    };

    // Generic tab button styling logic
    const getTabButtonClasses = (isActive: boolean) => {
        const baseClasses = 'relative flex-shrink-0 whitespace-nowrap py-2 px-5 font-semibold text-sm transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:z-10 rounded-t-lg';
        if (isActive) {
            // Active tab: looks like it's part of the content pane with scooped corners
            return `${baseClasses} bg-white text-orange-600 -mb-px z-20 scooped-tab`;
        }
        // Inactive tab: a simple button sitting on the bar without an underline effect
        return `${baseClasses} text-slate-500 hover:bg-slate-100/80 hover:text-slate-700`;
    };

    const headerBgClass = isDashboard 
        ? 'bg-gradient-to-b from-black/50 to-transparent border-b-transparent' 
        : 'bg-gradient-to-r from-orange-100 via-amber-100 to-yellow-50 border-b border-orange-200/80 shadow-md';

    return (
        <header 
          className={`fixed top-0 right-0 z-30 flex flex-col left-0 lg:left-[var(--sidebar-width)] ${isDashboard ? 'h-20' : 'h-28'} ${headerBgClass} animate-header-fade-in-down`}
          style={{ animationDelay: '1.0s' }}
        >
            <div className="px-4 sm:px-6 lg:px-8 flex-shrink-0">
                <div className="flex items-center justify-between h-20">
                    {/* Left side: Menu button & Title */}
                    <div className="flex-1 flex justify-start items-center gap-4">
                        <button
                            onClick={onMenuClick}
                            className={`p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500 lg:hidden ${isDashboard ? 'text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
                            aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
                        >
                             {isSidebarOpen ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                            )}
                        </button>
                        <div className="relative inline-block pb-3">
                            <h1 className={`font-sans text-xl font-bold uppercase tracking-wide truncate ${isDashboard ? 'text-white/90' : 'text-slate-800'}`}>
                                {title}
                            </h1>
                            {/* Decorative underline, not shown on dashboard where header is transparent */}
                            {!isDashboard && (
                                <div className="absolute bottom-0 left-0 flex items-center w-full" aria-hidden="true">
                                    <div className="flex-grow h-px bg-gradient-to-r from-transparent via-orange-400 to-amber-500"></div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 -ml-[3px]"></div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right side: Profile button */}
                    <div className="flex-shrink-0 flex justify-end">
                        <div ref={profileRef} className="relative">
                            <button
                                onClick={() => setIsProfileOpen(prev => !prev)}
                                className="p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-orange-500 transition-transform hover:scale-105 active:scale-100"
                                aria-label="View Profile"
                                aria-expanded={isProfileOpen}
                                aria-haspopup="true"
                            >
                                <div className="w-10 h-10 rounded-full bg-orange-100 border-2 border-white shadow-sm flex items-center justify-center overflow-hidden">
                                    {currentUser.avatar ? (
                                        <img src={currentUser.avatar} alt="Profile" className="w-full h-full object-cover" />
                                     ) : (
                                        <span className="font-semibold text-sm text-orange-600">{initials}</span>
                                     )}
                                </div>
                            </button>
                            
                            <div
                                className={`absolute right-0 mt-2 w-56 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 transition-all duration-200 ease-out z-10 ${
                                    isProfileOpen
                                    ? "opacity-100 scale-100"
                                    : "opacity-0 scale-95 pointer-events-none"
                                }`}
                                role="menu"
                                aria-orientation="vertical"
                                aria-labelledby="user-menu-button"
                            >
                                <div className="py-1" role="none">
                                    {originalAdminUser && (
                                        <div className="px-4 py-2 text-center text-xs text-slate-500 bg-slate-50">
                                            Viewing as {currentUser.name}
                                        </div>
                                    )}
                                    <a href="#" onClick={(e) => { e.preventDefault(); handleProfileNav("profile")}} role="menuitem" className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0012 11z" clipRule="evenodd" /></svg>
                                        <span>My Profile</span>
                                    </a>
                                     <a href="#" onClick={(e) => { e.preventDefault(); handleProfileNav("profile", { initialTab: 'security' })}} role="menuitem" className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" /></svg>
                                        <span>Update Password</span>
                                    </a>
                                    
                                    {/* --- Account Switching UI --- */}
                                    {originalAdminUser && (
                                         <a href="#" onClick={(e) => { e.preventDefault(); onSwitchBack(); }} role="menuitem" className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-amber-600 hover:bg-amber-50 hover:text-amber-700">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M15 10a.75.75 0 01-.75.75H7.56l1.22 1.22a.75.75 0 11-1.06 1.06l-2.5-2.5a.75.75 0 010-1.06l2.5-2.5a.75.75 0 111.06 1.06L7.56 9.25H14.25A.75.75 0 0115 10z" clipRule="evenodd" /></svg>
                                            <span>Switch Back to Admin</span>
                                        </a>
                                    )}

                                    {currentUser.id === 1 && !originalAdminUser && (
                                        <>
                                            <div className="my-1 h-px bg-slate-100 mx-2"></div>
                                            <div className="px-4 pt-2 pb-1 text-xs font-semibold text-slate-400">Switch Account (Test)</div>
                                            {allUsers.filter(u => u.id === 2 || u.id === 3).map(user => (
                                                 <a key={user.id} href="#" onClick={(e) => { e.preventDefault(); onSwitchAccount(user.id); }} role="menuitem" className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">
                                                    <div className="w-6 h-6 rounded-full bg-orange-100 border-2 border-white flex items-center justify-center shadow-inner overflow-hidden">
                                                        <span className="font-semibold text-xs text-orange-600">{user.name.match(/\b(\w)/g)?.join('').slice(0,2).toUpperCase()}</span>
                                                    </div>
                                                    <span>Switch to {user.name}</span>
                                                </a>
                                            ))}
                                        </>
                                    )}
                                    <div className="my-1 h-px bg-slate-100 mx-2"></div>
                                    <a href="#" onClick={(e) => { e.preventDefault(); handleLogout() }} role="menuitem" className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" /></svg>
                                        <span>Logout</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Conditionally rendered tab bar for ALL non-dashboard pages */}
            {!isDashboard && (
                <nav className="px-4 sm:px-6 lg:px-8 mt-auto">
                     <div className="relative flex items-end -mb-px scooped-tab-container" aria-label="Tabs">
                        {isEPV ? (
                            <>
                                <button onClick={() => onSetEpvActiveTab('records')} className={getTabButtonClasses(epvActiveTab === 'records')}>
                                    All Records
                                </button>
                                <button onClick={() => onSetEpvActiveTab('departmentSummary')} className={getTabButtonClasses(epvActiveTab === 'departmentSummary')}>
                                   Department Summary
                                </button>
                                <button onClick={() => onSetEpvActiveTab('dutyAnalysis')} className={getTabButtonClasses(epvActiveTab === 'dutyAnalysis')}>
                                   Duty Analysis (AI)
                                </button>
                                <button onClick={() => onSetEpvActiveTab('summary')} className={getTabButtonClasses(epvActiveTab === 'summary')}>
                                    Monthly Summary
                                </button>
                            </>
                        ) : isSPPV ? (
                            <>
                                <button onClick={() => onSetSppvActiveTab('records')} className={getTabButtonClasses(sppvActiveTab === 'records')}>
                                    Records
                                </button>
                                <button onClick={() => onSetSppvActiveTab('analysis')} className={getTabButtonClasses(sppvActiveTab === 'analysis')}>
                                    Reporting & Analysis
                                </button>
                            </>
                        ) : isITRT ? (
                            <>
                                <button onClick={() => onSetItrtActiveTab('records')} className={getTabButtonClasses(itrtActiveTab === 'records')}>
                                    Records & Import
                                </button>
                                <button onClick={() => onSetItrtActiveTab('analysis')} className={getTabButtonClasses(itrtActiveTab === 'analysis')}>
                                    Analysis
                                </button>
                            </>
                        ) : isERP ? (
                            <>
                                <button onClick={() => onSetErpActiveTab('records')} className={getTabButtonClasses(erpActiveTab === 'records')}>
                                    Records
                                </button>
                                <button onClick={() => onSetErpActiveTab('analysis')} className={getTabButtonClasses(erpActiveTab === 'analysis')}>
                                    Analysis Report
                                </button>
                            </>
                        ) : isCDA ? (
                            <>
                                <button onClick={() => onSetCdaActiveTab('visit')} className={getTabButtonClasses(cdaActiveTab === 'visit')}>
                                    Visit Analysis
                                </button>
                                <button onClick={() => onSetCdaActiveTab('material')} className={getTabButtonClasses(cdaActiveTab === 'material')}>
                                   Material Analysis
                                </button>
                                <button onClick={() => onSetCdaActiveTab('analysis')} className={getTabButtonClasses(cdaActiveTab === 'analysis')}>
                                   Cross Analysis
                                </button>
                            </>
                        ) : isMCP ? (
                            <>
                                <button onClick={() => onSetMcpActiveTab('records')} className={getTabButtonClasses(mcpActiveTab === 'records')}>
                                    All Records
                                </button>
                                <button onClick={() => onSetMcpActiveTab('departmentSummary')} className={getTabButtonClasses(mcpActiveTab === 'departmentSummary')}>
                                   Department Summary
                                </button>
                                <button onClick={() => onSetMcpActiveTab('dutyAnalysis')} className={getTabButtonClasses(mcpActiveTab === 'dutyAnalysis')}>
                                   Duty Analysis (AI)
                                </button>
                                <button onClick={() => onSetMcpActiveTab('summary')} className={getTabButtonClasses(mcpActiveTab === 'summary')}>
                                    Monthly Summary
                                </button>
                            </>
                        ) : isSsvDa ? (
                            <>
                                <button onClick={() => onSetSsvDaActiveTab('records')} className={getTabButtonClasses(ssvDaActiveTab === 'records')}>
                                    Records
                                </button>
                                <button onClick={() => onSetSsvDaActiveTab('analysis')} className={getTabButtonClasses(ssvDaActiveTab === 'analysis')}>
                                   Analysis
                                </button>
                            </>
                        ) : (
                            // Placeholder to ensure the ribbon area maintains its height on pages without tabs, matching the EPV page style.
                            <div className="py-2 px-5 font-semibold text-sm invisible">Placeholder</div>
                        )}
                        {/* This div creates the continuous bottom border for the bar */}
                        <div className="absolute bottom-0 left-0 right-0 h-px -z-10"></div>
                    </div>
                </nav>
            )}
        </header>
    );
};

export default Header;
