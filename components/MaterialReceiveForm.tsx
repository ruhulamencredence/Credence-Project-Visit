import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Project } from '../types';
import FormField from './FormField';
import SearchableSelect from './SearchableSelect';
import Spinner from './Spinner';

interface MaterialReceiveFormProps {
    currentUser: User;
    projects: Project[];
}

const VEHICLE_OPTIONS = [
  'Track',
  'Cover van',
  'Van',
  'Rickshaw',
  'CNG',
  'By Hand',
  'Other (please specify)',
];

const ProjectSelectionModal: React.FC<{
    isOpen: boolean;
    projects: Project[];
    onSelect: (projectName: string) => void;
}> = ({ isOpen, projects, onSelect }) => {
    const [selectedProject, setSelectedProject] = useState('');
    const projectNames = useMemo(() => projects.map(p => p.name), [projects]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (selectedProject) {
            onSelect(selectedProject);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 fade-in" role="dialog" aria-modal="true" aria-labelledby="project-select-title">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all" role="document">
                <div className="p-6">
                    <h2 id="project-select-title" className="text-xl font-bold text-slate-800">Select a Project</h2>
                    <p className="mt-1 text-sm text-slate-500">You must select a project before you can enter material details.</p>
                    <div className="mt-6">
                        <SearchableSelect
                            id="modalProjectName"
                            label="Project Name*"
                            options={projectNames}
                            value={selectedProject}
                            onChange={setSelectedProject}
                            placeholder="Select a project"
                            required
                        />
                    </div>
                </div>
                <div className="bg-slate-50 px-6 py-4 rounded-b-xl flex justify-end">
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={!selectedProject}
                        className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-slate-400 disabled:cursor-not-allowed"
                    >
                        Confirm Project
                    </button>
                </div>
            </div>
        </div>
    );
};

const MaterialReceiveForm: React.FC<MaterialReceiveFormProps> = ({ currentUser, projects }) => {
    const [entryDate] = useState(new Date());
    const [projectName, setProjectName] = useState('');
    const [projectZone, setProjectZone] = useState('');
    const [mrf, setMrf] = useState('');
    const [supplierName, setSupplierName] = useState('');
    const [materialName, setMaterialName] = useState('');
    const [vehicle, setVehicle] = useState('');
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [otherVehicle, setOtherVehicle] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unit, setUnit] = useState('');
    const [receivingDate, setReceivingDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
    const [receivingTime, setReceivingTime] = useState(new Date().toTimeString().substring(0, 5)); // Default to now

    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isProjectSelectModalOpen, setIsProjectSelectModalOpen] = useState(false);

    const mrfInputRef = useRef<HTMLInputElement>(null);

    const canEdit = currentUser.permissions.materialReceive.edit;

    // --- Conditional Access Logic ---
    const isRestrictedUser = currentUser.role !== 'admin';
    const isProjectSelected = !!projectName;
    const isContentLocked = isRestrictedUser && !isProjectSelected;

    const projectNames = useMemo(() => projects.map(p => p.name), [projects]);
    const projectZoneMap = useMemo(() =>
        projects.reduce((acc, project) => {
            acc[project.name] = project.zone;
            return acc;
        }, {} as Record<string, string>),
    [projects]);
    
    useEffect(() => {
        if (currentUser.role !== 'admin' && !projectName && !isSuccess) {
            setIsProjectSelectModalOpen(true);
        } else {
            setIsProjectSelectModalOpen(false);
        }
    }, [currentUser.role, projectName, isSuccess]);

    const handleProjectNameChange = (selectedProject: string) => {
        setProjectName(selectedProject);
        const zone = projectZoneMap[selectedProject] || '';
        setProjectZone(zone);
    };

    const resetForm = () => {
        setProjectName('');
        setProjectZone('');
        setMrf('');
        setSupplierName('');
        setMaterialName('');
        setVehicle('');
        setVehicleNumber('');
        setOtherVehicle('');
        setQuantity('');
        setUnit('');
        setReceivingDate(new Date().toISOString().split('T')[0]);
        setReceivingTime(new Date().toTimeString().substring(0, 5));
        setError(null);
        setIsSuccess(false);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);

        if (!projectName || !mrf || !supplierName || !materialName || !quantity || !unit || !receivingDate) {
            setError('Please fill out all required fields marked with *.');
            return;
        }

        if (['Track', 'Cover van'].includes(vehicle) && !vehicleNumber) {
            setError('Please enter the vehicle number for the selected vehicle.');
            return;
        }
        
        setIsSubmitting(true);
        console.log("--- Material Receive Form Submitted ---");
        console.log({
            projectName,
            projectZone,
            mrf,
            supplierName,
            materialName,
            vehicle: vehicle === 'Other (please specify)' ? otherVehicle : vehicle,
            vehicleNumber,
            quantity,
            unit,
            receivingDate,
            receivingTime,
            receivedBy: currentUser.name,
            employeeId: currentUser.employeeId,
            entryTimestamp: entryDate.toISOString(),
        });

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setIsSubmitting(false);
        setIsSuccess(true);
    };
    
    if (isSuccess) {
        return (
             <div className="p-4 sm:p-6 lg:p-8">
                <div className="bg-white rounded-2xl shadow-lg p-8 text-center border-slate-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="mt-4 text-2xl font-semibold text-slate-800">Submission Successful!</h3>
                    <p className="mt-2 text-slate-600">The material receiving information has been recorded.</p>
                    <button
                        onClick={resetForm}
                        className="mt-8 w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 hover:-translate-y-0.5 active:translate-y-0"
                    >
                        Enter Another Record
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="p-4 sm:p-6 lg:p-8">
                <div className="bg-white rounded-2xl shadow-lg border-slate-200 overflow-hidden">
                    <header className="bg-slate-50 p-4 border-b border-slate-200">
                        <div className="text-center">
                            <h1 className="text-xl font-bold text-slate-800">
                                Material Receive Form
                            </h1>
                            <p className="mt-1 text-sm text-slate-500">
                                {canEdit ? 'Enter the details of the received materials.' : 'You are viewing this in read-only mode.'}
                            </p>
                        </div>
                    </header>
                    <form onSubmit={handleSubmit} className="p-4 sm:p-6">
                        <fieldset disabled={!canEdit} className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    id="receivedBy"
                                    label="Received By"
                                    value={currentUser.name}
                                    onChange={() => {}}
                                    placeholder="Your full name"
                                    readOnly
                                />
                                <FormField
                                    id="employeeId"
                                    label="Employee ID"
                                    value={currentUser.employeeId}
                                    onChange={() => {}}
                                    placeholder="Your employee ID"
                                    readOnly
                                />
                            </div>
                            
                            <div>
                                <label htmlFor="entryDate" className="block text-sm font-medium text-slate-700">Entry Date & Time</label>
                                <input
                                    type="text"
                                    id="entryDate"
                                    name="entryDate"
                                    value={entryDate.toLocaleString()}
                                    readOnly
                                    className="mt-1 block w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-md text-sm shadow-sm text-slate-600 cursor-not-allowed"
                                />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <SearchableSelect
                                    id="projectName"
                                    label="Project Name*"
                                    options={projectNames}
                                    value={projectName}
                                    onChange={handleProjectNameChange}
                                    placeholder="Select a project"
                                    required
                                />
                                <FormField
                                    id="projectZone"
                                    label="Project Zone"
                                    value={projectZone}
                                    onChange={() => {}}
                                    placeholder="Auto-fills from Project Name"
                                    readOnly
                                />
                            </div>

                            <div className="relative pt-6 border-t border-slate-200">
                                {isContentLocked && (
                                    <div className="absolute inset-0 -mt-6 bg-slate-50/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-b-2xl">
                                        <div className="text-center p-4 bg-white rounded-lg shadow-md border border-slate-200">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-orange-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                            <p className="mt-2 font-semibold text-slate-700">Select a Project</p>
                                            <p className="text-sm text-slate-500">Please choose a project to continue.</p>
                                        </div>
                                    </div>
                                )}

                                <fieldset disabled={isContentLocked} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            ref={mrfInputRef}
                                            id="mrf"
                                            label="MRF*"
                                            value={mrf}
                                            onChange={e => setMrf(e.target.value)}
                                            placeholder="Enter MRF number"
                                            required
                                        />
                                        <FormField
                                            id="supplierName"
                                            label="Supplier Name*"
                                            value={supplierName}
                                            onChange={e => setSupplierName(e.target.value)}
                                            placeholder="Enter supplier name"
                                            required
                                        />
                                    </div>
                                    <FormField
                                        id="materialName"
                                        label="Material Name*"
                                        value={materialName}
                                        onChange={e => setMaterialName(e.target.value)}
                                        placeholder="Enter material name (e.g., Cement)"
                                        required
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                        <SearchableSelect
                                            id="vehicle"
                                            label="Vehicle"
                                            options={VEHICLE_OPTIONS}
                                            value={vehicle}
                                            onChange={setVehicle}
                                            placeholder="Select a vehicle type"
                                        />
                                        {['Track', 'Cover van'].includes(vehicle) && (
                                            <div className="fade-in">
                                                <FormField
                                                    id="vehicleNumber"
                                                    label="Vehicle Number*"
                                                    value={vehicleNumber}
                                                    onChange={e => setVehicleNumber(e.target.value)}
                                                    placeholder="Enter vehicle number"
                                                    required
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {vehicle === 'Other (please specify)' && (
                                        <div className="fade-in">
                                            <FormField
                                                id="otherVehicle"
                                                label="Please Specify (Optional)"
                                                value={otherVehicle}
                                                onChange={e => setOtherVehicle(e.target.value)}
                                                placeholder="Specify other vehicle type"
                                                required={false}
                                            />
                                        </div>
                                    )}
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            id="quantity"
                                            label="Quantity*"
                                            type="text"
                                            value={quantity}
                                            onChange={e => setQuantity(e.target.value)}
                                            placeholder="e.g., 100"
                                            required
                                        />
                                        <FormField
                                            id="unit"
                                            label="Unit*"
                                            value={unit}
                                            onChange={e => setUnit(e.target.value)}
                                            placeholder="e.g., bags, pcs, cft"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="receivingDate" className="block text-sm font-medium text-slate-700">Receiving Date*</label>
                                            <input
                                                type="date"
                                                id="receivingDate"
                                                value={receivingDate}
                                                onChange={(e) => setReceivingDate(e.target.value)}
                                                required
                                                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="receivingTime" className="block text-sm font-medium text-slate-700">Receiving Time</label>
                                            <input
                                                type="time"
                                                id="receivingTime"
                                                value={receivingTime}
                                                onChange={(e) => setReceivingTime(e.target.value)}
                                                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                                            />
                                        </div>
                                    </div>
                                </fieldset>
                            </div>
                            
                            {error && <p className="text-sm text-red-600 text-center p-2 bg-red-50 rounded-md">{error}</p>}

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !canEdit || isContentLocked}
                                    className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-slate-400 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Spinner className="w-5 h-5 mr-3" />
                                            Submitting...
                                        </>
                                    ) : (
                                        'Submit Record'
                                    )}
                                </button>
                            </div>

                        </fieldset>
                    </form>
                </div>
            </div>
            <ProjectSelectionModal
                isOpen={isProjectSelectModalOpen}
                projects={projects}
                onSelect={(selectedProject) => {
                    handleProjectNameChange(selectedProject);
                    setIsProjectSelectModalOpen(false);
                    setTimeout(() => {
                        mrfInputRef.current?.focus();
                    }, 100);
                }}
            />
        </>
    );
};

export default MaterialReceiveForm;