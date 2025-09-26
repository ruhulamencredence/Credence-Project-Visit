import React, { useState, useMemo } from 'react';
import { Project } from '../types';

// For TypeScript to recognize the jspdf library loaded from CDN
declare global {
    interface Window {
        jspdf: any;
    }
}

// Mock data structure
interface ProjectCase {
  id: number;
  caseName: string;
  projectName: string;
  reporter: string;
  date: string; // YYYY-MM-DD
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
}

const MOCK_CASES: ProjectCase[] = [
    { id: 1, caseName: 'Column Crack at Level 3', projectName: 'Lake Lofts', reporter: 'Ruhul Amen', date: '2024-08-25', category: 'Structural', priority: 'High' },
    { id: 2, caseName: 'Exposed Wiring in Hallway', projectName: 'Gladiolus', reporter: 'Admin User', date: '2024-08-24', category: 'Electrical', priority: 'Critical' },
    { id: 3, caseName: 'Leaking Pipe in Basement', projectName: 'Platinum', reporter: 'Ruhul Amen', date: '2024-08-22', category: 'Plumbing', priority: 'Medium' },
    { id: 4, caseName: 'Improper Scaffolding Setup', projectName: 'Jardin Palacia', reporter: 'Admin User', date: '2024-08-20', category: 'Safety Hazard', priority: 'High' },
    { id: 5, caseName: 'Paint Finishing Incomplete', projectName: 'Lake Lofts', reporter: 'Ruhul Amen', date: '2024-08-19', category: 'Finishing', priority: 'Low' },
    { id: 6, caseName: 'Faulty Elevator Control Panel', projectName: 'Gladiolus', reporter: 'Admin User', date: '2024-08-18', category: 'Electrical', priority: 'High' },
];

const ALL_CATEGORIES = Array.from(new Set(MOCK_CASES.map(c => c.category)));
const ALL_PRIORITIES: ProjectCase['priority'][] = ['Low', 'Medium', 'High', 'Critical'];

const getPriorityBadgeClass = (priority: 'Low' | 'Medium' | 'High' | 'Critical') => {
    switch (priority) {
        case 'Low': return 'bg-green-100 text-green-800';
        case 'Medium': return 'bg-yellow-100 text-yellow-800';
        case 'High': return 'bg-orange-100 text-orange-800';
        case 'Critical': return 'bg-red-100 text-red-800';
        default: return 'bg-slate-100 text-slate-800';
    }
};

interface ProjectCasesListProps {
    projects: Project[];
}

