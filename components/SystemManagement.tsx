import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Project, User, FeaturedProject } from '../types';
import { ZONES } from '../constants';
import FormField from './FormField';
import SearchableSelect from './SearchableSelect';
import ImageCropModal from './ImageCropModal';
import Spinner from './Spinner';

type SystemManagementTab = 'addProject' | 'projectList' | 'dashboardSettings';

interface SystemManagementProps {
    currentUser: User;
    projects: Project[];
    featuredProject: FeaturedProject;
    onAddProject: (projectData: Omit<Project, 'id'>) => Promise<void>;
    onUpdateProject: (updatedProject: Project) => Promise<void>;
    onDeleteProject: (projectId: number) => Promise<void>;
    onUpdateFeaturedProject: (newData: Partial<FeaturedProject>) => Promise<void>;
}

const EditProjectModal: React.FC<{
    isOpen: boolean;
    project: Project | null;
    onClose: () => void;
    onSave: (updatedProject: Project) => void;
    isSaving: boolean;
}> = ({ isOpen, project, onClose, onSave, isSaving }) => {
    const [name, setName] = useState('');
    const [zone, setZone] = useState('');
    const [address, setAddress] = useState('');
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (project) {
            setName(project.name);
            setZone(project.zone);
            setAddress(project.address);
        }
    }, [project]);

     useEffect(() => {
        if (!isOpen) return;
        const modalElement = modalRef.current;
        if (!modalElement) return;

        const focusableElements = modalElement.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusableElements.length === 0) return;
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        firstElement.focus();
        
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;
            if (e.shiftKey) { 
                if (document.activeElement === firstElement) {
                    lastElement.focus();
                    e.preventDefault();
                }
            } else { 
                if (document.activeElement === lastElement) {
                    firstElement.focus();
                    e.preventDefault();
                }
            }
        };
        modalElement.addEventListener('keydown', handleKeyDown);
        return () => modalElement.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    if (!isOpen || !project) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...project, name, zone, address });
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 fade-in" role="dialog" aria-modal="true" aria-labelledby="edit-project-title">
            <div ref={modalRef} className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <fieldset disabled={isSaving}>
                        <div className="p-6">
                            <h2 id="edit-project-title" className="text-xl font-bold text-slate-800">Edit Project</h2>
                            <div className="mt-6 space-y-4">
                                <FormField id="editProjectName" label="Project Name" value={name} onChange={e => setName(e.target.value)} placeholder="Enter project name" required />
                                <SearchableSelect id="editProjectZone" label="Project Zone" options={ZONES} value={zone} onChange={setZone} placeholder="Select a zone" required />
                                <FormField id="editProjectAddress" label="Project Address" as="textarea" value={address} onChange={e => setAddress(e.target.value)} placeholder="Enter full address" required />
                            </div>
                        </div>
                        <div className="bg-slate-50 px-6 py-4 rounded-b-xl flex justify-end gap-3">
                            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
                            <button type="submit" className="inline-flex items-center justify-center w-32 px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md shadow-sm hover:bg-orange-700 disabled:bg-slate-400">
                                {isSaving ? <Spinner/> : 'Save Changes'}
                            </button>
                        </div>
                    </fieldset>
                </form>
            </div>
        </div>
    );
};

const DeleteConfirmationModal: React.FC<{
    project: Project | null;
    onClose: () => void;
    onConfirm: () => void;
    isSaving: boolean;
}> = ({ project, onClose, onConfirm, isSaving }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!project) return;
        const modalElement = modalRef.current;
        if (!modalElement) return;

        const focusableElements = modalElement.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusableElements.length === 0) return;
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        firstElement.focus();
        
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;
            if (e.shiftKey) { 
                if (document.activeElement === firstElement) {
                    lastElement.focus();
                    e.preventDefault();
                }
            } else { 
                if (document.activeElement === lastElement) {
                    firstElement.focus();
                    e.preventDefault();
                }
            }
        };
        modalElement.addEventListener('keydown', handleKeyDown);
        return () => modalElement.removeEventListener('keydown', handleKeyDown);
    }, [project]);

    if (!project) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 fade-in" role="dialog" aria-modal="true" aria-labelledby="delete-project-title">
            <div ref={modalRef} className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()} aria-describedby="delete-project-description">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <h2 id="delete-project-title" className="text-xl font-bold text-slate-800 mt-4">Delete Project</h2>
                    <p id="delete-project-description" className="mt-2 text-sm text-slate-500">
                        Are you sure you want to delete the project <strong className="text-slate-700">{project.name}</strong>? This action cannot be undone.
                    </p>
                </div>
                <div className="bg-slate-50 px-6 py-4 rounded-b-xl flex justify-center gap-3">
                    <button type="button" onClick={onClose} disabled={isSaving} className="px-6 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
                    <button type="button" onClick={onConfirm} disabled={isSaving} className="inline-flex items-center justify-center w-36 px-6 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 disabled:bg-red-400">
                        {isSaving ? <Spinner /> : 'Confirm Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
};


