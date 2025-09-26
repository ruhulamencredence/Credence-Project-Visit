import React, { useState, useMemo } from 'react';
import { EmployeeVisit } from '../types';
import _ from 'lodash';

const VISIT_REQUIRED_HEADERS = [
    'Sl No', 'Date', 'Visitor Name', 'Department', 'Designation',
    'Visited Project Name', 'Entry Time', 'Out Time', 'Duration', 'Formula'
];

interface SSVDutyAnalysisRecordsProps {
    visits: EmployeeVisit[];
    fileInputRef: React.RefObject<HTMLInputElement>;
    onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onClearRecords: () => void;
}

const SSVDutyAnalysisRecords: React.FC<SSVDutyAnalysisRecordsProps> = ({ visits, fileInputRef, onFileUpload, onClearRecords }) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredVisits = useMemo(() => {
        const lowercasedQuery = searchQuery.toLowerCase();
        if (!lowercasedQuery) return visits;
        return visits.filter(visit => 
            Object.values(visit).some(value => 
                String(value).toLowerCase().includes(lowercasedQuery)
            )
        );
    }, [visits, searchQuery]);

    const handleDownloadTemplate = () => {
        if (typeof window.Papa === 'undefined') { return; }
        const exampleData = [
            ['1', '1-Jul-25', 'John Doe', 'HR & Admin (Security)', 'Security Supervisor', 'Lake Lofts', '10:00', '18:00', '8:00:00', 'Full Duty'],
            ['2', '1-Jul-25', 'Jane Smith', 'Construction', 'Executive', 'Gladiolus', '11:00', '12:00', '1:00:00', '']
        ];
        const csv = window.Papa.unparse({ fields: VISIT_REQUIRED_HEADERS, data: exampleData });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.setAttribute("href", URL.createObjectURL(blob));
        link.setAttribute("download", "ssv_duty_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fade-in p-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                <div className="flex-grow">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search SSV records..."
                        className="w-full max-w-lg px-4 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-orange-500"
                    />
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                    <label htmlFor="ssv-csv-upload" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-orange-500 text-sm font-medium rounded-md shadow-sm text-orange-600 bg-white hover:bg-orange-50">
                        Import CSV
                    </label>
                    <input id="ssv-csv-upload" type="file" ref={fileInputRef} onChange={onFileUpload} className="sr-only" accept=".csv" />
                    <button onClick={handleDownloadTemplate} className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-sm font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50">
                        Template
                    </button>
                    <button onClick={onClearRecords} disabled={visits.length === 0} className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-sm font-medium rounded-md shadow-sm text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50">
                        Clear
                    </button>
                </div>
            </div>
            <div className="overflow-auto" style={{ maxHeight: '60vh' }}>
                {filteredVisits.length > 0 ? (
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50 sticky top-0">
                            <tr>
                                {VISIT_REQUIRED_HEADERS.map(header => (<th key={header} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{header}</th>))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {filteredVisits.map((visit, index) => (
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
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p className="p-8 text-center text-slate-500">{visits.length === 0 ? "No data imported yet. Please import an employee visit CSV." : "No records match your search."}</p>
                )}
            </div>
        </div>
    );
};
export default SSVDutyAnalysisRecords;
