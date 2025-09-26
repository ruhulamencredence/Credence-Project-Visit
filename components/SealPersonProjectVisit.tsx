
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { SealPersonVisit, User, Project, SealPersonVisitTab } from '../types';
import FeedbackMessage from './FeedbackMessage';
import _ from 'lodash';

// For TypeScript to recognize libraries loaded from CDN
declare global {
    interface Window {
        jspdf: any;
        Papa: any;
    }
}

const REQUIRED_HEADERS = [
    'Sl No', 'Date', 'Name (Sales Person)', 'Designation', 'Customer Name',
    'Customer ID', 'Project Name', 'In Time', 'Out Time'
];

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

/**
 * Parses a date string from various common formats and returns it in YYYY-MM-DD format.
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
            return d.toISOString().split('T')[0];
        }
    }
  }

  // Handle formats like DD/MM/YYYY or DD-MM-YYYY
   const dmyMatch = dateString.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmyMatch) {
        const d = new Date(parseInt(dmyMatch[3], 10), parseInt(dmyMatch[2], 10) - 1, parseInt(dmyMatch[1], 10));
        if (!isNaN(d.getTime())) {
            return d.toISOString().split('T')[0];
        }
    }

  // Handle standard ISO and common formats
  const date = new Date(dateString.trim());
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  console.warn(`Could not parse date: "${dateString}"`);
  return '';
};


const calculateDurationInMinutes = (inTime: string, outTime: string): number | null => {
    if (!inTime || !outTime || inTime.toLowerCase() === 'n/a' || outTime.toLowerCase() === 'n/a') {
        return null;
    }

    const timeRegex = /^(\d{1,2}):(\d{2})/;
    const inMatch = String(inTime).match(timeRegex);
    const outMatch = String(outTime).match(timeRegex);

    if (!inMatch || !outMatch) {
        return null;
    }

    const inDate = new Date(0);
    inDate.setHours(parseInt(inMatch[1], 10), parseInt(inMatch[2], 10), 0, 0);

    const outDate = new Date(0);
    outDate.setHours(parseInt(outMatch[1], 10), parseInt(outMatch[2], 10), 0, 0);
    
    if (outDate < inDate) {
         return null;
    }

    const diffMs = outDate.getTime() - inDate.getTime();
    return Math.round(diffMs / 60000);
};

interface SealPersonProjectVisitProps {
    currentUser: User;
    projects: Project[];
    visits: SealPersonVisit[];
    onUpdateVisits: React.Dispatch<React.SetStateAction<SealPersonVisit[]>>;
    activeTab: SealPersonVisitTab;
    onTabChange: (tab: SealPersonVisitTab) => void;
}

// Reusable component for the small summary cards
const SummaryCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-white p-3 rounded-lg shadow-md border border-slate-200 flex items-center gap-3 transition-transform hover:scale-105">
        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
            {icon}
        </div>
        <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">{title}</p>
            <p className="text-xl font-bold text-slate-800 truncate" title={String(value)}>{value}</p>
        </div>
    </div>
);


// Reusable component to display a single report section in the consolidated view
const ReportSection: React.FC<{ report: any, allowWrap?: boolean }> = ({ report, allowWrap = true }) => {
    if (!report) return null;

    if (report.type === 'summaryCards' && report.cards) {
        const icons = [
            // Avg. Duration
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.415L11 9.586V6z" clipRule="evenodd" /></svg>,
            // < 5 min
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM6.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l6-6a1 1 0 00-1.414-1.414L9 11.586l-1.293-1.293z" clipRule="evenodd" /></svg>,
            // 5-10 min
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>,
            // 10-20 min
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v3.586l-1.293 1.293a1 1 0 001.414 1.414L5 13.586V16a1 1 0 001 1h8a1 1 0 001-1v-2.414l.293.293a1 1 0 001.414-1.414L15 11.586V8a6 6 0 00-6-6zm2 10a1 1 0 11-2 0 1 1 0 012 0z" /></svg>,
            // 20+ min
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" /></svg>,
        ];
        const colors = [
            'from-blue-100 to-indigo-200 border-blue-200 text-blue-800',
            'from-red-100 to-orange-200 border-red-200 text-red-800',
            'from-yellow-100 to-amber-200 border-yellow-200 text-yellow-800',
            'from-lime-100 to-green-200 border-lime-200 text-lime-800',
            'from-emerald-100 to-teal-200 border-emerald-200 text-emerald-800',
        ];

        return (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h4 className="text-lg font-semibold text-slate-700 mb-3">{report.title}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {report.cards.map((card: any, index: number) => (
                        <div key={index} className={`bg-gradient-to-br ${colors[index % colors.length]} p-4 rounded-xl shadow-md border flex flex-col items-center justify-center transition-transform hover:-translate-y-1`}>
                            <div className="mb-2 opacity-70">
                                {icons[index % icons.length]}
                            </div>
                            <p className="text-3xl font-extrabold">{card.value}</p>
                            <p className="text-xs font-semibold mt-1 opacity-90">{card.label}</p>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const tableClass = allowWrap ? "min-w-full text-sm table-fixed" : "min-w-full text-sm";
    const cellClass = allowWrap ? "px-3 py-2 whitespace-normal break-words text-slate-600" : "px-3 py-2 whitespace-nowrap text-slate-600";
    const headerClass = (h: string) => {
        let classes = "px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase";
        if (allowWrap && h === 'Project Names') {
            classes += ' w-2/5';
        }
        return classes;
    };
    
    return (
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h4 className="text-lg font-semibold text-slate-700 mb-3">{report.title}</h4>
            
             {report.headers && report.rows && (
                <div className="overflow-auto max-h-80">
                    <table className={tableClass}>
                        <thead className="bg-slate-200 sticky top-0">
                            <tr>
                                {report.headers.map((h: string) => <th key={h} className={headerClass(h)}>{h}</th>)}
                            </tr>
                        </thead>
                         <tbody className="bg-white divide-y divide-slate-200">
                            {report.rows.length > 0 ? report.rows.map((row: any[], rIndex: number) => (
                                <tr key={rIndex}>
                                    {row.map((cell: any, cIndex: number) => {
                                        if (typeof cell === 'object' && cell !== null && cell.colSpan) {
                                            let cellClasses = allowWrap ? "px-3 py-2 whitespace-normal break-words" : "px-3 py-2 whitespace-nowrap";
                                            if (cell.isTeamHeader) {
                                                cellClasses += " font-bold bg-indigo-100 text-indigo-900 text-sm text-left";
                                            } else if (cell.isTeamSummary) {
                                                cellClasses += " font-bold bg-indigo-200 text-indigo-900 text-xs text-center";
                                            } else if (cell.isSummary) {
                                                cellClasses += " font-semibold bg-orange-50 text-orange-900 text-xs text-center";
                                            }
                                            return <td key={cIndex} colSpan={cell.colSpan} className={cellClasses}>{cell.content}</td>;
                                        }
                                        return <td key={cIndex} className={cellClass}>{cell}</td>;
                                    })}
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={report.headers.length} className="text-center py-4 text-slate-500">No data available.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};


// --- PDF HELPER FUNCTION ---
/**
 * Adds a standardized, compact header and footer to every page of a jsPDF document.
 * @param doc The jsPDF document instance.
 * @param title The title of the report to display in the header.
 */
