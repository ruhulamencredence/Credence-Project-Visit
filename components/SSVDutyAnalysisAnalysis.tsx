import React, { useState, useMemo } from 'react';
import { EmployeeVisit } from '../types';
import _ from 'lodash';

// --- Helper Functions ---
const parseDurationToSeconds = (durationStr: string): number => {
    if (!durationStr || typeof durationStr !== 'string') return 0;
    const parts = durationStr.split(':').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return 0;
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
};

const formatSecondsToHHMM = (totalSeconds: number): string => {
    if (isNaN(totalSeconds) || totalSeconds <= 0) return '00:00';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const getShiftType = (entryTime: string): 'Day' | 'Night' => {
    if (!entryTime || !/^\d{1,2}:\d{2}/.test(entryTime)) {
        return 'Night'; // Default to night if time is invalid
    }
    // Day shift is from 8:00 AM (inclusive) to 8:00 PM (exclusive)
    return entryTime >= '08:00' && entryTime < '20:00' ? 'Day' : 'Night';
};

const parseDateTime = (dateStr: string, timeStr: string): Date | null => {
    if (!dateStr || !timeStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !/^\d{1,2}:\d{2}/.test(timeStr)) return null;
    const d = new Date(`${dateStr}T${timeStr}:00`);
    if (isNaN(d.getTime())) return null;
    return d;
};


const AnalysisCard: React.FC<{ title: string; value: React.ReactNode; subtext?: string; icon: React.ReactNode }> = ({ title, value, subtext, icon }) => (
    <div className="bg-gradient-to-br from-white to-slate-50 p-5 rounded-xl border border-slate-200/80 shadow-lg flex items-center gap-4 transition-all hover:-translate-y-1">
        <div className="flex-shrink-0 h-12 w-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
            {icon}
        </div>
        <div>
            <div className="text-2xl font-bold text-slate-800">{value}</div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            {subtext && <p className="text-xs text-slate-400 truncate" title={subtext}>{subtext}</p>}
        </div>
    </div>
);


interface SSVDutyAnalysisAnalysisProps {
    visits: EmployeeVisit[];
}

const SSVDutyAnalysisAnalysis: React.FC<SSVDutyAnalysisAnalysisProps> = ({ visits }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [supervisorFilter, setSupervisorFilter] = useState('');
    const [shiftFilter, setShiftFilter] = useState<'All' | 'Day' | 'Night'>('All');

    const uniqueSupervisors = useMemo(() => _.uniq(visits.map(v => v.visitorName)).sort(), [visits]);

    const analysisData = useMemo(() => {
        const filtered = visits.filter(v => {
            let dateMatch = true;

            // New logic for single-day "duty day" filtering (8AM to 8AM)
            if (startDate && endDate && startDate === endDate) {
                const dutyDayStart = parseDateTime(startDate, '08:00');
                if (!dutyDayStart) return false;

                const dutyDayEnd = new Date(dutyDayStart);
                dutyDayEnd.setDate(dutyDayEnd.getDate() + 1); // Next day at 08:00

                const visitEntryDateTime = parseDateTime(v.date, v.entryTime);
                if (!visitEntryDateTime) return false;

                // Entry time must be within the 24-hour duty window
                dateMatch = visitEntryDateTime >= dutyDayStart && visitEntryDateTime < dutyDayEnd;

            } else {
                // Original logic for standard date range filtering
                const startMatch = !startDate || v.date >= startDate;
                const endMatch = !endDate || v.date <= endDate;
                dateMatch = startMatch && endMatch;
            }

            const supervisorMatch = !supervisorFilter || v.visitorName === supervisorFilter;
            const shiftType = getShiftType(v.entryTime);
            const shiftMatch = shiftFilter === 'All' || shiftType === shiftFilter;
            
            return dateMatch && supervisorMatch && shiftMatch;
        });

        if (filtered.length === 0) return null;

        const totalDurationSec = _.sumBy(filtered, v => parseDurationToSeconds(v.duration));
        const totalShifts = filtered.length;
        const totalSupervisors = _.uniq(filtered.map(v => v.visitorName)).length;
        
        const projectHours = _.chain(filtered)
            .groupBy('projectName')
            .map((projectVisits, name) => ({
                name,
                hours: _.sumBy(projectVisits, v => parseDurationToSeconds(v.duration))
            }))
            .orderBy(['hours'], ['desc'])
            .value();

        const supervisorAnalysis = _.chain(filtered)
            .groupBy('visitorName')
            .map((svisits, name) => {
                const totalHoursSec = _.sumBy(svisits, v => parseDurationToSeconds(v.duration));
                const shifts = svisits.length;
                const projectsCovered = _.uniq(svisits.map(v => v.projectName)).length;
                const topProject = (_.chain(svisits)
                    .groupBy('projectName')
                    .map((pvisits, pname) => ({ name: pname, duration: _.sumBy(pvisits, v => parseDurationToSeconds(v.duration))}))
                    .maxBy('duration')
                    .value())?.name || 'N/A';
                
                return {
                    name,
                    totalShifts: shifts,
                    totalHours: formatSecondsToHHMM(totalHoursSec),
                    avgShiftLength: formatSecondsToHHMM(shifts > 0 ? totalHoursSec / shifts : 0),
                    dayShifts: svisits.filter(v => getShiftType(v.entryTime) === 'Day').length,
                    nightShifts: svisits.filter(v => getShiftType(v.entryTime) === 'Night').length,
                    projectsCovered,
                    topProject
                };
            })
            .orderBy(['totalShifts'], ['desc'])
            .value();

        // Hourly Duration Analysis
        const hourlyDurationBuckets = Array(24).fill(0); // in minutes
        filtered.forEach(visit => {
            if (!visit.entryTime || !visit.outTime || !visit.date) return;
            try {
                const entry = new Date(`${visit.date}T${visit.entryTime}`);
                const out = new Date(`${visit.date}T${visit.outTime}`);
                if (isNaN(entry.getTime()) || isNaN(out.getTime())) return;

                if (out < entry) out.setDate(out.getDate() + 1);

                let currentHourTime = new Date(entry);

                while (currentHourTime < out) {
                    const hourIndex = currentHourTime.getHours();
                    
                    const nextHourTime = new Date(currentHourTime);
                    nextHourTime.setHours(nextHourTime.getHours() + 1);
                    nextHourTime.setMinutes(0);
                    nextHourTime.setSeconds(0);

                    const endOfInterval = out < nextHourTime ? out : nextHourTime;
                    const minutesInHour = (endOfInterval.getTime() - currentHourTime.getTime()) / (1000 * 60);

                    if (minutesInHour > 0) {
                        hourlyDurationBuckets[hourIndex] += minutesInHour;
                    }
                    currentHourTime = nextHourTime;
                }
            } catch (e) {
                console.error("Error parsing visit times for hourly analysis", visit);
            }
        });
        
        const maxDurationMinutes = Math.max(...hourlyDurationBuckets, 1);
        const minDurationMinutes = Math.min(...hourlyDurationBuckets);
        const minDurationHour = hourlyDurationBuckets.indexOf(minDurationMinutes);

        // Hourly Frequency Analysis
        const hourlyFrequencyBuckets = Array(24).fill(0);
        filtered.forEach(visit => {
            if (visit.entryTime && /^\d{1,2}:\d{2}/.test(visit.entryTime)) {
                const hour = parseInt(visit.entryTime.split(':')[0], 10);
                if (hour >= 0 && hour < 24) {
                    hourlyFrequencyBuckets[hour]++;
                }
            }
        });
        const maxFrequency = Math.max(...hourlyFrequencyBuckets, 1);
        const peakHour = hourlyFrequencyBuckets.indexOf(Math.max(...hourlyFrequencyBuckets));
        const lowHour = hourlyFrequencyBuckets.indexOf(Math.min(...hourlyFrequencyBuckets));

        return {
            totalDutyHours: formatSecondsToHHMM(totalDurationSec),
            totalSupervisorsOnDuty: totalSupervisors,
            averageDutyLength: formatSecondsToHHMM(totalShifts > 0 ? totalDurationSec / totalShifts : 0),
            mostActiveProject: projectHours.length > 0 ? projectHours[0].name : 'N/A',
            dayShifts: filtered.filter(v => getShiftType(v.entryTime) === 'Day').length,
            nightShifts: filtered.filter(v => getShiftType(v.entryTime) === 'Night').length,
            supervisorAnalysis,
            projectAnalysis: projectHours.map(p => ({
                name: p.name,
                totalHours: formatSecondsToHHMM(p.hours),
                totalShifts: filtered.filter(v => v.projectName === p.name).length,
                supervisorCount: _.uniq(filtered.filter(v => v.projectName === p.name).map(v => v.visitorName)).length
            })),
            hourlyDurationAnalysis: {
                buckets: hourlyDurationBuckets.map(m => Math.round(m)),
                maxMinutes: maxDurationMinutes,
                minHour: minDurationHour,
            },
            hourlyFrequencyAnalysis: {
                buckets: hourlyFrequencyBuckets,
                maxFrequency,
                peakHour,
                lowHour
            },
        };
    }, [visits, startDate, endDate, supervisorFilter, shiftFilter]);

    const handleExportCSV = () => {
        if (!analysisData || typeof window.Papa === 'undefined') return;

        const headers = ['Supervisor Name', 'Total Shifts', 'Day Shifts', 'Night Shifts', 'Total Hours', 'Avg. Shift Length', 'Projects Covered', 'Top Project'];
        const csvData = analysisData.supervisorAnalysis.map(row => [
            row.name, row.totalShifts, row.dayShifts, row.nightShifts, row.totalHours, row.avgShiftLength, row.projectsCovered, row.topProject
        ]);

        const csv = window.Papa.unparse({ fields: headers, data: csvData });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.setAttribute("href", URL.createObjectURL(blob));
        link.setAttribute("download", `ssv_duty_analysis_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div>
                    <label htmlFor="start-date-ssv" className="block text-sm font-medium text-slate-700">Start Date</label>
                    <input type="date" id="start-date-ssv" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                    <label htmlFor="end-date-ssv" className="block text-sm font-medium text-slate-700">End Date</label>
                    <input type="date" id="end-date-ssv" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                    <label htmlFor="supervisor-filter-ssv" className="block text-sm font-medium text-slate-700">Supervisor</label>
                    <select id="supervisor-filter-ssv" value={supervisorFilter} onChange={e => setSupervisorFilter(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-orange-500">
                        <option value="">All Supervisors</option>
                        {uniqueSupervisors.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                </div>
                 <div>
                    <label htmlFor="shift-filter-ssv" className="block text-sm font-medium text-slate-700">Shift</label>
                    <select id="shift-filter-ssv" value={shiftFilter} onChange={e => setShiftFilter(e.target.value as any)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-orange-500">
                        <option value="All">All Shifts</option>
                        <option value="Day">Day Shift (8am-8pm)</option>
                        <option value="Night">Night Shift (8pm-8am)</option>
                    </select>
                </div>
            </div>

            {!analysisData ? (
                <div className="text-center py-12 text-slate-500">
                    <p>No SSV data found for the selected filters.</p>
                    <p className="text-sm">Please import data in the 'Records' tab or adjust your filters.</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <AnalysisCard title="Total Duty Hours" value={analysisData.totalDutyHours} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.415L11 9.586V6z" clipRule="evenodd" /></svg>} />
                        <AnalysisCard title="Average Duty Length" value={`${analysisData.averageDutyLength} hrs`} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" /><path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" /></svg>} />
                        <AnalysisCard title="Shift Breakdown" value={<div className="flex gap-4"><span className="text-sky-600">{analysisData.dayShifts} Day</span> / <span className="text-indigo-600">{analysisData.nightShifts} Night</span></div>} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M10 4a1 1 0 011 1v1.333a11.025 11.025 0 013.56 1.396 1 1 0 010 1.742A8.995 8.995 0 0010 17.5a8.995 8.995 0 00-4.56-9.289 1 1 0 010-1.742A11.025 11.025 0 019 6.333V5a1 1 0 011-1z" /></svg>} />
                        <AnalysisCard title="Most Active Project" value={<span className="truncate" title={analysisData.mostActiveProject}>{analysisData.mostActiveProject}</span>} subtext={`${analysisData.totalSupervisorsOnDuty} Supervisors on Duty`} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>} />
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="lg:col-span-2 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
                            <h3 className="text-base font-bold text-slate-800 border-b border-slate-200 pb-3 mb-4">Hourly Coverage (Duration)</h3>
                            <p className="text-xs text-slate-500 mb-4 -mt-2">
                                Total duty minutes logged per hour. Red bar indicates lowest coverage.
                            </p>
                            <div className="w-full h-64 flex items-end justify-between gap-1 px-2">
                                {analysisData.hourlyDurationAnalysis.buckets.map((minutes, hour) => {
                                    const height = analysisData.hourlyDurationAnalysis.maxMinutes > 0 ? (minutes / analysisData.hourlyDurationAnalysis.maxMinutes) * 100 : 0;
                                    const isMinHour = hour === analysisData.hourlyDurationAnalysis.minHour;
                                    return (
                                        <div key={hour} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                                            <div
                                                className={`w-full rounded-t-md transition-all duration-300 ${isMinHour ? 'bg-red-400 hover:bg-red-500' : 'bg-orange-400 group-hover:bg-orange-500'}`}
                                                style={{ height: `${height}%` }}
                                            ></div>
                                            <div className="absolute bottom-full mb-2 w-max p-2 text-xs text-white bg-slate-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                                {`${String(hour).padStart(2, '0')}:00 - Total: ${formatSecondsToHHMM(minutes * 60)}`}
                                            </div>
                                            <span className="text-xs text-slate-500 mt-1">{String(hour).padStart(2, '0')}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                         <div className="lg:col-span-2 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
                            <h3 className="text-base font-bold text-slate-800 border-b border-slate-200 pb-3 mb-4">Hourly Activity (Visit Count)</h3>
                             <p className="text-xs text-slate-500 mb-4 -mt-2">
                                Number of visits started per hour. Green bar is the peak hour, red is the lowest.
                            </p>
                            <div className="w-full h-64 flex items-end justify-between gap-1 px-2">
                                {analysisData.hourlyFrequencyAnalysis.buckets.map((count, hour) => {
                                    const height = analysisData.hourlyFrequencyAnalysis.maxFrequency > 0 ? (count / analysisData.hourlyFrequencyAnalysis.maxFrequency) * 100 : 0;
                                    const isPeakHour = hour === analysisData.hourlyFrequencyAnalysis.peakHour;
                                    const isLowHour = hour === analysisData.hourlyFrequencyAnalysis.lowHour;
                                    let barClass = 'bg-sky-400 group-hover:bg-sky-500';
                                    if(isPeakHour) barClass = 'bg-green-400 hover:bg-green-500';
                                    if(isLowHour && !isPeakHour) barClass = 'bg-red-400 hover:bg-red-500';
                                    return (
                                        <div key={hour} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                                            <div
                                                className={`w-full rounded-t-md transition-all duration-300 ${barClass}`}
                                                style={{ height: `${height}%` }}
                                            ></div>
                                            <div className="absolute bottom-full mb-2 w-max p-2 text-xs text-white bg-slate-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                                {`${String(hour).padStart(2, '0')}:00 - Visits: ${count}`}
                                            </div>
                                            <span className="text-xs text-slate-500 mt-1">{String(hour).padStart(2, '0')}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-lg font-semibold text-slate-800">Supervisor Performance</h3>
                                <button onClick={handleExportCSV} className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-300 text-xs font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50">Export CSV</button>
                            </div>
                             <div className="overflow-auto border rounded-lg" style={{ maxHeight: '50vh' }}>
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Supervisor</th>
                                            <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 uppercase">Total Shifts</th>
                                            <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 uppercase">Day</th>
                                            <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 uppercase">Night</th>
                                            <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 uppercase">Total Hours</th>
                                            <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 uppercase">Avg. Shift</th>
                                            <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 uppercase">Projects</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Top Project</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-200">
                                        {analysisData.supervisorAnalysis.map(row => (
                                            <tr key={row.name}>
                                                <td className="px-3 py-2 whitespace-nowrap font-medium text-slate-900">{row.name}</td>
                                                <td className="px-3 py-2 whitespace-nowrap text-center">{row.totalShifts}</td>
                                                <td className="px-3 py-2 whitespace-nowrap text-center text-sky-600">{row.dayShifts}</td>
                                                <td className="px-3 py-2 whitespace-nowrap text-center text-indigo-600">{row.nightShifts}</td>
                                                <td className="px-3 py-2 whitespace-nowrap text-center">{row.totalHours}</td>
                                                <td className="px-3 py-2 whitespace-nowrap text-center">{row.avgShiftLength}</td>
                                                <td className="px-3 py-2 whitespace-nowrap text-center">{row.projectsCovered}</td>
                                                <td className="px-3 py-2 whitespace-nowrap text-left text-slate-600 truncate max-w-[150px]" title={row.topProject}>{row.topProject}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div>
                             <h3 className="text-lg font-semibold text-slate-800 mb-2">Project Performance</h3>
                             <div className="overflow-auto border rounded-lg" style={{ maxHeight: '50vh' }}>
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Project</th>
                                            <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 uppercase">Total Hours</th>
                                            <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 uppercase">Total Shifts</th>
                                            <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 uppercase">Supervisors</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-200">
                                        {analysisData.projectAnalysis.map(row => (
                                            <tr key={row.name}>
                                                <td className="px-3 py-2 whitespace-nowrap font-medium text-slate-900 truncate max-w-[200px]" title={row.name}>{row.name}</td>
                                                <td className="px-3 py-2 whitespace-nowrap text-center">{row.totalHours}</td>
                                                <td className="px-3 py-2 whitespace-nowrap text-center">{row.totalShifts}</td>
                                                <td className="px-3 py-2 whitespace-nowrap text-center">{row.supervisorCount}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default SSVDutyAnalysisAnalysis;
