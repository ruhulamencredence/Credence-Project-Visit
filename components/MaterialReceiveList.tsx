import React, { useState, useMemo, useRef } from 'react';
import { MaterialReceiveItem, User, Project } from '../types';
import FeedbackMessage from './FeedbackMessage';

// For TypeScript to recognize libraries loaded from CDN
declare global {
    interface Window {
        jspdf: any;
        Papa: any;
    }
}

// MOCK DATA
const ALL_RECEIPTS: MaterialReceiveItem[] = [
    { id: 1, mrf: 'MRF-001', projectName: 'Lake Lofts', supplierName: 'ABC Cement', materialName: 'Portland Cement', quantity: 200, unit: 'Bags', vehicle: 'Track', vehicleNumber: 'DH-1234', receivedBy: 'Ruhul Amen', receivingDate: '2024-08-25', receivingTime: '10:30', entryDate: '2024-08-25T10:35:00Z' },
    { id: 2, mrf: 'MRF-002', projectName: 'Gladiolus', supplierName: 'XYZ Steel', materialName: '60-Grade Rebar', quantity: 5, unit: 'Ton', vehicle: 'Track', vehicleNumber: 'CH-5678', receivedBy: 'Admin User', receivingDate: '2024-08-25', receivingTime: '11:00', entryDate: '2024-08-25T11:05:00Z' },
    { id: 3, mrf: 'MRF-003', projectName: 'Platinum', supplierName: 'Local Bricks Co.', materialName: 'First Class Bricks', quantity: 5000, unit: 'Pcs', vehicle: 'Track', vehicleNumber: 'GA-9012', receivedBy: 'Ruhul Amen', receivingDate: '2024-08-24', receivingTime: '14:00', entryDate: '2024-08-24T14:10:00Z' },
    { id: 4, mrf: 'MRF-004', projectName: 'Jardin Palacia', supplierName: 'Best Paints Ltd.', materialName: 'Weatherproof Paint', quantity: 50, unit: 'Gallon', vehicle: 'Van', receivedBy: 'Admin User', receivingDate: '2024-08-23', receivingTime: '09:15', entryDate: '2024-08-23T09:20:00Z' },
    { id: 5, mrf: 'MRF-005', projectName: 'Lake Lofts', supplierName: 'Fine Sands', materialName: 'Sylhet Sand', quantity: 10, unit: 'CFT', vehicle: 'Track', vehicleNumber: 'DH-4321', receivedBy: 'Ruhul Amen', receivingDate: '2024-08-22', receivingTime: '16:45', entryDate: '2024-08-22T16:50:00Z' },
    { id: 6, mrf: 'MRF-006', projectName: 'Helena Sparta', supplierName: 'Super Wires', materialName: '1.5mm Electrical Wire', quantity: 100, unit: 'Coil', vehicle: 'By Hand', receivedBy: 'Admin User', receivingDate: '2024-08-21', receivingTime: '12:00', entryDate: '2024-08-21T12:02:00Z' },
    { id: 7, mrf: 'MRF-007', projectName: 'Gladiolus', supplierName: 'XYZ Steel', materialName: '40-Grade Rebar', quantity: 2, unit: 'Ton', vehicle: 'Track', vehicleNumber: 'CH-5678', receivedBy: 'Ruhul Amen', receivingDate: '2024-08-20', receivingTime: '15:30', entryDate: '2024-08-20T15:35:00Z' },
];

interface MaterialReceiveListProps {
    currentUser: User;
    projects: Project[];
}

const formatDateForPDF = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
};