const addPdfHeaderAndFooter = (doc: any, title: string, currentUser: User) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;
    const pageCount = (doc as any).internal.getNumberOfPages();

    // --- HEADER (with stylized logo) ---
    const headerStartY = 15;
    doc.setFont('CCRegeneration', 'bold');
    doc.setTextColor(234, 88, 12);
    doc.setDrawColor(234, 88, 12);
    const smallFontSize = 11; // Corresponds to 'recision'
    const largeFontSize = 14.7; // Corresponds to 'P'
    const sloganFontSize = 4.3;
    doc.setFontSize(largeFontSize);
    doc.setLineWidth(0.25);
    const largeP_X = margin;
    doc.text('P', largeP_X, headerStartY, { renderingMode: 'fillThenStroke' });
    const largePWidth = doc.getTextWidth('P');
    doc.setFontSize(smallFontSize);
    doc.setLineWidth(0.15);
    const restOfName = 'RECISION';
    doc.text(restOfName, largeP_X + largePWidth, headerStartY, { renderingMode: 'fillThenStroke' });
    const restOfNameWidth = doc.getTextWidth(restOfName);
    const totalNameWidth = largePWidth + restOfNameWidth;
    doc.setFont('CCRegeneration', 'normal');
    doc.setFontSize(sloganFontSize);
    doc.setTextColor(150);
    const sloganText = 'Eyes on Every Site';
    const sloganWidth = doc.getTextWidth(sloganText);
    const sloganX = largeP_X + (totalNameWidth / 2) - (sloganWidth / 2);
    const sloganY = headerStartY + 2;
    doc.text(sloganText, sloganX, sloganY);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(40);
    doc.text("Credence Housing Limited", pageWidth / 2, headerStartY, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("House-15, Road-13/A, Dhanmondi R/A, Dhaka-1209", pageWidth / 2, headerStartY + 6, { align: 'center' });
    
    doc.setDrawColor(220).setLineWidth(0.2);
    doc.line(margin, 28, pageWidth - margin, 28);
    
    doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(0);
    doc.text(title, pageWidth / 2, 34, { align: 'center' });

    // --- FOOTER (Note removed) ---
    doc.setFontSize(9).setTextColor(150);
    const preparedByStr = `Prepared by\n${currentUser.name}\n${currentUser.designation}`;
    doc.text(preparedByStr, margin, pageHeight - 20);
    
    doc.text('Dept. HOD', pageWidth / 2, pageHeight - 10, { align: 'center' });
    
    const pageStr = `Page ${pageNumber} of ${pageCount}`;
    doc.text(pageStr, pageWidth - margin, pageHeight - 10, { align: 'right' });
};


const invalidCustomerNames = new Set(['self', 'n/a', '-', '']);

const generateTeamVisitList = (analysisVisits: SealPersonVisit[], externalVisits: SealPersonVisit[]) => {
    const teamVisitListRows: any[] = [];
    const groupedBySalesperson = _.groupBy(analysisVisits, 'salesPersonName');
    const externalVisitsBySalesperson = _.groupBy(externalVisits, 'salesPersonName');

    SALES_TEAMS.forEach(team => {
        teamVisitListRows.push([{ content: `Team: ${team.teamName} (Leader: ${team.leader})`, colSpan: 4, isTeamHeader: true }]);
        
        let teamTotalVisits = 0;
        let teamUniqueCustomers = new Set<string>();
        let teamUniqueProjects = new Set<string>();

        team.members.forEach(member => {
            const memberVisits = _.orderBy(groupedBySalesperson[member] || [], ['date', 'projectName']);
            if (memberVisits.length > 0) {
                const externalMemberVisits = externalVisitsBySalesperson[member] || [];
                
                memberVisits.forEach((visit, index) => {
                     const isExternal = visit.customerName && !invalidCustomerNames.has(visit.customerName.trim().toLowerCase());
                     teamVisitListRows.push([
                        index === 0 ? member : '',
                        visit.projectName,
                        isExternal ? visit.customerName : 'Not Found',
                        isExternal ? (visit.customerId || 'N/A') : 'Not Found',
                    ]);
                });

                const totalVisits = memberVisits.length;
                const uniqueCustomers = new Set(externalMemberVisits.map(v => `${v.customerId}-${v.customerName}`)).size;
                const uniqueProjects = new Set(memberVisits.map(v => v.projectName)).size;
                
                teamVisitListRows.push([
                    { content: `Total Visits: ${totalVisits}`, colSpan: 1, isSummary: true },
                    { content: `Unique Projects: ${uniqueProjects}`, colSpan: 1, isSummary: true },
                    { content: `Unique Customers: ${uniqueCustomers}`, colSpan: 2, isSummary: true },
                ]);

                teamTotalVisits += totalVisits;
                externalMemberVisits.forEach(v => teamUniqueCustomers.add(`${v.customerId}-${v.customerName}`));
                memberVisits.forEach(v => teamUniqueProjects.add(v.projectName));
            }
        });

        teamVisitListRows.push([
            { content: `Team Total Visits: ${teamTotalVisits}`, colSpan: 1, isTeamSummary: true },
            { content: `Team Unique Projects: ${teamUniqueProjects.size}`, colSpan: 1, isTeamSummary: true },
            { content: `Team Unique Customers: ${teamUniqueCustomers.size}`, colSpan: 2, isTeamSummary: true },
        ]);
    });

    return {
        title: 'Team-wise Visit List',
        headers: ['Sales Person', 'Project Name', 'Customer Name', 'Customer ID'],
        rows: teamVisitListRows,
    };
};

