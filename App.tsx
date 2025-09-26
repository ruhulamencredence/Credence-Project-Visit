import React, { useState, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import ProjectVisitForm from './components/ProjectVisitForm';
import Header from './components/Header';
import LastVisitedProjects from './components/LastVisitedProjects';
import ProjectCaseForm from './components/ProjectCaseForm';
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';
import { View, Role, Project, FeaturedProject, ITAssignedIssue, EmployeeVisit as EmployeeVisitType, ERPCorrectionRecord, EmployeeVisitTab, SealPersonVisitTab, ITResponseTimelineTab, ERPCorrectionTab, ConstructionDutyAnalysisTab, MonthlyComparisonPrecisionTab, SealPersonVisit, MaterialReceiveItem, SSVDutyAnalysisTab } from './types';
import { User, Permissions } from './types';
import { initialUsers } from './data/users';
import { initialProjects } from './data/projects';
import { initialVisits } from './data/visits';
import { initialSealPersonVisits, initialMaterialReceipts } from './data/analysis';
import ProjectCasesList from './components/ProjectCasesList';
import MaterialReceiveForm from './components/MaterialReceiveForm';
import MaterialReceiveList from './components/MaterialReceiveList';
import SystemManagement from './components/SystemManagement';
import EmployeeProjectVisit from './components/EmployeeProjectVisit';
import SealPersonProjectVisit from './components/SealPersonProjectVisit';
import ITResponseTimeline from './components/ITResponseTimeline';
import { LoadingProvider, useLoading } from './contexts/LoadingContext';
import GlobalSpinner from './components/GlobalSpinner';
import Footer from './components/Footer';
import ERPCorrectionReport from './components/ERPCorrectionReport';
import ConstructionDutyAnalysis from './components/ConstructionDutyAnalysis';
import SplashScreen from './components/SplashScreen';
import MonthlyComparisonPrecision from './components/MonthlyComparisonPrecision';
import SSVDutyAnalysis from './components/SSVDutyAnalysis';

const viewTitles: Record<View, string> = {
    dashboard: 'Dashboard',
    projectVisit: 'New Visit Report',
    profile: 'Profile',
    lastVisitedProjects: 'Last Visited Projects',
    projectCase: 'Project Case Report',
    projectCasesList: 'Project Cases',
    adminPanel: 'Admin Panel',
    materialReceive: 'Material Receive',
    materialReceiveList: 'Material Receive List',
    systemManagement: 'System Management',
    employeeProjectVisit: 'Employee Project Visit',
    sealPersonProjectVisit: 'Seal Person Project Visit',
    itResponseTimeline: 'IT Response Time Reports',
    erpCorrectionReport: 'ERP Correction Report',
    constructionDutyAnalysis: 'Construction Duty Analysis',
    monthlyComparisonPrecision: 'Monthly Comparison Precision',
    ssvDutyAnalysis: 'SSV Duty Analysis',
};

const AccessDenied: React.FC = () => (
    <div className="p-6 md:p-8 text-center">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-red-200 max-w-md mx-auto">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <h2 className="mt-4 text-2xl font-bold text-slate-800">Access Denied</h2>
            <p className="mt-2 text-slate-600">You do not have permission to view this page. Please contact an administrator if you believe this is an error.</p>
        </div>
    </div>
);

const initialFeaturedProjects: FeaturedProject[] = [
  {
    image: 'https://plus.unsplash.com/premium_photo-1661817214148-2d4cf768a7c3?q=80&w=996&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: 'Data Surveillance Hub',
    location: 'Central Monitoring System',
    status: 'Live',
    completion: 100,
  },
];

function AppInner() {
    const { showLoading, hideLoading } = useLoading();
    const [users, setUsers] = useState<User[]>(initialUsers);
    const [projects, setProjects] = useState<Project[]>(initialProjects);
    const [featuredProjects, setFeaturedProjects] = useState<FeaturedProject[]>(initialFeaturedProjects);
    // To re-enable the login page on startup, change the initial state below back to `null`.
    const [authenticatedUser, setAuthenticatedUser] = useState<User | null>(initialUsers[0]);
    const [activeView, setActiveView] = useState<View>('dashboard');
    const [viewState, setViewState] = useState<any | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(() => {
        const savedWidth = typeof window !== 'undefined' ? localStorage.getItem('sidebarWidth') : null;
        return savedWidth ? parseInt(savedWidth, 10) : 224; // Default width (w-56)
    });
    
    // State for IT Assigned Issues to persist data
    const [itAssignedIssues, setItAssignedIssues] = useState<ITAssignedIssue[]>([]);
    // State for Employee Visits to persist data
    const [employeeVisits, setEmployeeVisits] = useState<EmployeeVisitType[]>(initialVisits);
    // State for ERP Correction reports to persist data
    const [erpCorrectionRecords, setErpCorrectionRecords] = useState<ERPCorrectionRecord[]>([]);
    
    // New state for Analytics Dashboard data
    const [sealPersonVisits, setSealPersonVisits] = useState<SealPersonVisit[]>(initialSealPersonVisits);
    const [materialReceipts, setMaterialReceipts] = useState<MaterialReceiveItem[]>(initialMaterialReceipts);

    // State for EmployeeProjectVisit tabs - lifted for Header integration
    const [epvActiveTab, setEpvActiveTab] = useState<EmployeeVisitTab>('records');
    // State for SealPersonProjectVisit tabs - lifted for Header integration
    const [sppvActiveTab, setSppvActiveTab] = useState<SealPersonVisitTab>('records');
    // State for ITResponseTimeline tabs - lifted for Header integration
    const [itrtActiveTab, setItrtActiveTab] = useState<ITResponseTimelineTab>('records');
    // State for ERPCorrectionReport tabs - lifted for Header integration
    const [erpActiveTab, setErpActiveTab] = useState<ERPCorrectionTab>('records');
    // State for ConstructionDutyAnalysis tabs - lifted for Header integration
    const [cdaActiveTab, setCdaActiveTab] = useState<ConstructionDutyAnalysisTab>('visit');
    // State for MonthlyComparisonPrecision tabs - lifted for Header integration
    const [mcpActiveTab, setMcpActiveTab] = useState<MonthlyComparisonPrecisionTab>('records');
    // State for SSV Duty Analysis tabs - lifted for Header integration
    const [ssvDaActiveTab, setSsvDaActiveTab] = useState<SSVDutyAnalysisTab>('records');


    // State to manage admin account switching for testing
    const [originalAdminUser, setOriginalAdminUser] = useState<User | null>(null);

    // New state for splash screen lifecycle
    const [splashState, setSplashState] = useState<'visible' | 'exiting' | 'hidden'>('visible');
    
    const handleLogin = async (email: string, password: string): Promise<boolean> => {
        showLoading();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
        
        hideLoading();
        if (user) {
            setAuthenticatedUser(user);
            setOriginalAdminUser(null); // Ensure no residual admin state on new login
            setActiveView('dashboard'); // Reset to dashboard on login
            setSplashState('visible'); // Show splash on new login
            return true;
        }
        
        return false;
    };

    const handleLogout = () => {
        setAuthenticatedUser(null);
        setOriginalAdminUser(null); // Ensure no residual admin state on logout
    };
    
    // --- Account Switching Handlers ---
    const handleSwitchAccount = (targetUserId: number) => {
        if (!authenticatedUser || authenticatedUser.id !== 1) return; // Only the main admin can switch
        const targetUser = users.find(u => u.id === targetUserId);
        if (targetUser) {
            setOriginalAdminUser(authenticatedUser); // Store the current admin session
            setAuthenticatedUser(targetUser); // Switch to the target user
            setActiveView('dashboard'); // Navigate to a neutral view
            setIsSidebarOpen(false); // Close sidebar if open
        }
    };

    const handleSwitchBackToAdmin = () => {
        if (originalAdminUser) {
            setAuthenticatedUser(originalAdminUser);
            setOriginalAdminUser(null);
            setActiveView('dashboard'); // Navigate to a neutral view
            setIsSidebarOpen(false); // Close sidebar if open
        }
    };
    // --- End Account Switching Handlers ---

    const handleNavigate = (view: View, state: any = null) => {
        // Don't show loader if navigating to the same view
        if (activeView === view) {
            setIsSidebarOpen(false);
            return;
        }

        // Set a timer to show the loader only if navigation is perceived as slow.
        const loaderTimer = setTimeout(() => {
            showLoading();
        }, 300); // Threshold for showing the loader (e.g., 300ms)

        // The actual work of navigation. In our client-side app, this is very fast.
        // We use a small timeout to ensure the UI remains responsive and the navigation
        // feels immediate, rather than waiting for an artificial delay.
        const pageLoadTime = 50; // Simulate a fast page load.

        setTimeout(() => {
            // Update the view
            setActiveView(view);
            setViewState(state);
            setIsSidebarOpen(false);

            // Navigation is complete. Now, prevent the loader from appearing if it hasn't already.
            clearTimeout(loaderTimer);
            
            // And if the loader did somehow appear (e.g., if pageLoadTime > 300), hide it.
            hideLoading();
        }, pageLoadTime);
    };
    
    const handleSidebarResize = useCallback((newWidth: number) => {
        const constrainedWidth = Math.max(72, Math.min(newWidth, 400)); // Min 72px, max 400px
        setSidebarWidth(constrainedWidth);
        if (typeof window !== 'undefined') {
            localStorage.setItem('sidebarWidth', String(constrainedWidth));
        }
    }, []);

    const handlePermissionsChange = (userId: number, newPermissions: Permissions) => {
        const updatedUsers = users.map(user =>
            user.id === userId ? { ...user, permissions: newPermissions } : user
        );
        setUsers(updatedUsers);
        // If the current user's permissions were changed, update the authenticatedUser state
        if (authenticatedUser && authenticatedUser.id === userId) {
            setAuthenticatedUser(updatedUsers.find(u => u.id === userId)!);
        }
    };

    const handleInviteUser = (name: string, email: string, role: Role) => {
        const newUser: User = {
            id: Date.now(), // simple unique ID for this example
            name,
            email,
            employeeId: `EMP-${String(Date.now()).slice(-4)}`, // Auto-generate a temp ID
            designation: role === 'admin' ? 'Administrator' : 'Team Member',
            department: 'Construction', // Default department for new users
            role,
            password: 'password123', // Default password for new users
            permissions: role === 'admin'
                ? { // Admin default permissions
                    dashboard: { view: true },
                    projectVisit: { view: true, edit: true },
                    lastVisitedProjects: { view: true },
                    projectCase: { view: true, edit: true },
                    projectCasesList: { view: true },
                    profile: { view: true, edit: true },
                    adminPanel: { view: true },
                    materialReceive: { view: true, edit: true },
                    materialReceiveList: { view: true },
                    systemManagement_addProject: { view: true, edit: true },
                    systemManagement_projectList: { view: true, edit: true },
                    systemManagement_dashboardSettings: { view: true, edit: true },
                    employeeProjectVisit: { view: true, edit: true },
                    sealPersonProjectVisit: { view: true, edit: true },
                    itResponseTimeline: { view: true, edit: true },
                    erpCorrectionReport: { view: true, edit: true },
                    constructionDutyAnalysis: { view: true, edit: true },
                    monthlyComparisonPrecision: { view: true, edit: true },
                    ssvDutyAnalysis: { view: true, edit: true },
                }
                : { // User default permissions
                    dashboard: { view: true },
                    projectVisit: { view: true, edit: true },
                    lastVisitedProjects: { view: true },
                    projectCase: { view: true, edit: false },
                    projectCasesList: { view: true },
                    profile: { view: true, edit: true },
                    adminPanel: { view: false },
                    materialReceive: { view: true, edit: true },
                    materialReceiveList: { view: false },
                    systemManagement_addProject: { view: false, edit: false },
                    systemManagement_projectList: { view: false, edit: false },
                    systemManagement_dashboardSettings: { view: false, edit: false },
                    employeeProjectVisit: { view: false, edit: false },
                    sealPersonProjectVisit: { view: false, edit: false },
                    itResponseTimeline: { view: false, edit: false },
                    erpCorrectionReport: { view: false, edit: false },
                    constructionDutyAnalysis: { view: false, edit: false },
                    monthlyComparisonPrecision: { view: false, edit: false },
                    ssvDutyAnalysis: { view: false, edit: false },
                },
        };
        setUsers(prevUsers => [...prevUsers, newUser]);
    };

    const handleUserUpdate = async (updatedData: Partial<Omit<User, 'id' | 'permissions' | 'role'>>) => {
        if (!authenticatedUser) return;

        showLoading();
        await new Promise(resolve => setTimeout(resolve, 700));

        const updatedUsers = users.map(user =>
            user.id === authenticatedUser.id ? { ...user, ...updatedData } : user
        );
        setUsers(updatedUsers);
        setAuthenticatedUser(prev => prev ? { ...prev, ...updatedData } : null);
        hideLoading();
    };
    
    const handleDeleteUser = async (userId: number) => {
        // Safety check: Admin cannot delete themselves.
        if (authenticatedUser && authenticatedUser.id === userId) {
            alert("Error: You cannot delete your own account.");
            return;
        }
        showLoading();
        await new Promise(resolve => setTimeout(resolve, 700));
        setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
        hideLoading();
    };

    const handlePasswordChangeByAdmin = async (userId: number, newPassword: string) => {
        // The AdminPanel modal has its own spinner, so we don't need the global one here.
        await new Promise(resolve => setTimeout(resolve, 700));
        const updatedUsers = users.map(user =>
            user.id === userId ? { ...user, password: newPassword } : user
        );
        setUsers(updatedUsers);
        alert(`Password for user ID ${userId} has been updated.`);
        console.log(`Admin updated password for user ID: ${userId}. New password: ${newPassword}`);
    };

    // Project Management Handlers
    const handleAddProject = async (projectData: Omit<Project, 'id'>) => {
        showLoading();
        await new Promise(resolve => setTimeout(resolve, 500));
        const newProject: Project = {
            id: Date.now(),
            ...projectData,
        };
        setProjects(prevProjects => [newProject, ...prevProjects].sort((a,b) => a.name.localeCompare(b.name)));
        hideLoading();
    };

    const handleUpdateProject = async (updatedProject: Project) => {
        showLoading();
        await new Promise(resolve => setTimeout(resolve, 500));
        setProjects(prevProjects =>
            prevProjects.map(p => p.id === updatedProject.id ? updatedProject : p)
        );
        hideLoading();
    };

    const handleDeleteProject = async (projectId: number) => {
        showLoading();
        await new Promise(resolve => setTimeout(resolve, 500));
        setProjects(prevProjects => prevProjects.filter(p => p.id !== projectId));
        hideLoading();
    };
    
    const handleUpdateFeaturedProject = async (newData: Partial<FeaturedProject>) => {
        showLoading();
        await new Promise(resolve => setTimeout(resolve, 500));
        setFeaturedProjects(prev => {
            const updatedProjects = [...prev];
            // Update the first project in the slideshow as a simple solution for the settings panel
            updatedProjects[0] = { ...updatedProjects[0], ...newData };
            return updatedProjects;
        });
        hideLoading();
    };

    const handleSplashAnimationEnd = () => {
        setSplashState('exiting');
        // Unmount after the fade-out animation completes (must match CSS)
        setTimeout(() => {
            setSplashState('hidden');
        }, 500);
    };

    const renderView = (currentUser: User) => {
        const permissions = currentUser.permissions;
        switch (activeView) {
            case 'projectVisit':
                return permissions.projectVisit.view ? <ProjectVisitForm currentUser={currentUser} projects={projects} /> : <AccessDenied />;
            case 'dashboard':
                 return permissions.dashboard.view ? <Dashboard onNavigate={handleNavigate} currentUser={currentUser} featuredProjects={featuredProjects} employeeVisits={employeeVisits} sealPersonVisits={sealPersonVisits} itAssignedIssues={itAssignedIssues} materialReceipts={materialReceipts} erpCorrectionRecords={erpCorrectionRecords} /> : <AccessDenied />;
            case 'profile':
                 return permissions.profile.view ? <Profile currentUser={currentUser} onUpdateUser={handleUserUpdate} initialState={viewState} /> : <AccessDenied />;
            case 'lastVisitedProjects':
                 return permissions.lastVisitedProjects.view ? <LastVisitedProjects currentUser={currentUser} /> : <AccessDenied />;
            case 'projectCase':
                 return permissions.projectCase.view ? <ProjectCaseForm currentUser={currentUser} projects={projects} /> : <AccessDenied />;
            case 'projectCasesList':
                 return permissions.projectCasesList.view ? <ProjectCasesList projects={projects} /> : <AccessDenied />;
            case 'materialReceive':
                 return permissions.materialReceive.view ? <MaterialReceiveForm currentUser={currentUser} projects={projects} /> : <AccessDenied />;
             case 'materialReceiveList':
                 return permissions.materialReceiveList.view ? <MaterialReceiveList currentUser={currentUser} projects={projects} /> : <AccessDenied />;
            case 'systemManagement':
                const canViewSystemManagement = permissions.systemManagement_addProject.view || permissions.systemManagement_projectList.view || permissions.systemManagement_dashboardSettings.view;
                return canViewSystemManagement 
                    ? <SystemManagement currentUser={currentUser} projects={projects} onAddProject={handleAddProject} onUpdateProject={handleUpdateProject} onDeleteProject={handleDeleteProject} featuredProject={featuredProjects[0]} onUpdateFeaturedProject={handleUpdateFeaturedProject} /> 
                    : <AccessDenied />;
            case 'adminPanel':
                return permissions.adminPanel.view ? <AdminPanel allUsers={users} onPermissionsChange={handlePermissionsChange} currentAdminId={currentUser.id} onInviteUser={handleInviteUser} onDeleteUser={handleDeleteUser} onPasswordChange={handlePasswordChangeByAdmin} originalAdminUser={originalAdminUser} onSwitchAccount={handleSwitchAccount} onSwitchBack={handleSwitchBackToAdmin} /> : <AccessDenied />;
            case 'employeeProjectVisit':
                return permissions.employeeProjectVisit.view ? <EmployeeProjectVisit currentUser={currentUser} projects={projects} visits={employeeVisits} onUpdateVisits={setEmployeeVisits} activeTab={epvActiveTab} onTabChange={setEpvActiveTab} /> : <AccessDenied />;
            case 'sealPersonProjectVisit':
                return permissions.sealPersonProjectVisit.view ? <SealPersonProjectVisit currentUser={currentUser} projects={projects} visits={sealPersonVisits} onUpdateVisits={setSealPersonVisits} activeTab={sppvActiveTab} onTabChange={setSppvActiveTab} /> : <AccessDenied />;
            case 'itResponseTimeline':
                return permissions.itResponseTimeline.view ? <ITResponseTimeline currentUser={currentUser} assignedIssues={itAssignedIssues} onUpdateAssignedIssues={setItAssignedIssues} activeTab={itrtActiveTab} onTabChange={setItrtActiveTab} /> : <AccessDenied />;
            case 'erpCorrectionReport':
                return permissions.erpCorrectionReport.view ? <ERPCorrectionReport currentUser={currentUser} reports={erpCorrectionRecords} onUpdateReports={setErpCorrectionRecords} activeTab={erpActiveTab} onTabChange={setErpActiveTab} /> : <AccessDenied />;
            case 'constructionDutyAnalysis':
                return permissions.constructionDutyAnalysis.view ? <ConstructionDutyAnalysis activeTab={cdaActiveTab} onTabChange={setCdaActiveTab} /> : <AccessDenied />;
            case 'monthlyComparisonPrecision':
                return permissions.monthlyComparisonPrecision.view ? <MonthlyComparisonPrecision currentUser={currentUser} projects={projects} visits={employeeVisits} onUpdateVisits={setEmployeeVisits} activeTab={mcpActiveTab} onTabChange={setMcpActiveTab} /> : <AccessDenied />;
            case 'ssvDutyAnalysis':
                return permissions.ssvDutyAnalysis.view ? <SSVDutyAnalysis currentUser={currentUser} activeTab={ssvDaActiveTab} onTabChange={setSsvDaActiveTab} /> : <AccessDenied />;
            default:
                 return permissions.dashboard.view ? <Dashboard onNavigate={handleNavigate} currentUser={currentUser} featuredProjects={featuredProjects} employeeVisits={employeeVisits} sealPersonVisits={sealPersonVisits} itAssignedIssues={itAssignedIssues} materialReceipts={materialReceipts} erpCorrectionRecords={erpCorrectionRecords} /> : <AccessDenied />;
        }
    };
    
    if (!authenticatedUser) {
        return <Login onLogin={handleLogin} />;
    }

    return (
        <>
            {splashState !== 'hidden' && (
                <SplashScreen 
                    user={authenticatedUser}
                    featuredProjects={featuredProjects}
                    onAnimationEnd={handleSplashAnimationEnd}
                    isExiting={splashState === 'exiting'}
                />
            )}

            <div 
                className={`relative z-50 bg-gray-50 text-slate-800 min-h-screen font-sans transition-all duration-700 ease-out ${splashState === 'visible' ? 'opacity-0 translate-y-12 pointer-events-none' : 'opacity-100 translate-y-0'}`}
                style={{'--sidebar-width': `${sidebarWidth}px`} as React.CSSProperties}
            >
                <Sidebar 
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                    activeView={activeView} 
                    onNavigate={handleNavigate}
                    currentUser={authenticatedUser}
                    onResize={handleSidebarResize}
                />
                <div className={`relative z-10 flex flex-col h-screen overflow-y-auto lg:ml-[var(--sidebar-width)]`}>
                    <Header 
                        onMenuClick={() => setIsSidebarOpen(prev => !prev)}
                        isSidebarOpen={isSidebarOpen}
                        title={viewTitles[activeView]}
                        activeView={activeView}
                        onNavigate={handleNavigate}
                        currentUser={authenticatedUser}
                        onLogout={handleLogout}
                        allUsers={users}
                        originalAdminUser={originalAdminUser}
                        onSwitchAccount={handleSwitchAccount}
                        onSwitchBack={handleSwitchBackToAdmin}
                        epvActiveTab={epvActiveTab}
                        onSetEpvActiveTab={setEpvActiveTab}
                        sppvActiveTab={sppvActiveTab}
                        onSetSppvActiveTab={setSppvActiveTab}
                        itrtActiveTab={itrtActiveTab}
                        onSetItrtActiveTab={setItrtActiveTab}
                        erpActiveTab={erpActiveTab}
                        onSetErpActiveTab={setErpActiveTab}
                        cdaActiveTab={cdaActiveTab}
                        onSetCdaActiveTab={setCdaActiveTab}
                        mcpActiveTab={mcpActiveTab}
                        onSetMcpActiveTab={setMcpActiveTab}
                        ssvDaActiveTab={ssvDaActiveTab}
                        onSetSsvDaActiveTab={setSsvDaActiveTab}
                    />
                    <main className={`flex-1 ${activeView === 'dashboard' ? '' : 'pt-28'}`}>
                        {renderView(authenticatedUser)}
                    </main>
                    <Footer />
                </div>
            </div>
        </>
    );
}

export default function App() {
    return (
        <LoadingProvider>
            <GlobalSpinner />
            <AppInner />
        </LoadingProvider>
    );
}