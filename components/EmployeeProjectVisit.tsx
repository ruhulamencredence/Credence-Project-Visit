import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, Project, EmployeeVisit, ReportData, EmployeeVisitTab } from '../types';
import { DEPARTMENTS } from '../constants';
import FeedbackMessage from './FeedbackMessage';
import AllDepartmentSummary from './AllDepartmentSummary';
import DutyAnalysis from './DutyAnalysis';
import EmployeeVisitSummary from './EmployeeVisitSummary';
import _ from 'lodash';
import { useLoading } from '../contexts/LoadingContext';

// For TypeScript to recognize libraries loaded from CDN
declare global {
    interface Window {
        jspdf: any;
        Papa: any;
    }
}

/**
 * Parses a date string from various common formats and returns it in YYYY-MM-DD format.
 * @param dateString The date string to parse.
 * @returns The formatted date string, or an empty string if invalid.
 */
const parseAndFormatDate = (dateString: string): string => {
  if (!dateString || typeof dateString !== 'string') return '';
  
  // Handle '1-Jul-25' format
  const excelDateMatch = dateString.trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/);
  if (excelDateMatch) {
    const day = excelDateMatch[1];
    const monthStr = excelDateMatch[2];
    const year = `20${excelDateMatch[3]}`;
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIndex = monthNames.findIndex(m => m.toLowerCase() === monthStr.toLowerCase());
    if (monthIndex > -1) {
        const d = new Date(parseInt(year, 10), monthIndex, parseInt(day, 10));
        if (!isNaN(d.getTime())) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const dayOfMonth = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${dayOfMonth}`;
        }
    }
  }

  const date = new Date(dateString.trim());

  if (isNaN(date.getTime())) {
    const parts = dateString.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (parts) {
      const day = parseInt(parts[1], 10);
      const month = parseInt(parts[2], 10) - 1;
      const year = parseInt(parts[3], 10);
      const dmyDate = new Date(year, month, day);
      if (!isNaN(dmyDate.getTime()) && dmyDate.getDate() === day && dmyDate.getMonth() === month && dmyDate.getFullYear() === year) {
          const y = dmyDate.getFullYear();
          const m = String(dmyDate.getMonth() + 1).padStart(2, '0');
          const d = String(dmyDate.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
      }
    }
    console.warn(`Could not parse date: "${dateString}"`);
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

interface EmployeeProjectVisitProps {
    currentUser: User;
    projects: Project[];
    visits: EmployeeVisit[];
    onUpdateVisits: React.Dispatch<React.SetStateAction<EmployeeVisit[]>>;
    activeTab: EmployeeVisitTab;
    onTabChange: (tab: EmployeeVisitTab) => void;
}

const EmployeeProjectVisit: React.FC<EmployeeProjectVisitProps> = ({ currentUser, projects, visits, onUpdateVisits, activeTab, onTabChange }) => {
    // --- STATE ---
    
    // State for Records Tab
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [projectFilter, setProjectFilter] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [feedback, setFeedback] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
    const [attendanceData, setAttendanceData] = useState<any[]>([]);
    
    // --- STATE FOR SUMMARY TAB (LIFTED) ---
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const [summarySelectedMonth, setSummarySelectedMonth] = useState(currentMonth);
    const [summarySelectedEmployee, setSummarySelectedEmployee] = useState('');
    const [summarySelectedDepartment, setSummarySelectedDepartment] = useState('');
    const [summaryReportData, setSummaryReportData] = useState<ReportData | null>(null);
    const [summaryReportTitle, setSummaryReportTitle] = useState('');
    const [isSummaryReportGenerated, setIsSummaryReportGenerated] = useState(false);

    // --- REFS & MEMOS ---
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { showLoading, hideLoading } = useLoading();
    const projectNames = useMemo(() => projects.map(p => p.name), [projects]);

    const filteredVisits = useMemo(() => {
        const lowercasedQuery = searchQuery.toLowerCase();
        return visits.filter(visit => {
            const startDateMatch = !startDate || visit.date >= startDate;
            const endDateMatch = !endDate || visit.date <= endDate;
            const projectMatch = !projectFilter || visit.projectName === projectFilter;
            const departmentMatch = !departmentFilter || visit.department === departmentFilter;
            
            const searchMatch = !lowercasedQuery ||
                visit.visitorName.toLowerCase().includes(lowercasedQuery) ||
                visit.department.toLowerCase().includes(lowercasedQuery) ||
                visit.designation.toLowerCase().includes(lowercasedQuery) ||
                visit.projectName.toLowerCase().includes(lowercasedQuery) ||
                visit.date.toLowerCase().includes(lowercasedQuery) ||
                visit.entryTime.toLowerCase().includes(lowercasedQuery) ||
                visit.outTime.toLowerCase().includes(lowercasedQuery) ||
                visit.duration.toLowerCase().includes(lowercasedQuery) ||
                (visit.remarks && visit.remarks.toLowerCase().includes(lowercasedQuery));

            return startDateMatch && endDateMatch && projectMatch && departmentMatch && searchMatch;
        });
    }, [visits, startDate, endDate, projectFilter, departmentFilter, searchQuery]);

    // --- Handlers for Records Tab ---
    const VISIT_REQUIRED_HEADERS = [
        'Sl No', 'Date', 'Visitor Name', 'Department', 'Designation',
        'Visited Project Name', 'Entry Time', 'Out Time', 'Duration', 'Formula'
    ];
    
    const handleClearRecords = () => {
        if (window.confirm('Are you sure you want to delete all visit records? This action cannot be undone.')) {
            onUpdateVisits([]);
            setFeedback({ message: 'All records have been cleared.', type: 'info' });
        }
    };

    const handleVisitFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
    
        showLoading();
    
        if (typeof window.Papa === 'undefined') {
            setFeedback({ message: "CSV parsing library is not available.", type: 'error' });
            hideLoading();
            return;
        }
    
        window.Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results: any) => {
                try {
                    const headers = results.meta.fields;
                    const isValid = headers && VISIT_REQUIRED_HEADERS.length === headers.length && VISIT_REQUIRED_HEADERS.every((h, i) => headers[i]?.trim() === h);
    
                    if (!isValid) {
                        setFeedback({ message: "CSV header mismatch. Please use the exact format from the downloaded template.", type: 'error' });
                         if (event.target) event.target.value = '';
                        return;
                    }
    
                    const newVisits: EmployeeVisit[] = [];
                    let hasError = false;
    
                    results.data.forEach((row: any, index: number) => {
                        if (hasError) return;
                        
                        const requiredDataFields = ['Date', 'Visitor Name', 'Department', 'Designation', 'Visited Project Name', 'Entry Time', 'Out Time', 'Duration'];
                        for (const field of requiredDataFields) {
                            if (!row[field]) {
                                setFeedback({ message: `Missing required data for "${field}" in row ${index + 2}.`, type: 'error' });
                                hasError = true;
                                return;
                            }
                        }
    
                        const formattedDate = parseAndFormatDate(row.Date);
                        if (!formattedDate) {
                            setFeedback({ message: `Invalid date format in row ${index + 2}: "${row.Date}".`, type: 'error' });
                            hasError = true;
                            return;
                        }
                        
                        newVisits.push({
                            id: Date.now() + index,
                            date: formattedDate,
                            visitorName: row['Visitor Name'],
                            department: row['Department'],
                            designation: row['Designation'],
                            projectName: row['Visited Project Name'],
                            entryTime: row['Entry Time'],
                            outTime: row['Out Time'],
                            duration: row['Duration'],
                            remarks: row['Formula'] || '',
                        });
                    });
    
                    if (!hasError) {
                        onUpdateVisits(prev => _.orderBy([...prev, ...newVisits], ['date'], ['desc']));
                        setFeedback({ message: `Successfully imported ${newVisits.length} records.`, type: 'success' });
                    }
                } finally {
                    hideLoading();
                }
            },
            error: (error: any) => {
                setFeedback({ message: `CSV parsing error: ${error.message}`, type: 'error' });
                hideLoading();
            }
        });
    
        if (event.target) event.target.value = '';
    };

    const handleDownloadRecordsCSV = () => {
        // User-defined headers
        const headers = ['Sl No', 'Date', 'Visitor Name', 'Department', 'Designation', 'Visited Project Name', 'Entry Time', 'Out Time', 'Duration', 'Formula'];
        
        // Map filtered data to an array of arrays, matching the header order
        const dataForCsv = filteredVisits.map((visit, index) => [
            index + 1,
            visit.date,
            visit.visitorName,
            visit.department,
            visit.designation,
            visit.projectName,
            visit.entryTime,
            visit.outTime,
            visit.duration,
            visit.remarks || '' // This now corresponds to the 'Formula' column
        ]);

        // Use Papa.unparse with the headers and the array-of-arrays data
        const csv = window.Papa.unparse({
            fields: headers,
            data: dataForCsv
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "employee_visits_export.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadVisitTemplate = () => {
        if (typeof window.Papa === 'undefined') {
            setFeedback({ message: "CSV library is not available.", type: 'error' });
            return;
        }

        const exampleData = [
            [
                1, '1-Jul-25', 'Wayes Ah', 'HR & Adm', 'Executive', 'Castle Onamika', '2:11', '2:17', '0:06:00', '5 - 9 Minutes'
            ],
            [
                2, '1-Jul-25', 'Md. Abul Emon', 'HR & Adm', 'Security Supervisor', 'Castle Onamika', '2:38', '3:05', '0:27:00', 'More Than 20 Minutes'
            ]
        ];

        const csv = window.Papa.unparse({
            fields: VISIT_REQUIRED_HEADERS,
            data: exampleData
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "visit_template.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setFeedback({ message: 'Template downloaded successfully!', type: 'success' });
    };

    // --- HANDLERS FOR SUMMARY TAB ---
    const handleSummaryMonthChange = (month: string) => {
        setSummarySelectedMonth(month);
        setIsSummaryReportGenerated(false); // Reset report when filter changes
    };

    const handleSummaryEmployeeChange = (employeeNameValue: string) => {
        const employeeName = employeeNameValue === 'All Employees' ? '' : employeeNameValue;
        setSummarySelectedEmployee(employeeName);

        if (employeeName) {
            const employeeVisit = visits.find(v => v.visitorName === employeeName);
            setSummarySelectedDepartment(employeeVisit ? employeeVisit.department : '');
        } else {
            setSummarySelectedDepartment('');
        }
        setIsSummaryReportGenerated(false); // Reset report when filter changes
    };
    
    const handleSummaryDepartmentChange = (departmentNameValue: string) => {
        const departmentName = departmentNameValue === 'All Departments' ? '' : departmentNameValue;
        setSummarySelectedDepartment(departmentName);
        setIsSummaryReportGenerated(false); // Reset report when filter changes
    };

    // --- NEW HANDLERS FOR MONTHLY ATTENDANCE ---
    const handleMonthlyAttendanceFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        showLoading();

        if (typeof window.Papa === 'undefined') {
            setFeedback({ message: "CSV parsing library is not available.", type: 'error' });
            hideLoading();
            return;
        }

        window.Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results: any) => {
                try {
                    const headersFromFile = results.meta.fields;
                    if (!headersFromFile || headersFromFile.length < 5) {
                        setFeedback({ message: "Invalid CSV format. Please use the monthly attendance template.", type: 'error' });
                        return;
                    }

                    const requiredStaticHeaders = ['Emp. Name', 'Emp. Code', 'Designation', 'Total Working Day'];
                    const hasRequiredHeaders = requiredStaticHeaders.every(h => headersFromFile.includes(h));

                    if (!hasRequiredHeaders) {
                        setFeedback({ message: `Monthly attendance CSV is missing required headers. It must contain at least: ${requiredStaticHeaders.join(', ')}.`, type: 'error' });
                        return;
                    }
                    
                    const newAttendanceRecords = results.data.map((row: any) => ({
                        'Emp. Name': row['Emp. Name'],
                        'Emp. Code': row['Emp. Code'],
                        'Designation': row['Designation'],
                    })).filter((r: any) => r['Emp. Name'] && r['Emp. Code']);

                    if (newAttendanceRecords.length === 0) {
                        setFeedback({ message: `No valid employee records found in the CSV.`, type: 'error' });
                        return;
                    }
                    
                    setAttendanceData(prev => _.unionBy(newAttendanceRecords, prev, 'Emp. Name'));
                    
                    setFeedback({ message: `Successfully processed ${newAttendanceRecords.length} monthly attendance records.`, type: 'success' });

                } finally {
                    hideLoading();
                    if (event.target) event.target.value = '';
                }
            },
            error: (error: any) => {
                setFeedback({ message: `CSV parsing error: ${error.message}`, type: 'error' });
                hideLoading();
            }
        });
    };

    return (
        <>
            {/* Page Content */}
            <div className="px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8">
                {/* Gradient border container */}
                <div className="bg-gradient-to-r from-white via-orange-50 to-amber-50 rounded-b-xl shadow-lg px-px pb-px">
                    <div className="bg-white rounded-b-xl">
                        <div className="p-6">
                            {activeTab === 'records' && (
                                <div className="fade-in">
                                    {/* Filters */}
                                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 pb-6 border-b border-slate-200">
                                        <div>
                                            <label htmlFor="start-date-filter" className="block text-sm font-medium text-slate-700">Start Date</label>
                                            <input type="date" id="start-date-filter" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
                                        </div>
                                        <div>
                                            <label htmlFor="end-date-filter" className="block text-sm font-medium text-slate-700">End Date</label>
                                            <input type="date" id="end-date-filter" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
                                        </div>
                                        <div>
                                            <label htmlFor="project-filter" className="block text-sm font-medium text-slate-700">Project</label>
                                            <select id="project-filter" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500">
                                                <option value="">All Projects</option>
                                                {projectNames.map((name) => (<option key={name} value={name}>{name}</option>))}
                                            </select>
                                        </div>
                                         <div>
                                            <label htmlFor="dept-filter" className="block text-sm font-medium text-slate-700">Department</label>
                                            <select id="dept-filter" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500">
                                                <option value="">All Departments</option>
                                                {DEPARTMENTS.map((dept) => (<option key={dept} value={dept}>{dept}</option>))}
                                            </select>
                                        </div>
                                        <div className="md:col-span-2 lg:col-span-4">
                                            <label htmlFor="search-query" className="block text-sm font-medium text-slate-700">Dynamic Search</label>
                                            <input type="text" id="search-query" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by visitor, project, remarks, etc..." className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
                                        </div>
                                    </div>
                                    {/* Actions and Table */}
                                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                                       <div className="flex items-center gap-3 flex-wrap">
                                           <label htmlFor="csv-upload" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                                                Import CSV File
                                           </label>
                                            <input id="csv-upload" type="file" ref={fileInputRef} onChange={handleVisitFileUpload} className="sr-only" accept=".csv" />
                                            <button onClick={handleDownloadVisitTemplate} className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 9.293a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                                Download Template
                                            </button>
                                            <button onClick={handleDownloadRecordsCSV} disabled={filteredVisits.length === 0} className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                                Export
                                            </button>
                                       </div>
                                       <button onClick={handleClearRecords} disabled={visits.length === 0} className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-sm font-medium rounded-md shadow-sm text-red-700 bg-red-50 hover:bg-red-100 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                                            </svg>
                                            Clear Records
                                        </button>
                                    </div>
                                    <div className="overflow-auto" style={{ maxHeight: '24rem' }}>
                                        <table className="min-w-full divide-y divide-slate-200">
                                            <thead className="bg-slate-50 sticky top-0">
                                              <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Sl No</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Visitor Name</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Department</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Designation</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Visited Project Name</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Entry Time</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Out Time</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Duration</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Formula</th>
                                              </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-slate-200">
                                              {filteredVisits.length > 0 ? filteredVisits.map((visit, index) => (
                                                <tr key={visit.id} className="hover:bg-slate-50">
                                                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{index + 1}</td>
                                                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{visit.date}</td>
                                                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{visit.visitorName}</td>
                                                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{visit.department}</td>
                                                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{visit.designation}</td>
                                                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{visit.projectName}</td>
                                                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{visit.entryTime}</td>
                                                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{visit.outTime}</td>
                                                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{visit.duration}</td>
                                                  <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500 truncate max-w-xs" title={visit.remarks || ''}>{visit.remarks}</td>
                                                </tr>
                                              )) : (
                                                <tr><td colSpan={10} className="text-center py-8 text-slate-500">No records match your criteria.</td></tr>
                                              )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                            {activeTab === 'departmentSummary' && (
                                <div className="fade-in">
                                    <AllDepartmentSummary visits={visits} departments={DEPARTMENTS} currentUser={currentUser} />
                                </div>
                            )}
                            {activeTab === 'dutyAnalysis' && (
                                <div className="fade-in">
                                    <DutyAnalysis visits={visits} currentUser={currentUser} />
                                </div>
                            )}
                            {activeTab === 'summary' && (
                                <div className="fade-in">
                                   <EmployeeVisitSummary
                                     currentUser={currentUser}
                                     visits={visits}
                                     attendanceData={attendanceData}
                                     onUpdateAttendanceData={setAttendanceData}
                                     reportData={summaryReportData}
                                     setReportData={setSummaryReportData}
                                     isReportGenerated={isSummaryReportGenerated}
                                     setIsReportGenerated={setIsSummaryReportGenerated}
                                     reportTitle={summaryReportTitle}
                                     setReportTitle={setSummaryReportTitle}
                                     selectedMonth={summarySelectedMonth}
                                     onMonthChange={handleSummaryMonthChange}
                                     selectedEmployee={summarySelectedEmployee}
                                     onEmployeeChange={handleSummaryEmployeeChange}
                                     selectedDepartment={summarySelectedDepartment}
                                     onDepartmentChange={handleSummaryDepartmentChange}
                                   />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {feedback && <FeedbackMessage message={feedback.message} type={feedback.type} onDismiss={() => setFeedback(null)} />}
        </>
    );
};

export default EmployeeProjectVisit;
