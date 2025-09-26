
import React, { useMemo } from 'react';
import { View, User, EmployeeVisit, SealPersonVisit, ITAssignedIssue, MaterialReceiveItem, ERPCorrectionRecord } from '../types';
import _ from 'lodash';

// --- Helper Functions ---
const parseDurationToSeconds = (durationStr: string): number => {
    if (!durationStr || typeof durationStr !== 'string') return 0;
    const parts = durationStr.split(':').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return 0;
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
};

const formatSecondsToHHMM = (totalSeconds: number): string => {
    if (isNaN(totalSeconds) || totalSeconds < 0) return '00:00';
    const totalMinutes = Math.round(Math.abs(totalSeconds) / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const parseDateTime = (dateStr: string, timeStr: string): Date | null => {
    if (!dateStr || !timeStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !/^\d{1,2}:\d{2}/.test(timeStr)) return null;
    const d = new Date(`${dateStr}T${timeStr}:00`);
    if (isNaN(d.getTime())) return null;
    return d;
};

// --- Child Components for the new design ---
const RadialProgress = ({ percentage, colorClass }: { percentage: number, colorClass: string }) => {
    const radius = 33;
    const circumference = 2 * Math.PI * radius;
    const clampedPercentage = Math.max(0, Math.min(percentage, 100));
    const offset = circumference - (clampedPercentage / 100) * circumference;

    return (
        <div className="relative h-20 w-20">
            <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
                <circle
                    className="text-black/10"
                    strokeWidth="8"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="40"
                    cy="40"
                />
                <circle
                    className={`${colorClass} animate-progress-draw`}
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference}
                    style={{ '--progress-offset': offset } as React.CSSProperties}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="40"
                    cy="40"
                />
            </svg>
             <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-lg font-bold ${colorClass}`}>
                    {Math.round(clampedPercentage)}%
                </span>
            </div>
        </div>
    );
};


interface AnalyticsCardProps {
  title: string;
  icon: React.ReactNode;
  mainStat: React.ReactNode;
  description: string;
  details: { label: string; value: React.ReactNode }[];
  colorScheme: string;
  onNavigate: () => void;
  permission: boolean;
  customVisual?: React.ReactNode;
}

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({ title, icon, mainStat, description, details, colorScheme, onNavigate, permission, customVisual }) => {
    const schemes: Record<string, { 
        gradient: string; 
        text: string; 
        iconBg: string; 
        iconText: string; 
        mainStatText: string; 
        descriptionText: string; 
        detailBg: string; 
        detailLabelText: string; 
        detailValueText: string; 
        buttonBg: string; 
        buttonText: string; 
        buttonHoverBg: string;
    }> = {
        blue: {
            gradient: 'from-blue-50 to-indigo-100',
            text: 'text-blue-900',
            iconBg: 'bg-blue-200/80',
            iconText: 'text-blue-600',
            mainStatText: 'text-blue-900',
            descriptionText: 'text-blue-800/90',
            detailBg: 'bg-blue-100/50',
            detailLabelText: 'text-blue-700',
            detailValueText: 'text-blue-900',
            buttonBg: 'bg-blue-500',
            buttonText: 'text-white',
            buttonHoverBg: 'hover:bg-blue-600',
        },
        green: {
            gradient: 'from-green-50 to-emerald-100',
            text: 'text-green-900',
            iconBg: 'bg-green-200/80',
            iconText: 'text-green-600',
            mainStatText: 'text-green-900',
            descriptionText: 'text-green-800/90',
            detailBg: 'bg-green-100/50',
            detailLabelText: 'text-green-700',
            detailValueText: 'text-green-900',
            buttonBg: 'bg-green-500',
            buttonText: 'text-white',
            buttonHoverBg: 'hover:bg-green-600',
        },
        purple: {
            gradient: 'from-purple-50 to-violet-100',
            text: 'text-purple-900',
            iconBg: 'bg-purple-200/80',
            iconText: 'text-purple-600',
            mainStatText: 'text-purple-900',
            descriptionText: 'text-purple-800/90',
            detailBg: 'bg-purple-100/50',
            detailLabelText: 'text-purple-700',
            detailValueText: 'text-purple-900',
            buttonBg: 'bg-purple-500',
            buttonText: 'text-white',
            buttonHoverBg: 'hover:bg-purple-600',
        },
        amber: {
            gradient: 'from-amber-50 to-orange-100',
            text: 'text-amber-900',
            iconBg: 'bg-amber-200/80',
            iconText: 'text-amber-600',
            mainStatText: 'text-amber-900',
            descriptionText: 'text-amber-800/90',
            detailBg: 'bg-amber-100/50',
            detailLabelText: 'text-amber-700',
            detailValueText: 'text-amber-900',
            buttonBg: 'bg-amber-500',
            buttonText: 'text-white',
            buttonHoverBg: 'hover:bg-amber-600',
        },
        rose: {
            gradient: 'from-rose-50 to-red-100',
            text: 'text-rose-900',
            iconBg: 'bg-rose-200/80',
            iconText: 'text-rose-600',
            mainStatText: 'text-rose-900',
            descriptionText: 'text-rose-800/90',
            detailBg: 'bg-rose-100/50',
            detailLabelText: 'text-rose-700',
            detailValueText: 'text-rose-900',
            buttonBg: 'bg-rose-500',
            buttonText: 'text-white',
            buttonHoverBg: 'hover:bg-rose-600',
        },
        teal: {
            gradient: 'from-teal-50 to-cyan-100',
            text: 'text-teal-900',
            iconBg: 'bg-teal-200/80',
            iconText: 'text-teal-600',
            mainStatText: 'text-teal-900',
            descriptionText: 'text-teal-800/90',
            detailBg: 'bg-teal-100/50',
            detailLabelText: 'text-teal-700',
            detailValueText: 'text-teal-900',
            buttonBg: 'bg-teal-500',
            buttonText: 'text-white',
            buttonHoverBg: 'hover:bg-teal-600',
        },
        slate: {
            gradient: 'from-slate-50 to-gray-100',
            text: 'text-slate-900',
            iconBg: 'bg-slate-200/80',
            iconText: 'text-slate-600',
            mainStatText: 'text-slate-900',
            descriptionText: 'text-slate-800/90',
            detailBg: 'bg-slate-100/50',
            detailLabelText: 'text-slate-700',
            detailValueText: 'text-slate-900',
            buttonBg: 'bg-slate-500',
            buttonText: 'text-white',
            buttonHoverBg: 'hover:bg-slate-600',
        },
    };

    const currentScheme = schemes[colorScheme];

    return (
        <div className={`relative bg-gradient-to-br ${currentScheme.gradient} p-5 rounded-2xl shadow-lg border border-black/5 overflow-hidden flex flex-col justify-between transition-all duration-300 transform hover:scale-[1.03] hover:shadow-2xl h-full`}>
            <div className="relative z-10 flex flex-col h-full">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <h3 className={`text-lg font-bold tracking-wide ${currentScheme.text}`}>{title}</h3>
                    <div className={`flex-shrink-0 h-10 w-10 rounded-lg ${currentScheme.iconBg} ${currentScheme.iconText} flex items-center justify-center shadow-inner`}>
                        {icon}
                    </div>
                </div>

                {/* Main Content */}
                <div className="relative flex-grow my-4 flex items-center justify-between">
                    <div className="flex-1">
                        <div className={`text-5xl font-extrabold drop-shadow-sm ${currentScheme.mainStatText}`}>{mainStat}</div>
                        <p className={`text-sm font-medium ${currentScheme.descriptionText} mt-1`}>{description}</p>
                    </div>
                     {customVisual && (
                        <div className="flex-shrink-0 -mr-3">
                            {customVisual}
                        </div>
                    )}
                </div>

                {/* Details Footer */}
                <div className="mt-auto space-y-2">
                    {details.map(stat => (
                        <div key={stat.label} className={`flex justify-between items-baseline text-sm ${currentScheme.detailBg} px-3 py-1.5 rounded-md`}>
                            <dt className={`font-medium ${currentScheme.detailLabelText}`}>{stat.label}</dt>
                            {/* FIX: The `title` attribute expects a string, but stat.value can be a ReactNode. Convert to string for primitives or ignore for elements. */}
                            <dd className={`font-semibold truncate ${currentScheme.detailValueText}`} title={React.isValidElement(stat.value) ? undefined : String(stat.value ?? '')}>{stat.value}</dd>
                        </div>
                    ))}
                </div>
            </div>
            {permission && (
                 <button onClick={onNavigate} className={`relative z-10 mt-5 w-full text-center py-2.5 ${currentScheme.buttonBg} ${currentScheme.buttonText} font-bold rounded-lg text-sm ${currentScheme.buttonHoverBg} transition-all duration-200 shadow-md hover:shadow-lg`}>
                    View Details &rarr;
                </button>
            )}
        </div>
    );
};

interface AnalyticsOverviewProps {
  onNavigate: (view: View, state?: any) => void;
  currentUser: User;
  employeeVisits: EmployeeVisit[];
  sealPersonVisits: SealPersonVisit[];
  itAssignedIssues: ITAssignedIssue[];
  materialReceipts: MaterialReceiveItem[];
  erpCorrectionRecords: ERPCorrectionRecord[];
}

const SALES_TEAMS = [
  { teamName: 'Team Nahid', leader: 'Nazmul Huda Nahid', members: ['Nazmul Huda Nahid', 'Md. Shakhawait Hossain Bhuiyan (Shojol)', 'Md. Saifullah Rochee'] },
  { teamName: 'Team Nurul', leader: 'Md. Nurul Haque', members: ['Md. Nurul Haque', 'Mohai Meen Al Abir', 'Md. Mamun Bhuiyan'] },
  { teamName: 'Team Trak', leader: 'Md. Tarikul Islam Tarek', members: ['Md. Tarikul Islam Tarek', 'Md. Nazrul Islam', 'Irfan Mahamood'] },
  { teamName: 'Team Jafor', leader: 'Md. Jafar Iqbal', members: ['Md. Jafar Iqbal', 'Md. Rubel Rana', 'Md. Dulal Hosen'] },
  { teamName: 'team Sazzad', leader: 'Md. Sazzad Hossain', members: ['Md. Sazzad Hossain', 'Abu Sadik Md. Nafi', 'Md. Sabbir Ahmed'] },
  { teamName: 'Team Saymon', leader: 'Md. Saymon Chowdhury', members: ['Md. Saymon Chowdhury', 'Md. Mahbub Alam', 'Md. Saidur Rahman'] },
  { teamName: 'Team Ahbab', leader: 'Md. Ahbabur Rahman Khan', members: ['Md. Ahbabur Rahman Khan', 'Ridoy Kumar Roy', 'Md. Shariful Islam'] },
  { teamName: 'Team Mustafiz', leader: 'Abu Raihan Al Mustafiz', members: ['Abu Raihan Al Mustafiz', 'Khondokar Ashduzzaman Parves', 'Riaz Sarker'] },
  { teamName: 'Team Mahamudul', leader: 'Md. Mahamudul Hasan Mani', members: ['Md. Mahamudul Hasan Mani', 'Md. Mustafizur Rahman', 'Md. Mosiur RAhman Siam'] },
];

const invalidCustomerNames = new Set(['self', 'n/a', '-', '']);

const calculateDurationInMinutes = (inTime: string, outTime: string): number | null => {
    if (!inTime || !outTime || inTime.toLowerCase() === 'n/a' || outTime.toLowerCase() === 'n/a') {
        return null;
    }
    const timeRegex = /^(\d{1,2}):(\d{2})/;
    const inMatch = String(inTime).match(timeRegex);
    const outMatch = String(outTime).match(timeRegex);
    if (!inMatch || !outMatch) return null;
    const inDate = new Date(0);
    inDate.setHours(parseInt(inMatch[1], 10), parseInt(inMatch[2], 10), 0, 0);
    const outDate = new Date(0);
    outDate.setHours(parseInt(outMatch[1], 10), parseInt(outMatch[2], 10), 0, 0);
    if (outDate < inDate) return null;
    const diffMs = outDate.getTime() - inDate.getTime();
    return Math.round(diffMs / 60000);
};


// --- Main Component ---
const AnalyticsOverview: React.FC<AnalyticsOverviewProps> = ({ 
    currentUser, 
    onNavigate,
    employeeVisits,
    sealPersonVisits,
    itAssignedIssues,
    materialReceipts,
    erpCorrectionRecords,
}) => {
    const { permissions } = currentUser;

    // --- Summarization Logic ---
    const employeeVisitSummary = useMemo(() => {
        const totalVisits = employeeVisits.length;
        const durationCounts = {
            'Under 5m': employeeVisits.filter(v => parseDurationToSeconds(v.duration) < 300).length,
            '5-19m': employeeVisits.filter(v => { const s = parseDurationToSeconds(v.duration); return s >= 300 && s < 1200; }).length,
            'Over 20m': employeeVisits.filter(v => parseDurationToSeconds(v.duration) >= 1200).length,
        };
        const topCategory = (Object.entries(durationCounts).sort((a, b) => b[1] - a[1])[0] || ['N/A'])[0];
        const totalDurationSec = _.sumBy(employeeVisits, v => parseDurationToSeconds(v.duration));

        return {
            totalVisits,
            uniqueEmployees: _.uniq(employeeVisits.map(v => v.visitorName)).length,
            uniqueProjects: _.uniq(employeeVisits.map(v => v.projectName)).length,
            totalDuration: formatSecondsToHHMM(totalDurationSec),
            avgDuration: formatSecondsToHHMM(totalVisits > 0 ? totalDurationSec / totalVisits : 0),
            busiestDay: (_.chain(employeeVisits).countBy('date').toPairs().maxBy(1).value() || ['N/A'])[0],
            durationCounts,
            topCategory,
        };
    }, [employeeVisits]);

    const monthlyComparisonSummary = useMemo(() => {
        const [year, month] = new Date().toISOString().slice(0, 7).split('-').map(Number);
        const currentMonthStr = `${year}-${String(month).padStart(2, '0')}`;
        const lastMonthDate = new Date(year, month - 2, 1);
        const lastMonthStr = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
        
        const currentVisits = employeeVisits.filter(v => v.date.startsWith(currentMonthStr));
        const lastMonthVisits = employeeVisits.filter(v => v.date.startsWith(lastMonthStr));
        const currentDuration = _.sumBy(currentVisits, v => parseDurationToSeconds(v.duration));
        const lastMonthDuration = _.sumBy(lastMonthVisits, v => parseDurationToSeconds(v.duration));
        const stability = lastMonthDuration > 0 ? ((currentDuration - lastMonthDuration) / lastMonthDuration) * 100 : currentDuration > 0 ? 100 : 0;
        
        return { 
            stability, 
            currentDuration: formatSecondsToHHMM(currentDuration),
            lastMonthDuration: formatSecondsToHHMM(lastMonthDuration),
        };
    }, [employeeVisits]);

    const sealPersonVisitSummary = useMemo(() => {
        // Engagement Metrics
        const visitsWithDuration = sealPersonVisits
            .map(v => ({ ...v, duration: calculateDurationInMinutes(v.inTime, v.outTime) }))
            .filter(v => v.duration !== null && v.duration >= 0);
        
        const totalDurationMinutes = _.sumBy(visitsWithDuration, 'duration');
        const avgDurationMinutes = visitsWithDuration.length > 0 ? totalDurationMinutes / visitsWithDuration.length : 0;
        
        const busiestProjectEntry = _.chain(sealPersonVisits).countBy('projectName').toPairs().maxBy(1).value();

        // Team Metrics
        const memberToTeamMap: { [key: string]: string } = {};
        SALES_TEAMS.forEach(team => {
            team.members.forEach(member => {
                memberToTeamMap[member] = team.teamName;
            });
        });

        const visitsWithTeam = sealPersonVisits.map(v => ({
            ...v,
            teamName: memberToTeamMap[v.salesPersonName] || 'Unassigned'
        }));

        const teamVisitCounts = _.countBy(visitsWithTeam, 'teamName');
        const topTeamEntry = _.chain(teamVisitCounts).toPairs().omit(['Unassigned']).maxBy(1).value();
        
        let topMemberInTopTeam = 'N/A';
        if (topTeamEntry) {
            const topTeamVisits = visitsWithTeam.filter(v => v.teamName === topTeamEntry[0]);
            const topMemberEntry = _.chain(topTeamVisits).countBy('salesPersonName').toPairs().maxBy(1).value();
            if(topMemberEntry) {
                topMemberInTopTeam = topMemberEntry[0];
            }
        }

        // General Summary
        const uniqueCustomers = _.uniqBy(
            sealPersonVisits.filter(v => v.customerName && !invalidCustomerNames.has(v.customerName.toLowerCase().trim())), 
            'customerId'
        ).length;

        return {
            totalVisits: sealPersonVisits.length,
            uniqueCustomers: uniqueCustomers,
            uniqueProjects: _.uniq(sealPersonVisits.map(v => v.projectName)).length,
            topTeamName: topTeamEntry ? topTeamEntry[0] : 'N/A',
            topTeamVisits: topTeamEntry ? topTeamEntry[1] as number : 0,
            topMemberInTopTeam,
            totalDuration: formatSecondsToHHMM(totalDurationMinutes * 60),
            avgDuration: `${Math.round(avgDurationMinutes)} min`,
            busiestProject: busiestProjectEntry ? busiestProjectEntry[0] : 'N/A',
        };
    }, [sealPersonVisits]);
    
    const itSummary = useMemo(() => {
        const totalIssues = itAssignedIssues.length;
        if (totalIssues === 0) {
            return {
                openIssues: 0,
                totalIssues: 0,
                resolutionRate: 0,
                topZone: { name: 'N/A', count: 0, projects: 0 },
                mostFrequent: { name: 'N/A', count: 0, topProject: 'N/A' },
            };
        }

        const openIssues = itAssignedIssues.filter(i => i.status === 'Issue').length;
        const resolvedIssues = totalIssues - openIssues;
        const resolutionRate = (resolvedIssues / totalIssues) * 100;

        const topZoneEntry = _.chain(itAssignedIssues)
            .groupBy('zone')
            .map((issuesInZone, zoneName) => ({
                name: zoneName,
                count: issuesInZone.length,
                projects: _.uniq(issuesInZone.map(i => i.projectName)).length,
            }))
            .orderBy(['count'], ['desc'])
            .first()
            .value();

        const mostFrequentEntry = _.chain(itAssignedIssues)
            .groupBy('issue')
            .map((issues, issueName) => ({
                name: issueName,
                count: issues.length,
                topProject: (_.chain(issues).countBy('projectName').toPairs().maxBy(1).value() || ['N/A'])[0]
            }))
            .orderBy(['count'], ['desc'])
            .first()
            .value();

        return {
            openIssues,
            totalIssues,
            resolutionRate,
            topZone: topZoneEntry || { name: 'N/A', count: 0, projects: 0 },
            mostFrequent: mostFrequentEntry || { name: 'N/A', count: 0, topProject: 'N/A' },
        };
    }, [itAssignedIssues]);

    const constructionAnalysisSummary = useMemo(() => {
        const rmcData = materialReceipts.filter(m => m.materialName?.toLowerCase().includes('rmc'));
        if (rmcData.length === 0 || employeeVisits.length === 0) return { totalRMC: rmcData.length, matches: 0, matchRate: 0 };
        
        let matches = 0;
        rmcData.forEach(material => {
            const materialDateTime = parseDateTime(material.receivingDate, material.receivingTime);
            if (!materialDateTime) return;
            const windowStart = new Date(materialDateTime.getTime() - 30 * 60 * 1000);
            const windowEnd = new Date(materialDateTime.getTime() + 30 * 60 * 1000);
            if (employeeVisits.some(v => v.projectName === material.projectName && v.date === material.receivingDate && parseDateTime(v.date, v.entryTime)! <= windowEnd && parseDateTime(v.date, v.outTime)! >= windowStart)) {
                matches++;
            }
        });
        
        return { totalRMC: rmcData.length, matches, matchRate: rmcData.length > 0 ? (matches / rmcData.length) * 100 : 0 };
    }, [materialReceipts, employeeVisits]);

    const erpCorrectionSummary = useMemo(() => {
        const totalReports = erpCorrectionRecords.length;
        const pendingReports = erpCorrectionRecords.filter(r => r.status === 'Pending').length;
        
        let topDepartment = 'N/A';
        if (totalReports > 0) {
            const countsByDept = _.countBy(erpCorrectionRecords, 'department');
            const pairs = _.toPairs(countsByDept);
            const topPair = _.maxBy(pairs, pair => pair[1]);
            if (topPair) {
                topDepartment = topPair[0];
            }
        }

        const completedThisMonth = erpCorrectionRecords.filter(r => {
            if (r.status !== 'Completed' || !r.completedDate) return false;
            const completedDate = new Date(r.completedDate);
            const today = new Date();
            return completedDate.getFullYear() === today.getFullYear() && completedDate.getMonth() === today.getMonth();
        }).length;
        
        return {
            totalReports,
            pendingReports,
            topDepartment,
            completedThisMonth
        };
    }, [erpCorrectionRecords]);

    // --- Card Definitions ---
    const stabilityValue = monthlyComparisonSummary.stability;
    const stabilityText = `${Math.abs(stabilityValue).toFixed(1)}%`;
    const StabilityIcon = stabilityValue > 0 
        ? () => <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
        : stabilityValue < 0 
        ? () => <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
        : () => <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 10a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1z" clipRule="evenodd" /></svg>;
    const stabilityColor = stabilityValue > 0 ? 'text-green-600' : stabilityValue < 0 ? 'text-red-600' : 'text-amber-600';
    
    const surveillanceCards = [
        permissions.employeeProjectVisit.view && {
            title: "Total Visits", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0110 14.25a5 5 0 01-1.5-4.33A6.97 6.97 0 007 16c0 .34.024.673.07 1h5.86z" /></svg>, colorScheme: "blue", mainStat: employeeVisitSummary.totalVisits, description: "Recorded Visits", details: [{ label: 'Unique Employees', value: employeeVisitSummary.uniqueEmployees }, { label: 'Unique Projects', value: employeeVisitSummary.uniqueProjects },], permission: true, onNavigate: () => onNavigate('employeeProjectVisit')
        },
        permissions.employeeProjectVisit.view && {
            title: "Visit Duration", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.415L11 9.586V6z" clipRule="evenodd" /></svg>, colorScheme: "purple", mainStat: employeeVisitSummary.totalDuration, description: "Total Hours On-Site", details: [{ label: 'Avg. Duration', value: `${employeeVisitSummary.avgDuration} hrs` }, { label: 'Busiest Day', value: employeeVisitSummary.busiestDay },], permission: true, onNavigate: () => onNavigate('employeeProjectVisit')
        },
        permissions.monthlyComparisonPrecision.view && {
            title: "Performance Stability", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L12 11.586l3.293-3.293V7h-1z" clipRule="evenodd" /></svg>, colorScheme: "green", mainStat: <div className={`flex items-center gap-2 ${stabilityColor}`}><StabilityIcon/>{stabilityText}</div>, description: "vs. Last Month", details: [{ label: 'Current Month Duration', value: `${monthlyComparisonSummary.currentDuration} hrs` }, { label: 'Last Month Duration', value: `${monthlyComparisonSummary.lastMonthDuration} hrs` },], permission: true, onNavigate: () => onNavigate('monthlyComparisonPrecision')
        },
        permissions.sealPersonProjectVisit.view && {
            title: "Sales Visit Summary", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>, colorScheme: "purple", mainStat: sealPersonVisitSummary.totalVisits, description: "Total Recorded Visits", details: [{ label: 'Unique Customers', value: sealPersonVisitSummary.uniqueCustomers }, { label: 'Unique Projects', value: sealPersonVisitSummary.uniqueProjects },], permission: true, onNavigate: () => onNavigate('sealPersonProjectVisit')
        },
        permissions.itResponseTimeline.view && {
            title: "IT Issue Summary", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>, colorScheme: "amber", mainStat: itSummary.openIssues, description: "Currently Open Issues", details: [{ label: 'Total Recorded', value: itSummary.totalIssues }, { label: 'Resolution Rate', value: `${itSummary.resolutionRate.toFixed(1)}%` },], permission: true, onNavigate: () => onNavigate('itResponseTimeline')
        },
        permissions.constructionDutyAnalysis.view && {
            title: "RMC Duty Analysis", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" /><path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" /></svg>, colorScheme: "rose", mainStat: `${constructionAnalysisSummary.matchRate.toFixed(1)}%`, description: "RMC Visit Match Rate", details: [{ label: 'RMC Deliveries', value: constructionAnalysisSummary.totalRMC }, { label: 'Matching Visits', value: constructionAnalysisSummary.matches },], permission: permissions.constructionDutyAnalysis.view, onNavigate: () => onNavigate('constructionDutyAnalysis'), customVisual: <RadialProgress percentage={constructionAnalysisSummary.matchRate} colorClass="text-rose-500" />
        },
    ].filter(Boolean);

    const erpCard = permissions.erpCorrectionReport.view ? {
        title: "ERP Corrections", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm11.707 6.293a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 111.414-1.414L9 12.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>, colorScheme: "teal", mainStat: erpCorrectionSummary.pendingReports, description: "Pending Reports", details: [{ label: 'Total Recorded', value: erpCorrectionSummary.totalReports }, { label: 'Completed (This Month)', value: erpCorrectionSummary.completedThisMonth }, { label: 'Top Dept. with Issues', value: _.truncate(String(erpCorrectionSummary.topDepartment), { length: 24 }) },], permission: permissions.erpCorrectionReport.view, onNavigate: () => onNavigate('erpCorrectionReport')
    } : null;

    const systemCard = {
        title: "API & Backend", icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>, colorScheme: "slate", mainStat: <span className="text-green-600">Operational</span>, description: "System Status", details: [{ label: 'Avg. Latency', value: '45ms' }, { label: 'Uptime (30d)', value: '99.98%' },], permission: false, onNavigate: () => {}
    };

    const hasSurveillancePermission = surveillanceCards.length > 0;
    const hasErpPermission = !!erpCard;

    return (
        <div className="space-y-12">
            {hasSurveillancePermission && (
                <div>
                    <h4 className="text-xl font-bold text-slate-700 mb-4 pb-2 border-b border-slate-200 animate-card-fade-in-up" style={{ animationDelay: '0.2s' }}>Surveillance Report Summary</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {surveillanceCards.map((card: any, index) => (
                            <div key={card.title} className="animate-card-fade-in-up" style={{ animationDelay: `${0.3 + index * 0.05}s` }}>
                                <AnalyticsCard {...card} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {hasErpPermission && erpCard && (
                <div>
                    <h4 className="text-xl font-bold text-slate-700 mb-4 pb-2 border-b border-slate-200 animate-card-fade-in-up" style={{ animationDelay: '0.4s' }}>ERP Correction Summary</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                         <div className="animate-card-fade-in-up" style={{ animationDelay: '0.5s' }}>
                            <AnalyticsCard {...erpCard} />
                        </div>
                    </div>
                </div>
            )}

            <div>
                <h4 className="text-xl font-bold text-slate-700 mb-4 pb-2 border-b border-slate-200 animate-card-fade-in-up" style={{ animationDelay: '0.6s' }}>System Status</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <div className="animate-card-fade-in-up" style={{ animationDelay: '0.7s' }}>
                        <AnalyticsCard {...systemCard} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsOverview;
