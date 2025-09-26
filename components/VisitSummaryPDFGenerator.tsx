import React from 'react';
import { User, ReportData, EmployeeVisit } from '../types';
import _ from 'lodash';

interface VisitSummaryPDFGeneratorProps {
    reportData: ReportData | null;
    reportTitle: string;
    currentUser: User;
    selectedMonth: string;
    selectedEmployee: string;
    selectedDepartment: string;
    allVisits: EmployeeVisit[];
    attendanceData: any[];
}

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

    const totalMinutes = Math.round(absSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

/**
 * Generates the report data for a single employee for a given month.
 * This logic is extracted from the main component to be reusable.
 */
const generateReportForEmployee = (employeeName: string, selectedMonth: string, allVisits: EmployeeVisit[], attendanceData: any[]): ReportData | null => {
    const [year, month] = selectedMonth.split('-').map(Number);
    
    const visitsInMonth = allVisits.filter(visit => {
        const visitDate = new Date(visit.date);
        const monthMatch = visitDate.getFullYear() === year && visitDate.getMonth() + 1 === month;
        const employeeMatch = visit.visitorName === employeeName;
        return monthMatch && employeeMatch;
    });

    if (visitsInMonth.length === 0) return null;

    // The rest of the report generation logic is the same as before
    const perDayVisits = _.chain(visitsInMonth)
        .groupBy('date')
        .map((dayVisits, date) => ({
            date,
            visitCount: dayVisits.length,
            totalDuration: _.sumBy(dayVisits, v => parseDurationToSeconds(v.duration)),
        }))
        .orderBy('date', 'asc')
        .value();

    const totalVisitDays = perDayVisits.length;
    const totalProjectsVisited = _.uniqBy(visitsInMonth, 'projectName').length;
    const grandTotalDuration = _.sumBy(perDayVisits, 'totalDuration');

    const perProjectVisits = _.chain(visitsInMonth)
        .groupBy('projectName')
        .map((projectVisits, projectName) => ({
            projectName,
            visitCount: projectVisits.length,
            totalDuration: _.sumBy(projectVisits, v => parseDurationToSeconds(v.duration)),
        }))
        .orderBy('visitCount', 'desc')
        .value();

    const durationCounts: { [key: string]: number } = {
        'More than 20 Minutes': 0, '10–19 Minutes': 0, '5–9 Minutes': 0, 'Less than 5 Minutes': 0,
    };
    const improperVisits: EmployeeVisit[] = [];
    visitsInMonth.forEach(visit => {
        const seconds = parseDurationToSeconds(visit.duration);
        if (seconds === 0) {
            improperVisits.push(visit);
            return;
        }
        const minutes = seconds / 60;
        if (minutes > 20) durationCounts['More than 20 Minutes']++;
        else if (minutes >= 10) durationCounts['10–19 Minutes']++;
        else if (minutes >= 5) durationCounts['5–9 Minutes']++;
        else durationCounts['Less than 5 Minutes']++;
    });
    const durationCountsArray = Object.entries(durationCounts).map(([category, count]) => ({ category, count }));

    const dailyProjectsLog = _.chain(visitsInMonth).cloneDeep().orderBy('date', 'asc').map(v => ({ date: v.date, projectName: v.projectName })).value();

    const visitDates = new Set(visitsInMonth.map(v => v.date));
    const noVisitDays: { date: string; day: string; remark: string }[] = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const employeeAttendanceRecord = attendanceData.find(rec => rec['Emp. Name'] === employeeName);

    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month - 1, day);
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek >= 0 && dayOfWeek <= 4) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            if (!visitDates.has(dateStr)) {
                 const remark = employeeAttendanceRecord ? (employeeAttendanceRecord[String(day)] || '') : '';
                noVisitDays.push({ date: dateStr, day: dayNames[dayOfWeek], remark });
            }
        }
    }
    
    return {
        perDay: perDayVisits,
        summary: { totalVisitDays, totalProjectsVisited, grandTotalDuration },
        perProject: perProjectVisits,
        durationCounts: durationCountsArray,
        improperVisitCount: improperVisits.length,
        improperVisits,
        dailyProjects: dailyProjectsLog,
        noVisitDays,
    };
};

