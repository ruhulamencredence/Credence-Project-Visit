import React, { useMemo, useRef, useState } from 'react';
import { ITAssignedIssue, User } from '../types';
import _ from 'lodash';
import { useLoading } from '../contexts/LoadingContext';

const formatDateDDMMMYYYY = (date: Date | string | null): string => {
    if (!date) return '';
    try {
        if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
            date = `${date}T00:00:00Z`;
        }
        const d = new Date(date);
        
        if (isNaN(d.getTime())) return String(date);

        const day = String(d.getUTCDate()).padStart(2, '0');
        const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
        const year = d.getUTCFullYear();

        return `${day}-${month}-${year}`;
    } catch (e) {
        return String(date); // Fallback
    }
};

interface AnalysisData {
    totalAssignedIssues: number;
    issueCount: number;
    offlineCount: number;
    zoneSummary: {
        zone: string;
        count: number;
        projects: string[];
    }[];
    projectSummary: [string, number][];
    top5CommonProblems: {
        issue: string;
        count: number;
        latestProject: string;
        latestDate: Date | null;
        projectSpecificCount: number;
    }[];
    issueTimeline: {
        issue: string;
        projectName: string;
        count: number;
        timelines: { start: Date, end: Date }[];
        totalActiveDays: number;
        firstReported: Date | null;
        lastReported: Date | null;
        solutionDate: Date | string | null;
        resolutionTimeInDays: number | null;
    }[];
    averageResolutionTime: number;
    longestOpenIssue: {
        issue: string;
        projectName: string;
        resolutionTimeInDays: number | null;
    } | undefined;
    mostFrequentIssue: {
        issue: string;
        projectName: string;
        count: number;
    } | null;
}

interface ITAnalysisTabProps {
    analysisData: AnalysisData | null;
    currentUser: User;
}

// Analysis Card component
const AnalysisCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = "" }) => (
    <div className={`bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm transition-shadow hover:shadow-md ${className}`}>
        <h3 className="text-base font-bold text-slate-800 border-b border-slate-200 pb-3 mb-4">{title}</h3>
        <div className="text-sm">{children}</div>
    </div>
);

// Helper function for count color
const getCountColorClass = (count: number) => {
    if (count >= 10) return 'text-red-600';
    if (count >= 5) return 'text-orange-600';
    if (count >= 3) return 'text-yellow-600';
    return 'text-green-600';
};


