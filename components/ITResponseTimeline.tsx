import React, { useState, useMemo, useRef } from 'react';
import FeedbackMessage from './FeedbackMessage';
import _ from 'lodash';
import { ITAssignedIssue, ITResponseTimelineTab, User } from '../types';
import ITRecordsTab from './ITRecordsTab';
import ITAnalysisTab from './ITAnalysisTab';

// For TypeScript to recognize libraries loaded from CDN
declare global {
    interface Window {
        Papa: any;
    }
}

/**
 * Robustly parses a date string from a CSV file into a Date object, treating it as UTC.
 * Handles DD-MMM-YYYY, DD-MMM-YY, YYYY-MM-DD, and other common formats.
 * @param dateStr The date string from the CSV.
 * @returns A Date object representing UTC midnight, or null if parsing fails.
 */
const parseDateFromCSV = (dateStr: string): Date | null => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const s = dateStr.trim();

    // 1. Try DD-MMM-YYYY or DD-MMM-YY (e.g., 01-Sep-2025 or 01-Sep-25)
    const dmyMatch = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4}|\d{2})$/);
    if (dmyMatch) {
        const day = parseInt(dmyMatch[1], 10);
        const monthStr = dmyMatch[2];
        let year = parseInt(dmyMatch[3], 10);
        
        if (year < 100) year += 2000;
        
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthIndex = monthNames.findIndex(m => m.toLowerCase() === monthStr.toLowerCase());

        if (monthIndex > -1) {
            const date = new Date(Date.UTC(year, monthIndex, day));
            if (!isNaN(date.getTime())) return date;
        }
    }

    // 2. Try YYYY-MM-DD (ISO format without time)
    const ymdMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymdMatch) {
        const year = parseInt(ymdMatch[1], 10);
        const month = parseInt(ymdMatch[2], 10) - 1; // month is 0-indexed
        const day = parseInt(ymdMatch[3], 10);
        const date = new Date(Date.UTC(year, month, day));
        if (!isNaN(date.getTime())) return date;
    }

    // 3. Try MM/DD/YYYY or M/D/YYYY (common US format)
    const mdyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdyMatch) {
        const month = parseInt(mdyMatch[1], 10) - 1;
        const day = parseInt(mdyMatch[2], 10);
        const year = parseInt(mdyMatch[3], 10);
        const date = new Date(Date.UTC(year, month, day));
        if (!isNaN(date.getTime())) return date;
    }
    
    // 4. Last resort: Generic parsing (can be unreliable due to timezone)
    // We convert to UTC components to strip local timezone information.
    const fallbackDate = new Date(s);
    if (!isNaN(fallbackDate.getTime())) {
        return new Date(Date.UTC(fallbackDate.getFullYear(), fallbackDate.getMonth(), fallbackDate.getDate()));
    }

    console.warn(`Could not parse date: "${s}"`);
    return null;
};

interface ITResponseTimelineProps {
    currentUser: User;
    assignedIssues: ITAssignedIssue[];
    onUpdateAssignedIssues: (issues: ITAssignedIssue[]) => void;
    activeTab: ITResponseTimelineTab;
    onTabChange: (tab: ITResponseTimelineTab) => void;
}