const MaterialReceiveList: React.FC<MaterialReceiveListProps> = ({ currentUser, projects }) => {
    const [receipts, setReceipts] = useState<MaterialReceiveItem[]>(ALL_RECEIPTS);
    const [feedback, setFeedback] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [projectFilter, setProjectFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const projectNames = useMemo(() => projects.map(p => p.name), [projects]);

    const filteredReceipts = useMemo(() => {
        const lowercasedQuery = searchQuery.toLowerCase();

        return receipts.filter(receipt => {
            const startDateMatch = !startDate || receipt.receivingDate >= startDate;
            const endDateMatch = !endDate || receipt.receivingDate <= endDate;
            const projectMatch = !projectFilter || receipt.projectName === projectFilter;

            if (!searchQuery.trim()) {
                return startDateMatch && endDateMatch && projectMatch;
            }
            
            const searchMatch =
                receipt.projectName.toLowerCase().includes(lowercasedQuery) ||
                receipt.mrf.toLowerCase().includes(lowercasedQuery) ||
                receipt.supplierName.toLowerCase().includes(lowercasedQuery) ||
                receipt.materialName.toLowerCase().includes(lowercasedQuery) ||
                String(receipt.quantity).toLowerCase().includes(lowercasedQuery) ||
                receipt.unit.toLowerCase().includes(lowercasedQuery) ||
                receipt.vehicle.toLowerCase().includes(lowercasedQuery) ||
                (receipt.vehicleNumber && receipt.vehicleNumber.toLowerCase().includes(lowercasedQuery)) ||
                receipt.receivedBy.toLowerCase().includes(lowercasedQuery) ||
                receipt.receivingDate.includes(lowercasedQuery) ||
                receipt.receivingTime.includes(lowercasedQuery) ||
                new Date(receipt.entryDate).toLocaleString().toLowerCase().includes(lowercasedQuery);

            return startDateMatch && endDateMatch && projectMatch && searchMatch;
        });
    }, [receipts, startDate, endDate, projectFilter, searchQuery]);

    const handleDownloadTemplate = () => {
        if (typeof window.Papa === 'undefined') {
            setFeedback({ message: 'CSV library is not available.', type: 'error' });
            return;
        }
        const headers = ['MRF', 'Project Name', 'Supplier Name', 'Material Name', 'Quantity', 'Unit', 'Vehicle', 'Vehicle Number', 'Received By', 'Receiving Date', 'Receiving Time'];
        const exampleData = [
            ['MRF-101', 'Lake Lofts', 'Local Supplier Inc.', 'Sand', 10, 'CFT', 'Track', 'DH-11-2233', 'Ruhul Amen', '2024-09-01', '11:00'],
            ['MRF-102', 'Gladiolus', 'Major Cement Co.', 'Portland Cement', 500, 'Bags', 'Cover van', 'CH-55-6677', 'Admin User', '2024-09-02', '14:30'],
        ];
        const csv = window.Papa.unparse({ fields: headers, data: exampleData });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "material_receipt_template.csv");
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
                const requiredHeaders = ['MRF', 'Project Name', 'Supplier Name', 'Material Name', 'Quantity', 'Unit', 'Received By', 'Receiving Date', 'Receiving Time'];
                const headers = results.meta.fields;

                if (!requiredHeaders.every(h => headers.includes(h))) {
                    setFeedback({ message: 'CSV is missing required headers. Please use the template.', type: 'error' });
                    if (event.target) event.target.value = '';
                    return;
                }

                const newReceipts: MaterialReceiveItem[] = [];
                let errorOccurred = false;
                const projectNamesSet = new Set(projects.map(p => p.name));

                for (const [index, row] of results.data.entries()) {
                    if (errorOccurred) break;
                    if (!requiredHeaders.every(h => row[h] && String(row[h]).trim())) {
                        setFeedback({ message: `Row ${index + 2}: Missing data for a required field.`, type: 'error' });
                        errorOccurred = true;
                        continue;
                    }
                    if (!projectNamesSet.has(row['Project Name'])) {
                        setFeedback({ message: `Row ${index + 2}: Project "${row['Project Name']}" does not exist.`, type: 'error' });
                        errorOccurred = true;
                        continue;
                    }
                    if (isNaN(parseFloat(row['Quantity']))) {
                        setFeedback({ message: `Row ${index + 2}: Quantity "${row['Quantity']}" is not a valid number.`, type: 'error' });
                        errorOccurred = true;
                        continue;
                    }

                    newReceipts.push({
                        id: Date.now() + index,
                        mrf: row.MRF,
                        projectName: row['Project Name'],
                        supplierName: row['Supplier Name'],
                        materialName: row['Material Name'],
                        quantity: parseFloat(row.Quantity),
                        unit: row.Unit,
                        vehicle: row.Vehicle || 'N/A',
                        vehicleNumber: row['Vehicle Number'] || undefined,
                        receivedBy: row['Received By'],
                        receivingDate: row['Receiving Date'], // Assumes YYYY-MM-DD
                        receivingTime: row['Receiving Time'], // Assumes HH:MM
                        entryDate: new Date().toISOString(),
                    });
                }
                
                if (!errorOccurred) {
                    setReceipts(prev => [...prev, ...newReceipts]);
                    setFeedback({ message: `Successfully imported ${newReceipts.length} records.`, type: 'success' });
                }
            },
            error: (err: any) => {
                setFeedback({ message: `Error parsing CSV: ${err.message}`, type: 'error' });
            }
        });

        if (event.target) event.target.value = ''; // Reset file input
    };

    const handleDownloadCSV = () => {
        const headers = ['Project Name', 'MRF NO', 'Supplier Name', 'Material Name', 'Quantity', 'Unit', 'Receiving Date', 'Receiving Time', 'Vehicle', 'Received By', 'Entry Date'];
        
        const rows = filteredReceipts.map(r => {
            const entryDateFormatted = new Date(r.entryDate).toLocaleString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(',', '');
            const vehicleInfo = `${r.vehicle}${r.vehicleNumber ? ` (${r.vehicleNumber})` : ''}`;

            return [
                `"${r.projectName}"`,
                `"${r.mrf}"`,
                `"${r.supplierName}"`,
                `"${r.materialName}"`,
                r.quantity,
                `"${r.unit}"`,
                `"${r.receivingDate}"`,
                `"${r.receivingTime}"`,
                `"${vehicleInfo}"`,
                `"${r.receivedBy}"`,
                `"${entryDateFormatted}"`
            ].join(',');
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `material-receipts-report-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadPDF = () => {
        if (typeof window.jspdf === 'undefined') {
            console.error("jsPDF library is not loaded.");
            alert("Could not generate PDF. Please try reloading the page.");
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 14;

        // Header
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
        const sloganX = largeP_X + (totalNameWidth / 2) - (sloganWidth / 2); // Center slogan
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
        doc.setDrawColor(220);
        doc.setLineWidth(0.2);
        doc.line(margin, 28, pageWidth - margin, 28);
        const contentStartY = 35;
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(40);
        doc.text("Material Receive Report", pageWidth / 2, contentStartY, { align: 'center' });
        const preparingDateStr = `Preparing Date: ${formatDateForPDF(new Date())}`;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(preparingDateStr, pageWidth - margin, contentStartY, { align: 'right' });
        doc.setFontSize(10);
        doc.setTextColor(100);
        const start = startDate ? formatDateForPDF(new Date(startDate + 'T00:00:00')) : 'N/A';
        const end = endDate ? formatDateForPDF(new Date(endDate + 'T00:00:00')) : 'N/A';
        const filterInfo = `Date Range: ${start} to ${end} | Project: ${projectFilter || 'All'} | Search: ${searchQuery || 'None'}`;
        doc.text(filterInfo, pageWidth / 2, contentStartY + 8, { align: 'center' });

        // Table
        const tableColumn = ['Project Name', 'MRF NO', 'Supplier Name', 'Material Name', 'Quantity', 'Unit', 'Receiving Date', 'Receiving Time', 'Vehicle', 'Received By', 'Entry Date'];
        const tableRows = filteredReceipts.map(r => {
             const entryDateFormatted = new Date(r.entryDate).toLocaleString('en-CA').replace(',', '');
             const receivingDateFormatted = formatDateForPDF(new Date(`${r.receivingDate}T00:00:00`));
             const vehicleInfo = `${r.vehicle}${r.vehicleNumber ? ` (${r.vehicleNumber})` : ''}`;

            return [
                r.projectName,
                r.mrf,
                r.supplierName,
                r.materialName,
                r.quantity.toString(),
                r.unit,
                receivingDateFormatted,
                r.receivingTime,
                vehicleInfo,
                r.receivedBy,
                entryDateFormatted
            ];
        });


        (doc as any).autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: contentStartY + 12,
            theme: 'grid',
            styles: { fontSize: 7, cellPadding: 1.5 },
            headStyles: { fillColor: [234, 88, 12], fontSize: 7, halign: 'center' },
            bodyStyles: { halign: 'center' }
        });

        // Footer
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
        
        doc.save(`material-receipts-report-${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <>
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-xl font-semibold text-slate-800 mb-4">Filter Material Receipts</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
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
                            <label htmlFor="search-filter" className="block text-sm font-medium text-slate-700">Search</label>
                            <input type="text" id="search-filter" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search all fields..." className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                    <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <h2 className="text-xl font-semibold text-slate-800">
                            Receipts ({filteredReceipts.length})
                        </h2>
                        <div className="flex items-center gap-3 flex-wrap justify-end">
                            <label htmlFor="csv-upload" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-orange-500 text-sm font-medium rounded-md shadow-sm text-orange-600 bg-white hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                                Import (CSV)
                            </label>
                            <input id="csv-upload" type="file" ref={fileInputRef} onChange={handleFileUpload} className="sr-only" accept=".csv" />
                            <button onClick={handleDownloadTemplate} className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 9.293a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                Download Template
                            </button>
                            <button onClick={handleDownloadCSV} disabled={filteredReceipts.length === 0} className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed" aria-label="Download report as CSV">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                Export Excel (CSV)
                            </button>
                            <button onClick={handleDownloadPDF} disabled={filteredReceipts.length === 0} className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-slate-400 disabled:cursor-not-allowed" aria-label="Download report as PDF">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                                Export PDF
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        {filteredReceipts.length > 0 ? (
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Project Name</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">MRF NO</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Supplier Name</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Material Name</th>
                                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Quantity</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Unit</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Receiving Date</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Time</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Vehicle</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Received By</th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Entry Date</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {filteredReceipts.map((receipt) => (
                                        <tr key={receipt.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{receipt.projectName}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{receipt.mrf}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{receipt.supplierName}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{receipt.materialName}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500 text-right">{receipt.quantity}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{receipt.unit}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(`${receipt.receivingDate}T00:00:00`).toLocaleDateString('en-CA')}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{receipt.receivingTime}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{receipt.vehicle}{receipt.vehicleNumber ? ` (${receipt.vehicleNumber})` : ''}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{receipt.receivedBy}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(receipt.entryDate).toLocaleString('en-CA', { dateStyle: 'short', timeStyle: 'short' }).replace(',', '')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="p-6 text-center text-slate-500">No receipts found matching your criteria.</p>
                        )}
                    </div>
                </div>
            </div>
            {feedback && <FeedbackMessage message={feedback.message} type={feedback.type} onDismiss={() => setFeedback(null)} />}
        </>
    );
};

export default MaterialReceiveList;