const ITAnalysisTab: React.FC<ITAnalysisTabProps> = ({ analysisData, currentUser }) => {
    const { showLoading, hideLoading } = useLoading();
    const [showAllIssues, setShowAllIssues] = useState(false);

    const sortedTimelineData = useMemo(() => {
        if (!analysisData?.issueTimeline) return [];
        return _.orderBy(analysisData.issueTimeline, ['count'], ['desc']);
    }, [analysisData?.issueTimeline]);


    const handleSaveAsPdf = () => {
        if (!analysisData || typeof window.jspdf === 'undefined') {
            alert('PDF generation library is not available or there is no data to export.');
            return;
        }
    
        showLoading();
    
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 10;
            let lastY = 0;
    
            const addHeaderFooter = (currentPage: number, totalPages: number) => {
                const pageHeight = doc.internal.pageSize.getHeight();
                // Header
                const headerStartY = 15;
                // Company Name & Address
                doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(40);
                doc.text("Credence Housing Limited", pageWidth / 2, headerStartY, { align: 'center' });
                doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(100);
                doc.text("House-15, Road-13/A, Dhanmondi R/A, Dhaka-1209", pageWidth / 2, headerStartY + 6, { align: 'center' });
                // Report Title with month
                const currentMonthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
                doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(40);
                doc.text(`IT Response Timeline - Analysis Report (${currentMonthName})`, pageWidth / 2, headerStartY + 12, { align: 'center' });
                
                // Footer
                doc.setFontSize(9).setTextColor(150);
                const preparedByStr = `Prepared by\n${currentUser.name}\n${currentUser.designation}`;
                doc.text(preparedByStr, margin, pageHeight - 18);
                const pageStr = `Page ${currentPage} of ${totalPages}`;
                doc.text(pageStr, pageWidth - margin, pageHeight - 10, { align: 'right' });
            };
    
            // --- Start Drawing ---
            lastY = 38; // Start below header
    
            // Summary Cards
            doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(40);
            doc.text('Overall Summary', margin, lastY);
            lastY += 6;
    
            const cardWidth = (pageWidth - margin * 2 - 10) / 3;
            const cardHeight = 20;
            const cardColors = {
                total: [224, 231, 255], // blue-100
                issue: [254, 243, 199], // yellow-100
                offline: [209, 250, 229], // green-100
            };
    
            doc.setFillColor(...cardColors.total);
            doc.roundedRect(margin, lastY, cardWidth, cardHeight, 3, 3, 'F');
            doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor(55, 65, 81);
            doc.text(String(analysisData.totalAssignedIssues), margin + 5, lastY + 10);
            doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(100, 116, 139);
            doc.text('Total Records', margin + 5, lastY + 15);
    
            doc.setFillColor(...cardColors.issue);
            doc.roundedRect(margin + cardWidth + 5, lastY, cardWidth, cardHeight, 3, 3, 'F');
            doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor(55, 65, 81);
            doc.text(String(analysisData.issueCount), margin + cardWidth + 10, lastY + 10);
            doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(100, 116, 139);
            doc.text('Issues Reported', margin + cardWidth + 10, lastY + 15);
    
            doc.setFillColor(...cardColors.offline);
            doc.roundedRect(margin + (cardWidth + 5) * 2, lastY, cardWidth, cardHeight, 3, 3, 'F');
            doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor(55, 65, 81);
            doc.text(String(analysisData.offlineCount), margin + (cardWidth + 5) * 2 + 5, lastY + 10);
            doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(100, 116, 139);
            doc.text('Marked Offline', margin + (cardWidth + 5) * 2 + 5, lastY + 15);
    
            lastY += cardHeight + 10;
            
            // --- Tables ---
            const tableOptions = {
                theme: 'grid',
                headStyles: { fillColor: [41, 51, 61], textColor: 255, fontSize: 8, fontStyle: 'bold', cellPadding: 1.5 },
                bodyStyles: { fontSize: 7.5, cellPadding: 1, fontStyle: 'normal' },
                styles: { overflow: 'linebreak' },
                margin: { top: 38, bottom: 25, left: margin, right: margin },
                didDrawPage: (data: any) => {
                    addHeaderFooter(data.pageNumber, (doc as any).internal.getNumberOfPages());
                }
            };
    
            // Top 5 Common Problems
            (doc as any).autoTable({
                ...tableOptions,
                head: [[{ content: 'Top 5 Common Problems', colSpan: 4, styles: { halign: 'center' } }], ['#', 'Problem', 'Count', 'Latest Project & Date']],
                body: analysisData.top5CommonProblems.map((p, index) => [
                    index + 1,
                    p.issue,
                    p.count,
                    `${p.latestProject}\n(${formatDateDDMMMYYYY(p.latestDate)})`
                ]),
                startY: lastY,
                columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 'auto'}, 2: { cellWidth: 15 }, 3: { cellWidth: 40 } }
            });
            lastY = (doc as any).lastAutoTable.finalY + 8;

            // Add title for the next section
            doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(40);
            doc.text('Zone & Project Breakdown', margin, lastY);
            lastY += 8;
    
            // Zone Breakdown & Project Breakdown side-by-side
            const zoneTableY = lastY;
            (doc as any).autoTable({
                ...tableOptions,
                head: [['Zone', 'Count', 'Projects']],
                body: analysisData.zoneSummary.map(z => [z.zone, z.count, z.projects.join(', ')]),
                startY: zoneTableY,
                margin: { left: margin, right: pageWidth / 2 + 2 },
                tableWidth: pageWidth / 2 - margin - 2,
            });
            const zoneTableFinalY = (doc as any).lastAutoTable.finalY;
            
            // Project breakdown into 2 columns
            const projectSummary = analysisData.projectSummary;
            const half = Math.ceil(projectSummary.length / 2);
            const firstHalfProjects = projectSummary.slice(0, half);
            const secondHalfProjects = projectSummary.slice(half);
            
            const rightHalfXStart = pageWidth / 2 + 2;
            const rightHalfWidth = pageWidth / 2 - margin - 2;
            const projectTableWidth = rightHalfWidth / 2 - 1; // Subtract gap for a small space

            let projectTable1FinalY = zoneTableY;
            if (firstHalfProjects.length > 0) {
                (doc as any).autoTable({
                    ...tableOptions,
                    head: [['Project', 'Count']],
                    body: firstHalfProjects,
                    startY: zoneTableY,
                    margin: { left: rightHalfXStart, right: pageWidth - rightHalfXStart - projectTableWidth },
                    tableWidth: projectTableWidth,
                });
                projectTable1FinalY = (doc as any).lastAutoTable.finalY;
            }

            let projectTable2FinalY = zoneTableY;
            if (secondHalfProjects.length > 0) {
                 (doc as any).autoTable({
                    ...tableOptions,
                    head: [['Project', 'Count']],
                    body: secondHalfProjects,
                    startY: zoneTableY,
                    margin: { left: rightHalfXStart + projectTableWidth + 2, right: margin },
                    tableWidth: projectTableWidth,
                });
                projectTable2FinalY = (doc as any).lastAutoTable.finalY;
            }
    
            lastY = Math.max(zoneTableFinalY, projectTable1FinalY, projectTable2FinalY) + 8;
    
            // Issue Timeline
            (doc as any).autoTable({
                ...tableOptions,
                head: [[{ content: 'Unique Issue Timeline & Resolution', colSpan: 8, styles: { halign: 'center' } }], ['Project', 'Issue', 'Occurrences', 'Raised On', 'Active Days', 'Resolution', 'Resolution Date', 'Status']],
                body: analysisData.issueTimeline.map(t => [
                    t.projectName,
                    t.issue,
                    t.count,
                    formatDateDDMMMYYYY(t.firstReported),
                    t.totalActiveDays,
                    t.resolutionTimeInDays !== null ? `${t.resolutionTimeInDays} Day(s)` : 'N/A',
                    t.solutionDate === 'Ongoing' ? 'N/A' : formatDateDDMMMYYYY(t.solutionDate),
                    t.solutionDate === 'Ongoing' ? 'Ongoing' : 'Resolved'
                ]),
                startY: lastY
            });
    
            // Finalize footers on all pages
            const totalPages = (doc as any).internal.getNumberOfPages();
            for(let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                addHeaderFooter(i, totalPages);
            }
    
            doc.save(`it-analysis-report-${new Date().toISOString().split('T')[0]}.pdf`);
    
        } catch (error) {
            console.error("PDF Generation Error:", error);
            alert('An error occurred while generating the PDF.');
        } finally {
            hideLoading();
        }
    };

    const handleSaveSummaryPdf = () => {
        if (!analysisData || typeof window.jspdf === 'undefined') {
            alert('PDF generation library is not available or there is no data to export.');
            return;
        }

        showLoading();

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'legal'); // Use legal size
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 12;

            const addHeaderFooterToAllPages = () => {
                const totalPages = (doc as any).internal.getNumberOfPages();
                for (let i = 1; i <= totalPages; i++) {
                    doc.setPage(i);
                    // Header
                    const headerStartY = 15;
                    doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(40);
                    doc.text("Credence Housing Limited", pageWidth / 2, headerStartY, { align: 'center' });
                    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(100);
                    doc.text("House-15, Road-13/A, Dhanmondi R/A, Dhaka-1209", pageWidth / 2, headerStartY + 6, { align: 'center' });
                    const currentMonthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
                    doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(40);
                    doc.text(`IT Response Timeline - Summary Report (${currentMonthName})`, pageWidth / 2, headerStartY + 12, { align: 'center' });
                    
                    // Footer
                    doc.setFontSize(9).setTextColor(150);
                    const preparedByStr = `Prepared by\n${currentUser.name}\n${currentUser.designation}`;
                    doc.text(preparedByStr, margin, pageHeight - 18);
                    const pageStr = `Page ${i} of ${totalPages}`;
                    doc.text(pageStr, pageWidth - margin, pageHeight - 10, { align: 'right' });
                }
            };

            // --- PAGE 1 ---
            let lastY = 38; // Start below header area
            doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(40);
            doc.text('Data Analysis Summary', margin, lastY);
            lastY += 6;

            // Summary Cards
            const cardWidth = (pageWidth - margin * 2 - 10) / 3;
            const cardHeight = 20;
            doc.setFillColor(224, 231, 255).roundedRect(margin, lastY, cardWidth, cardHeight, 3, 3, 'F');
            doc.setFont('helvetica', 'bold').setFontSize(16).text(String(analysisData.totalAssignedIssues), margin + 5, lastY + 10);
            doc.setFont('helvetica', 'normal').setFontSize(9).text('Total Records', margin + 5, lastY + 15);
            doc.setFillColor(254, 243, 199).roundedRect(margin + cardWidth + 5, lastY, cardWidth, cardHeight, 3, 3, 'F');
            doc.setFont('helvetica', 'bold').setFontSize(16).text(String(analysisData.issueCount), margin + cardWidth + 10, lastY + 10);
            doc.setFont('helvetica', 'normal').setFontSize(9).text('Issues Reported', margin + cardWidth + 10, lastY + 15);
            doc.setFillColor(209, 250, 229).roundedRect(margin + (cardWidth + 5) * 2, lastY, cardWidth, cardHeight, 3, 3, 'F');
            doc.setFont('helvetica', 'bold').setFontSize(16).text(String(analysisData.offlineCount), margin + (cardWidth + 5) * 2 + 5, lastY + 10);
            doc.setFont('helvetica', 'normal').setFontSize(9).text('Marked Offline', margin + (cardWidth + 5) * 2 + 5, lastY + 15);
            lastY += cardHeight + 10;

            const tableOptions = { theme: 'grid', headStyles: { fillColor: [41, 51, 61], fontSize: 8 }, bodyStyles: { fontSize: 7.5 }, styles: { overflow: 'linebreak' } };
            
            // Two-column layout for tables
            const colWidth = (pageWidth - margin * 2 - 5) / 2;
            
            // Left Column
            const leftColX = margin;
            (doc as any).autoTable({
                ...tableOptions,
                head: [[{ content: 'Top 5 Common Problems', colSpan: 3, styles: { halign: 'center' } }], ['#', 'Problem', 'Count']],
                body: analysisData.top5CommonProblems.map((p, i) => [i + 1, p.issue, p.count]),
                startY: lastY,
                tableWidth: colWidth,
                margin: { left: leftColX, right: pageWidth - leftColX - colWidth }
            });
            let leftColY = (doc as any).lastAutoTable.finalY;

            (doc as any).autoTable({
                ...tableOptions,
                head: [[{ content: 'Zone Breakdown', colSpan: 2, styles: { halign: 'center' } }], ['Zone', 'Count']],
                body: analysisData.zoneSummary.map(z => [z.zone, z.count]),
                startY: leftColY + 5,
                tableWidth: colWidth,
                margin: { left: leftColX, right: pageWidth - leftColX - colWidth }
            });

            // Right Column
            const rightColX = margin + colWidth + 5;
            (doc as any).autoTable({
                ...tableOptions,
                head: [[{ content: 'Project Breakdown', colSpan: 2, styles: { halign: 'center' } }], ['Project', 'Count']],
                body: analysisData.projectSummary,
                startY: lastY,
                tableWidth: colWidth,
                margin: { left: rightColX, right: margin }
            });

            // --- PAGE 2 ---
            doc.addPage('legal', 'p');
            lastY = 38;

            // Timeline Highlights
            doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(40);
            doc.text('Timeline Highlights', margin, lastY);
            lastY += 6;
            doc.setFillColor(241, 245, 249).roundedRect(margin, lastY, cardWidth, cardHeight, 3, 3, 'F');
            doc.setFont('helvetica', 'bold').setFontSize(16).text(`${analysisData.averageResolutionTime.toFixed(1)} Days`, margin + 5, lastY + 10);
            doc.setFont('helvetica', 'normal').setFontSize(9).text('Avg. Time to Resolve', margin + 5, lastY + 15);
            doc.setFillColor(241, 245, 249).roundedRect(margin + cardWidth + 5, lastY, cardWidth, cardHeight, 3, 3, 'F');
            doc.setFont('helvetica', 'bold').setFontSize(10).text(_.truncate(analysisData.longestOpenIssue?.issue || 'N/A', { length: 25 }), margin + cardWidth + 10, lastY + 8);
            doc.setFont('helvetica', 'normal').setFontSize(9).text(`Longest Open Issue (${analysisData.longestOpenIssue?.resolutionTimeInDays || 0} days)`, margin + cardWidth + 10, lastY + 15);
            doc.setFillColor(241, 245, 249).roundedRect(margin + (cardWidth + 5) * 2, lastY, cardWidth, cardHeight, 3, 3, 'F');
            doc.setFont('helvetica', 'bold').setFontSize(10).text(_.truncate(analysisData.mostFrequentIssue?.issue || 'N/A', { length: 25 }), margin + (cardWidth + 5) * 2 + 5, lastY + 8);
            doc.setFont('helvetica', 'normal').setFontSize(9).text(`Most Frequent Issue (${analysisData.mostFrequentIssue?.count || 0} times)`, margin + (cardWidth + 5) * 2 + 5, lastY + 15);
            lastY += cardHeight + 10;
            
            // Unique Issue Timeline (2 columns)
            const timelineData = analysisData.issueTimeline;
            const timelineHalf = Math.ceil(timelineData.length / 2);
            const timelineCol1 = timelineData.slice(0, timelineHalf);
            const timelineCol2 = timelineData.slice(timelineHalf);
            const timelineHeaders = [['Project', 'Issue', 'Count', 'Status']];
            
            const timelineTableOptions = {
                 ...tableOptions,
                 head: [[{ content: 'Unique Issue Timeline & Resolution', colSpan: 4, styles: { halign: 'center' } }], ...timelineHeaders],
                 columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 12 }, 3: { cellWidth: 15 } }
            };

            if (timelineCol1.length > 0) {
                 (doc as any).autoTable({
                    ...timelineTableOptions,
                    body: timelineCol1.map(t => [t.projectName, t.issue, t.count, t.solutionDate === 'Ongoing' ? 'Ongoing' : 'Resolved']),
                    startY: lastY,
                    tableWidth: colWidth,
                    margin: { left: leftColX, right: pageWidth - leftColX - colWidth }
                });
            }
             if (timelineCol2.length > 0) {
                 (doc as any).autoTable({
                    ...timelineTableOptions,
                    body: timelineCol2.map(t => [t.projectName, t.issue, t.count, t.solutionDate === 'Ongoing' ? 'Ongoing' : 'Resolved']),
                    startY: lastY,
                    tableWidth: colWidth,
                    margin: { left: rightColX, right: margin }
                });
            }

            // Finalize
            addHeaderFooterToAllPages();
            doc.save(`it-analysis-summary-${new Date().toISOString().split('T')[0]}.pdf`);

        } catch (error) {
            console.error("Summary PDF Generation Error:", error);
            alert('An error occurred while generating the summary PDF.');
        } finally {
            hideLoading();
        }
    };
    
    if (!analysisData) {
        return (
            <div className="p-8 text-center text-slate-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V7a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-slate-900">No Data for Analysis</h3>
                <p className="mt-1 text-sm text-slate-500">Please import data in the "Records & Import" tab to see the analysis.</p>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6 no-print">
                <h2 className="text-2xl font-bold text-slate-800">Data Analysis Summary</h2>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleSaveAsPdf} 
                        className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50"
                        title="Save detailed analysis as a PDF"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                        Save Detailed PDF
                    </button>
                    <button 
                        onClick={handleSaveSummaryPdf} 
                        className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50"
                        title="Save a compact summary of this analysis as a PDF"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                        Save Summary PDF
                    </button>
                </div>
            </div>
            
            <div className="bg-gradient-to-br from-cyan-50 to-blue-100 p-6 rounded-lg space-y-6">
                <div id="it-analysis-summary-section">
                    {/* Overall Status Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {/* Total Records Card */}
                        <div className="bg-gradient-to-br from-blue-100 to-indigo-200 p-4 rounded-xl shadow-md flex items-center gap-4 transition-all hover:shadow-lg hover:-translate-y-1">
                            <div className="flex-shrink-0 h-12 w-12 rounded-full bg-white/70 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{analysisData.totalAssignedIssues}</p>
                                <p className="text-sm font-medium text-slate-600">Total Records</p>
                            </div>
                        </div>
                        {/* Issues Reported Card */}
                        <div className="bg-gradient-to-br from-yellow-100 to-amber-200 p-4 rounded-xl shadow-md flex items-center gap-4 transition-all hover:shadow-lg hover:-translate-y-1">
                            <div className="flex-shrink-0 h-12 w-12 rounded-full bg-white/70 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-yellow-900">{analysisData.issueCount}</p>
                                <p className="text-sm font-medium text-slate-600">Issues Reported</p>
                            </div>
                        </div>
                        {/* Marked Offline Card */}
                        <div className="bg-gradient-to-br from-green-100 to-emerald-200 p-4 rounded-xl shadow-md flex items-center gap-4 transition-all hover:shadow-lg hover:-translate-y-1">
                            <div className="flex-shrink-0 h-12 w-12 rounded-full bg-white/70 flex items-center justify-center">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-green-900">{analysisData.offlineCount}</p>
                                <p className="text-sm font-medium text-slate-600">Marked Offline</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Breakdown & Top Problems */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <AnalysisCard title="Zone Breakdown" className="lg:col-span-2">
                        <div className="space-y-4">
                            {analysisData.zoneSummary.map(({ zone, count, projects }) => (
                                <div key={zone}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-semibold text-slate-700">{zone}</span>
                                        <span className="text-slate-500 font-bold">{count}</span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-2.5 mb-1.5">
                                        <div className="bg-gradient-to-r from-orange-400 to-red-500 h-2.5 rounded-full" style={{ width: `${(count / analysisData.totalAssignedIssues) * 100}%` }}></div>
                                    </div>
                                    {projects.length > 0 && (
                                        <p className="text-xs text-slate-500 pl-1" title={projects.join(', ')}>
                                            <span className="font-medium text-slate-600">Projects:</span> {_.truncate(projects.join(', '), { length: 100 })}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </AnalysisCard>
                    <AnalysisCard title="Top 5 Common Problems" className="lg:col-span-2">
                        <ol className="space-y-3 list-none">
                            {analysisData.top5CommonProblems.map((p, index) => (
                                <li key={p.issue} className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 text-orange-600 font-bold flex items-center justify-center ring-2 ring-white">{index + 1}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-800 truncate" title={p.issue}>{p.issue}</p>
                                        <div className="flex items-baseline text-xs text-slate-500 mt-1">
                                            <p className="truncate pr-2">
                                                Project: <span className="font-semibold text-slate-600" title={p.latestProject}>{p.latestProject}</span>
                                                <span className="font-bold ml-1.5">
                                                    (<span className={getCountColorClass(p.projectSpecificCount)}>{p.projectSpecificCount}</span>
                                                    <span className="text-slate-400"> / {p.count} total</span>)
                                                </span>
                                            </p>
                                            <p className="ml-auto pl-2 whitespace-nowrap">Date: <span className="font-semibold text-slate-600">{formatDateDDMMMYYYY(p.latestDate)}</span></p>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </AnalysisCard>
                    <AnalysisCard title="Project Breakdown" className="lg:col-span-4">
                        {(() => {
                            if (!analysisData.projectSummary || analysisData.projectSummary.length === 0) {
                                return <p className="text-slate-500 text-center">No project data available.</p>;
                            }

                            const numRows = 10;
                            const numCols = Math.ceil(analysisData.projectSummary.length / numRows);
                            const projectChunks = _.chunk(analysisData.projectSummary, numRows);

                            const gridItems = [];
                            for (let i = 0; i < numRows; i++) { // iterate rows
                                for (let j = 0; j < numCols; j++) { // iterate columns
                                    if (projectChunks[j] && projectChunks[j][i]) {
                                        const [project, count] = projectChunks[j][i];
                                        gridItems.push(
                                            <div key={`${project as string}-name`} className="py-1 border-b border-slate-200/80 text-slate-700 truncate pr-2" title={project as string}>
                                                {project}
                                            </div>,
                                            <div key={`${project as string}-count`} className={`py-1 border-b border-slate-200/80 font-bold text-right ${getCountColorClass(count as number)}`}>
                                                {count}
                                            </div>
                                        );
                                    } else {
                                        // Add empty divs to keep grid structure
                                        gridItems.push(<div key={`empty-${j}-${i}-name`} />, <div key={`empty-${j}-${i}-count`} />);
                                    }
                                }
                            }

                            return (
                                <div className="grid gap-x-6 text-sm" style={{ gridTemplateColumns: `repeat(${numCols}, minmax(0, 1fr) auto)` }}>
                                    {gridItems}
                                </div>
                            );
                        })()}
                    </AnalysisCard>
                    
                    <AnalysisCard title="Timeline Highlights" className="lg:col-span-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                            <div className="bg-slate-100 p-3 rounded-lg">
                                <p className="text-xs text-slate-500 font-semibold">Avg. Time to Resolve</p>
                                <p className="font-bold text-slate-800 text-2xl mt-1">{analysisData.averageResolutionTime.toFixed(1)} Days</p>
                            </div>
                            <div className="bg-slate-100 p-3 rounded-lg">
                                <p className="text-xs text-slate-500 font-semibold">Longest Open Issue</p>
                                <p className="font-bold text-slate-800 text-lg mt-1 truncate" title={analysisData.longestOpenIssue?.issue || 'N/A'}>
                                    {analysisData.longestOpenIssue?.issue || 'N/A'}
                                </p>
                                <p className="text-sm text-slate-600">
                                    ({analysisData.longestOpenIssue?.resolutionTimeInDays || 0} days at {analysisData.longestOpenIssue?.projectName || 'N/A'})
                                </p>
                            </div>
                            <div className="bg-slate-100 p-3 rounded-lg">
                                <p className="text-xs text-slate-500 font-semibold">Most Frequent Issue</p>
                                <p className="font-bold text-slate-800 text-lg mt-1 truncate" title={analysisData.mostFrequentIssue?.issue || 'N/A'}>
                                    {analysisData.mostFrequentIssue?.issue || 'N/A'}
                                </p>
                                <p className="text-sm text-slate-600">({analysisData.mostFrequentIssue?.count || 0} times)</p>
                            </div>
                        </div>
                    </AnalysisCard>

                     <AnalysisCard title="Unique Issue Timeline & Resolution" className="lg:col-span-4">
                        {(() => {
                            if (sortedTimelineData.length === 0) {
                                return <div className="text-center py-8 text-slate-500">No issues to display.</div>;
                            }

                            const hasInfrequentIssues = sortedTimelineData.some(issue => issue.count < 2);
                            
                            const displayedTimelineData = showAllIssues
                                ? sortedTimelineData
                                : sortedTimelineData.filter(issue => issue.count >= 2);
                                
                            if (displayedTimelineData.length === 0 && !showAllIssues) {
                                return (
                                    <div className="text-center py-8 text-slate-500">
                                        <p>No issues occurred more than once.</p>
                                        {hasInfrequentIssues && (
                                            <button
                                                onClick={() => setShowAllIssues(true)}
                                                className="mt-4 px-4 py-2 text-sm font-medium text-orange-600 bg-orange-100 rounded-md hover:bg-orange-200 transition-colors"
                                            >
                                                View All {sortedTimelineData.length} Unique Issues
                                            </button>
                                        )}
                                    </div>
                                );
                            }

                            return (
                                <>
                                    {hasInfrequentIssues && (
                                        <div className="flex justify-end mb-4">
                                            <button
                                                onClick={() => setShowAllIssues(prev => !prev)}
                                                className="px-4 py-2 text-sm font-medium text-orange-600 bg-orange-100 rounded-md hover:bg-orange-200 transition-colors"
                                            >
                                                {showAllIssues ? 'Show Only Frequent Issues (2+)' : `View All (${sortedTimelineData.length}) Issues`}
                                            </button>
                                        </div>
                                    )}
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-slate-200">
                                            <thead className="bg-slate-100">
                                                <tr>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Project</th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Issue</th>
                                                    <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 uppercase">Occurrences</th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Raised On</th>
                                                    <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 uppercase">Active Days</th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Resolution</th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Resolution Date</th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-slate-200">
                                                {displayedTimelineData.map((issue, index) => (
                                                    <tr key={`${issue.issue}-${issue.projectName}-${index}`}>
                                                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-slate-800">{issue.projectName}</td>
                                                        <td className="px-3 py-2 whitespace-normal text-sm text-slate-600">{issue.issue}</td>
                                                        <td className="px-3 py-2 text-center text-sm font-bold text-slate-700">{issue.count}</td>
                                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-600">{formatDateDDMMMYYYY(issue.firstReported)}</td>
                                                        <td className="px-3 py-2 text-center text-sm text-slate-600">{issue.totalActiveDays}</td>
                                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-600">{issue.resolutionTimeInDays !== null ? `${issue.resolutionTimeInDays} day(s)` : 'N/A'}</td>
                                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-600">
                                                            {issue.solutionDate === 'Ongoing' ? 'N/A' : formatDateDDMMMYYYY(issue.solutionDate)}
                                                        </td>
                                                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${issue.solutionDate === 'Ongoing' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                                                {issue.solutionDate === 'Ongoing' ? 'Ongoing' : 'Resolved'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            );
                        })()}
                    </AnalysisCard>
                </div>
            </div>
        </div>
    );
};

export default ITAnalysisTab;