


import React, { useState, useMemo, useRef, useEffect } from 'react';
import { EmployeeVisit, User } from '../types';
import _ from 'lodash';
import SearchableSelect from './SearchableSelect';
import { DESIGNATIONS } from '../constants';
import FeedbackMessage from './FeedbackMessage';
import ChangeIcon from './ChangeIcon';
import { useLoading } from '../contexts/LoadingContext';
// FIX: Changed to a named import to match the export from PdfExport.tsx
import { PdfExport } from './PdfExport';

// For TypeScript to recognize libraries loaded from CDN
declare global {
    interface Window {
        jspdf: any;
        Papa: any;
        html2canvas: any;
    }
}

// Define the specific designations for the Project Side group
export const PROJECT_SIDE_INVENTORY_DESIGNATIONS = new Set([
    'Assistant Project Accountant (CH)',
    'Site Accountant (CH)',
]);


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
    const sign = totalSeconds < 0 ? '-' : '';
    const absSeconds = Math.abs(totalSeconds);

    // Round to the nearest minute for accuracy
    const totalMinutes = Math.round(absSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const formatStabilityValue = (value: number): string => {
    const icon = value > 0 ? '▲' : value < 0 ? '▼' : '–';
    return `${icon} ${Math.abs(value).toFixed(2)}%`;
};

const EXEMPT_DEPARTMENTS = new Set([
  'Internal Audit',
  'Brand Management',
  'Planning & Design (Architectural)',
  'Electro-Mechanical',
  'Information Technology (IT)',
  'Management Information System (MIS)',
  'Material Quality Assurance & Purchase',
]);


interface SupposedlyDurations {
    durationForDisplaySec: number;
    durationForCalcSec: number;
}

/**
 * Encapsulates the business logic for determining visit durations.
 * Returns both the duration for UI display and the duration for percentage calculations.
 * @param department The employee's department.
 * @param designation The employee's designation.
 * @returns An object with durations for display and calculation.
 */
const getSupposedlyDurations = (department: string, designation: string): SupposedlyDurations => {
    const isExempt = EXEMPT_DEPARTMENTS.has(department);
    
    // Rule 1: Exempt departments have a 0hr target but are measured against a 4hr baseline for stability.
    if (isExempt) {
        return { durationForDisplaySec: 0, durationForCalcSec: 4 * 3600 };
    }
    
    // Rule 2: Inventory Project Side roles have a 6hr target.
    if (department === 'Inventory Mgt.' && PROJECT_SIDE_INVENTORY_DESIGNATIONS.has(designation)) {
        return { durationForDisplaySec: 4 * 3600, durationForCalcSec: 4 * 3600 };
    }
    // Rule 3: Inventory Project Side roles have a 6hr target.
    if (department === 'Inventory Mgt. (Project Side)' && PROJECT_SIDE_INVENTORY_DESIGNATIONS.has(designation)) {
        return { durationForDisplaySec: 6 * 3600, durationForCalcSec: 6 * 3600 };
    }
    // Rule 4: HR & Security have a 7hr target.
    if (department === 'HR & Admin (Security)' || department === 'HR & Admin (Security)') {
        return { durationForDisplaySec: 7 * 3600, durationForCalcSec: 7 * 3600 };
    }
    
    // Default Rule: All others have a 4hr target.
    return { durationForDisplaySec: 4 * 3600, durationForCalcSec: 4 * 3600 };
};


export interface SummaryDataRow {
    department: string;
    visitorName: string;
    designation: string;
    totalWorkingDay: number;
    totalVisitedDay: number;
    previousVisitedProjectCount: number;
    totalVisitedProjectCount: number;
    durationCount: {
        moreThan20: number;
        tenTo19: number;
        fiveTo9: number;
        lessThan5: number;
    };
    supposedlyVisitDurationDay: string;
    supposedlyVisitDurationMonth: string;
    currentMonthActualDuration: string;
    currentMonthDurationPercentage: number;
    lastMonthActualDuration: string;
    lastMonthDurationPercentage: number;
    currentStability: number;
    lastMonthPerDayAverage: string;
    currentMonthDayAverage: string;
    averageStability: number;
}

// New interface for multi-month data
interface MultiMonthDataRow {
    visitorName: string;
    department: string;
    designation: string;
    monthlyMetrics: {
        [month: string]: {
            actualDuration: string;
            achievedPercentage: number;
            totalVisits: number;
            avgDailyDuration: string;
        }
    };
    trend: number; // Overall stability/trend over the period
}

interface AllDepartmentSummaryProps {
    visits: EmployeeVisit[];
    departments: string[];
    currentUser: User;
    analysisMode?: 'single-month-comparison' | 'multi-month';
}

// --- Department and Designation Sorting Order ---
const departmentOrder = [
  'Construction',
  'Inventory Mgt.',
  'Inventory Mgt. (Project Side)'
  'Internal Audit',
  'Quality Assurance',
  'HR & Admin (Security)',
  'Planning & Design (Architectural)',
  'Electro-Mechanical',
  'Information Technology',
  'Material Quality Assurance & Purchase'
];

const designationOrderByDept: Record<string, string[]> = {
  'Construction': [
    'Director', 'AGM', 'D.M', 'Deputy Manager', 'Asst. Manager', 'Asst. Manager [for construction]'
  ],
  'Inventory Mgt.': [
    'Deputy Manager', 'Asst. Manager', 'Senior Executive', 'Site Accountant (CH)', 'Assistant Project Accountant (CH)', 'Assistant Project Accountant (CH) [for Inventory Mgt.]'
  ],
    'Inventory Mgt. (Project Side)': [
    'Deputy Manager', 'Asst. Manager', 'Senior Executive', 'Site Accountant (CH)', 'Assistant Project Accountant (CH)', 'Assistant Project Accountant (CH) [for Inventory Mgt.]'
  ],
  'Internal Audit': [
    'Deputy Manager', 'Junior Executive',
  ],
  'Quality Assurance': [
    'Manager', 'Asst. Manager', 'Sr. Executive', 'Sr. Executive [Quality Assurance]'
  ],
  'HR & Admin (Security)': [
    'Sr. Manager', 'Manager', 'Asst. Manager', 'Executive', 'Security Supervisor [For HR & Admin (Security)]'
  ],
  'Planning & Design (Architectural)': [
    'Associate Architect', 'Senior Assistant Architect', 'Assistant Architect', 'Junior Architect', 'Junior Surveyor', 'Junior Architect [for Planning & Design (Architectural)]'
  ],
  'Electro-Mechanical': [
    'AGM', 'Senior Executive', 'Executive', 'Junior Executive', 'Electrician', 'Electrician [for Electro-Mechanical]'
  ],
  'Information Technology': [
    'Senior Executive', 'IT Technician', 'Intern [for Information technology]'
  ],
  'Material Quality Assurance & Purchase': [
    'Head of Procurement', 'Manager', 'Assistant Manager', 'Senior Executive', 'Executive', 'Junior Executive', 'Junior Executive [for Material Quality Assurance & Purchase]'
  ]
};

const getMonthsInRange = (startMonth: string, endMonth: string): string[] => {
    const start = new Date(startMonth + '-01T00:00:00Z');
    const end = new Date(endMonth + '-01T00:00:00Z');
    const months: string[] = [];
    let current = start;
  
    while (current <= end) {
      months.push(current.toISOString().slice(0, 7)); // "YYYY-MM"
      current.setUTCMonth(current.getUTCMonth() + 1);
    }
    return months;
};

const AllDepartmentSummary: React.FC<AllDepartmentSummaryProps> = ({ visits, departments, currentUser, analysisMode = 'single-month-comparison' }) => {
    const today = new Date();
    const latestMonthFromData = useMemo(() => {
        if (visits.length > 0) {
            const latestVisit = _.maxBy(visits, 'date');
            if (latestVisit) {
                const latestDate = new Date(latestVisit.date);
                return `${latestDate.getFullYear()}-${String(latestDate.getMonth() + 1).padStart(2, '0')}`;
            }
        }
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    }, [visits]);
    
    const [selectedMonth, setSelectedMonth] = useState(latestMonthFromData);
    
    // State for multi-month mode
    const [startMonth, setStartMonth] = useState(() => {
        const d = new Date(latestMonthFromData);
        d.setMonth(d.getMonth() - 2);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const [endMonth, setEndMonth] = useState(latestMonthFromData);
    const [rangeError, setRangeError] = useState('');

    const [departmentFilter, setDepartmentFilter] = useState('');
    const [employeeFilter, setEmployeeFilter] = useState('');
    const [workingDays, setWorkingDays] = useState<Record<string, number>>({});
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [customDurations, setCustomDurations] = useState<Record<string, string>>({});
    const [feedback, setFeedback] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

    // State for configurable working days
    const [defaultCurrentWorkingDays, setDefaultCurrentWorkingDays] = useState('25');
    const [defaultLastWorkingDays, setDefaultLastWorkingDays] = useState('26');
    const [securityCurrentWorkingDays, setSecurityCurrentWorkingDays] = useState('');
    const [securityLastWorkingDays, setSecurityLastWorkingDays] = useState('');
    const [officeCurrentWorkingDays, setOfficeCurrentWorkingDays] = useState('');
    const [officeLastWorkingDays, setOfficeLastWorkingDays] = useState('');

    const containerRef = useRef<HTMLDivElement>(null);
    const contentToPrintRef = useRef<HTMLDivElement>(null);
    const theadRef = useRef<HTMLTableSectionElement>(null);
    const workingDayFileInputRef = useRef<HTMLInputElement>(null);
    const { showLoading, hideLoading } = useLoading();

    // --- STICKY HEADER POSITIONING CONSTANTS ---
    const THEAD_HEIGHT = 53; // in px, from observation/estimation
    const DEPT_HEADER_HEIGHT = 32; // in px, estimation for a row with p-2
    const SUMMARY_ROW_HEIGHT = 52; // in px, estimation for the new summary row
    const topForDeptHeader = THEAD_HEIGHT;
    const topForSummaryRow = topForDeptHeader + DEPT_HEADER_HEIGHT;
    const topForSubgroupHeader = topForSummaryRow + SUMMARY_ROW_HEIGHT;

    const { departmentOrderMap, designationOrderMaps } = useMemo(() => {
        const deptMap = new Map(departmentOrder.map((dept, index) => [dept, index]));
        const desigMaps = Object.fromEntries(
            Object.entries(designationOrderByDept).map(([dept, designations]) => [
                dept,
                new Map(designations.map((desig, index) => [desig, index]))
            ])
        );
        return { departmentOrderMap: deptMap, designationOrderMaps: desigMaps };
    }, []);
    
    useEffect(() => {
        setSelectedMonth(latestMonthFromData);
    }, [latestMonthFromData]);
    
    useEffect(() => {
        if (analysisMode !== 'multi-month') return;
        const months = getMonthsInRange(startMonth, endMonth);
        if (months.length > 6) {
            setRangeError('The date range cannot exceed 6 months.');
        } else if (startMonth > endMonth) {
            setRangeError('Start month cannot be after end month.');
        } else {
            setRangeError('');
        }
    }, [startMonth, endMonth, analysisMode]);

    const { currentMonthName, lastMonthName } = useMemo(() => {
        if (!selectedMonth) return { currentMonthName: 'Current', lastMonthName: 'Last' };
        const [year, month] = selectedMonth.split('-').map(Number);
        const current = new Date(year, month - 1, 1);
        const last = new Date(year, month - 2, 1);
        const nameFormat = { month: 'short' as const };
        return {
            currentMonthName: current.toLocaleString('en-US', nameFormat),
            lastMonthName: last.toLocaleString('en-US', nameFormat),
        };
    }, [selectedMonth]);
    
    // --- Full Screen Logic ---
    const handleToggleFullScreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch(err => {
                alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    useEffect(() => {
        const handleFullScreenChange = () => {
            setIsFullScreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullScreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullScreenChange);
        };
    }, []);

    const handleWorkingDaysChange = (employeeName: string, days: string) => {
        const numDays = parseInt(days, 10);
        if (days === '') {
            setWorkingDays(prev => {
                const newState = { ...prev };
                delete newState[employeeName];
                return newState;
            });
        } else if (!isNaN(numDays) && numDays >= 0 && numDays <= 31) {
            setWorkingDays(prev => ({ ...prev, [employeeName]: numDays }));
        }
    };
    
    const handleCustomDurationChange = (department: string, hours: string) => {
        // Allow empty string, numbers, and a single decimal point.
        if (hours === '' || /^[0-9]*\.?[0-9]*$/.test(hours)) {
            setCustomDurations(prev => ({ ...prev, [department]: hours }));
        }
    };
    
    // Existing summaryData logic for single-month-comparison
    const summaryData = useMemo<SummaryDataRow[]>(() => {
        if (analysisMode !== 'single-month-comparison') return [];
        
        const [year, month] = selectedMonth.split('-').map(Number); // month is 1-based

        let lastMonthYear = year;
        let lastMonth = month - 1;
        if (lastMonth === 0) {
            lastMonth = 12;
            lastMonthYear = year - 1;
        }

        const currentVisits = visits.filter(v => {
            if (!v.date || !/^\d{4}-\d{2}-\d{2}$/.test(v.date)) return false;
            const [visitYear, visitMonth] = v.date.split('-').map(Number);
            return visitYear === year && visitMonth === month;
        });

        const lastMonthVisits = visits.filter(v => {
            if (!v.date || !/^\d{4}-\d{2}-\d{2}$/.test(v.date)) return false;
            const [visitYear, visitMonth] = v.date.split('-').map(Number);
            return visitYear === lastMonthYear && visitMonth === lastMonth;
        });
        
        const employeeNamesWithVisits = _.uniq(visits.map(v => v.visitorName));

        const numDefaultCurrentWD = parseInt(defaultCurrentWorkingDays, 10) || 0;
        const numDefaultLastWD = parseInt(defaultLastWorkingDays, 10) || 0;
        const numSecurityCurrentWD = parseInt(securityCurrentWorkingDays, 10);
        const numSecurityLastWD = parseInt(securityLastWorkingDays, 10);
        const numOfficeCurrentWD = parseInt(officeCurrentWorkingDays, 10);
        const numOfficeLastWD = parseInt(officeLastWorkingDays, 10);

        const calculatedData = employeeNamesWithVisits
            .map(employeeName => {
            const allVisitsForEmployee = visits.filter(v => v.visitorName === employeeName);
            if (allVisitsForEmployee.length === 0) return null;

            const employeeVisits = currentVisits.filter(v => v.visitorName === employeeName);
            const employeeLastMonthVisits = lastMonthVisits.filter(v => v.visitorName === employeeName);

            const firstVisit = allVisitsForEmployee[0];
            const { department, designation } = firstVisit;
            
            const customDurationInput = customDurations[department];
            let { durationForDisplaySec, durationForCalcSec } = getSupposedlyDurations(department, designation);

            if (customDurationInput !== undefined && customDurationInput.trim() !== '') {
                const customHours = parseFloat(customDurationInput);
                if (!isNaN(customHours) && customHours >= 0) {
                    durationForDisplaySec = customHours * 3600;
                    if (customHours === 0) {
                        durationForCalcSec = 4 * 3600; 
                    } else {
                        durationForCalcSec = customHours * 3600;
                    }
                }
            }
            
            const isSecurity = department.toLowerCase().includes('security');
            
            let wd: number;
            if (workingDays[employeeName] !== undefined) {
                wd = workingDays[employeeName];
            } else if (isSecurity && !isNaN(numSecurityCurrentWD)) {
                wd = numSecurityCurrentWD;
            } else {
                wd = numDefaultCurrentWD;
            }
            
            const lastMonthWorkingDays = 
                (isSecurity && !isNaN(numSecurityLastWD)) ? numSecurityLastWD :
                numDefaultLastWD;

            const totalVisitedDay = _.uniqBy(employeeVisits, 'date').length;
            const totalVisitedProjectCount = _.uniqBy(employeeVisits, 'projectName').length;
            const previousVisitedProjectCount = _.uniqBy(employeeLastMonthVisits, 'projectName').length;

            const currentMonthActualDurationSec = _.sumBy(employeeVisits, v => parseDurationToSeconds(v.duration));
            const supposedlyDurationMonthSec = wd * durationForDisplaySec; 
            
            const supposedlyDurationMonthSec_forCalc = wd * durationForCalcSec;
            const currentMonthDurationPercentage = supposedlyDurationMonthSec_forCalc > 0 ? (currentMonthActualDurationSec / supposedlyDurationMonthSec_forCalc) * 100 : 0;
            
            const durationCount = {
                moreThan20: employeeVisits.filter(v => parseDurationToSeconds(v.duration) >= 1200).length,
                tenTo19: employeeVisits.filter(v => { const s = parseDurationToSeconds(v.duration); return s >= 600 && s < 1200; }).length,
                fiveTo9: employeeVisits.filter(v => { const s = parseDurationToSeconds(v.duration); return s >= 300 && s < 600; }).length,
                lessThan5: employeeVisits.filter(v => parseDurationToSeconds(v.duration) < 300).length,
            };

            const lastMonthActualDurationSec = _.sumBy(employeeLastMonthVisits, v => parseDurationToSeconds(v.duration));
            const lastMonthSupposedlyDurationMonthSec_forCalc = lastMonthWorkingDays * durationForCalcSec;
            const lastMonthDurationPercentage = lastMonthSupposedlyDurationMonthSec_forCalc > 0 ? (lastMonthActualDurationSec / lastMonthSupposedlyDurationMonthSec_forCalc) * 100 : 0;
            
            const currentMonthAvgDivisor = !isNaN(numOfficeCurrentWD) && numOfficeCurrentWD > 0 ? numOfficeCurrentWD : numDefaultCurrentWD;
            const lastMonthAvgDivisor = !isNaN(numOfficeLastWD) && numOfficeLastWD > 0 ? numOfficeLastWD : numDefaultLastWD;
            
            const currentMonthDayAverageSec = currentMonthAvgDivisor > 0 ? currentMonthActualDurationSec / currentMonthAvgDivisor : 0;
            const lastMonthPerDayAverageSec = lastMonthAvgDivisor > 0 ? lastMonthActualDurationSec / lastMonthAvgDivisor : 0;
            
            const currentStability = currentMonthDurationPercentage - lastMonthDurationPercentage;
            
            let averageStabilityPercentage = 0;
            if (lastMonthPerDayAverageSec > 0) {
                averageStabilityPercentage = ((currentMonthDayAverageSec - lastMonthPerDayAverageSec) / lastMonthPerDayAverageSec) * 100;
            } else if (lastMonthPerDayAverageSec === 0 && currentMonthDayAverageSec > 0) {
                averageStabilityPercentage = 100.0;
            }

            return {
                department: department,
                visitorName: employeeName,
                designation: designation,
                totalWorkingDay: wd,
                totalVisitedDay,
                previousVisitedProjectCount,
                totalVisitedProjectCount,
                durationCount,
                supposedlyVisitDurationDay: formatSecondsToHHMM(durationForDisplaySec),
                supposedlyVisitDurationMonth: formatSecondsToHHMM(supposedlyDurationMonthSec),
                currentMonthActualDuration: formatSecondsToHHMM(currentMonthActualDurationSec),
                currentMonthDurationPercentage,
                lastMonthActualDuration: formatSecondsToHHMM(lastMonthActualDurationSec),
                lastMonthDurationPercentage,
                currentStability,
                lastMonthPerDayAverage: formatSecondsToHHMM(lastMonthPerDayAverageSec),
                currentMonthDayAverage: formatSecondsToHHMM(currentMonthDayAverageSec),
                averageStability: averageStabilityPercentage,
            };
        }).filter((item): item is SummaryDataRow => item !== null);
        return calculatedData;
    }, [selectedMonth, visits, workingDays, defaultCurrentWorkingDays, defaultLastWorkingDays, securityCurrentWorkingDays, securityLastWorkingDays, officeCurrentWorkingDays, officeLastWorkingDays, customDurations, analysisMode]);
    
    // New memo for multi-month data
    const multiMonthSummaryData = useMemo<MultiMonthDataRow[]>(() => {
        if (analysisMode !== 'multi-month' || rangeError) return [];
        
        const months = getMonthsInRange(startMonth, endMonth);
        const employeeNames = _.uniq(visits.map(v => v.visitorName));

        return employeeNames
            .map(name => {
                const allVisitsForEmployee = visits.filter(v => v.visitorName === name);
                if (allVisitsForEmployee.length === 0) return null;

                const { department, designation } = allVisitsForEmployee[0];
                const monthlyMetrics: MultiMonthDataRow['monthlyMetrics'] = {};
                const percentages: number[] = [];

                months.forEach(monthStr => {
                    const [year, month] = monthStr.split('-').map(Number);
                    const visitsInMonth = allVisitsForEmployee.filter(v => v.date.startsWith(monthStr));
                    
                    const { durationForCalcSec } = getSupposedlyDurations(department, designation);
                    const wd = parseInt(defaultCurrentWorkingDays, 10) || 22; // Using a default for now

                    const actualDurationSec = _.sumBy(visitsInMonth, v => parseDurationToSeconds(v.duration));
                    const supposedlyDurationSec = wd * durationForCalcSec;
                    const achievedPercentage = supposedlyDurationSec > 0 ? (actualDurationSec / supposedlyDurationSec) * 100 : 0;
                    
                    percentages.push(achievedPercentage);

                    monthlyMetrics[monthStr] = {
                        actualDuration: formatSecondsToHHMM(actualDurationSec),
                        achievedPercentage: achievedPercentage,
                        totalVisits: visitsInMonth.length,
                        avgDailyDuration: formatSecondsToHHMM(wd > 0 ? actualDurationSec / wd : 0),
                    };
                });
                
                const trend = percentages.length > 1 ? percentages[percentages.length - 1] - percentages[0] : 0;

                return {
                    visitorName: name,
                    department,
                    designation,
                    monthlyMetrics,
                    trend
                };
            }).filter((item): item is MultiMonthDataRow => item !== null);

    }, [startMonth, endMonth, rangeError, visits, defaultCurrentWorkingDays, analysisMode]);


    const departmentNamesForFilter = useMemo(() => {
        return _.uniq(summaryData.map(row => row.department)).sort();
    }, [summaryData]);

    const employeeNamesForFilter = useMemo(() => {
        let relevantData = summaryData;
        if (departmentFilter) {
            relevantData = summaryData.filter(row => row.department === departmentFilter);
        }
        return _.uniq(relevantData.map(row => row.visitorName)).sort();
    }, [summaryData, departmentFilter]);

    const filteredData = useMemo(() => {
        const dataToFilter = analysisMode === 'multi-month' ? multiMonthSummaryData : summaryData;
        
        return dataToFilter.filter(row => {
            if (departmentFilter && row.department !== departmentFilter) return false;
            if (employeeFilter && row.visitorName !== employeeFilter) return false;
            return true;
        }).sort((a, b) => {
            const deptOrderA = departmentOrderMap.get(a.department) ?? Infinity;
            const deptOrderB = departmentOrderMap.get(b.department) ?? Infinity;

            if (deptOrderA !== deptOrderB) return deptOrderA - deptOrderB;

            const desigOrderMap = designationOrderMaps[a.department as keyof typeof designationOrderMaps];
            if (desigOrderMap) {
                const desigOrderA = desigOrderMap.get(a.designation) ?? Infinity;
                const desigOrderB = desigOrderMap.get(b.designation) ?? Infinity;
                if (desigOrderA !== desigOrderB) return desigOrderA - desigOrderB;
            }
            return a.visitorName.localeCompare(b.visitorName);
        });
    }, [summaryData, multiMonthSummaryData, departmentFilter, employeeFilter, departmentOrderMap, designationOrderMaps, analysisMode]);
    
    const groupedData = useMemo(() => {
        const grouped = new Map<string, any[]>();
        const orderedDepts = _.uniq(filteredData.map(d => d.department));

        orderedDepts.forEach(deptName => {
            const employeesInDept = filteredData.filter(row => row.department === deptName);
            if (employeesInDept.length > 0) {
                grouped.set(deptName, employeesInDept);
            }
        });
        return grouped;
    }, [filteredData]);
    
    const monthsForHeader = useMemo(() => {
        if (analysisMode !== 'multi-month' || rangeError) return [];
        return getMonthsInRange(startMonth, endMonth);
    }, [startMonth, endMonth, rangeError, analysisMode]);

    const handleDepartmentFilterChange = (value: string) => {
        const filterValue = value === 'All Departments' ? '' : value;
        setDepartmentFilter(filterValue);
        setEmployeeFilter(''); // Reset employee filter when department changes
    };
    
    const handleEmployeeFilterChange = (value: string) => {
        const filterValue = value === 'All Employees' ? '' : value;
        setEmployeeFilter(filterValue);
    };

    const handleDownloadWDTemplate = () => {
        if (typeof window.Papa === 'undefined') {
            setFeedback({ message: 'CSV library is not available.', type: 'error' });
            return;
        }
        const headers = ['Visitor Name', 'Department', 'Designation', 'Working Day'];
        const exampleData = summaryData.length > 0
            ? summaryData.slice(0, 3).map(d => [d.visitorName, d.department, d.designation, d.totalWorkingDay])
            : [['Ruhul Amen', 'Construction', 'Executive', 22]];

        const csv = window.Papa.unparse({ fields: headers, data: exampleData });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "working_day_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleWorkingDayFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (typeof window.Papa === 'undefined') {
            setFeedback({ message: "CSV parsing library is not available.", type: 'error' });
            return;
        }

        window.Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results: any) => {
                const requiredHeaders = ['Visitor Name', 'Working Day'];
                const headers = results.meta.fields;

                if (!requiredHeaders.every(h => headers.includes(h))) {
                    setFeedback({ message: 'CSV must contain "Visitor Name" and "Working Day" headers.', type: 'error' });
                    if (event.target) event.target.value = '';
                    return;
                }

                const newWorkingDays: Record<string, number> = {};
                let errorOccurred = false;
                const employeeNameSet = new Set(summaryData.map(d => d.visitorName));

                for (const [index, row] of results.data.entries()) {
                    if (errorOccurred) break;

                    const visitorName = row['Visitor Name'];
                    const workingDayStr = row['Working Day'];

                    if (!visitorName || !workingDayStr) {
                        setFeedback({ message: `Row ${index + 2}: Missing Visitor Name or Working Day.`, type: 'error' });
                        errorOccurred = true;
                        continue;
                    }

                    if (!employeeNameSet.has(visitorName)) {
                         continue; // Silently skip names not in the current summary
                    }

                    const workingDay = parseInt(workingDayStr, 10);
                    if (isNaN(workingDay) || workingDay < 0 || workingDay > 31) {
                        setFeedback({ message: `Row ${index + 2}: Invalid Working Day "${workingDayStr}". Must be a number between 0 and 31.`, type: 'error' });
                        errorOccurred = true;
                        continue;
                    }

                    newWorkingDays[visitorName] = workingDay;
                }
                
                if (!errorOccurred) {
                    setWorkingDays(prev => ({ ...prev, ...newWorkingDays }));
                    setFeedback({ message: `Successfully updated working days for ${Object.keys(newWorkingDays).length} employees.`, type: 'success' });
                }
            },
            error: (err: any) => {
                setFeedback({ message: `Error parsing CSV: ${err.message}`, type: 'error' });
            }
        });

        if (event.target) event.target.value = ''; // Reset file input
    };


    const handleExportCSV = () => {
        if (typeof window.Papa === 'undefined') {
            alert('CSV Export library is not available.');
            return;
        }

        const headers = [
            'SL. No', 'Visitor Name', 'Department', 'Designation', 'Work Day',
            'Visit Day', 'Prev Projects', 'Total Projects',
            '>20m', '10-19m', '5-9m', '<5m',
            'Supposedly Dur/Day', 'Supposedly Dur/Month',
            'Current Actual', 'Current %',
            'Last M Actual', 'Last M %',
            'Stability %', `${lastMonthName} Avg/Day`, `${currentMonthName} Avg/Day`,
            'Avg Stability %'
        ];

        const data = filteredData.map((row, index) => {
            const isExempt = (row as SummaryDataRow).supposedlyVisitDurationDay === '00:00';
            const r = row as SummaryDataRow;
            return [
                index + 1,
                r.visitorName,
                r.department,
                r.designation,
                r.totalWorkingDay,
                r.totalVisitedDay,
                r.previousVisitedProjectCount,
                r.totalVisitedProjectCount,
                r.durationCount.moreThan20,
                r.durationCount.tenTo19,
                r.durationCount.fiveTo9,
                r.durationCount.lessThan5,
                r.supposedlyVisitDurationDay,
                r.supposedlyVisitDurationMonth,
                r.currentMonthActualDuration,
                isExempt ? r.currentMonthActualDuration : r.currentMonthDurationPercentage.toFixed(2),
                r.lastMonthActualDuration,
                isExempt ? r.lastMonthActualDuration : `${r.lastMonthDurationPercentage.toFixed(2)}%`,
                r.currentStability.toFixed(2),
                r.lastMonthPerDayAverage,
                r.currentMonthDayAverage,
                r.averageStability.toFixed(2),
            ];
        });

        const csv = window.Papa.unparse({ fields: headers, data });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `department_summary_${selectedMonth}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrintView = () => {
        window.print();
    };

    const handleSaveViewAsPdf = async () => {
        const printableArea = contentToPrintRef.current;
        if (!printableArea || typeof window.html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
            setFeedback({ message: 'PDF generation library is not available.', type: 'error' });
            return;
        }

        const scrollableContainer = printableArea.querySelector('.overflow-auto') as HTMLElement | null;
        if (!scrollableContainer) {
            setFeedback({ message: 'Could not find the table container to export.', type: 'error' });
            return;
        }

        showLoading();
        const originalMaxHeight = scrollableContainer.style.maxHeight;

        try {
            const { jsPDF } = window.jspdf;
            
            // Temporarily remove height restrictions for full content capture
            scrollableContainer.style.maxHeight = 'none';

            const canvas = await window.html2canvas(printableArea, {
                scale: 2,
                useCORS: true,
                logging: false,
                allowTaint: true,
            });

            // Restore original height immediately after capture
            scrollableContainer.style.maxHeight = originalMaxHeight;

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'legal',
            });

            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            let heightLeft = pdfHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pdf.internal.pageSize.getHeight();

            while (heightLeft > 0) {
                position = -(pdfHeight - heightLeft);
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
                heightLeft -= pdf.internal.pageSize.getHeight();
            }
            
            pdf.save(`department_summary_view_${selectedMonth}.pdf`);

        } catch (error) {
            console.error("Error generating view PDF:", error);
            setFeedback({ message: 'An error occurred while generating the PDF.', type: 'error' });
        } finally {
            // Ensure style is always restored
            scrollableContainer.style.maxHeight = originalMaxHeight;
            hideLoading();
        }
    };


    // --- RENDER LOGIC ---

    const renderMultiMonthFilters = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 no-print">
             <div>
                <label htmlFor="start-month-select" className="block text-sm font-medium text-slate-700">Start Month</label>
                <input type="month" id="start-month-select" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-orange-500"/>
            </div>
            <div>
                <label htmlFor="end-month-select" className="block text-sm font-medium text-slate-700">End Month</label>
                <input type="month" id="end-month-select" value={endMonth} onChange={(e) => setEndMonth(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-orange-500"/>
            </div>
            <div className="lg:col-span-2">
                <SearchableSelect
                    id="dept-filter-multi"
                    label="Department"
                    options={['All Departments', ..._.uniq(multiMonthSummaryData.map(r => r.department)).sort()]}
                    value={departmentFilter}
                    onChange={handleDepartmentFilterChange}
                    placeholder="Filter departments..."
                />
            </div>
            {rangeError && <div className="md:col-span-4 text-center text-red-600 bg-red-50 p-2 rounded-md">{rangeError}</div>}
        </div>
    );
    
    const renderSingleMonthFilters = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-4 no-print">
             <div>
                <label htmlFor="month-select-dept" className="block text-sm font-medium text-slate-700">Select Month</label>
                <input type="month" id="month-select-dept" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"/>
            </div>
             <div>
                <SearchableSelect
                    id="dept-filter-dept"
                    label="Department"
                    options={['All Departments', ...departmentNamesForFilter]}
                    value={departmentFilter}
                    onChange={handleDepartmentFilterChange}
                    placeholder="Type to filter departments..."
                />
            </div>
             <div>
                <SearchableSelect
                    id="employee-filter-dept"
                    label="Employee"
                    options={['All Employees', ...employeeNamesForFilter]}
                    value={employeeFilter}
                    onChange={handleEmployeeFilterChange}
                    placeholder="Type to filter employees..."
                />
            </div>
            <div className="lg:col-span-3 grid grid-cols-3 gap-4 border p-2 rounded-md bg-slate-50">
                <div>
                    <label htmlFor="default-wd-current" className="block text-xs font-medium text-slate-600">Default WD ({currentMonthName})</label>
                    <input type="number" id="default-wd-current" value={defaultCurrentWorkingDays} onChange={e => setDefaultCurrentWorkingDays(e.target.value)} min="0" max="31" className="mt-1 block w-full px-2 py-1 bg-white border border-slate-300 rounded-md text-sm shadow-sm"/>
                    <label htmlFor="default-wd-last" className="block text-xs font-medium text-slate-600 mt-2">Default WD ({lastMonthName})</label>
                    <input type="number" id="default-wd-last" value={defaultLastWorkingDays} onChange={e => setDefaultLastWorkingDays(e.target.value)} min="0" max="31" className="mt-1 block w-full px-2 py-1 bg-white border border-slate-300 rounded-md text-sm shadow-sm"/>
                </div>
                <div>
                    <label htmlFor="security-wd-current" className="block text-xs font-medium text-slate-600">Security WD ({currentMonthName})</label>
                    <input type="number" id="security-wd-current" value={securityCurrentWorkingDays} onChange={e => setSecurityCurrentWorkingDays(e.target.value)} min="0" max="31" placeholder="Optional" className="mt-1 block w-full px-2 py-1 bg-white border border-slate-300 rounded-md text-sm shadow-sm"/>
                    <label htmlFor="security-wd-last" className="block text-xs font-medium text-slate-600 mt-2">Security WD ({lastMonthName})</label>
                    <input type="number" id="security-wd-last" value={securityLastWorkingDays} onChange={e => setSecurityLastWorkingDays(e.target.value)} min="0" max="31" placeholder="Optional" className="mt-1 block w-full px-2 py-1 bg-white border border-slate-300 rounded-md text-sm shadow-sm"/>
                </div>
                <div>
                    <label htmlFor="office-wd-current" className="block text-xs font-medium text-slate-600">Office Day ({currentMonthName})</label>
                    <input type="number" id="office-wd-current" value={officeCurrentWorkingDays} onChange={e => setOfficeCurrentWorkingDays(e.target.value)} min="0" max="31" placeholder="Optional" className="mt-1 block w-full px-2 py-1 bg-white border border-slate-300 rounded-md text-sm shadow-sm"/>
                    <label htmlFor="office-wd-last" className="block text-xs font-medium text-slate-600 mt-2">Office Day ({lastMonthName})</label>
                    <input type="number" id="office-wd-last" value={officeLastWorkingDays} onChange={e => setOfficeLastWorkingDays(e.target.value)} min="0" max="31" placeholder="Optional" className="mt-1 block w-full px-2 py-1 bg-white border border-slate-300 rounded-md text-sm shadow-sm"/>
                </div>
            </div>
        </div>
    );

    const renderMultiMonthTable = () => (
        <div ref={contentToPrintRef} className="printable-area">
            <div className={`overflow-auto border rounded-lg ${isFullScreen ? 'h-[calc(100vh-200px)]' : 'max-h-[70vh]'}`}>
                <table className="min-w-full text-xs border-collapse">
                    <thead ref={theadRef} className="bg-slate-100 sticky top-0 z-10">
                        <tr>
                            <th className="sticky left-0 bg-slate-100 p-2 border border-slate-300 align-middle w-12 text-center" rowSpan={2}>SL</th>
                            <th className="sticky left-12 bg-slate-100 p-2 border border-slate-300 align-middle w-48" rowSpan={2}>Visitor Name</th>
                            {monthsForHeader.map(month => {
                                const [year, monthNum] = month.split('-');
                                const monthName = new Date(Number(year), Number(monthNum) - 1, 1).toLocaleString('en-US', { month: 'short' });
                                return <th key={month} colSpan={4} className="p-2 border border-slate-300 text-center">{`${monthName} '${year.slice(2)}`}</th>;
                            })}
                            <th className="p-2 border border-slate-300 align-middle text-center" rowSpan={2}>Trend</th>
                        </tr>
                        <tr>
                            {monthsForHeader.map(month => (
                                <React.Fragment key={`${month}-sub`}>
                                    <th className="p-2 border border-slate-300 align-middle text-center">Actual Dur.</th>
                                    <th className="p-2 border border-slate-300 align-middle text-center">%</th>
                                    <th className="p-2 border border-slate-300 align-middle text-center">Avg/Day</th>
                                    <th className="p-2 border border-slate-300 align-middle text-center">Visits</th>
                                </React.Fragment>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {Array.from(groupedData.entries()).map(([department, employees]) => (
                            <React.Fragment key={department}>
                                <tr className="sticky bg-slate-200 z-[6]" style={{ top: `${THEAD_HEIGHT}px` }}>
                                    <td colSpan={2 + (monthsForHeader.length * 4) + 1} className="p-2 font-bold text-slate-800 border border-slate-300">{department}</td>
                                </tr>
                                {(employees as MultiMonthDataRow[]).map((row, index) => (
                                    <tr key={row.visitorName} className="hover:bg-slate-50">
                                        <td className="sticky left-0 bg-white hover:bg-slate-50 p-2 border border-slate-300 text-center">{index + 1}</td>
                                        <td className="sticky left-12 bg-white hover:bg-slate-50 p-2 border border-slate-300 whitespace-nowrap font-semibold">{row.visitorName}</td>
                                        {monthsForHeader.map(month => {
                                            const metrics = row.monthlyMetrics[month];
                                            return metrics ? (
                                                <React.Fragment key={`${month}-${row.visitorName}`}>
                                                    <td className="p-2 border border-slate-300 text-center whitespace-nowrap">{metrics.actualDuration}</td>
                                                    <td className="p-2 border border-slate-300 text-center whitespace-nowrap">{metrics.achievedPercentage.toFixed(2)}%</td>
                                                    <td className="p-2 border border-slate-300 text-center whitespace-nowrap">{metrics.avgDailyDuration}</td>
                                                    <td className="p-2 border border-slate-300 text-center whitespace-nowrap">{metrics.totalVisits}</td>
                                                </React.Fragment>
                                            ) : (
                                                <td key={`${month}-${row.visitorName}`} colSpan={4} className="p-2 border border-slate-300 text-center text-slate-400">N/A</td>
                                            );
                                        })}
                                        <td className="p-2 border border-slate-300 text-center whitespace-nowrap"><ChangeIcon value={formatStabilityValue(row.trend)} /></td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
    
    const renderSingleMonthTable = () => {
        let slNo = 1;
    
        const renderRow = (row: SummaryDataRow) => {
            const isExempt = row.supposedlyVisitDurationDay === '00:00';
            return (
                <tr key={row.visitorName} className="hover:bg-slate-50">
                    <td className="sticky left-0 bg-white hover:bg-slate-50 p-2 border border-slate-300 text-center">{slNo++}</td>
                    <td className="sticky left-12 bg-white hover:bg-slate-50 p-2 border border-slate-300 whitespace-nowrap font-semibold">
                        {row.visitorName}
                    </td>
                    <td className="p-2 border border-slate-300 whitespace-nowrap">{row.designation}</td>
                    <td className="p-2 border border-slate-300 text-center">
                        <input
                            type="number"
                            value={workingDays[row.visitorName] ?? ''}
                            onChange={e => handleWorkingDaysChange(row.visitorName, e.target.value)}
                            placeholder={String(row.totalWorkingDay)}
                            className="w-12 text-center bg-transparent focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500 rounded"
                            min="0"
                            max="31"
                        />
                    </td>
                    <td className="p-2 border border-slate-300 text-center">{row.totalVisitedDay}</td>
                    <td className="p-2 border border-slate-300 text-center">{row.previousVisitedProjectCount}</td>
                    <td className="p-2 border border-slate-300 text-center">{row.totalVisitedProjectCount}</td>
                    <td className="p-2 border border-slate-300 text-center">{row.durationCount.moreThan20}</td>
                    <td className="p-2 border border-slate-300 text-center">{row.durationCount.tenTo19}</td>
                    <td className="p-2 border border-slate-300 text-center">{row.durationCount.fiveTo9}</td>
                    <td className="p-2 border border-slate-300 text-center">{row.durationCount.lessThan5}</td>
                    <td className="p-2 border border-slate-300 text-center">{row.supposedlyVisitDurationDay}</td>
                    <td className="p-2 border border-slate-300 text-center">{row.supposedlyVisitDurationMonth}</td>
                    <td className="p-2 border border-slate-300 text-center">{row.currentMonthActualDuration}</td>
                    <td className="p-2 border border-slate-300 text-center">{isExempt ? row.currentMonthActualDuration : `${row.currentMonthDurationPercentage.toFixed(2)}%`}</td>
                    <td className="p-2 border border-slate-300 text-center">{row.lastMonthActualDuration}</td>
                    <td className="p-2 border border-slate-300 text-center">{isExempt ? row.lastMonthActualDuration : `${row.lastMonthDurationPercentage.toFixed(2)}%`}</td>
                    <td className="p-2 border border-slate-300 text-center whitespace-nowrap"><ChangeIcon value={formatStabilityValue(row.currentStability)} /></td>
                    <td className="p-2 border border-slate-300 text-center">{row.lastMonthPerDayAverage}</td>
                    <td className="p-2 border border-slate-300 text-center">{row.currentMonthDayAverage}</td>
                    <td className="p-2 border border-slate-300 text-center whitespace-nowrap"><ChangeIcon value={formatStabilityValue(row.averageStability)} /></td>
                </tr>
            );
        };
    
        return (
            <div ref={contentToPrintRef} className="printable-area">
                <div className={`overflow-auto border rounded-lg ${isFullScreen ? 'h-[calc(100vh-200px)]' : 'max-h-[70vh]'}`}>
                    <table className="min-w-full text-xs border-collapse">
                        <thead ref={theadRef} className="bg-slate-100 sticky top-0 z-10">
                            <tr>
                                <th className="sticky left-0 bg-slate-100 p-2 border border-slate-300 align-middle w-12 text-center" rowSpan={2}>SL</th>
                                <th className="sticky left-12 bg-slate-100 p-2 border border-slate-300 align-middle w-48" rowSpan={2}>Visitor Name</th>
                                <th className="p-2 border border-slate-300 align-middle" rowSpan={2}>Designation</th>
                                <th className="p-2 border border-slate-300 align-middle" rowSpan={2}>Work Day</th>
                                <th className="p-2 border border-slate-300 align-middle" rowSpan={2}>Visit Day</th>
                                <th className="p-2 border border-slate-300 align-middle" rowSpan={2}>Prev. Proj.</th>
                                <th className="p-2 border border-slate-300 align-middle" rowSpan={2}>Total Proj.</th>
                                <th className="p-2 border border-slate-300 text-center" colSpan={4}>Duration Count</th>
                                <th className="p-2 border border-slate-300 align-middle" rowSpan={2}>Target /Day</th>
                                <th className="p-2 border border-slate-300 align-middle" rowSpan={2}>Target /Month</th>
                                <th className="p-2 border border-slate-300 align-middle" rowSpan={2}>{currentMonthName} Actual</th>
                                <th className="p-2 border border-slate-300 align-middle" rowSpan={2}>{currentMonthName} %</th>
                                <th className="p-2 border border-slate-300 align-middle" rowSpan={2}>{lastMonthName} Actual</th>
                                <th className="p-2 border border-slate-300 align-middle" rowSpan={2}>{lastMonthName} %</th>
                                <th className="p-2 border border-slate-300 align-middle whitespace-nowrap" rowSpan={2}>Stability %</th>
                                <th className="p-2 border border-slate-300 align-middle" rowSpan={2}>{lastMonthName} Avg/Day</th>
                                <th className="p-2 border border-slate-300 align-middle" rowSpan={2}>{currentMonthName} Avg/Day</th>
                                <th className="p-2 border border-slate-300 align-middle whitespace-nowrap" rowSpan={2}>Avg Stability %</th>
                            </tr>
                            <tr>
                                <th className="p-2 border border-slate-300 text-center">&gt;20m</th>
                                <th className="p-2 border border-slate-300 text-center">10-19m</th>
                                <th className="p-2 border border-slate-300 text-center">5-9m</th>
                                <th className="p-2 border border-slate-300 text-center">&lt;5m</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {Array.from(groupedData.entries()).map(([department, employees]) => {
                                 const departmentHeader = (
                                    <tr className="sticky bg-slate-200 z-[6]" style={{ top: `${THEAD_HEIGHT}px` }}>
                                        <td colSpan={20} className="p-2 font-bold text-slate-800 border border-slate-300">
                                            {department}
                                        </td>
                                    </tr>
                                );
                                
                                if (department === 'Inventory Mgt.') {
                                    const projectSideEmployees = (employees as SummaryDataRow[]).filter(e => PROJECT_SIDE_INVENTORY_DESIGNATIONS.has(e.designation));
                                    const headOfficeEmployees = (employees as SummaryDataRow[]).filter(e => !PROJECT_SIDE_INVENTORY_DESIGNATIONS.has(e.designation));
                                    
                                    return (
                                        <React.Fragment key={department}>
                                            {departmentHeader}
                                            {headOfficeEmployees.length > 0 && (
                                                <tr className="sticky bg-slate-100 z-[5]" style={{ top: `${topForSubgroupHeader}px` }}>
                                                    <td colSpan={20} className="p-1.5 font-semibold text-center text-slate-600 border border-slate-300">Head Office</td>
                                                </tr>
                                            )}
                                            {headOfficeEmployees.map(row => renderRow(row))}
                                            {projectSideEmployees.length > 0 && (
                                                <tr className="sticky bg-slate-100 z-[5]" style={{ top: `${topForSubgroupHeader}px` }}>
                                                    <td colSpan={20} className="p-1.5 font-semibold text-center text-slate-600 border border-slate-300">Project Side</td>
                                                </tr>
                                            )}
                                            {projectSideEmployees.map(row => renderRow(row))}
                                        </React.Fragment>
                                    );
                                }
    
                                return (
                                    <React.Fragment key={department}>
                                        {departmentHeader}
                                        {(employees as SummaryDataRow[]).map(row => renderRow(row))}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <>
            <div ref={containerRef} className={`fade-in ${isFullScreen ? 'bg-white p-4' : ''}`}>
                {/* Filter and Configuration Section */}
                {analysisMode === 'multi-month' ? renderMultiMonthFilters() : renderSingleMonthFilters()}

                {analysisMode === 'single-month-comparison' && (
                    <div className="flex justify-end items-center gap-2 mb-2 no-print">
                        <label htmlFor="wd-csv-upload" className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 border border-slate-300 text-xs font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50" title="Import Working Days from CSV">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                            Import WD
                        </label>
                        <input id="wd-csv-upload" type="file" ref={workingDayFileInputRef} onChange={handleWorkingDayFileUpload} className="sr-only" accept=".csv" />
                        <button onClick={handleDownloadWDTemplate} className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-300 text-xs font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50" title="Download Working Day Template">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293-9.293a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            WD Template
                        </button>
                        <button onClick={handleExportCSV} className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-300 text-xs font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50" title="Export Data as CSV">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            Export Data (CSV)
                        </button>
                        <PdfExport 
                            groupedData={groupedData}
                            currentUser={currentUser}
                            selectedMonth={selectedMonth}
                            currentMonthName={currentMonthName}
                            lastMonthName={lastMonthName}
                            defaultCurrentWorkingDays={defaultCurrentWorkingDays}
                            defaultLastWorkingDays={defaultLastWorkingDays}
                            securityCurrentWorkingDays={securityCurrentWorkingDays}
                            securityLastWorkingDays={securityLastWorkingDays}
                        />
                         <button onClick={handleSaveViewAsPdf} className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-300 text-xs font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50" title="Save current view as PDF">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                            Save View (PDF)
                        </button>
                         <button onClick={handlePrintView} className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-300 text-xs font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50" title="Print current view">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v3a2 2 0 002 2h8a2 2 0 002-2v-3h1a2 2 0 002-2v-3a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" /></svg>
                            Print View
                        </button>
                        <button onClick={handleToggleFullScreen} className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-300 text-xs font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50" title={isFullScreen ? 'Exit Full Screen' : 'Enter Full Screen'}>
                            {isFullScreen ? 
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M15 5a1 1 0 011 1v3a1 1 0 11-2 0V7.414l-3.293 3.293a1 1 0 11-1.414-1.414L12.586 6H10a1 1 0 110-2h5zM5 15a1 1 0 01-1-1v-3a1 1 0 112 0v1.586l3.293-3.293a1 1 0 111.414 1.414L7.414 13H9a1 1 0 110 2H5z" clipRule="evenodd" /></svg>
                                    Exit
                                </>
                                :
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 10a1 1 0 011-1h3a1 1 0 110 2H7.414l3.293 3.293a1 1 0 11-1.414-1.414L6 12.586V14a1 1 0 11-2 0v-3a1 1 0 011-1zm10-1a1 1 0 010 2h-3a1 1 0 110-2h3zm-3 6a1 1 0 011-1h3a1 1 0 110 2h-1.586l-3.293 3.293a1 1 0 11-1.414-1.414L13.414 16H12a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                                    Full Screen
                                </>
                            }
                        </button>
                    </div>
                )}
                
                {analysisMode === 'multi-month' ? renderMultiMonthTable() : renderSingleMonthTable()}
            </div>
            {feedback && <FeedbackMessage message={feedback.message} type={feedback.type} onDismiss={() => setFeedback(null)} />}
        </>
    );
};

export default AllDepartmentSummary;