const SealPersonProjectVisit: React.FC<SealPersonProjectVisitProps> = ({ currentUser, projects, visits, onUpdateVisits, activeTab, onTabChange }) => {
    const [feedback, setFeedback] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Filters for Records Tab
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [projectFilter, setProjectFilter] = useState('');
    const [salesPersonFilter, setSalesPersonFilter] = useState('');
    const [teamFilter, setTeamFilter] = useState('');

    // State for Analysis Tab
    const [analysisStartDate, setAnalysisStartDate] = useState('');
    const [analysisEndDate, setAnalysisEndDate] = useState('');
    const [reportType, setReportType] = useState('');
    const [reportData, setReportData] = useState<any | null>(null);

    const projectNames = useMemo(() => _.uniq(projects.map(p => p.name)).sort(), [projects]);
    
    const salesPersonNames = useMemo(() => {
        const allNames = _.uniq(visits.map(v => v.salesPersonName)).sort();
        if (!teamFilter) {
            return allNames;
        }
        const selectedTeam = SALES_TEAMS.find(t => t.teamName === teamFilter);
        if (selectedTeam) {
            const teamMemberSet = new Set(selectedTeam.members);
            return allNames.filter(name => teamMemberSet.has(name));
        }
        return []; // No matching team, so no salespeople to show
    }, [visits, teamFilter]);

    useEffect(() => {
        setSalesPersonFilter(''); // Reset salesperson filter when team changes
    }, [teamFilter]);

    const filteredVisits = useMemo(() => {
        return visits.filter(visit => {
            const startDateMatch = !startDate || visit.date >= startDate;
            const endDateMatch = !endDate || visit.date <= endDate;
            const projectMatch = !projectFilter || visit.projectName === projectFilter;
            
            let teamMembers: string[] | null = null;
            if (teamFilter) {
                const selectedTeam = SALES_TEAMS.find(t => t.teamName === teamFilter);
                if (selectedTeam) {
                    teamMembers = selectedTeam.members;
                } else {
                    return false; // Team selected but not found, show no results
                }
            }
            
            const teamMatch = !teamMembers || teamMembers.includes(visit.salesPersonName);
            const salesPersonMatch = !salesPersonFilter || visit.salesPersonName === salesPersonFilter;

            return startDateMatch && endDateMatch && projectMatch && teamMatch && salesPersonMatch;
        });
    }, [visits, startDate, endDate, projectFilter, salesPersonFilter, teamFilter]);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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
                const headers = results.meta.fields;
                const isValid = headers && REQUIRED_HEADERS.every(h => headers.includes(h.trim()));

                if (!isValid) {
                    setFeedback({ message: "CSV header mismatch. Please use the exact format from the template.", type: 'error' });
                    if (event.target) event.target.value = '';
                    return;
                }

                const newVisits: SealPersonVisit[] = [];
                let hasError = false;

                results.data.forEach((row: any, index: number) => {
                    if (hasError) return;
                    if (!row['Sl No'] || !row['Date'] || !row['Name (Sales Person)'] || !row['Project Name']) {
                        setFeedback({ message: `Missing essential data in row ${index + 2}.`, type: 'error' });
                        hasError = true;
                        return;
                    }
                    
                    const formattedDate = parseAndFormatDate(row['Date']);
                    if (!formattedDate) {
                        setFeedback({ message: `Invalid date format in row ${index + 2}: "${row['Date']}". Skipping row.`, type: 'error' });
                        hasError = true;
                        return;
                    }

                    newVisits.push({
                        id: Date.now() + index,
                        slNo: row['Sl No'],
                        date: formattedDate,
                        salesPersonName: row['Name (Sales Person)'],
                        designation: row['Designation'] || 'N/A',
                        customerName: row['Customer Name'] || 'N/A',
                        customerId: row['Customer ID'] || 'N/A',
                        projectName: row['Project Name'],
                        inTime: row['In Time'] || 'N/A',
                        outTime: row['Out Time'] || 'N/A',
                    });
                });

                if (!hasError) {
                    onUpdateVisits(prev => _.orderBy([...prev, ...newVisits], ['date'], ['desc']));
                    setFeedback({ message: `Successfully imported ${newVisits.length} records.`, type: 'success' });
                }
            },
            error: (error: any) => {
                setFeedback({ message: `CSV parsing error: ${error.message}`, type: 'error' });
            }
        });

        if (event.target) event.target.value = '';
    };

    const handleDownloadTemplate = () => {
        if (typeof window.Papa === 'undefined') {
            setFeedback({ message: 'CSV library is not available.', type: 'error' });
            return;
        }
        const exampleData = [
            ['1', '01-Sep-24', 'John Doe', 'Sales Executive', 'Mr. Smith', 'CUST-001', 'Lake Lofts', '10:00', '11:00'],
        ];

        const csv = window.Papa.unparse({ fields: REQUIRED_HEADERS, data: exampleData });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "seal_person_visit_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const handleExportCSV = () => {
        const dataForCsv = filteredVisits.map(v => ({
            'Sl No': v.slNo,
            'Date': v.date,
            'Name (Sales Person)': v.salesPersonName,
            'Designation': v.designation,
            'Customer Name': v.customerName,
            'Customer ID': v.customerId,
            'Project Name': v.projectName,
            'In Time': v.inTime,
            'Out Time': v.outTime,
        }));

        const csv = window.Papa.unparse(dataForCsv);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "seal_person_visits_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const handleExportPDF = () => {
        if (typeof window.jspdf === 'undefined') {
            alert('PDF Export library is not available.');
            return;
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const reportTitle = "Seal Person Visit Report";

        const tableColumn = ['Sl', 'Date', 'Salesperson', 'Designation', 'Customer (ID)', 'Project', 'In', 'Out'];
        const tableRows = filteredVisits.map(v => [
            v.slNo,
            v.date,
            v.salesPersonName,
            v.designation,
            `${v.customerName} (${v.customerId})`,
            v.projectName,
            v.inTime,
            v.outTime,
        ]);

        (doc as any).autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 38, 
            theme: 'grid',
            headStyles: {
                fillColor: [234, 88, 12],
                fontSize: 8,
                fontStyle: 'bold',
                textColor: [255, 255, 255],
            },
            bodyStyles: {
                fontSize: 8,
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            },
            styles: {
                cellPadding: 1.5,
                overflow: 'linebreak',
            },
            margin: { top: 40, bottom: 30, left: 14, right: 14 },
            didDrawPage: (data: any) => {
                addPdfHeaderAndFooter(doc, reportTitle, currentUser);
            },
        });
        
        doc.save(`seal-person-visits-${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const handleExportTeamListCSV = () => {
        if (typeof window.Papa === 'undefined') {
            setFeedback({ message: 'CSV library is not available.', type: 'error' });
            return;
        }

        const analysisVisits = visits.filter(visit => {
            const startDateMatch = !analysisStartDate || visit.date >= analysisStartDate;
            const endDateMatch = !analysisEndDate || visit.date <= analysisEndDate;
            return startDateMatch && endDateMatch;
        });

        if (analysisVisits.length === 0) {
            setFeedback({ message: 'No data available in the selected date range to export.', type: 'info' });
            return;
        }

        const headers = ['Team Name', 'Team Leader', 'Sales Person', 'Date', 'Project Name', 'Customer Name', 'Customer ID'];
        const csvData: any[] = [];
        const visitsBySalesperson = _.groupBy(analysisVisits, 'salesPersonName');

        SALES_TEAMS.forEach(team => {
            team.members.forEach(member => {
                const memberVisits = visitsBySalesperson[member];
                if (memberVisits && memberVisits.length > 0) {
                    memberVisits.forEach(visit => {
                        csvData.push([
                            team.teamName,
                            team.leader,
                            member,
                            visit.date,
                            visit.projectName,
                            visit.customerName,
                            visit.customerId
                        ]);
                    });
                }
            });
        });

        const csv = window.Papa.unparse({ fields: headers, data: csvData });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `team_visit_list_${analysisStartDate || 'all'}_to_${analysisEndDate || 'all'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const generateConsolidatedData = (analysisVisits: SealPersonVisit[]) => {
        const externalVisits = analysisVisits.filter(v => 
            v.customerName && !invalidCustomerNames.has(v.customerName.trim().toLowerCase())
        );

        const visitsBySalesperson = _.groupBy(analysisVisits, 'salesPersonName');
        const externalVisitsBySalesperson = _.groupBy(externalVisits, 'salesPersonName');
        const salespersonStats = Object.keys(visitsBySalesperson)
            .map(salesperson => {
                const totalVisits = visitsBySalesperson[salesperson]?.length || 0;
                const uniqueCustomers = _.uniqBy(externalVisitsBySalesperson[salesperson] || [], v => `${v.customerId}-${v.customerName}`).length;
                const uniqueProjects = _.uniqBy(visitsBySalesperson[salesperson], 'projectName');
                const uniqueProjectsCount = uniqueProjects.length;
                const uniqueProjectNames = uniqueProjects.map(p => p.projectName).sort().join(', ');
                return { salesperson, totalVisits, uniqueCustomers, uniqueProjectsCount, uniqueProjectNames };
            })
            .sort((a, b) => b.totalVisits - a.totalVisits);

        const visitsPerSalesperson = {
            title: 'Total Visits per Sales Person',
            headers: ['Sales Person', 'Total Visits', 'Total Customers', 'Unique Projects', 'Project Names'],
            rows: salespersonStats.map(s => [s.salesperson, s.totalVisits, s.uniqueCustomers, s.uniqueProjectsCount, s.uniqueProjectNames])
        };

        const customerProjectGrouped = _.countBy(externalVisits, v => `${v.customerName} (${v.customerId})|${v.projectName}`);
        const visitsPerCustomerAndProject = {
            title: 'Visits per Customer & Project',
            headers: ['Customer', 'Project Name', 'Total Visits'],
            rows: Object.entries(customerProjectGrouped).map(([key, count]) => {
                const [customer, project] = key.split('|');
                return [customer, project, count];
            }).sort((a, b) => Number(b[2]) - Number(a[2]))
        };

        const projectGrouped = _.countBy(analysisVisits, 'projectName');
        const visitsPerProject = { title: 'Total Visits per Project', headers: ['Project', 'Total Visits'], rows: Object.entries(projectGrouped).sort((a,b) => Number(b[1]) - Number(a[1])) };
        
        const uniqueCustomersPerSalespersonGrouped = _.groupBy(externalVisits, 'salesPersonName');
        const uniqueCustomersPerSalesperson = {
            title: 'Unique Customers per Salesperson (External)',
            headers: ['Sales Person', 'Unique External Customers'],
            rows: Object.entries(uniqueCustomersPerSalespersonGrouped).map(([salesperson, visits]) => {
                const uniqueCustomerCount = _.uniqBy(visits, v => `${v.customerId}-${v.customerName}`).length;
                return [salesperson, uniqueCustomerCount];
            }).sort((a, b) => Number(b[1]) - Number(a[1]))
        };
        
        const groupedBySalespersonAllVisits = _.groupBy(analysisVisits, 'salesPersonName');
        const groupedBySalespersonExternal = _.groupBy(externalVisits, 'salesPersonName');
        
        const salespersonCustomerVisitsRows: any[] = [];
        const sortedSalespeople = Object.keys(groupedBySalespersonAllVisits).sort();

        sortedSalespeople.forEach(salesperson => {
            const allVisitsForPerson = _.orderBy(groupedBySalespersonAllVisits[salesperson] || [], ['date', 'projectName']);
            const externalVisitsForPerson = groupedBySalespersonExternal[salesperson] || [];

            if (allVisitsForPerson.length > 0) {
                 allVisitsForPerson.forEach((visit, index) => {
                    const isExternal = visit.customerName && !invalidCustomerNames.has(visit.customerName.trim().toLowerCase());
                    salespersonCustomerVisitsRows.push([
                        index === 0 ? salesperson : '',
                        visit.projectName,
                        isExternal ? visit.customerName : 'Not Found',
                        isExternal ? (visit.customerId || 'N/A') : 'Not Found',
                    ]);
                });
            }
            
            const totalVisits = allVisitsForPerson.length;
            const uniqueCustomers = _.uniqBy(externalVisitsForPerson, v => `${v.customerId}-${v.customerName}`).length;
            const uniqueProjects = _.uniqBy(allVisitsForPerson, 'projectName').length;
            
            salespersonCustomerVisitsRows.push([
                { content: `Total Visits: ${totalVisits}`, colSpan: 1, isSummary: true },
                { content: `Unique Projects: ${uniqueProjects}`, colSpan: 1, isSummary: true },
                { content: `Unique Customers: ${uniqueCustomers}`, colSpan: 2, isSummary: true },
            ]);
        });

        const salespersonCustomerVisits = {
            title: 'Salesperson-wise Customer & Project Visits (List)',
            headers: ['Sales Person', 'Project Name', 'Customer Name', 'Customer ID'],
            rows: salespersonCustomerVisitsRows,
        };

        const withDuration = analysisVisits.map(v => ({...v, duration: calculateDurationInMinutes(v.inTime, v.outTime)})).filter(v => v.duration !== null && v.duration >= 0);
        const avgDuration = withDuration.length ? _.sumBy(withDuration, 'duration') / withDuration.length : 0;
        const timeAnalysis = {
            title: 'Visit Duration Analysis',
            type: 'summaryCards',
            cards: [
                { label: 'Avg. Duration (min)', value: avgDuration.toFixed(2) },
                { label: '< 5 min Visits', value: withDuration.filter(v => v.duration! < 5).length },
                { label: '5-10 min Visits', value: withDuration.filter(v => v.duration! >= 5 && v.duration! < 10).length },
                { label: '10-20 min Visits', value: withDuration.filter(v => v.duration! >= 10 && v.duration! < 20).length },
                { label: '20+ min Visits', value: withDuration.filter(v => v.duration! >= 20).length },
            ]
        };

        const topPerformers = {
            title: 'Top 5 Sales Persons (by Visits)',
            headers: ['Sales Person', 'Total Visits', 'Total Customers', 'Unique Projects', 'Project Names'],
            rows: salespersonStats.slice(0, 5).map(s => [s.salesperson, s.totalVisits, s.uniqueCustomers, s.uniqueProjectsCount, s.uniqueProjectNames])
        };

        const missing = analysisVisits.filter(v => !v.outTime || v.outTime.toLowerCase() === 'n/a');
        const missingOutTime = { title: 'Visits with Missing Out Time', headers: ['Date', 'Sales Person', 'Project', 'Customer', 'In Time'], rows: missing.map(v => [v.date, v.salesPersonName, v.projectName, v.customerName, v.inTime]) };

        return {
            type: 'consolidated',
            title: 'Consolidated Visit Report',
            visitsPerSalesperson,
            visitsPerCustomer: visitsPerCustomerAndProject,
            visitsPerProject,
            uniqueCustomersPerSalesperson,
            salespersonCustomerVisits,
            teamVisitList: generateTeamVisitList(analysisVisits, externalVisits),
            timeAnalysis,
            topPerformers,
            missingOutTime
        };
    };

    const handleGenerateReport = () => {
        const analysisVisits = visits.filter(visit => {
            const startDateMatch = !analysisStartDate || visit.date >= analysisStartDate;
            const endDateMatch = !analysisEndDate || visit.date <= analysisEndDate;
            return startDateMatch && endDateMatch;
        });

        // --- Overall Summary Calculation ---
        const externalVisitsForSummary = analysisVisits.filter(v => 
            v.customerName && !invalidCustomerNames.has(v.customerName.trim().toLowerCase())
        );
        const overallSummary = {
            totalSalesPersons: _.uniqBy(analysisVisits, 'salesPersonName').length,
            totalTeamMembers: new Set(SALES_TEAMS.flatMap(t => t.members)).size,
            totalVisits: analysisVisits.length,
            totalUniqueCustomers: _.uniqBy(externalVisitsForSummary, v => `${v.customerId}-${v.customerName}`).length,
            totalUniqueProjects: _.uniqBy(analysisVisits, 'projectName').length,
            topVisitedProject: _.chain(analysisVisits).countBy('projectName').toPairs().maxBy(1).value()?.[0] || 'N/A',
        };
        // --- End Summary Calculation ---

        let data: any = {};
        
        if (reportType === 'consolidated-report') {
            data = { ...generateConsolidatedData(analysisVisits), overallSummary };
        } else {
            const externalVisits = analysisVisits.filter(v => 
                v.customerName && !invalidCustomerNames.has(v.customerName.trim().toLowerCase())
            );
            let reportContent: any = {};
            switch(reportType) {
                case 'visits-per-salesperson': {
                    const visitsBySalesperson = _.groupBy(analysisVisits, 'salesPersonName');
                    const externalVisitsBySalesperson = _.groupBy(externalVisits, 'salesPersonName');
                    const salespersonStats = Object.keys(visitsBySalesperson)
                        .map(salesperson => {
                            const totalVisits = visitsBySalesperson[salesperson]?.length || 0;
                            const uniqueCustomers = _.uniqBy(externalVisitsBySalesperson[salesperson] || [], v => `${v.customerId}-${v.customerName}`).length;
                            const uniqueProjects = _.uniqBy(visitsBySalesperson[salesperson], 'projectName');
                            const uniqueProjectsCount = uniqueProjects.length;
                            const uniqueProjectNames = uniqueProjects.map(p => p.projectName).sort().join(', ');
                            return { salesperson, totalVisits, uniqueCustomers, uniqueProjectsCount, uniqueProjectNames };
                        })
                        .sort((a, b) => b.totalVisits - a.totalVisits);
                    reportContent = {
                        title: 'Total Visits per Sales Person',
                        headers: ['Sales Person', 'Total Visits', 'Total Customers', 'Unique Projects', 'Project Names'],
                        rows: salespersonStats.map(s => [s.salesperson, s.totalVisits, s.uniqueCustomers, s.uniqueProjectsCount, s.uniqueProjectNames])
                    };
                    break;
                }
                case 'visits-per-customer': {
                    const grouped = _.countBy(externalVisits, v => `${v.customerName} (${v.customerId})|${v.projectName}`);
                    const rows = Object.entries(grouped).map(([key, count]) => {
                        const [customer, project] = key.split('|');
                        return [customer, project, count];
                    }).sort((a, b) => Number(b[2]) - Number(a[2]));
                    reportContent = {
                        title: 'Visits per Customer & Project',
                        headers: ['Customer', 'Project Name', 'Total Visits'],
                        rows,
                    };
                    break;
                }
                case 'unique-customers-per-salesperson': {
                    const grouped = _.groupBy(externalVisits, 'salesPersonName');
                    const rows = Object.entries(grouped).map(([salesperson, visits]) => {
                        const uniqueCustomerCount = _.uniqBy(visits, v => `${v.customerId}-${v.customerName}`).length;
                        return [salesperson, uniqueCustomerCount];
                    });
                    reportContent = {
                        title: 'Unique Customers per Salesperson (External)',
                        headers: ['Sales Person', 'Unique External Customers'],
                        rows: rows.sort((a, b) => Number(b[1]) - Number(a[1]))
                    };
                    break;
                }
                case 'salesperson-customer-visits': {
                    const groupedBySalespersonAllVisits = _.groupBy(analysisVisits, 'salesPersonName');
                    const groupedBySalespersonExternal = _.groupBy(externalVisits, 'salesPersonName');

                    const rows: any[] = [];
                    const sortedSalespeople = Object.keys(groupedBySalespersonAllVisits).sort();

                    sortedSalespeople.forEach(salesperson => {
                        const allVisitsForPerson = _.orderBy(groupedBySalespersonAllVisits[salesperson] || [], ['date', 'projectName']);
                        const externalVisitsForPerson = groupedBySalespersonExternal[salesperson] || [];

                        if (allVisitsForPerson.length > 0) {
                            allVisitsForPerson.forEach((visit, index) => {
                                const isExternal = visit.customerName && !invalidCustomerNames.has(visit.customerName.trim().toLowerCase());
                                rows.push([
                                    index === 0 ? salesperson : '',
                                    visit.projectName,
                                    isExternal ? visit.customerName : 'Not Found',
                                    isExternal ? (visit.customerId || 'N/A') : 'Not Found',
                                ]);
                            });
                        }
                        
                        const totalVisits = allVisitsForPerson.length;
                        const uniqueCustomers = _.uniqBy(externalVisitsForPerson, v => `${v.customerId}-${v.customerName}`).length;
                        const uniqueProjects = _.uniqBy(allVisitsForPerson, 'projectName').length;
                        
                        rows.push([
                            { content: `Total Visits: ${totalVisits}`, colSpan: 1, isSummary: true },
                            { content: `Unique Projects: ${uniqueProjects}`, colSpan: 1, isSummary: true },
                            { content: `Unique Customers: ${uniqueCustomers}`, colSpan: 2, isSummary: true },
                        ]);
                    });

                    reportContent = {
                        title: 'Salesperson-wise Customer & Project Visits (List)',
                        headers: ['Sales Person', 'Project Name', 'Customer Name', 'Customer ID'],
                        rows,
                    };
                    break;
                }
                 case 'team-visit-list': {
                    reportContent = generateTeamVisitList(analysisVisits, externalVisits);
                    break;
                }
                case 'visits-per-project': {
                    const grouped = _.countBy(analysisVisits, 'projectName');
                    reportContent = { title: 'Total Visits per Project', headers: ['Project', 'Total Visits'], rows: Object.entries(grouped).sort((a,b) => Number(b[1]) - Number(a[1])) };
                    break;
                }
                case 'time-analysis': {
                    const withDuration = analysisVisits.map(v => ({...v, duration: calculateDurationInMinutes(v.inTime, v.outTime)})).filter(v => v.duration !== null && v.duration >= 0);
                    const avgDuration = withDuration.length ? _.sumBy(withDuration, 'duration') / withDuration.length : 0;
                    reportContent = {
                        title: 'Visit Duration Analysis',
                        type: 'summaryCards',
                        cards: [
                            { label: 'Avg. Duration (min)', value: avgDuration.toFixed(2) },
                            { label: '< 5 min Visits', value: withDuration.filter(v => v.duration! < 5).length },
                            { label: '5-10 min Visits', value: withDuration.filter(v => v.duration! >= 5 && v.duration! < 10).length },
                            { label: '10-20 min Visits', value: withDuration.filter(v => v.duration! >= 10 && v.duration! < 20).length },
                            { label: '20+ min Visits', value: withDuration.filter(v => v.duration! >= 20).length },
                        ]
                    };
                    break;
                }
                case 'top-performers': {
                     const visitsBySalesperson = _.groupBy(analysisVisits, 'salesPersonName');
                     const externalVisitsBySalesperson = _.groupBy(externalVisits, 'salesPersonName');
                     const salespersonStats = Object.keys(visitsBySalesperson)
                         .map(salesperson => {
                            const totalVisits = visitsBySalesperson[salesperson]?.length || 0;
                            const uniqueCustomers = _.uniqBy(externalVisitsBySalesperson[salesperson] || [], v => `${v.customerId}-${v.customerName}`).length;
                            const uniqueProjects = _.uniqBy(visitsBySalesperson[salesperson], 'projectName');
                            const uniqueProjectsCount = uniqueProjects.length;
                            const uniqueProjectNames = uniqueProjects.map(p => p.projectName).sort().join(', ');
                            return { salesperson, totalVisits, uniqueCustomers, uniqueProjectsCount, uniqueProjectNames };
                         })
                         .sort((a, b) => b.totalVisits - a.totalVisits);

                     reportContent = {
                         title: 'Top 5 Sales Persons (by Visits)',
                         headers: ['Sales Person', 'Total Visits', 'Total Customers', 'Unique Projects', 'Project Names'],
                         rows: salespersonStats.slice(0, 5).map(s => [s.salesperson, s.totalVisits, s.uniqueCustomers, s.uniqueProjectsCount, s.uniqueProjectNames])
                     };
                     break;
                }
                case 'missing-out-time': {
                    const missing = analysisVisits.filter(v => !v.outTime || v.outTime.toLowerCase() === 'n/a');
                    reportContent = { title: 'Visits with Missing Out Time', headers: ['Date', 'Sales Person', 'Project', 'Customer', 'In Time'], rows: missing.map(v => [v.date, v.salesPersonName, v.projectName, v.customerName, v.inTime]) };
                    break;
                }
                default:
                    setFeedback({ message: 'Please select a report type.', type: 'error' });
                    return;
            }
            data = { ...reportContent, overallSummary };
        }
        setReportData(data);
    };

    const handleExportReportPDF = () => {
        if (!reportData || typeof window.jspdf === 'undefined') {
            alert('Generate a report first or PDF library is not available.');
            return;
        }

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ 
                orientation: 'portrait',
                unit: 'mm', 
                format: 'a4' 
            });

            const pageHeight = doc.internal.pageSize.getHeight();
            const headerHeight = 40; // Space for header
            const footerHeight = 30; // Space for footer
            
            const didParseCellHook = function (data: any) {
                const sourceRow = data.row.raw;
                if (!sourceRow) return;

                if (Array.isArray(sourceRow) && sourceRow.some(cell => typeof cell === 'object' && cell?.isTeamHeader)) {
                    Object.values(data.row.cells).forEach((cell: any) => {
                        cell.styles.fillColor = [67, 56, 202]; // Indigo-700
                        cell.styles.textColor = [255, 255, 255];
                        cell.styles.fontStyle = 'bold';
                        cell.styles.halign = 'left';
                    });
                } else if (Array.isArray(sourceRow) && sourceRow.some(cell => typeof cell === 'object' && cell?.isTeamSummary)) {
                    Object.values(data.row.cells).forEach((cell: any) => {
                        cell.styles.fillColor = [199, 210, 254]; // Indigo-200
                        cell.styles.textColor = [49, 46, 129]; // Indigo-900
                        cell.styles.fontStyle = 'bold';
                        cell.styles.halign = 'center';
                    });
                } else if (Array.isArray(sourceRow) && sourceRow.some(cell => typeof cell === 'object' && cell?.isSummary)) {
                    Object.values(data.row.cells).forEach((cell: any) => {
                        cell.styles.fillColor = [255, 247, 237];
                        cell.styles.textColor = [124, 45, 18];
                        cell.styles.fontStyle = 'bold';
                        cell.styles.halign = 'center';
                    });
                }
            };

            const addSection = (sectionData: any, startY: number): number => {
                if (!sectionData) return startY;
                const pageWidth = doc.internal.pageSize.getWidth();
                const margin = 14;
                const contentWidth = pageWidth - margin * 2;

                // Handle summary cards type
                if (sectionData.type === 'summaryCards' && Array.isArray(sectionData.cards)) {
                    doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(40);
                    doc.text(sectionData.title, margin, startY);
                    
                    const cardWidth = (contentWidth - (2 * 4)) / 3; // 3 cards per row, 4mm gap
                    const cardHeight = 15;
                    let currentX = margin;
                    let currentY = startY + 5;

                    sectionData.cards.forEach((card: any, index: number) => {
                        if (index > 0 && index % 3 === 0) {
                            currentX = margin;
                            currentY += cardHeight + 4;
                        }
                        
                        doc.setFillColor(241, 245, 249); // slate-100
                        doc.setDrawColor(226, 232, 240); // slate-200
                        doc.roundedRect(currentX, currentY, cardWidth, cardHeight, 2, 2, 'FD');
                        
                        doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(40);
                        doc.text(String(card.value), currentX + cardWidth / 2, currentY + 8, { align: 'center' });
                        
                        doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(100);
                        doc.text(card.label, currentX + cardWidth / 2, currentY + 12, { align: 'center' });
                        
                        currentX += cardWidth + 4;
                    });
                    
                    return currentY + cardHeight;
                }

                // Guard against missing headers or rows for table sections
                if (!Array.isArray(sectionData.headers) || !Array.isArray(sectionData.rows)) {
                    console.warn(`Skipping section "${sectionData.title}" due to missing headers or rows for table generation.`);
                    return startY;
                }
                
                let specificColumnStyles: any = {};
                // Add fixed column widths for specific reports to ensure alignment
                if (sectionData.title.includes('List')) { // Targets both "Team-wise Visit List" and "Salesperson-wise...List"
                    specificColumnStyles = {
                        0: { cellWidth: 50 }, // Sales Person or Team
                        1: { cellWidth: 45 }, // Project Name
                        2: { cellWidth: 50 }, // Customer Name
                        3: { cellWidth: 25 }, // Customer ID
                    };
                }

                const commonOptions = {
                    theme: 'grid',
                    styles: { fontSize: 7, cellPadding: 1.2, overflow: 'linebreak', lineWidth: 0.1, lineColor: [200, 200, 200] },
                    headStyles: { fillColor: [234, 88, 12], fontSize: 7.5, fontStyle: 'bold', lineWidth: 0.1, lineColor: [200, 200, 200] },
                    margin: { top: headerHeight, bottom: footerHeight },
                    didDrawPage: (data: any) => addPdfHeaderAndFooter(doc, reportData.title, currentUser),
                    didParseCell: didParseCellHook,
                    columnStyles: specificColumnStyles,
                };
                
                if (sectionData.title.includes('List')) {
                    const groups: any[][] = [];
                    let currentGroup: any[] = [];
                    sectionData.rows.forEach((row: any) => {
                        currentGroup.push(row);
                        if (Array.isArray(row) && row.some((cell:any) => typeof cell === 'object' && (cell?.isSummary || cell?.isTeamSummary))) {
                            groups.push(currentGroup);
                            currentGroup = [];
                        }
                    });
                    if (currentGroup.length > 0) groups.push(currentGroup);
                
                    let currentY = startY;
                    
                    groups.forEach((group) => {
                        const isTeamHeader = group[0]?.[0]?.isTeamHeader;
                        const estimatedGroupHeight = (group.length * 5); // 5mm per row estimate
                        const remainingPageSpace = pageHeight - currentY - footerHeight;
                        
                        const isFirstOnPage = currentY === startY || currentY === headerHeight;
                        if (!isFirstOnPage && estimatedGroupHeight > remainingPageSpace) {
                            doc.addPage();
                            currentY = headerHeight;
                        }
                        
                        const body = group.filter((row:any) => !row[0]?.isTeamHeader);
                        const head = isTeamHeader ? 
                            [[{ content: group[0][0].content, colSpan: sectionData.headers.length, styles: { ...group[0][0], fontStyle: 'bold' } }], sectionData.headers] :
                            [sectionData.headers];

                        (doc as any).autoTable({ ...commonOptions, head: head, body: body, startY: currentY });
                        currentY = (doc as any).lastAutoTable.finalY + 4;
                    });
                    return currentY;
                }

                // Default logic for other tables
                (doc as any).autoTable({
                    ...commonOptions,
                    head: [[{ content: sectionData.title, colSpan: sectionData.headers.length, styles: { halign: 'center', fillColor: [52, 73, 94] } }], sectionData.headers],
                    body: sectionData.rows,
                    startY: startY,
                });
                return (doc as any).lastAutoTable.finalY;
            };

            let lastY = headerHeight;

            if (reportData.type === 'consolidated') {
                 const reportsToRender = [
                    reportData.timeAnalysis, reportData.topPerformers, reportData.visitsPerSalesperson,
                    reportData.visitsPerCustomer, reportData.uniqueCustomersPerSalesperson,
                    reportData.visitsPerProject, reportData.teamVisitList, reportData.salespersonCustomerVisits,
                    reportData.missingOutTime,
                ];

                reportsToRender.forEach(report => {
                    if (report) {
                        const remainingPageSpace = pageHeight - lastY - footerHeight;
                        if (lastY > headerHeight && remainingPageSpace < 20) { // Check if space is too small for a new section
                            doc.addPage();
                            lastY = headerHeight;
                        }
                        lastY = addSection(report, lastY) + 5;
                    }
                });
            } else {
                addSection(reportData, headerHeight);
            }
            
            doc.save(`report_${reportType || 'consolidated'}_${new Date().toISOString().split('T')[0]}.pdf`);

        } catch (error) {
            console.error("PDF Generation Error:", error);
            setFeedback({ message: `Failed to generate PDF. Error: ${error instanceof Error ? error.message : String(error)}`, type: 'error' });
        }
    };
    
    const handleExportReportCSV = () => {
        if (!reportData) {
            alert('Generate a report first.');
            return;
        }
        if (typeof window.Papa === 'undefined') {
            alert('CSV Export library is not available.');
            return;
        }

        let csvContent = '';
        const { Papa } = window;

        const addSectionToCsv = (report: any): string => {
            if (!report) return '';
            let sectionCsv = '';
            sectionCsv += `"${report.title}"\n`;

            if (report.overallSummary && Array.isArray(report.overallSummary)) {
                const summaryLine = report.overallSummary.map((s: any) => `${s.label}: ${s.value}`).join(' | ');
                sectionCsv += `"${summaryLine}"\n`;
            }
            sectionCsv += '\n';

            if (report.type === 'summaryCards' && report.cards) {
                sectionCsv += Papa.unparse({
                    fields: ['Metric', 'Value'],
                    data: report.cards.map((c: any) => [c.label, c.value])
                });
            } else if (report.headers && report.rows) {
                const cleanRows = report.rows.map((row: any[]) => {
                    if (Array.isArray(row) && row.some(cell => typeof cell === 'object' && (cell?.isSummary || cell?.isTeamSummary || cell?.isTeamHeader))) {
                        if(row[0]?.isTeamHeader) return [row[0].content];
                        return row.map(cell => typeof cell === 'object' ? cell.content : cell);
                    }
                    return row;
                });
                sectionCsv += Papa.unparse({
                    fields: report.headers,
                    data: cleanRows
                });
            }
            return sectionCsv + '\n\n';
        };

        if (reportData.type === 'consolidated') {
            csvContent += `"${reportData.title}"\n\n`;
            csvContent += addSectionToCsv(reportData.timeAnalysis);
            csvContent += addSectionToCsv(reportData.topPerformers);
            csvContent += addSectionToCsv(reportData.visitsPerSalesperson);
            csvContent += addSectionToCsv(reportData.visitsPerCustomer);
            csvContent += addSectionToCsv(reportData.uniqueCustomersPerSalesperson);
            csvContent += addSectionToCsv(reportData.visitsPerProject);
            csvContent += addSectionToCsv(reportData.teamVisitList);
            csvContent += addSectionToCsv(reportData.salespersonCustomerVisits);
            csvContent += addSectionToCsv(reportData.missingOutTime);
        } else {
            csvContent = addSectionToCsv(reportData);
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        const reportName = reportData.title.toLowerCase().replace(/[\s&()]+/g, '_').replace(/_+/g, '_');
        link.setAttribute("download", `${reportName}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <>
            <div className="px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8">
                <div className="bg-gradient-to-r from-white via-orange-50 to-amber-50 rounded-b-xl shadow-lg px-px pb-px">
                    <div className="bg-white rounded-b-xl">
                
                        {activeTab === 'records' && (
                            <div className="fade-in">
                                <div className="p-6">
                                     <h3 className="text-lg font-semibold text-slate-800 mb-4">Filters</h3>
                                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                        <div>
                                            <label htmlFor="start-date-filter" className="block text-sm font-medium text-slate-700">Start Date</label>
                                            <input type="date" id="start-date-filter" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
                                        </div>
                                        <div>
                                            <label htmlFor="end-date-filter" className="block text-sm font-medium text-slate-700">End Date</label>
                                            <input type="date" id="end-date-filter" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
                                        </div>
                                        <div>
                                            <label htmlFor="project-filter" className="block text-sm font-medium text-slate-700">Project</label>
                                            <select id="project-filter" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500">
                                                <option value="">All Projects</option>
                                                {projectNames.map(name => <option key={name} value={name}>{name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="team-filter" className="block text-sm font-medium text-slate-700">Team</label>
                                            <select id="team-filter" value={teamFilter} onChange={e => setTeamFilter(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500">
                                                <option value="">All Teams</option>
                                                {SALES_TEAMS.map(team => (
                                                    <option key={team.teamName} value={team.teamName}>{team.teamName}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="sales-person-filter" className="block text-sm font-medium text-slate-700">Sales Person</label>
                                            <select id="sales-person-filter" value={salesPersonFilter} onChange={(e) => setSalesPersonFilter(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500">
                                                <option value="">All Sales Persons</option>
                                                {salesPersonNames.map(name => <option key={name} value={name}>{name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 border-t border-slate-200">
                                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                                        <h3 className="text-lg font-semibold text-slate-800">Visit Records ({filteredVisits.length})</h3>
                                        <div className="flex items-center gap-3 flex-wrap justify-end">
                                            <label htmlFor="csv-upload" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50">
                                                Import (CSV)
                                            </label>
                                            <input id="csv-upload" type="file" ref={fileInputRef} onChange={handleFileUpload} className="sr-only" accept=".csv" />
                                            <button onClick={handleDownloadTemplate} className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50">
                                                Download Template
                                            </button>
                                            <button onClick={handleExportCSV} disabled={filteredVisits.length === 0} className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                                Export Excel (CSV)
                                            </button>
                                            <button onClick={handleExportPDF} disabled={filteredVisits.length === 0} className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50">Export PDF</button>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-slate-200">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    {REQUIRED_HEADERS.map(header => <th key={header} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{header}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-slate-200">
                                                {filteredVisits.length > 0 ? filteredVisits.map(visit => (
                                                    <tr key={visit.id} className="hover:bg-slate-50">
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{visit.slNo}</td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{visit.date}</td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{visit.salesPersonName}</td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{visit.designation}</td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{visit.customerName}</td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{visit.customerId}</td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{visit.projectName}</td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{visit.inTime}</td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{visit.outTime}</td>
                                                    </tr>
                                                )) : (
                                                    <tr>
                                                        <td colSpan={REQUIRED_HEADERS.length} className="text-center py-8 text-slate-500">
                                                            {visits.length === 0 ? "No data imported yet. Please import a CSV file." : "No records match your current filters."}
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'analysis' && (
                             <div className="p-6 space-y-6 fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                                     <div>
                                        <label htmlFor="report-type" className="block text-sm font-medium text-slate-700">Report Type</label>
                                        <select id="report-type" value={reportType} onChange={e => setReportType(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500">
                                            <option value="">-- Select a Report --</option>
                                            <option value="consolidated-report">Consolidated Report (All-in-One)</option>
                                            <optgroup label="Attendance / Visit Summary">
                                                <option value="visits-per-salesperson">Total Visits per Sales Person</option>
                                            </optgroup>
                                            <optgroup label="Customer Analysis">
                                                <option value="visits-per-customer">Visits per Customer &amp; Project</option>
                                                <option value="unique-customers-per-salesperson">Unique Customers per Salesperson (External)</option>
                                                <option value="salesperson-customer-visits">Salesperson-wise Customer &amp; Project Visits (List)</option>
                                            </optgroup>
                                            <optgroup label="Team Analysis">
                                                <option value="team-visit-list">Team-wise Visit List</option>
                                            </optgroup>
                                            <optgroup label="Project Analysis">
                                                <option value="visits-per-project">Visits per Project</option>
                                            </optgroup>
                                            <optgroup label="Performance & Time">
                                                <option value="time-analysis">Visit Duration Analysis</option>
                                                <option value="top-performers">Top 5 Sales Persons (by Visits)</option>
                                            </optgroup>
                                            <optgroup label="Exception Reports">
                                                <option value="missing-out-time">Visits with Missing Out Time</option>
                                            </optgroup>
                                        </select>
                                    </div>
                                     <div>
                                        <label htmlFor="analysis-start-date" className="block text-sm font-medium text-slate-700">Start Date</label>
                                        <input type="date" id="analysis-start-date" value={analysisStartDate} onChange={(e) => setAnalysisStartDate(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
                                    </div>
                                    <div>
                                        <label htmlFor="analysis-end-date" className="block text-sm font-medium text-slate-700">End Date</label>
                                        <input type="date" id="analysis-end-date" value={analysisEndDate} onChange={(e) => setAnalysisEndDate(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
                                    </div>
                                    <button onClick={handleGenerateReport} className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700">Generate Report</button>
                                    <button onClick={handleExportTeamListCSV} className="w-full inline-flex items-center justify-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50" title="Download a detailed CSV of all team visits in the selected date range">Team List (CSV)</button>
                                </div>

                                {reportData && (
                                    <div className="pt-6 border-t border-slate-200">
                                        {reportData.overallSummary && (
                                            <div className="mb-6">
                                                <h3 className="text-xl font-semibold text-slate-800 mb-3">Overall Summary</h3>
                                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                                    <SummaryCard title="Sales Persons" value={reportData.overallSummary.totalSalesPersons} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0110 14.25a5 5 0 01-1.5-4.33A6.97 6.97 0 007 16c0 .34.024.673.07 1h5.86z" /></svg>} />
                                                    <SummaryCard title="Team Members" value={reportData.overallSummary.totalTeamMembers} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>} />
                                                    <SummaryCard title="Total Visits" value={reportData.overallSummary.totalVisits} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>} />
                                                    <SummaryCard title="Unique Customers" value={reportData.overallSummary.totalUniqueCustomers} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a1 1 0 00-1 1v1a1 1 0 002 0V3a1 1 0 00-1-1zM4 4h3a3 3 0 006 0h3a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm2.5 7a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm2.45 2a2.5 2.5 0 10-4.9 0h4.9zM12 9a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>} />
                                                    <SummaryCard title="Unique Projects" value={reportData.overallSummary.totalUniqueProjects} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" /></svg>} />
                                                    <SummaryCard title="Top Project" value={reportData.overallSummary.topVisitedProject} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" /><path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" /></svg>} />
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-xl font-semibold text-slate-800">{reportData.title}</h3>
                                            <div className="flex items-center gap-3">
                                                <button onClick={handleExportReportCSV} className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                                    Export Excel (CSV)
                                                </button>
                                                <button onClick={handleExportReportPDF} className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                                                    Export PDF
                                                </button>
                                            </div>
                                        </div>
                                        {reportData.type === 'consolidated' ? (
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                <ReportSection report={reportData.timeAnalysis} />
                                                <ReportSection report={reportData.topPerformers} allowWrap={false} />
                                                <ReportSection report={reportData.visitsPerSalesperson} allowWrap={false} />
                                                <ReportSection report={reportData.visitsPerCustomer} />
                                                <ReportSection report={reportData.uniqueCustomersPerSalesperson} />
                                                <ReportSection report={reportData.visitsPerProject} />
                                                <ReportSection report={reportData.teamVisitList} />
                                                <ReportSection report={reportData.salespersonCustomerVisits} />
                                                <ReportSection report={reportData.missingOutTime} />
                                            </div>
                                        ) : (
                                            <ReportSection report={reportData} allowWrap={!['Total Visits per Sales Person', 'Top 5 Sales Persons (by Visits)'].includes(reportData.title)} />
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {feedback && <FeedbackMessage message={feedback.message} type={feedback.type} onDismiss={() => setFeedback(null)} />}
        </>
    );
};

export default SealPersonProjectVisit;
