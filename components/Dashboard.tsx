import React, { useState, useEffect } from 'react';
import { View, User, FeaturedProject, EmployeeVisit, SealPersonVisit, ITAssignedIssue, MaterialReceiveItem, ERPCorrectionRecord } from '../types';
import AnalyticsOverview from './AnalyticsOverview';

interface DashboardProps {
  onNavigate: (view: View, state?: any) => void;
  currentUser: User;
  featuredProjects: FeaturedProject[];
  employeeVisits: EmployeeVisit[];
  sealPersonVisits: SealPersonVisit[];
  itAssignedIssues: ITAssignedIssue[];
  materialReceipts: MaterialReceiveItem[];
  erpCorrectionRecords: ERPCorrectionRecord[];
}

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const Dashboard: React.FC<DashboardProps> = ({ 
    onNavigate, 
    currentUser, 
    featuredProjects,
    employeeVisits,
    sealPersonVisits,
    itAssignedIssues,
    materialReceipts,
    erpCorrectionRecords,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const greeting = getGreeting();
  const firstName = currentUser.name.split(' ')[0];

  useEffect(() => {
    if (featuredProjects.length <= 1) return;
    const timer = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % featuredProjects.length);
    }, 5000); // Change image every 5 seconds
    return () => clearInterval(timer);
  }, [featuredProjects.length]);

  const currentProject = featuredProjects[currentIndex];

  const menuItems = [
    currentUser.permissions.constructionDutyAnalysis.view && {
        view: 'constructionDutyAnalysis',
        bg: 'from-purple-100 to-violet-200 hover:from-purple-200 hover:to-violet-300',
        border: 'border-purple-200 hover:border-purple-300',
        iconColor: 'text-purple-600',
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" /><path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" /></svg>,
        title: 'Construction Duty Analysis',
        textColor: 'text-purple-900',
        description: 'Analyze and cross-reference construction duty reports.'
    },
    currentUser.permissions.erpCorrectionReport.view && {
        view: 'erpCorrectionReport',
        bg: 'from-orange-100 to-red-200 hover:from-orange-200 hover:to-red-300',
        border: 'border-orange-200 hover:border-orange-300',
        iconColor: 'text-orange-600',
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm11.707 6.293a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 111.414-1.414L9 12.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>,
        title: 'ERP Correction Report',
        textColor: 'text-orange-900',
        description: 'View and manage ERP data corrections.'
    },
    currentUser.permissions.employeeProjectVisit.view && {
        view: 'employeeProjectVisit',
        bg: 'from-blue-100 to-indigo-200 hover:from-blue-200 hover:to-indigo-300',
        border: 'border-blue-200 hover:border-blue-300',
        iconColor: 'text-blue-600',
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0110 14.25a5 5 0 01-1.5-4.33A6.97 6.97 0 007 16c0 .34.024.673.07 1h5.86z" /></svg>,
        title: 'Employee Visits',
        textColor: 'text-blue-900',
        description: 'Log and review employee visits to project sites.'
    },
    currentUser.permissions.sealPersonProjectVisit.view && {
        view: 'sealPersonProjectVisit',
        bg: 'from-lime-100 to-green-200 hover:from-lime-200 hover:to-green-300',
        border: 'border-lime-200 hover:border-lime-300',
        iconColor: 'text-lime-600',
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>,
        title: 'Sales Person Visits',
        textColor: 'text-lime-900',
        description: 'Track sales team interactions with customers.'
    },
    currentUser.permissions.itResponseTimeline.view && {
        view: 'itResponseTimeline',
        bg: 'from-fuchsia-100 to-purple-200 hover:from-fuchsia-200 hover:to-purple-300',
        border: 'border-fuchsia-200 hover:border-fuchsia-300',
        iconColor: 'text-fuchsia-600',
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.415L11 9.586V6z" clipRule="evenodd" /></svg>,
        title: 'IT Response Time',
        textColor: 'text-fuchsia-900',
        description: 'Analyze IT support ticket resolution times.'
    },
    currentUser.permissions.projectVisit.view && {
        view: 'projectVisit',
        bg: 'from-teal-100 to-cyan-200 hover:from-teal-200 hover:to-cyan-300',
        border: 'border-teal-200 hover:border-teal-300',
        iconColor: 'text-teal-600',
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>,
        title: 'File a Site Report',
        textColor: 'text-teal-900',
        description: 'Log a new visit and report issues.'
    },
    currentUser.permissions.projectCase.view && {
        view: 'projectCase',
        bg: 'from-yellow-100 to-amber-200 hover:from-yellow-200 hover:to-amber-300',
        border: 'border-yellow-200 hover:border-yellow-300',
        iconColor: 'text-yellow-600',
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>,
        title: 'Create a Case File',
        textColor: 'text-yellow-900',
        description: 'Raise a project case for an issue.'
    }
  ].filter(Boolean) as any[];

  return (
    <div>
      {/* Featured Project Banner */}
      <div className="relative w-full h-[400px]">
        {featuredProjects.map((project, index) => (
             <img 
                key={index}
                src={project.image} 
                alt={project.title} 
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${index === currentIndex ? 'opacity-100' : 'opacity-0'}`}
            />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black/80 z-10"></div>
        
        {/* Centered Greeting */}
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-4">
            <h2 className="font-serif text-4xl font-bold text-white drop-shadow-lg">
                {greeting}, {firstName}
            </h2>
            <div className="w-32 h-px bg-orange-500 my-4"></div>
            <p className="font-sans text-lg text-white/90 drop-shadow-md">
                Your Eyes on Every Site, Ensuring Progress and Precision.
            </p>
        </div>

        {/* Bottom Project Info */}
        <div className="absolute bottom-0 left-0 p-6 md:p-8 z-20">
          <span className="bg-orange-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider shadow-lg">{currentProject.status}</span>
          <h3 className="text-4xl font-bold text-white mt-3 drop-shadow-md">{currentProject.title}</h3>
          <p className="text-slate-200 text-lg mt-1 drop-shadow-md">{currentProject.location}</p>
        </div>

        {/* Slideshow Navigation Dots */}
        <div className="absolute bottom-8 right-8 z-20 flex space-x-2">
            {featuredProjects.map((_, index) => (
                <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${index === currentIndex ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white'}`}
                    aria-label={`Go to slide ${index + 1}`}
                />
            ))}
        </div>
      </div>

      {/* Main dashboard content with padding */}
      <div className="p-4 sm:p-6 lg:p-8 space-y-12">
        {/* Quick Access Section */}
        <div>
            <div className="mb-6">
                <h3 className="text-2xl font-bold text-slate-800">Quick Access</h3>
                <p className="text-slate-500 mt-1">Jump directly to your most common tasks.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {menuItems.map((item, index) => (
                    <button
                        key={item.view}
                        onClick={() => onNavigate(item.view)}
                        className={`bg-gradient-to-br ${item.bg} border ${item.border} p-6 rounded-xl flex gap-4 text-left w-full transition-all duration-200 transform hover:-translate-y-1 shadow-sm hover:shadow-lg animate-card-fade-in-up`}
                        style={{ animationDelay: `${0.2 + index * 0.1}s` }}
                    >
                        <div className={item.iconColor}>
                            {item.icon}
                        </div>
                        <div>
                            <h3 className={`font-bold text-lg ${item.textColor}`}>{item.title}</h3>
                            <p className="text-sm text-slate-600 mt-1">{item.description}</p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
        
        {/* Analytics Section */}
        <div>
            <div className="mb-6">
                <h3 className="text-2xl font-bold text-slate-800">Analytics Overview</h3>
                <p className="text-slate-500 mt-1">A high-level look at key operational metrics.</p>
            </div>
            <AnalyticsOverview
                currentUser={currentUser}
                onNavigate={onNavigate}
                employeeVisits={employeeVisits}
                sealPersonVisits={sealPersonVisits}
                itAssignedIssues={itAssignedIssues}
                materialReceipts={materialReceipts}
                erpCorrectionRecords={erpCorrectionRecords}
            />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;