const ITResponseTimeline: React.FC<ITResponseTimelineProps> = ({ currentUser, assignedIssues, onUpdateAssignedIssues, activeTab }) => {
    const [statusFilter, setStatusFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [feedback, setFeedback] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const filteredIssues = useMemo(() => {
        return assignedIssues.filter(assignedIssue => {
            const statusMatch = !statusFilter || assignedIssue.status === statusFilter;
            const searchMatch = !searchQuery ||
                assignedIssue.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                assignedIssue.issue.toLowerCase().includes(searchQuery.toLowerCase()) ||
                assignedIssue.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                assignedIssue.zone.toLowerCase().includes(searchQuery.toLowerCase()) ||
                assignedIssue.assignedTo.toLowerCase().includes(searchQuery.toLowerCase());
            return statusMatch && searchMatch;
        });
    }, [assignedIssues, statusFilter, searchQuery]);
    
    const analysisData = useMemo(() => {
        if (assignedIssues.length === 0) return null;

        const mostRecentDateInDataset = _.maxBy(assignedIssues, 'reportedAt')?.reportedAt;
        
        const zoneDetails = _.chain(assignedIssues)
            .groupBy('zone')
            .map((issuesInZone, zoneName) => {
                return {
                    zone: zoneName,
                    count: issuesInZone.length,
                    projects: _.uniq(issuesInZone.map(issue => issue.projectName)).sort(),
                };
            })
            .orderBy(['count'], ['desc'])
            .value();

        const statusSummary = _.countBy(assignedIssues, 'status');
        const projectSummary = _.countBy(assignedIssues, 'projectName');

        // New calculation for top 5 common problems with details
        const issuesByDescription = _.groupBy(assignedIssues, 'issue');
        const top5CommonProblems = _.chain(Object.entries(issuesByDescription))
            .map(([issue, issues]) => {
                const latestIssue = _.maxBy(issues, 'reportedAt');
                const latestProjectName = latestIssue?.projectName || 'N/A';
                const projectSpecificCount = issues.filter(i => i.projectName === latestProjectName).length;
                return {
                    issue: issue,
                    count: issues.length,
                    latestProject: latestProjectName,
                    latestDate: latestIssue?.reportedAt || null,
                    projectSpecificCount: projectSpecificCount,
                };
            })
            .orderBy(['count'], ['desc'])
            .slice(0, 5)
            .value();

        const issueTimelineData = _.chain(assignedIssues)
            .groupBy(t => `${t.issue}|${t.projectName}`)
            .map((groupedIssues, issueAndProject) => {
                const [issue, projectName] = issueAndProject.split('|');
                
                const uniqueDates = _.uniqBy(groupedIssues, t => t.reportedAt.getTime())
                                     .map(t => t.reportedAt)
                                     .sort((a, b) => a.getTime() - b.getTime());

                const timelines: { start: Date, end: Date }[] = [];
                let totalActiveDays = 0;

                if (uniqueDates.length > 0) {
                    let currentTimeline = { start: uniqueDates[0], end: uniqueDates[0] };
                    for (let i = 1; i < uniqueDates.length; i++) {
                        const prevDate = uniqueDates[i - 1];
                        const currentDate = uniqueDates[i];
                        const diffDays = (currentDate.getTime() - prevDate.getTime()) / (1000 * 3600 * 24);
                        if (diffDays === 1) {
                            currentTimeline.end = currentDate;
                        } else {
                            timelines.push(currentTimeline);
                            currentTimeline = { start: currentDate, end: currentDate };
                        }
                    }
                    timelines.push(currentTimeline);
                    totalActiveDays = timelines.reduce((sum, tl) => sum + ((tl.end.getTime() - tl.start.getTime()) / (1000 * 3600 * 24) + 1), 0);
                }

                let solutionDate: Date | string | null = null;
                let resolutionTimeInDays: number | null = null;
                
                if (timelines.length > 0 && mostRecentDateInDataset) {
                    const latestTimeline = timelines[timelines.length - 1];
                    const isOngoing = latestTimeline.end.getTime() === mostRecentDateInDataset.getTime();
                    
                    if (isOngoing) {
                        solutionDate = 'Ongoing';
                        resolutionTimeInDays = Math.ceil((mostRecentDateInDataset.getTime() - latestTimeline.start.getTime()) / (1000 * 3600 * 24)) + 1;
                    } else {
                        const resolvedDate = new Date(latestTimeline.end.getTime());
                        resolvedDate.setUTCDate(resolvedDate.getUTCDate() + 1);
                        solutionDate = resolvedDate;
                        resolutionTimeInDays = Math.ceil((solutionDate.getTime() - latestTimeline.start.getTime()) / (1000 * 3600 * 24));
                    }
                }

                return {
                    issue,
                    projectName,
                    count: groupedIssues.length,
                    timelines,
                    totalActiveDays,
                    firstReported: uniqueDates.length > 0 ? uniqueDates[0] : null,
                    lastReported: uniqueDates.length > 0 ? uniqueDates[uniqueDates.length - 1] : null,
                    solutionDate,
                    resolutionTimeInDays,
                };
            })
            .orderBy('count', 'desc')
            .value();
            
        // --- New Summary Metrics ---
        const resolvedIssues = issueTimelineData.filter(t => typeof t.resolutionTimeInDays === 'number' && t.solutionDate !== 'Ongoing');
        const averageResolutionTime = resolvedIssues.length > 0 ? _.meanBy(resolvedIssues, 'resolutionTimeInDays') : 0;
        
        const ongoingIssues = issueTimelineData.filter(t => t.solutionDate === 'Ongoing');
        const longestOpenIssue = _.maxBy(ongoingIssues, 'resolutionTimeInDays');
        
        const mostFrequentIssue = issueTimelineData.length > 0 ? issueTimelineData[0] : null;


        return {
            totalAssignedIssues: assignedIssues.length,
            issueCount: statusSummary['Issue'] || 0,
            offlineCount: statusSummary['Offline'] || 0,
            zoneSummary: zoneDetails,
            projectSummary: _.orderBy(Object.entries(projectSummary), ([_project, count]) => count, ['desc']),
            top5CommonProblems,
            issueTimeline: issueTimelineData,
            // New summary data
            averageResolutionTime,
            longestOpenIssue,
            mostFrequentIssue,
        };
    }, [assignedIssues]);

    const handleDownloadTemplate = () => {
        if (typeof window.Papa === 'undefined') {
            setFeedback({ message: 'CSV library is not available.', type: 'error' });
            return;
        }
        const headers = ["SL No", "Date", "Project Name", "Zone", "Status", "Assigned Issue", "Assigned To"];
        const exampleData = [
            ['IT-101', '01-Sep-2025', 'Lake Lofts', 'Dhanmondi', 'Issue', 'Cannot access shared folder', 'IT Support'],
            ['IT-102', '02-Sep-2025', 'Gladiolus', 'Banani', 'Offline', 'Outlook is crashing', 'IT Support'],
        ];
        const csv = window.Papa.unparse({ fields: headers, data: exampleData });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "it_timeline_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setFeedback({ message: 'Template downloaded successfully!', type: 'success' });
    };

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
                const requiredHeaders = ["SL No", "Date", "Project Name", "Zone", "Status", "Assigned Issue", "Assigned To"];
                const headers = results.meta.fields;

                if (!requiredHeaders.every(h => headers.includes(h))) {
                    setFeedback({ message: 'CSV is missing required headers. Please use the new template.', type: 'error' });
                    if (event.target) event.target.value = '';
                    return;
                }

                const newAssignedIssues: ITAssignedIssue[] = [];
                let errorOccurred = false;
                const validStatuses: ITAssignedIssue['status'][] = ['Issue', 'Offline'];

                for (const [index, row] of results.data.entries()) {
                    if (errorOccurred) break;
                    
                    for (const field of requiredHeaders) {
                        if (!row[field]) {
                            setFeedback({ message: `Row ${index + 2}: Missing data for required field "${field}".`, type: 'error' });
                            errorOccurred = true;
                            break;
                        }
                    }
                    if (errorOccurred) continue;
                    
                    const reportedAt = parseDateFromCSV(row['Date']);
                    if (!reportedAt) {
                         setFeedback({ message: `Row ${index + 2}: Invalid or unsupported 'Date' format: "${row['Date']}".`, type: 'error' });
                         errorOccurred = true;
                         continue;
                    }
                    
                    const status = row['Status'];
                    if (!validStatuses.includes(status)) {
                        setFeedback({ message: `Row ${index + 2}: Invalid status "${status}". Must be one of: Issue, Offline.`, type: 'error' });
                        errorOccurred = true;
                        continue;
                    }

                    newAssignedIssues.push({
                        id: row['SL No'],
                        issue: row['Assigned Issue'],
                        reportedAt,
                        assignedTo: row['Assigned To'],
                        status,
                        projectName: row['Project Name'],
                        zone: row['Zone'],
                    });
                }
                
                if (!errorOccurred) {
                    const updatedIssues = _.orderBy([...assignedIssues, ...newAssignedIssues], ['reportedAt'], ['desc']);
                    onUpdateAssignedIssues(updatedIssues);
                    setFeedback({ message: `Successfully imported ${newAssignedIssues.length} assigned issues.`, type: 'success' });
                }
            },
            error: (err: any) => {
                setFeedback({ message: `Error parsing CSV: ${err.message}`, type: 'error' });
            }
        });

        if (event.target) event.target.value = ''; // Reset file input
    };

    const handleClearRecords = () => {
        if (window.confirm('Are you sure you want to delete all IT timeline records? This action cannot be undone.')) {
            onUpdateAssignedIssues([]);
            setFeedback({ message: 'All records have been cleared.', type: 'info' });
        }
    };

    return (
        <>
            <div className="px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8">
                <div className="bg-gradient-to-r from-white via-orange-50 to-amber-50 rounded-b-xl shadow-lg px-px pb-px">
                    <div className="bg-white rounded-b-xl">
                        {activeTab === 'records' && (
                            <ITRecordsTab
                                filteredIssues={filteredIssues}
                                statusFilter={statusFilter}
                                onStatusFilterChange={setStatusFilter}
                                searchQuery={searchQuery}
                                onSearchQueryChange={setSearchQuery}
                                fileInputRef={fileInputRef}
                                onFileUpload={handleFileUpload}
                                onDownloadTemplate={handleDownloadTemplate}
                                onClearRecords={handleClearRecords}
                                assignedIssuesCount={assignedIssues.length}
                            />
                        )}

                        {activeTab === 'analysis' && (
                           <div className="fade-in">
                             <ITAnalysisTab analysisData={analysisData} currentUser={currentUser} />
                           </div>
                        )}
                    </div>
                </div>
            </div>
            {feedback && <FeedbackMessage message={feedback.message} type={feedback.type} onDismiss={() => setFeedback(null)} />}
        </>
    );
};

export default ITResponseTimeline;