const ProjectCasesList: React.FC<ProjectCasesListProps> = ({ projects }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [projectFilter, setProjectFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');

    const projectNames = useMemo(() => projects.map(p => p.name), [projects]);

    const filteredCases = useMemo(() => {
        return MOCK_CASES.filter(pcase => {
            const startDateMatch = !startDate || pcase.date >= startDate;
            const endDateMatch = !endDate || pcase.date <= endDate;
            const projectMatch = !projectFilter || pcase.projectName === projectFilter;
            const priorityMatch = !priorityFilter || pcase.priority === priorityFilter;
            const categoryMatch = !categoryFilter || pcase.category === categoryFilter;
            return startDateMatch && endDateMatch && projectMatch && priorityMatch && categoryMatch;
        });
    }, [startDate, endDate, projectFilter, priorityFilter, categoryFilter]);

    const handleDownloadPDF = () => {
        if (typeof window.jspdf === 'undefined') {
            console.error("jsPDF library is not loaded.");
            alert("Could not generate PDF. Please try reloading the page.");
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Title
        doc.setFontSize(18);
        doc.text("Project Cases Report", 14, 22);

        // Filter Info
        doc.setFontSize(11);
        doc.setTextColor(100);
        const start = startDate ? new Date(startDate + 'T00:00:00').toLocaleDateString('en-US') : 'N/A';
        const end = endDate ? new Date(endDate + 'T00:00:00').toLocaleDateString('en-US') : 'N/A';
        const filterInfo = [
            `Date Range: ${start} to ${end}`,
            `Project: ${projectFilter || 'All'}`,
            `Priority: ${priorityFilter || 'All'}`,
            `Category: ${categoryFilter || 'All'}`,
        ];
        doc.text(filterInfo, 14, 32);

        // Table
        const tableColumn = ["Case Name", "Project", "Date", "Priority", "Category"];
        const tableRows = filteredCases.map(pcase => [
            pcase.caseName,
            pcase.projectName,
            new Date(`${pcase.date}T00:00:00`).toLocaleDateString('en-US'),
            pcase.priority,
            pcase.category
        ]);

        (doc as any).autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 55,
            theme: 'grid',
            headStyles: { fillColor: [255, 107, 10] }, // Orange header
        });

        // Footer
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            const pageStr = `Page ${i} of ${pageCount}`;
            doc.setFontSize(10);
            doc.text(pageStr, doc.internal.pageSize.width - 14 - doc.getTextWidth(pageStr), doc.internal.pageSize.height - 10);
            doc.text(`Generated on: ${new Date().toLocaleDateString('en-US')}`, 14, doc.internal.pageSize.height - 10);
        }

        // Save
        doc.save(`project-cases-report-${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-xl font-semibold text-slate-800 mb-4">Filter Project Cases</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                    {/* Date Filters */}
                    <div>
                        <label htmlFor="start-date-filter" className="block text-sm font-medium text-slate-700">Start Date</label>
                        <input type="date" id="start-date-filter" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
                    </div>
                    <div>
                        <label htmlFor="end-date-filter" className="block text-sm font-medium text-slate-700">End Date</label>
                        <input type="date" id="end-date-filter" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
                    </div>
                     {/* Project Filter */}
                    <div>
                        <label htmlFor="project-filter" className="block text-sm font-medium text-slate-700">Project</label>
                        <select id="project-filter" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500">
                            <option value="">All Projects</option>
                            {projectNames.map((name) => (<option key={name} value={name}>{name}</option>))}
                        </select>
                    </div>
                     {/* Priority Filter */}
                    <div>
                        <label htmlFor="priority-filter" className="block text-sm font-medium text-slate-700">Priority</label>
                        <select id="priority-filter" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500">
                            <option value="">All Priorities</option>
                            {ALL_PRIORITIES.map((p) => (<option key={p} value={p}>{p}</option>))}
                        </select>
                    </div>
                     {/* Category Filter */}
                    <div>
                        <label htmlFor="category-filter" className="block text-sm font-medium text-slate-700">Category</label>
                        <select id="category-filter" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500">
                            <option value="">All Categories</option>
                            {ALL_CATEGORIES.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                     <h2 className="text-xl font-semibold text-slate-800">
                        Results ({filteredCases.length})
                    </h2>
                    <button onClick={handleDownloadPDF} disabled={filteredCases.length === 0} className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-slate-400 disabled:cursor-not-allowed" aria-label="Download report as PDF">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                        Download PDF
                    </button>
                </div>
                {filteredCases.length > 0 ? (
                    <ul className="divide-y divide-slate-200">
                        {filteredCases.map((pcase) => (
                            <li key={pcase.id} className="p-4 grid grid-cols-3 md:grid-cols-4 gap-4 items-center hover:bg-slate-50 transition-colors">
                                <div className="col-span-2 md:col-span-1">
                                    <p className="font-semibold text-slate-800 truncate" title={pcase.caseName}>{pcase.caseName}</p>
                                    <p className="text-sm text-slate-500">{pcase.projectName}</p>
                                </div>
                                <div className="hidden md:block">
                                    <p className="text-sm text-slate-600">{new Date(`${pcase.date}T00:00:00`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                </div>
                                <div>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityBadgeClass(pcase.priority)}`}>
                                        {pcase.priority}
                                    </span>
                                </div>
                                <div className="text-right">
                                     <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800">
                                        {pcase.category}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="p-6 text-center text-slate-500">No project cases found matching your criteria.</p>
                )}
            </div>
        </div>
    );
};

export default ProjectCasesList;