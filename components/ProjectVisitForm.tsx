// This component contains the entire "Project Visit" issue reporting form.
// It manages form state, user interactions, photo capture/upload, and submission.

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { IssueItem, User, Project } from '../types';
import FormField from './FormField';
import Spinner from './Spinner';
import SearchableSelect from './SearchableSelect';
import PhotoUploader from './PhotoUploader';
import PhotoPreview from './PhotoPreview';
import { resizeImage } from '../utils/imageUtils';
import { analyzeIssueDescription } from '../services/geminiService';
import { useLoading } from '../contexts/LoadingContext';

interface ProjectVisitFormProps {
    currentUser: User;
    projects: Project[];
}

const getPriorityBadgeClass = (priority: 'Low' | 'Medium' | 'High' | 'Critical') => {
    switch (priority) {
        case 'Low': return 'bg-green-100 text-green-800 border-green-200';
        case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'High': return 'bg-orange-100 text-orange-800 border-orange-200';
        case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
        default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
};

const SuccessMessage: React.FC<{ onReset: () => void }> = ({ onReset }) => (
    <div className="text-center p-8">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-green-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="mt-6 text-3xl font-bold text-slate-800">Report Submitted!</h3>
        <p className="mt-3 text-slate-600 max-w-sm mx-auto">Thank you for helping us improve our projects. Your report has been successfully recorded.</p>
        <button
            onClick={onReset}
            className="mt-10 w-full max-w-xs inline-flex items-center justify-center px-6 py-3.5 border border-transparent text-base font-medium rounded-lg shadow-lg text-white bg-gradient-to-br from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 hover:-translate-y-1 active:translate-y-0 transition-transform"
        >
            Submit Another Report
        </button>
    </div>
);


export default function ProjectVisitForm({ currentUser, projects }: ProjectVisitFormProps) {
    const { showLoading, hideLoading } = useLoading();
    const [projectName, setProjectName] = useState('');
    const [projectZone, setProjectZone] = useState('');
    const [otherProjectName, setOtherProjectName] = useState('');
    const [entryDate, setEntryDate] = useState(new Date());
    const [frontViewPhotos, setFrontViewPhotos] = useState<string[]>([]);
    const [issues, setIssues] = useState<IssueItem[]>([{ id: Date.now().toString(), description: '', photos: [], comments: '' }]);
    
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState<Record<string, boolean>>({});
    
    const [view, setView] = useState<'form' | 'success'>('form');
    
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [cameraTarget, setCameraTarget] = useState<{ type: 'frontView' | 'issue'; issueId?: string } | null>(null);

    const frontViewFileInputRef = useRef<HTMLInputElement>(null);
    const issueFileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const canEdit = currentUser.permissions.projectVisit.edit;

    const projectNames = useMemo(() => projects.map(p => p.name), [projects]);
    const projectZoneMap = useMemo(() =>
        projects.reduce((acc, project) => {
            acc[project.name] = project.zone;
            return acc;
        }, {} as Record<string, string>),
    [projects]);
    
    useEffect(() => {
        if (!isCameraOpen) {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            return;
        }

        let isCancelled = false;
        const videoEl = videoRef.current;

        const startCamera = async () => {
            if (!videoEl) return;

            if (!navigator.mediaDevices?.getUserMedia) {
                let errorMessage = "Camera is not supported on this device or browser.";
                if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                    errorMessage += " Camera access requires a secure connection (HTTPS).";
                }
                if (!isCancelled) {
                    setError(errorMessage);
                    setIsCameraOpen(false);
                }
                return;
            }
            
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                if (isCancelled) {
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }
                
                streamRef.current = stream;
                videoEl.srcObject = stream;
                
                videoEl.onloadedmetadata = () => {
                    videoEl.play().catch(err => {
                        console.error("Video autoplay failed:", err);
                        if (!isCancelled) {
                            setError("Could not start camera preview. Please check permissions and browser settings.");
                        }
                    });
                };

            } catch (err) {
                console.error("Error accessing camera:", err);
                if (!isCancelled) {
                    setError("Could not access the camera. Please ensure you have given the necessary permissions.");
                    setIsCameraOpen(false);
                }
            }
        };

        startCamera();

        return () => {
            isCancelled = true;
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            if (videoEl) {
                videoEl.onloadedmetadata = null;
                // Prevent error on some browsers
                if (videoEl.srcObject) {
                  videoEl.srcObject = null;
                }
            }
        };
    }, [isCameraOpen]);
    
    const handleIssueUpdate = (id: string, updatedValues: Partial<Omit<IssueItem, 'id'>>) => {
        setIssues(prevIssues =>
            prevIssues.map(issue =>
                issue.id === id ? { ...issue, ...updatedValues } : issue
            )
        );
    };

    const addIssue = () => {
        setIssues(prev => [...prev, { id: Date.now().toString(), description: '', photos: [], comments: '' }]);
    };

    const removeIssue = (id: string) => {
        setIssues(prev => prev.filter(issue => issue.id !== id));
    };

    const handleFrontViewFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const remainingSlots = 4 - frontViewPhotos.length;
            if (remainingSlots <= 0) return;

            const filesToProcess = files.slice(0, remainingSlots);
            filesToProcess.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = async () => {
                    try {
                        const resizedImage = await resizeImage(reader.result as string);
                        setFrontViewPhotos(prev => [...prev, resizedImage]);
                    } catch (err) {
                        console.error("Failed to resize image:", err);
                        setError("There was an error processing the image.");
                    }
                };
                reader.readAsDataURL(file as Blob);
            });
        }
    };

    const removeFrontViewPhoto = (indexToRemove: number) => {
        setFrontViewPhotos(prev => prev.filter((_, index) => index !== indexToRemove));
    };
    
    const handleIssueFileChange = (e: React.ChangeEvent<HTMLInputElement>, issueId: string) => {
        const issue = issues.find(i => i.id === issueId);
        if (e.target.files && issue) {
            const files = Array.from(e.target.files);
            const remainingSlots = 4 - issue.photos.length;
            if (remainingSlots <= 0) return;

            const filesToProcess = files.slice(0, remainingSlots);
            filesToProcess.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = async () => {
                    try {
                        const resizedImage = await resizeImage(reader.result as string);
                        setIssues(prevIssues =>
                            prevIssues.map(iss => {
                                if (iss.id === issueId && iss.photos.length < 4) {
                                    return { ...iss, photos: [...iss.photos, resizedImage] };
                                }
                                return iss;
                            })
                        );
                    } catch (err) {
                        console.error("Failed to resize image:", err);
                        setError("There was an error processing the image.");
                    }
                };
                reader.readAsDataURL(file as Blob);
            });
        }
    };
    
    const removeIssuePhoto = (issueId: string, indexToRemove: number) => {
        setIssues(prevIssues =>
            prevIssues.map(issue => {
                if (issue.id === issueId) {
                    const newPhotos = issue.photos.filter((_, index) => index !== indexToRemove);
                    return { ...issue, photos: newPhotos };
                }
                return issue;
            })
        );
    };

    const handleOpenCamera = (target: { type: 'frontView' | 'issue'; issueId?: string }) => {
        setCameraTarget(target);
        setIsCameraOpen(true);
    };

    const closeCamera = () => {
        setCapturedImage(null);
        setIsCameraOpen(false);
        setCameraTarget(null);
    };

    const handleCapture = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const context = canvas.getContext('2d');
            if (context) {
                context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                setCapturedImage(canvas.toDataURL('image/jpeg'));
            }
        }
    };

    const handleRetake = () => setCapturedImage(null);

    const handleUsePhoto = async () => {
        if (!capturedImage || !cameraTarget) return;

        try {
            const resizedImage = await resizeImage(capturedImage);
            if (cameraTarget.type === 'frontView' && frontViewPhotos.length < 4) {
                setFrontViewPhotos(prev => [...prev, resizedImage]);
            } else if (cameraTarget.type === 'issue' && cameraTarget.issueId) {
                setIssues(prevIssues =>
                    prevIssues.map(issue => {
                        if (issue.id === cameraTarget.issueId && issue.photos.length < 4) {
                            return { ...issue, photos: [...issue.photos, resizedImage] };
                        }
                        return issue;
                    })
                );
            }
        } catch (err) {
            console.error("Failed to resize captured image:", err);
            setError("There was an error processing the captured photo.");
        } finally {
            closeCamera();
        }
    };
    
    const handleAnalyzeIssue = async (issueId: string) => {
        const issue = issues.find(i => i.id === issueId);
        if (!issue || !issue.description) {
            return;
        }

        setIsAnalyzing(prev => ({ ...prev, [issueId]: true }));
        showLoading();
        setError(null);

        try {
            const result = await analyzeIssueDescription(issue.description, issue.photos);
            if (result) {
                handleIssueUpdate(issueId, {
                    category: result.category,
                    priority: result.priority,
                    summary: result.summary,
                });
            } else {
                setError("AI analysis failed. Please try again or fill in the details manually.");
            }
        } catch (err) {
            console.error(err);
            setError("An error occurred during AI analysis.");
        } finally {
            hideLoading();
            setIsAnalyzing(prev => ({ ...prev, [issueId]: false }));
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
    
        const finalProjectName = projectName === 'Other' ? otherProjectName : projectName;
        if (!finalProjectName) {
            setError("Please select or enter a project name.");
            return;
        }
    
        const validIssues = issues.filter(issue => issue.description.trim() !== '');
        if (validIssues.length === 0 && frontViewPhotos.length === 0) {
            setError("Please describe at least one issue or add a project front photo to submit a report.");
            return;
        }

        setIsSubmitting(true);
        showLoading();
        setError(null);

        // Simulate a successful submission without sending data anywhere.
        console.log("--- Report Captured (Not Submitted) ---");
        console.log({
            projectName: finalProjectName,
            projectZone,
            entryDate: entryDate.toISOString(),
            reporter: { name: currentUser.name, employeeId: currentUser.employeeId },
            frontViewPhotosCount: frontViewPhotos.length,
            issues: validIssues.map(i => ({ description: i.description, comments: i.comments, photosCount: i.photos.length, analysis: { category: i.category, priority: i.priority, summary: i.summary } }))
        });

        // Simulate network delay for better UX
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        hideLoading();
        setIsSubmitting(false);
        setView('success');
    };

    const handleProjectNameChange = (selectedProject: string) => {
        setProjectName(selectedProject);
        if (selectedProject !== 'Other') {
            const zone = projectZoneMap[selectedProject] || '';
            setProjectZone(zone);
        } else {
            setProjectZone(''); // Clear zone if 'Other' is selected
        }
    };

    const resetForm = () => {
        setProjectName('');
        setProjectZone('');
        setOtherProjectName('');
        setFrontViewPhotos([]);
        if (frontViewFileInputRef.current) frontViewFileInputRef.current.value = "";
        
        setIssues([{ id: Date.now().toString(), description: '', photos: [], comments: '' }]);
        issueFileInputRefs.current.clear();

        setView('form');
        setError(null);
        setEntryDate(new Date());
    };

    return (
        <>
            <div className="p-4 sm:p-6 lg:p-8">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200/80">
                    {view === 'success' ? (
                        <div className="flex flex-col items-center justify-center min-h-[600px]">
                            <SuccessMessage onReset={resetForm} />
                        </div>
                    ) : (
                        <>
                            <header className="bg-gradient-to-br from-white to-slate-50 p-6 border-b border-slate-200">
                                <div className="text-center">
                                    <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 text-orange-600 mb-3 ring-4 ring-white">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                                    </div>
                                    <h1 className="text-2xl font-bold text-slate-800">
                                        Project Visit Issue Report
                                    </h1>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {canEdit ? 'Please fill out the form to report any issues found on site.' : 'You are viewing this report in read-only mode.'}
                                    </p>
                                </div>
                            </header>
                            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
                                <fieldset disabled={!canEdit || isSubmitting} className="space-y-8">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <FormField
                                            id="reporterName"
                                            label="Reporter Name"
                                            value={currentUser.name}
                                            onChange={() => {}}
                                            placeholder="Your full name"
                                            required
                                            readOnly
                                        />
                                        <FormField
                                            id="employeeId"
                                            label="Employee ID"
                                            type="text"
                                            value={currentUser.employeeId}
                                            onChange={() => {}}
                                            placeholder="Your employee ID"
                                            required
                                            readOnly
                                        />
                                    </div>
                                    
                                    <div className="space-y-6 p-6 bg-slate-50/70 rounded-xl border border-slate-200">
                                        <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-3">Project Details</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                             <SearchableSelect
                                                id="projectName"
                                                label="Project Name"
                                                options={[...projectNames, "Other"]}
                                                value={projectName}
                                                onChange={handleProjectNameChange}
                                                placeholder="Type or select a project"
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
                                         {projectName === 'Other' && (
                                            <div className="fade-in">
                                                <FormField
                                                    id="otherProjectName"
                                                    label="Custom Project Name"
                                                    value={otherProjectName}
                                                    onChange={(e) => setOtherProjectName(e.target.value)}
                                                    placeholder="Enter the new project name"
                                                    required
                                                />
                                            </div>
                                        )}
                                        <div>
                                            <label htmlFor="entryDate" className="block text-sm font-medium text-slate-700">Entry Date & Time</label>
                                            <input
                                                type="text"
                                                id="entryDate"
                                                name="entryDate"
                                                value={entryDate.toLocaleString()}
                                                readOnly
                                                className="mt-1 block w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-md text-sm shadow-sm text-slate-600 cursor-not-allowed focus:outline-none focus:ring-0"
                                            />
                                        </div>
                                    </div>
                                
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">
                                            Project Front View Photos (up to 4)
                                        </label>
                                        {frontViewPhotos.length > 0 && (
                                            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                {frontViewPhotos.map((photo, index) => (
                                                    <PhotoPreview
                                                        key={index}
                                                        src={photo}
                                                        alt={`Project front view ${index + 1}`}
                                                        onRemove={() => removeFrontViewPhoto(index)}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                        {canEdit && frontViewPhotos.length < 4 && (
                                            <div className="mt-2">
                                                <PhotoUploader
                                                    id="front-view-photo-upload"
                                                    onFileChange={handleFrontViewFileChange}
                                                    onCameraClick={() => handleOpenCamera({ type: 'frontView' })}
                                                    fileInputRef={frontViewFileInputRef}
                                                    multiple
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <hr className="border-slate-200/80" />

                                    {issues.map((issue, index) => {
                                        return (
                                            <div key={issue.id} className="p-6 border border-slate-200 rounded-xl space-y-6 relative bg-white shadow-sm">
                                                <div className="flex justify-between items-start">
                                                    <h3 className="font-semibold text-xl text-slate-800">Issue #{index + 1}</h3>
                                                    {issues.length > 1 && canEdit && (
                                                        <button type="button" onClick={() => removeIssue(issue.id)} className="p-1.5 text-slate-500 hover:text-red-600 rounded-full hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500" aria-label="Remove issue">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        </button>
                                                    )}
                                                </div>
                                                <div>
                                                    <FormField
                                                        id={`description-${issue.id}`}
                                                        label="Description of Issue"
                                                        as="textarea"
                                                        value={issue.description}
                                                        onChange={(e) => handleIssueUpdate(issue.id, { description: e.target.value })}
                                                        placeholder="Please be as detailed as possible. What did you see?"
                                                        required
                                                    />
                                                </div>
                                                
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700">
                                                        Issue Photos (up to 4, Optional)
                                                    </label>
                                                    {issue.photos.length > 0 && (
                                                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                            {issue.photos.map((photo, photoIndex) => (
                                                                <PhotoPreview
                                                                    key={photoIndex}
                                                                    src={photo}
                                                                    alt={`Issue ${index + 1} photo ${photoIndex + 1}`}
                                                                    onRemove={() => removeIssuePhoto(issue.id, photoIndex)}
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                    {canEdit && issue.photos.length < 4 && (
                                                        <div className="mt-2">
                                                            <PhotoUploader
                                                                id={`issue-photo-upload-${issue.id}`}
                                                                onFileChange={(e) => handleIssueFileChange(e, issue.id)}
                                                                onCameraClick={() => handleOpenCamera({ type: 'issue', issueId: issue.id })}
                                                                fileInputRef={(el) => { if (el) issueFileInputRefs.current.set(issue.id, el); }}
                                                                multiple
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {canEdit && (
                                                    <div className="pt-2 flex justify-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAnalyzeIssue(issue.id)}
                                                            disabled={!issue.description.trim() || isAnalyzing[issue.id] || isSubmitting}
                                                            className="inline-flex items-center gap-2 px-6 py-2.5 border border-transparent text-sm font-medium rounded-full shadow-sm text-white bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:from-slate-400 disabled:to-slate-400 disabled:cursor-not-allowed transition-all hover:-translate-y-0.5 active:translate-y-0"
                                                        >
                                                            {isAnalyzing[issue.id] ? (
                                                                <>
                                                                    <Spinner className="w-5 h-5" />
                                                                    Analyzing...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                                                    Analyze Issue {issue.photos.length > 0 ? '(Text + Photos)' : ''}
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                )}

                                                {(issue.category || issue.priority || issue.summary) && (
                                                    <div className="p-4 bg-indigo-50/60 border border-indigo-200/80 rounded-lg space-y-4 fade-in">
                                                        <h4 className="text-sm font-semibold text-indigo-800 flex items-center gap-2">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                                                            AI Analysis Results
                                                        </h4>
                                                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                                                            {issue.category && (
                                                                <div>
                                                                    <dt className="font-medium text-slate-600">Category</dt>
                                                                    <dd className="mt-1 text-slate-900">{issue.category}</dd>
                                                                </div>
                                                            )}
                                                            {issue.priority && (
                                                                <div>
                                                                    <dt className="font-medium text-slate-600">Priority</dt>
                                                                    <dd className="mt-1">
                                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getPriorityBadgeClass(issue.priority)}`}>
                                                                            {issue.priority}
                                                                        </span>
                                                                    </dd>
                                                                </div>
                                                            )}
                                                            {issue.summary && (
                                                                <div className="sm:col-span-2">
                                                                    <dt className="font-medium text-slate-600">Summary</dt>
                                                                    <dd className="mt-1 text-slate-900">{issue.summary}</dd>
                                                                </div>
                                                            )}
                                                        </dl>
                                                    </div>
                                                )}
                                                
                                                <div>
                                                    <FormField
                                                        id={`comments-${issue.id}`}
                                                        label="Comments (Optional)"
                                                        as="textarea"
                                                        value={issue.comments}
                                                        onChange={(e) => handleIssueUpdate(issue.id, { comments: e.target.value })}
                                                        placeholder="Add any additional comments or notes here."
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {canEdit && (
                                        <div>
                                            <button type="button" onClick={addIssue} className="w-full flex justify-center items-center px-4 py-3 border-2 border-slate-300 border-dashed text-sm font-medium rounded-lg text-slate-600 hover:border-orange-500 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110 2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg>
                                                Add Another Issue
                                            </button>
                                        </div>
                                    )}
                                    
                                    {error && <p className="text-sm text-red-600 text-center p-2 bg-red-50 rounded-md">{error}</p>}

                                    <div className="pt-4 border-t border-slate-200">
                                        <button
                                            type="submit"
                                            disabled={isSubmitting || !canEdit}
                                            className="w-full inline-flex items-center justify-center px-6 py-3.5 border border-transparent text-base font-medium rounded-lg shadow-lg text-white bg-gradient-to-br from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:from-slate-400 disabled:to-slate-400 disabled:cursor-not-allowed hover:-translate-y-1 active:translate-y-0 disabled:transform-none transition-all duration-200"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <Spinner className="w-5 h-5 mr-3" />
                                                    Submitting...
                                                </>
                                            ) : (
                                                'Submit Report'
                                            )}
                                        </button>
                                    </div>
                                </fieldset>
                            </form>
                        </>
                    )}
                </div>
            </div>
            {isCameraOpen && (
                <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="camera-title">
                     <h2 id="camera-title" className="sr-only">Camera View</h2>
                     <div className="relative w-full h-full flex items-center justify-center">
                        {!capturedImage ? (
                            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
                        ) : (
                            <img src={capturedImage} alt="Captured preview" className="w-full h-full object-contain" />
                        )}
                        <button onClick={closeCamera} className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full" aria-label="Close camera">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                     </div>
                     <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/50 flex items-center justify-center space-x-4">
                        {!capturedImage ? (
                            <button onClick={handleCapture} className="p-4 bg-white rounded-full text-slate-800" aria-label="Capture photo">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            </button>
                        ) : (
                            <>
                                <button onClick={handleRetake} className="p-3 bg-white/90 text-slate-800 rounded-full flex items-center gap-2 text-base sm:text-lg font-semibold px-4 sm:px-6" aria-label="Retake photo">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
                                    Retake
                                </button>
                                <button onClick={handleUsePhoto} className="p-3 bg-orange-600 text-white rounded-full flex items-center gap-2 text-base sm:text-lg font-semibold px-4 sm:px-6" aria-label="Use this photo">
                                    Use Photo
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                </button>
                            </>
                        )}
                     </div>
                </div>
            )}
        </>
    );
}