const SystemManagement: React.FC<SystemManagementProps> = ({ currentUser, projects, onAddProject, onUpdateProject, onDeleteProject, featuredProject, onUpdateFeaturedProject }) => {
    
    const { permissions } = currentUser;

    const availableTabs = useMemo(() => {
        const tabs: SystemManagementTab[] = [];
        if (permissions.systemManagement_addProject.view) tabs.push('addProject');
        if (permissions.systemManagement_projectList.view) tabs.push('projectList');
        if (permissions.systemManagement_dashboardSettings.view) tabs.push('dashboardSettings');
        return tabs;
    }, [permissions]);
    
    const [activeTab, setActiveTab] = useState<SystemManagementTab>(availableTabs[0] ?? 'addProject');
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form state for adding
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectZone, setNewProjectZone] = useState('');
    const [newProjectAddress, setNewProjectAddress] = useState('');
    
    // Form state for dashboard settings
    const [featuredData, setFeaturedData] = useState<FeaturedProject>(featuredProject);
    
    useEffect(() => {
        setFeaturedData(featuredProject);
    }, [featuredProject]);

    // State for filtering
    const [searchQuery, setSearchQuery] = useState('');

    // Modal state
    const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    
    const canEditAddProject = permissions.systemManagement_addProject.edit;
    const canEditProjectList = permissions.systemManagement_projectList.edit;
    const canEditDashboardSettings = permissions.systemManagement_dashboardSettings.edit;

    const handleAddProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProjectName || !newProjectZone || !newProjectAddress) {
            setError("All fields are required to add a project.");
            return;
        }
        setError(null);
        setIsSaving(true);
        
        await onAddProject({
            name: newProjectName,
            zone: newProjectZone,
            address: newProjectAddress,
        });

        setIsSaving(false);
        setNewProjectName('');
        setNewProjectZone('');
        setNewProjectAddress('');
        alert(`Project "${newProjectName}" added successfully!`);
        if (availableTabs.includes('projectList')) {
            setActiveTab('projectList'); // Switch to list view after adding
        }
    };
    
    const handleFeaturedDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setFeaturedData(prev => ({...prev, [id]: value}));
    };
    
    const handleFeaturedImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                if (result) {
                    setImageToCrop(result);
                    setIsCropModalOpen(true);
                }
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleSaveDashboardSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSaving(true);
        await onUpdateFeaturedProject({
            ...featuredData,
            completion: Number(featuredData.completion) || 0,
        });
        setIsSaving(false);
        alert('Dashboard settings updated successfully!');
    };

    const handleSaveProjectUpdate = async (updatedProject: Project) => {
        setIsSaving(true);
        await onUpdateProject(updatedProject);
        setIsSaving(false);
        setProjectToEdit(null);
    };

    const handleConfirmDelete = async () => {
        if (projectToDelete) {
            setIsSaving(true);
            await onDeleteProject(projectToDelete.id);
            setIsSaving(false);
            setProjectToDelete(null);
        }
    };
    
    const handleCroppedImageSave = (croppedImageBase64: string) => {
        setFeaturedData(prev => ({ ...prev, image: croppedImageBase64 }));
        setIsCropModalOpen(false);
        setImageToCrop(null);
    };

    const filteredProjects = useMemo(() => {
        if (!searchQuery) return projects;
        return projects.filter(p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.zone.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.address.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [projects, searchQuery]);

    const getTabClasses = (tab: SystemManagementTab) => {
      return activeTab === tab
        ? 'border-orange-500 text-orange-600'
        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300';
    };

    return (
        <>
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-800">System Management</h2>
                    <p className="text-slate-600 font-medium mt-1">Manage projects and dashboard settings.</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                    <div className="border-b border-slate-200 px-6 pt-2">
                        <nav className="flex gap-x-2" aria-label="Tabs">
                            {availableTabs.includes('addProject') && (
                                <button onClick={() => setActiveTab('addProject')} className={`whitespace-nowrap py-3 px-4 rounded-t-lg font-medium text-sm transition-colors ${getTabClasses('addProject')}`}>Add Project</button>
                            )}
                            {availableTabs.includes('projectList') && (
                                <button onClick={() => setActiveTab('projectList')} className={`whitespace-nowrap py-3 px-4 rounded-t-lg font-medium text-sm transition-colors ${getTabClasses('projectList')}`}>Project List ({projects.length})</button>
                            )}
                            {availableTabs.includes('dashboardSettings') && (
                                <button onClick={() => setActiveTab('dashboardSettings')} className={`whitespace-nowrap py-3 px-4 rounded-t-lg font-medium text-sm transition-colors ${getTabClasses('dashboardSettings')}`}>Dashboard Settings</button>
                            )}
                        </nav>
                    </div>

                    <div className="p-6">
                        {/* Add Project Tab */}
                        {activeTab === 'addProject' && (
                            <div className="fade-in max-w-2xl mx-auto">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4">Add New Project</h3>
                                <form onSubmit={handleAddProject} className="space-y-4">
                                    <fieldset disabled={!canEditAddProject || isSaving}>
                                        <FormField id="newProjectName" label="Project Name" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="Enter project name" required />
                                        <SearchableSelect id="newProjectZone" label="Project Zone" options={ZONES} value={newProjectZone} onChange={setNewProjectZone} placeholder="Select a zone" required />
                                        <FormField id="newProjectAddress" label="Project Address" as="textarea" value={newProjectAddress} onChange={e => setNewProjectAddress(e.target.value)} placeholder="Enter full address" required />
                                        {error && <p className="text-sm text-red-600">{error}</p>}
                                        <div className="pt-2 flex justify-end">
                                            <button type="submit" disabled={!canEditAddProject || isSaving} className="inline-flex items-center justify-center w-36 px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md shadow-sm hover:bg-orange-700 disabled:bg-slate-400">
                                                {isSaving ? <Spinner /> : 'Add Project'}
                                            </button>
                                        </div>
                                    </fieldset>
                                </form>
                            </div>
                        )}

                        {/* Project List Tab */}
                        {activeTab === 'projectList' && (
                            <div className="fade-in">
                                <div className="mb-4">
                                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search projects by name, zone, or address..." className="w-full max-w-lg px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" />
                                </div>
                                <div className="overflow-x-auto border rounded-lg">
                                    <table className="min-w-full divide-y divide-slate-200">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Zone</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Address</th>
                                                {canEditProjectList && <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-200">
                                            {filteredProjects.map(project => (
                                                <tr key={project.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{project.name}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{project.zone}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 truncate max-w-sm">{project.address}</td>
                                                    {canEditProjectList && (
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                                                            <button onClick={() => setProjectToEdit(project)} className="text-orange-600 hover:text-orange-900">Edit</button>
                                                            <button onClick={() => setProjectToDelete(project)} className="text-red-600 hover:text-red-900">Delete</button>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Dashboard Settings Tab */}
                        {activeTab === 'dashboardSettings' && (
                            <div className="fade-in max-w-2xl mx-auto">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4">Dashboard Featured Project</h3>
                                 <form onSubmit={handleSaveDashboardSettings} className="space-y-4">
                                    <fieldset disabled={!canEditDashboardSettings || isSaving}>
                                        <FormField id="title" label="Project Title" value={featuredData.title} onChange={handleFeaturedDataChange} placeholder="e.g., Lake Lofts" required />
                                        <FormField id="location" label="Location" value={featuredData.location} onChange={handleFeaturedDataChange} placeholder="e.g., Dhanmondi" required />
                                        <FormField id="status" label="Status" value={featuredData.status} onChange={handleFeaturedDataChange} placeholder="e.g., Under Construction" required />
                                        <div>
                                            <label htmlFor="completion" className="block text-sm font-medium text-slate-700">Completion (%)</label>
                                            <input type="range" id="completion" min="0" max="100" value={featuredData.completion} onChange={e => setFeaturedData(prev => ({...prev, completion: Number(e.target.value)}))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500" />
                                            <div className="text-center text-sm text-slate-500">{featuredData.completion}%</div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700">Featured Image</label>
                                            <div className="mt-1 flex items-center gap-4">
                                                <img src={featuredData.image} alt="Featured Project" className="w-32 h-20 object-cover rounded-md border" />
                                                <label htmlFor="featured-image-upload" className="cursor-pointer px-3 py-2 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50">Change Image</label>
                                                <input id="featured-image-upload" type="file" onChange={handleFeaturedImageChange} className="sr-only" accept="image/*" />
                                            </div>
                                        </div>
                                        <div className="pt-2 flex justify-end">
                                            <button type="submit" disabled={!canEditDashboardSettings || isSaving} className="inline-flex items-center justify-center w-36 px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md shadow-sm hover:bg-orange-700 disabled:bg-slate-400">
                                                {isSaving ? <Spinner /> : 'Save Settings'}
                                            </button>
                                        </div>
                                    </fieldset>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <EditProjectModal isOpen={!!projectToEdit} project={projectToEdit} onClose={() => setProjectToEdit(null)} onSave={handleSaveProjectUpdate} isSaving={isSaving} />
            <DeleteConfirmationModal project={projectToDelete} onClose={() => setProjectToDelete(null)} onConfirm={handleConfirmDelete} isSaving={isSaving} />
            <ImageCropModal isOpen={isCropModalOpen} onClose={() => setIsCropModalOpen(false)} onSave={handleCroppedImageSave} imageSrc={imageToCrop} />
        </>
    );
};

export default SystemManagement;