const VisitSummaryPDFGenerator: React.FC<VisitSummaryPDFGeneratorProps> = ({
    reportData,
    reportTitle,
    currentUser,
    selectedMonth,
    selectedEmployee,
    selectedDepartment,
    allVisits,
    attendanceData,
}) => {
    const handleDownloadSummaryPDF = () => {
        if (typeof window.jspdf === 'undefined') return;
        if (!selectedEmployee && allVisits.length === 0) return; // Guard for all employees case
        if (selectedEmployee && !reportData) return; // Guard for single employee case
    
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

        const drawReport = (isFirstPage: boolean) => {
            // If "All Employees" is selected, loop and generate a report for each
            if (!selectedEmployee) {
                const [year, month] = selectedMonth.split('-').map(Number);
                const visitsForMonth = allVisits.filter(v => {
                     const visitDate = new Date(v.date);
                     const monthMatch = visitDate.getFullYear() === year && visitDate.getMonth() + 1 === month;
                     const departmentMatch = !selectedDepartment || v.department === selectedDepartment;
                     return monthMatch && departmentMatch;
                });
                const uniqueEmployees = _.uniq(visitsForMonth.map(v => v.visitorName)).sort();

                uniqueEmployees.forEach((employeeName, index) => {
                    const individualReportData = generateReportForEmployee(employeeName, selectedMonth, allVisits, attendanceData);
                    if (individualReportData) {
                        if (index > 0) {
                            doc.addPage();
                        }
                        const monthName = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' });
                        const individualReportTitle = `Monthly Visit Report - ${monthName} ${year}`;
                        const employeeVisitData = allVisits.find(v => v.visitorName === employeeName);
                        drawSingleReportOnPage(doc, individualReportData, individualReportTitle, currentUser, employeeVisitData, attendanceData);
                    }
                });

            } else if (reportData) {
                // Original behavior: generate a single report
                 const employeeVisitData = allVisits.find(v => v.visitorName === selectedEmployee);
                 drawSingleReportOnPage(doc, reportData, reportTitle, currentUser, employeeVisitData, attendanceData);
            }
        };

        drawReport(true);

        // Add footers to all pages after all content is drawn
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            // Re-draw header on subsequent pages if content overflowed
            if (i > 1) {
                addHeader(doc);
            }
            addFooter(doc, currentUser, i, pageCount);
        }
    
        const fileName = selectedEmployee 
            ? `visit-summary-${selectedEmployee}-${selectedMonth}.pdf`
            : `visit-summary-${selectedDepartment || 'all-depts'}-${selectedMonth}.pdf`;
        doc.save(fileName);
    };

    const addHeader = (docInstance: any) => {
        const pageWidth = docInstance.internal.pageSize.getWidth();
        const margin = 10;
        const headerStartY = 10;
        docInstance.setFont('helvetica', 'bold');
        docInstance.setFontSize(16);
        docInstance.setTextColor(234, 88, 12); // Orange
        docInstance.text("Credence Housing Limited", pageWidth / 2, headerStartY, { align: 'center' });
        
        docInstance.setFont('helvetica', 'normal');
        docInstance.setFontSize(8);
        docInstance.setTextColor(100);
        docInstance.text("House-15, Road-13/A, Dhanmondi R/A, Dhaka-1209", pageWidth / 2, headerStartY + 6, { align: 'center' });
        
        docInstance.setDrawColor(0);
        docInstance.setLineWidth(0.2);
        docInstance.line(margin, headerStartY + 8, pageWidth - margin, headerStartY + 8);
    };

    const addFooter = (docInstance: any, user: User, pageNum: number, pageCount: number) => {
        const pageWidth = docInstance.internal.pageSize.getWidth();
        const pageHeight = docInstance.internal.pageSize.getHeight();
        const margin = 10;

        docInstance.setFontSize(9);
        docInstance.setTextColor(150);

        const preparedByStr = `Prepared by\n${user.name}\n${user.designation}`;
        docInstance.text(preparedByStr, margin, pageHeight - 20);

        docInstance.text('Dept. HOD', pageWidth / 2, pageHeight - 10, { align: 'center' });

        const pageStr = `Page ${pageNum} of ${pageCount}`;
        docInstance.text(pageStr, pageWidth - margin, pageHeight - 10, { align: 'right' });
    };

    const drawSingleReportOnPage = (doc: any, data: ReportData, title: string, user: User, employeeData?: EmployeeVisit, attendanceData?: any[]) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 10;
        const footerHeight = 25;
    
        const tableOptions = {
            theme: 'grid',
            headStyles: { fillColor: [41, 51, 61], textColor: 255, fontSize: 8, fontStyle: 'bold', cellPadding: 1.5 },
            bodyStyles: { fontSize: 7.5, cellPadding: 1, fontStyle: 'normal' },
            styles: { overflow: 'linebreak' },
        };

        addHeader(doc);
    
        let lastY = 10 + 15;
        doc.setFontSize(15).setFont('helvetica', 'bold').setTextColor(40);
        doc.text(title, pageWidth / 2, lastY, { align: 'center' });
        lastY += 6;

        if (employeeData) {
            // Prioritize data from the monthly attendance import
            const attendanceRecord = attendanceData?.find(rec => rec['Emp. Name'] === employeeData.visitorName);

            // Details from different sources
            const employeeName = employeeData.visitorName;
            const employeeId = attendanceRecord ? attendanceRecord['Emp. Code'] : 'N/A';
            const designation = attendanceRecord ? attendanceRecord['Designation'] : employeeData.designation || 'N/A';
            
            const [year, month] = selectedMonth.split('-');
            const monthName = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
            const preparingDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        
            const employeeDetailsBody = [
                [
                    `Name: ${employeeName}`,
                    `Employee Code/ID: ${employeeId}`,
                    `Month: ${monthName}`
                ],
                [
                    `Desgn: ${designation}`,
                    '', // Empty cell
                    `Date of Preparing: ${preparingDate}`
                ]
            ];
            
            (doc as any).autoTable({
                body: employeeDetailsBody,
                startY: lastY,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 1, lineColor: [200,200,200], lineWidth: 0.1 },
                didParseCell: (hookData: any) => {
                    const raw = hookData.cell.raw;
                    if (raw && typeof raw === 'string' && raw.includes(':')) {
                         const parts = raw.split(/:(.*)/s);
                         hookData.cell.text = [parts[0] + ':', parts[1] || ''];
                    }
                },
                didDrawCell: (hookData: any) => {
                    const raw = hookData.cell.raw;
                    if (raw && typeof raw === 'string' && raw.includes(':')) {
                        doc.setFont(undefined, 'bold');
                    }
                },
                 willDrawCell: (hookData: any) => {
                    const raw = hookData.cell.raw;
                    if (raw && typeof raw === 'string' && raw.includes(':')) {
                         doc.setFont(undefined, 'normal');
                    }
                 }
            });
            lastY = (doc as any).lastAutoTable.finalY + 5;
        }

        doc.setFontSize(10).setFont('helvetica', 'bold');
        doc.text('Overall Summary', margin, lastY);
        lastY += 5;
        const summaryText = `Total Visiting Days: ${data.summary.totalVisitDays}  |  Total Projects Visited: ${data.summary.totalProjectsVisited}  |  Grand Total Duration: ${formatSecondsToHHMM(data.summary.grandTotalDuration)}`;
        doc.setFont('helvetica', 'normal').setFontSize(9);
        doc.text(summaryText, margin, lastY);
        lastY += 8;
    
        const columnGap = 2;
        const columnCount = 4;
        const totalGapWidth = columnGap * (columnCount - 1);
        const columnWidth = (pageWidth - (margin * 2) - totalGapWidth) / columnCount;
    
        const col1X = margin;
        const col2X = col1X + columnWidth + columnGap;
        const col3X = col2X + columnWidth + columnGap;
        const col4X = col3X + columnWidth + columnGap;
    
        let colY = lastY;
    
        // COL 1
        doc.setFontSize(11).setFont('helvetica', 'bold').text("Per Day Visit Count", col1X, colY);
        (doc as any).autoTable({
            ...tableOptions,
            head: [['Date', 'Visits', 'Duration']],
            body: data.perDay.map(d => [d.date, d.visitCount, formatSecondsToHHMM(d.totalDuration)]),
            startY: colY + 5,
            margin: { left: col1X, right: pageWidth - col1X - columnWidth },
            tableWidth: columnWidth,
        });
    
        if (data.noVisitDays.length > 0) {
            let afterVisitTableY = (doc as any).lastAutoTable.finalY + 5;
            doc.setFontSize(11).setFont('helvetica', 'bold').text("No Visit Days (Weekdays)", col1X, afterVisitTableY);
            (doc as any).autoTable({
                ...tableOptions,
                head: [['Date', 'Day', 'Remarks']],
                body: data.noVisitDays.map(d => [d.date, d.day, d.remark || '']),
                startY: afterVisitTableY + 5,
                margin: { left: col1X, right: pageWidth - col1X - columnWidth },
                tableWidth: columnWidth,
            });
        }
    
        // COL 2
        doc.setFontSize(11).setFont('helvetica', 'bold').text("Per Project Summary", col2X, colY);
        (doc as any).autoTable({
            ...tableOptions,
            head: [['Project', 'Visits', 'Duration']],
            body: data.perProject.map(p => [p.projectName, p.visitCount, formatSecondsToHHMM(p.totalDuration)]),
            startY: colY + 5,
            margin: { left: col2X, right: pageWidth - col2X - columnWidth },
            tableWidth: columnWidth,
        });
    
        // COL 3
        doc.setFontSize(11).setFont('helvetica', 'bold').text("Duration Feedback", col3X, colY);
        (doc as any).autoTable({
            ...tableOptions,
            head: [['Category', 'Count']],
            body: [...data.durationCounts.map(d => [d.category, d.count]), ['Improper Visits', data.improperVisitCount]],
            startY: colY + 5,
            margin: { left: col3X, right: pageWidth - col3X - columnWidth },
            tableWidth: columnWidth,
            didParseCell: (hookData: any) => { if (hookData.row.raw[0] === 'Improper Visits') { hookData.cell.styles.fontStyle = 'bold'; hookData.cell.styles.textColor = [200, 0, 0]; } },
        });
    
        // COL 4
        if (data.dailyProjects.length > 0) {
            const columnXPositions = [col1X, col2X, col3X, col4X];
            const rowHeightEstimate = 6; // Adjusted for larger font
            let dataToProcess = [...data.dailyProjects];
            let currentColumnIndex = 3;
            let isFirstChunkOfLog = true;
    
            while (dataToProcess.length > 0) {
                if (currentColumnIndex > 3) {
                    doc.addPage();
                    currentColumnIndex = 0;
                }
    
                const colX = columnXPositions[currentColumnIndex];
                // Use the page's top margin plus space for the header for subsequent pages
                const startY = (doc.internal.getCurrentPageInfo().pageNumber > 1) 
                    ? margin + 20 
                    : (currentColumnIndex === 3 && isFirstChunkOfLog ? colY : margin + 20);

                const availableHeight = pageHeight - startY - footerHeight;
                const rowsInThisColumn = Math.max(1, Math.floor(availableHeight / rowHeightEstimate));
                const chunk = dataToProcess.splice(0, rowsInThisColumn);
    
                if (chunk.length > 0) {
                    const logTitle = isFirstChunkOfLog && currentColumnIndex === 3 ? "Daily Project Log" : "Daily Project Log (Cont.)";
                    doc.setFontSize(11).setFont('helvetica', 'bold').text(logTitle, colX, startY);
                    (doc as any).autoTable({
                        ...tableOptions,
                        head: [['Date', 'Project Name']],
                        body: chunk.map(d => [d.date, d.projectName]),
                        startY: startY + 5,
                        margin: { left: colX, right: pageWidth - colX - columnWidth },
                        tableWidth: columnWidth,
                    });
                }
                isFirstChunkOfLog = false;
                currentColumnIndex++;
            }
        }
    };

    return (
        <button onClick={handleDownloadSummaryPDF} disabled={!reportData && !allVisits.length} className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
            Download PDF
        </button>
    );
};

export default VisitSummaryPDFGenerator;