

import React from 'react';
import { User, ReportData, EmployeeVisit } from '../types';
import { SummaryDataRow, PROJECT_SIDE_INVENTORY_DESIGNATIONS } from './AllDepartmentSummary';
import _ from 'lodash';

// For TypeScript to recognize libraries loaded from CDN
declare global {
    interface Window {
        jspdf: any;
    }
}

interface PdfExportProps {
    groupedData: Map<string, SummaryDataRow[]>;
    currentUser: User;
    selectedMonth: string;
    currentMonthName: string;
    lastMonthName: string;
    defaultCurrentWorkingDays: string;
    defaultLastWorkingDays: string;
    securityCurrentWorkingDays: string;
    securityLastWorkingDays: string;
}

// FIX: Changed component to be a named export and to return a JSX button element.
// This resolves the error where the component did not return a ReactNode.
export const PdfExport: React.FC<PdfExportProps> = ({
    groupedData,
    currentUser,
    selectedMonth,
    currentMonthName,
    lastMonthName,
    defaultCurrentWorkingDays,
    defaultLastWorkingDays,
    securityCurrentWorkingDays,
    securityLastWorkingDays,
}) => {
    
    // Stability value formatting function for PDF
    const formatStabilityValueForPDF = (value: number): { text: string, color: number[] } => {
        const absValue = Math.abs(value);
        const text = `${absValue.toFixed(2)}%`;
        
        if (value > 0) {
            return { text: `▲ ${text}`, color: [0, 128, 0] }; // Green
        } else if (value < 0) {
            return { text: `▼ ${text}`, color: [255, 0, 0] }; // Red
        } else {
            return { text: `– ${text}`, color: [100, 100, 100] }; // Gray
        }
    };

    const handleExportPDF = () => {
        if (typeof window.jspdf === 'undefined') {
            alert('PDF Export library is not available.');
            return;
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'legal' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 10;

        const formatDateForPDF = (date: Date) => {
            const day = String(date.getDate()).padStart(2, '0');
            const month = date.toLocaleString('en-US', { month: 'short' });
            const year = date.getFullYear();
            return `${day} ${month} ${year}`;
        };
        
        // == PDF HEADER ==
        const headerStartY = 14;
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(40);
        doc.text("Credence Housing Limited", pageWidth / 2, headerStartY, { align: 'center' });
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text("House-15, Road-13/A, Dhanmondi R/A, Dhaka-1209", pageWidth / 2, headerStartY + 6, { align: 'center' });

        doc.setDrawColor(220);
        doc.setLineWidth(0.2);
        doc.line(margin, 28, pageWidth - margin, 28);

        // == REPORT TITLE ==
        let contentStartY = 34;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(40);
        doc.text(`Department Summary Report - ${currentMonthName} ${selectedMonth.split('-')[0]}`, pageWidth / 2, contentStartY, { align: 'center' });
        
        const preparingDateStr = `Preparing Date: ${formatDateForPDF(new Date())}`;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(preparingDateStr, pageWidth - margin, contentStartY, { align: 'right' });
        
        contentStartY += 5;

        // == TABLE ==
        const head = [
            [
                { content: 'SL', rowSpan: 2 }, { content: 'Name', rowSpan: 2 },
                { content: 'Design.', rowSpan: 2 }, { content: 'WD', rowSpan: 2 }, { content: 'VD', rowSpan: 2 },
                { content: 'Prev. Proj.', rowSpan: 2 }, { content: 'Total Proj.', rowSpan: 2 },
                { content: 'Duration Count', colSpan: 4, styles: { halign: 'center' } },
                { content: 'Target/Day', rowSpan: 2 }, { content: 'Target/Month', rowSpan: 2 },
                { content: `${currentMonthName} Actual`, rowSpan: 2 }, { content: `${currentMonthName} %`, rowSpan: 2 },
                { content: `${lastMonthName} Actual`, rowSpan: 2 }, { content: `${lastMonthName} %`, rowSpan: 2 },
                { content: 'Stability', rowSpan: 2 }, { content: `${lastMonthName} Avg`, rowSpan: 2 },
                { content: `${currentMonthName} Avg`, rowSpan: 2 }, { content: 'Avg Stab. %', rowSpan: 2 }
            ],
            [
                '>20', '10-19', '5-9', '<5'
            ]
        ];
        
        const body: any[] = [];
        let slNo = 1;
        groupedData.forEach((employees, department) => {
            if (!employees) return;

            const departmentHeader = { 
                content: department, 
                colSpan: 20, 
                styles: { 
                    fontStyle: 'bold', 
                    fillColor: [232, 234, 237],
                    textColor: [51, 65, 85],
                    halign: 'left',
                    lineWidth: 0.1,
                    lineColor: [150, 150, 150],
                } 
            };

            if (department === 'Inventory Management') {
                const projectSideEmployees = employees.filter(e => PROJECT_SIDE_INVENTORY_DESIGNATIONS.has(e.designation));
                const headOfficeEmployees = employees.filter(e => !PROJECT_SIDE_INVENTORY_DESIGNATIONS.has(e.designation));
                
                body.push([departmentHeader]);

                if (headOfficeEmployees.length > 0) {
                    body.push([{ content: 'Head Office', colSpan: 20, styles: { fontStyle: 'italic', fillColor: [241, 245, 249], halign: 'center' } }]);
                    headOfficeEmployees.forEach(row => {
                         const isExempt = row.supposedlyVisitDurationDay === '00:00';
                         const stabilityData = formatStabilityValueForPDF(row.currentStability);
                         const avgStabilityData = formatStabilityValueForPDF(row.averageStability);
                         
                         body.push([ 
                             slNo++, 
                             row.visitorName, 
                             row.designation, 
                             row.totalWorkingDay, 
                             row.totalVisitedDay, 
                             row.previousVisitedProjectCount, 
                             row.totalVisitedProjectCount, 
                             row.durationCount.moreThan20, 
                             row.durationCount.tenTo19, 
                             row.durationCount.fiveTo9, 
                             row.durationCount.lessThan5, 
                             row.supposedlyVisitDurationDay, 
                             row.supposedlyVisitDurationMonth, 
                             row.currentMonthActualDuration, 
                             isExempt ? row.currentMonthActualDuration : `${row.currentMonthDurationPercentage.toFixed(2)}%`, 
                             row.lastMonthActualDuration, 
                             isExempt ? row.lastMonthActualDuration : `${row.lastMonthDurationPercentage.toFixed(2)}%`, 
                             stabilityData.text, // Use formatted text here
                             row.lastMonthPerDayAverage, 
                             row.currentMonthDayAverage, 
                             avgStabilityData.text // Use formatted text here
                         ]);
                    });
                }
                 if (projectSideEmployees.length > 0) {
                    body.push([{ content: 'Project Side', colSpan: 20, styles: { fontStyle: 'italic', fillColor: [241, 245, 249], halign: 'center' } }]);
                    projectSideEmployees.forEach(row => {
                         const isExempt = row.supposedlyVisitDurationDay === '00:00';
                         const stabilityData = formatStabilityValueForPDF(row.currentStability);
                         const avgStabilityData = formatStabilityValueForPDF(row.averageStability);
                         
                         body.push([ 
                             slNo++, 
                             row.visitorName, 
                             row.designation, 
                             row.totalWorkingDay, 
                             row.totalVisitedDay, 
                             row.previousVisitedProjectCount, 
                             row.totalVisitedProjectCount, 
                             row.durationCount.moreThan20, 
                             row.durationCount.tenTo19, 
                             row.durationCount.fiveTo9, 
                             row.durationCount.lessThan5, 
                             row.supposedlyVisitDurationDay, 
                             row.supposedlyVisitDurationMonth, 
                             row.currentMonthActualDuration, 
                             isExempt ? row.currentMonthActualDuration : `${row.currentMonthDurationPercentage.toFixed(2)}%`, 
                             row.lastMonthActualDuration, 
                             isExempt ? row.lastMonthActualDuration : `${row.lastMonthDurationPercentage.toFixed(2)}%`, 
                             stabilityData.text, // Use formatted text here
                             row.lastMonthPerDayAverage, 
                             row.currentMonthDayAverage, 
                             avgStabilityData.text // Use formatted text here
                         ]);
                    });
                }

            } else {
                 body.push([departmentHeader]);
                 employees.forEach(row => {
                    const isExempt = row.supposedlyVisitDurationDay === '00:00';
                    const stabilityData = formatStabilityValueForPDF(row.currentStability);
                    const avgStabilityData = formatStabilityValueForPDF(row.averageStability);
                    
                    body.push([
                        slNo++, 
                        row.visitorName, 
                        row.designation, 
                        row.totalWorkingDay, 
                        row.totalVisitedDay,
                        row.previousVisitedProjectCount, 
                        row.totalVisitedProjectCount,
                        row.durationCount.moreThan20, 
                        row.durationCount.tenTo19, 
                        row.durationCount.fiveTo9,
                        row.durationCount.lessThan5, 
                        row.supposedlyVisitDurationDay,
                        row.supposedlyVisitDurationMonth, 
                        row.currentMonthActualDuration,
                        isExempt ? row.currentMonthActualDuration : `${row.currentMonthDurationPercentage.toFixed(2)}%`,
                        row.lastMonthActualDuration,
                        isExempt ? row.lastMonthActualDuration : `${row.lastMonthDurationPercentage.toFixed(2)}%`,
                        stabilityData.text, // Use formatted text here
                        row.lastMonthPerDayAverage, 
                        row.currentMonthDayAverage,
                        avgStabilityData.text // Use formatted text here
                    ]);
                });
            }
        });

        (doc as any).autoTable({
            head, body, startY: contentStartY, theme: 'grid',
            margin: { left: margin, right: margin, bottom: 30 },
            styles: { fontSize: 5.5, cellPadding: 0.8, lineWidth: 0.1, lineColor: [220, 220, 220] },
            headStyles: { fillColor: [44, 62, 80], textColor: 255, halign: 'center', valign: 'middle', fontSize: 5.5 },
            bodyStyles: { halign: 'center' },
            columnStyles: {
                1: { halign: 'left', cellWidth: 35 }, 
                2: { halign: 'left', cellWidth: 25 },
            },
            didParseCell: function (data: any) {
                // Style department/subgroup header rows
                // FIX: Added Array.isArray check to prevent accessing .length on a non-array, resolving potential errors.
                if (Array.isArray(data.row.raw) && data.row.raw.length === 1 && data.row.raw[0].colSpan) {
                    Object.assign(data.cell.styles, data.row.raw[0].styles);
                    return;
                }
                
                // Style stability columns with colored arrows (columns 17 and 20)
                if (data.column.dataKey === 17 || data.column.dataKey === 20) {
                    const cellText = data.cell.text[0] || data.cell.text;
                    
                    if (typeof cellText === 'string') {
                        if (cellText.includes('▲')) {
                            data.cell.styles.textColor = [0, 128, 0]; // Green
                        } else if (cellText.includes('▼')) {
                            data.cell.styles.textColor = [255, 0, 0]; // Red
                        } else if (cellText.includes('–')) {
                            data.cell.styles.textColor = [100, 100, 100]; // Gray
                        }
                    }
                }
            }
        });

        // == NOTES SECTION ==
        const notes = [
            `1. The Per Day Average Working Hours for each individual has been calculated based on the number of actual working days in ${lastMonthName} (${defaultLastWorkingDays} days) and ${currentMonthName} (${defaultCurrentWorkingDays} days), respectively. This allows a fair comparison between the two months.`,
            (securityLastWorkingDays || securityCurrentWorkingDays) ? `2. Exceptional: Security Dept. working days in ${lastMonthName} (${securityLastWorkingDays || 'N/A'} days) and ${currentMonthName} (${securityCurrentWorkingDays || 'N/A'} days).` : null,
            `3. Individuals showing Negative (▼) values in the comparison had lower average working hours in ${currentMonthName} compared to ${lastMonthName}.`,
            `4. Those with Positive (▲) values had higher working hours in ${currentMonthName} than in ${lastMonthName}.`,
            `5. This method ensures accurate performance tracking aligned with each month's effective working days.`,
        ].filter(Boolean); // Filter out null values
        
        let finalY = (doc as any).lastAutoTable.finalY;
        const noteStartY = finalY + 8 > pageHeight - 30 ? (doc.addPage(), 20) : finalY + 8; // Check for page break
        
        doc.setFontSize(8).setFont('helvetica', 'bold').setTextColor(80);
        doc.text('Important Notes:', margin, noteStartY);
        doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(120);
        doc.text(notes.join('\n'), margin, noteStartY + 4);

        // == FOOTER ==
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(9);
            doc.setTextColor(150);

            const preparedByStr = `Prepared by\n${currentUser.name}\n${currentUser.designation}`;
            doc.text(preparedByStr, margin, pageHeight - 20);

            doc.text('Dept. HOD', pageWidth / 2, pageHeight - 10, { align: 'center' });

            const pageStr = `Page ${i} of ${pageCount}`;
            doc.text(pageStr, pageWidth - margin, pageHeight - 10, { align: 'right' });
        }
        
        doc.save(`department_summary_${selectedMonth}.pdf`);
    };

    return (
        <button onClick={handleExportPDF} className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-300 text-xs font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50" title="Export Detailed Report as PDF">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
            Export Data (PDF)
        </button>
    );
};