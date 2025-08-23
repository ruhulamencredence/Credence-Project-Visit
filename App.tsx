// This is the main application component.
// It manages the entire state of the issue reporting form, handles user interactions
// such as adding/removing issues, capturing photos, and submitting the final report.
// It also orchestrates the communication with the Gemini API for intelligent issue analysis.

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { IssueCategory, PriorityLevel, SuggestedInfo, IssueItem, User } from './types';
import { analyzeIssue } from './services/geminiService';
import { PRIORITY_COLORS, PROJECT_NAMES } from './constants';
import FormField from './components/FormField';
import Spinner from './components/Spinner';
import SuggestedTag from './components/SuggestedTag';
import Sidebar from './components/Sidebar';
import Auth from './components/Auth';
import Profile from './components/Profile';

const CATEGORY_COLORS: Record<IssueCategory, { bg: string; text: string; border: string }> = {
    [IssueCategory.Safety]: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
    [IssueCategory.Maintenance]: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
    [IssueCategory.Cleanliness]: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
    [IssueCategory.IT]: { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300' },
    [IssueCategory.Other]: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' },
};

const SuccessMessage: React.FC<{ onReset: () => void }> = ({ onReset }) => (
    <div className="text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="mt-4 text-2xl font-semibold text-slate-800 dark:text-slate-100">Report Submitted!</h3>
        <p className="mt-2 text-slate-600 dark:text-slate-300">Thank you for helping us improve our projects.</p>
        <button
            onClick={onReset}
            className="mt-8 w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
        >
            Submit Another Report
        </button>
    </div>
);


export default function App() {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [projectName, setProjectName] = useState('');
    const [otherProjectName, setOtherProjectName] = useState('');
    const [entryDate, setEntryDate] = useState('');
    const [frontViewPhotos, setFrontViewPhotos] = useState<string[]>([]);
    const [issues, setIssues] = useState<IssueItem[]>([{ id: Date.now().toString(), description: '', photo: null, comments: '' }]);
    
    const [suggestions, setSuggestions] = useState<Map<string, SuggestedInfo | null>>(new Map());
    const [analyzing, setAnalyzing] = useState<Set<string>>(new Set());

    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    
    // Theme state
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        if (typeof window !== 'undefined' && localStorage.theme) {
            return localStorage.theme;
        }
        if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    });
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    // Camera state
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [cameraTarget, setCameraTarget] = useState<{ type: 'frontView' | 'issue'; issueId?: string } | null>(null);

    const debounceTimeouts = useRef<Map<string, number>>(new Map());
    const frontViewFileInputRef = useRef<HTMLInputElement>(null);
    const issueFileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    
    // Check for logged in user on mount
    useEffect(() => {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            setCurrentUser(JSON.parse(storedUser));
        }
    }, []);

    useEffect(() => {
        setEntryDate(new Date().toLocaleString());
    }, []);
    
    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const handleLoginSuccess = (user: User) => {
        setCurrentUser(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
    };

    const handleLogout = () => {
        setCurrentUser(null);
        localStorage.removeItem('currentUser');
        setIsSidebarOpen(false);
    };

    const handleOpenProfile = () => {
        setIsSidebarOpen(false); // Close sidebar when opening profile
        setIsProfileOpen(true);
    };
    const handleCloseProfile = () => setIsProfileOpen(false);

    const handleUpdateUser = (updatedData: Partial<User>) => {
        if (!currentUser) return;
        
        const updatedUser = { ...currentUser, ...updatedData };
        setCurrentUser(updatedUser);
        
        // In a real app, you would not store password in localStorage.
        // We need to retrieve the old record to preserve the password.
        const storedUserString = localStorage.getItem(`user_${currentUser.email}`);
        if (storedUserString) {
            const storedUser = JSON.parse(storedUserString);
            localStorage.setItem(`user_${currentUser.email}`, JSON.stringify({
                ...storedUser,
                ...updatedUser
            }));
        } else {
            // Fallback for admin or if user is somehow missing
             localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        }
    };

    // IMPORTANT: This password change logic is for demonstration purposes only.
    // Storing passwords in localStorage is highly insecure.
    // A real application must use a secure backend service for authentication.
    const handleChangePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
        return new Promise(resolve => {
            if (!currentUser) {
                resolve({ success: false, message: "No user is logged in." });
                return;
            }

            const storedUserString = localStorage.getItem(`user_${currentUser.email}`);
            if (!storedUserString) {
                resolve({ success: false, message: "Could not find user data." });
                return;
            }
            
            const storedUser = JSON.parse(storedUserString);

            if (storedUser.password !== currentPassword) {
                resolve({ success: false, message: "Current password does not match." });
                return;
            }

            const updatedUserWithNewPass = { ...storedUser, password: newPassword };
            localStorage.setItem(`user_${currentUser.email}`, JSON.stringify(updatedUserWithNewPass));

            resolve({ success: true, message: "Password updated successfully!" });
        });
    };

    const handleAnalysis = useCallback(async (id: string, description: string, image: string | null) => {
        if (description.trim().length < 20 && !image) {
            setSuggestions(prev => new Map(prev).set(id, null));
            return;
        }

        setAnalyzing(prev => new Set(prev).add(id));
        setError(null);
        try {
            const result = await analyzeIssue(description, image);
            setSuggestions(prev => new Map(prev).set(id, result));
        } catch (e) {
            setError('Could not analyze issue. Please check your API key.');
            console.error(e);
        } finally {
            setAnalyzing(prev => {
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
            });
        }
    }, []);
    
    const handleIssueUpdate = (id: string, updatedValues: Partial<Omit<IssueItem, 'id'>>) => {
        let targetIssue: IssueItem | null = null;
        setIssues(prevIssues => {
            const newIssues = prevIssues.map(issue => {
                if (issue.id === id) {
                    targetIssue = { ...issue, ...updatedValues };
                    return targetIssue;
                }
                return issue;
            });
            return newIssues;
        });

        if (targetIssue) {
            if (debounceTimeouts.current.has(id)) {
                clearTimeout(debounceTimeouts.current.get(id)!);
            }
            const timeoutId = window.setTimeout(() => {
                handleAnalysis(id, targetIssue!.description, targetIssue!.photo);
            }, 700);
            debounceTimeouts.current.set(id, timeoutId);
        }
    };

    const addIssue = () => {
        setIssues(prev => [...prev, { id: Date.now().toString(), description: '', photo: null, comments: '' }]);
    };

    const removeIssue = (id: string) => {
        setIssues(prev => prev.filter(issue => issue.id !== id));
        setSuggestions(prev => {
            const newMap = new Map(prev);
            newMap.delete(id);
            return newMap;
        });
        setAnalyzing(prev => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
        });
        if (debounceTimeouts.current.has(id)) {
            clearTimeout(debounceTimeouts.current.get(id)!);
            debounceTimeouts.current.delete(id);
        }
    };

    const handleFrontViewFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const remainingSlots = 4 - frontViewPhotos.length;
            if (remainingSlots <= 0) return;

            const filesToProcess = files.slice(0, remainingSlots);
            filesToProcess.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setFrontViewPhotos(prev => [...prev, reader.result as string]);
                };
                reader.readAsDataURL(file as Blob);
            });
        }
    };

    const removeFrontViewPhoto = (indexToRemove: number) => {
        setFrontViewPhotos(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleOpenCamera = async (target: { type: 'frontView' | 'issue'; issueId?: string }) => {
        setCameraTarget(target);
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                setIsCameraOpen(true);
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
                setError("Could not access the camera. Please ensure you have given the necessary permissions.");
            }
        } else {
            setError("Camera not supported on this device or browser.");
        }
    };

    const closeCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
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

    const handleUsePhoto = () => {
        if (!capturedImage || !cameraTarget) return;

        if (cameraTarget.type === 'frontView' && frontViewPhotos.length < 4) {
            setFrontViewPhotos(prev => [...prev, capturedImage]);
        } else if (cameraTarget.type === 'issue' && cameraTarget.issueId) {
            handleIssueUpdate(cameraTarget.issueId, { photo: capturedImage });
        }
        
        closeCamera();
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        const GOOGLE_SCRIPT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwYMXyIdr0yIitA871euLp4EJvBKZ6fdjl0Ct4qGhuHhj0jA26SZ8uHecsdVmaVJMHqyA/exec';
    
        if (GOOGLE_SCRIPT_WEB_APP_URL.includes('AKfy...')) {
            setError("Configuration Error: The Google Apps Script URL is a placeholder. Please replace it with your actual Web App URL to submit the report.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        const reportData = {
            reporterName: currentUser!.name,
            reporterEmail: currentUser!.email,
            projectName: projectName === 'Other' ? otherProjectName : projectName,
            entryDate,
            frontViewPhotos,
            issues: issues.map(issue => ({
                description: issue.description,
                photo: issue.photo,
                comments: issue.comments,
                suggestion: suggestions.get(issue.id) || null
            }))
        };
    
        try {
            const response = await fetch(GOOGLE_SCRIPT_WEB_APP_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify(reportData),
            });
    
            if (!response.ok) {
                throw new Error(`Network response was not ok. Status: ${response.status}`);
            }
    
            const result = await response.json();
    
            if (result.status !== 'success') {
                throw new Error(result.message || 'The script reported an error.');
            }
    
            console.log("Form Submitted successfully:", result);
            setIsSubmitted(true);
    
        } catch (err) {
            console.error("Form Submission Error:", err);
            let message = "An unknown error occurred.";
            if (err instanceof Error) {
              message = err.message;
            } else if (typeof err === "string") {
              message = err;
            } else if (err && typeof err === 'object' && 'message' in err) {
              message = String((err as { message: unknown }).message);
            }
            setError(`Failed to submit report: ${message}. Please check your connection and the Google Script URL configuration.`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setProjectName('');
        setOtherProjectName('');
        setFrontViewPhotos([]);
        if (frontViewFileInputRef.current) frontViewFileInputRef.current.value = "";
        
        setIssues([{ id: Date.now().toString(), description: '', photo: null, comments: '' }]);
        issueFileInputRefs.current.clear();

        setSuggestions(new Map());
        setAnalyzing(new Set());
        debounceTimeouts.current.forEach(timeoutId => clearTimeout(timeoutId));
        debounceTimeouts.current.clear();
        
        setIsSubmitted(false);
        setError(null);
        setEntryDate(new Date().toLocaleString());
    };

    if (!currentUser) {
        return <Auth onLoginSuccess={handleLoginSuccess} />;
    }

    return (
        <div className="w-full h-[100dvh] bg-white dark:bg-slate-950 md:max-w-sm md:mx-auto md:h-[95vh] md:my-[2.5vh] md:rounded-3xl md:shadow-2xl flex flex-col overflow-hidden border border-slate-300 dark:border-slate-700">
            <Sidebar 
                isOpen={isSidebarOpen} 
                onClose={() => setIsSidebarOpen(false)} 
                theme={theme}
                setTheme={setTheme}
                user={currentUser}
                onLogout={handleLogout}
                onProfileClick={handleOpenProfile}
            />
             {isProfileOpen && currentUser && (
                <Profile 
                    user={currentUser} 
                    onClose={handleCloseProfile}
                    onUpdateUser={handleUpdateUser}
                    onChangePassword={handleChangePassword}
                />
            )}
            {isSubmitted ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <SuccessMessage onReset={resetForm} />
                </div>
            ) : (
                <>
                    <header className="sticky top-0 z-10 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg p-4 border-b border-slate-200 dark:border-slate-700">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 focus:ring-offset-white dark:focus:ring-offset-slate-900"
                            aria-label="Open menu"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                        <div className="text-center">
                            <h1 className="text-xl font-bold text-orange-600 dark:text-orange-400 font-display uppercase tracking-wide">
                                <span className="text-2xl">C</span>redence Project Visit
                            </h1>
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 font-semibold tracking-wide">
                                – Issue Finding Report –
                            </p>
                        </div>
                        <div className="w-9" />
                    </header>
                    <main className="flex-1 overflow-y-auto">
                        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Reporter</label>
                                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-md truncate">{currentUser.name}</p>

                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Entry Date & Time</label>
                                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-md">{entryDate}</p>
                                </div>
                            </div>
                            
                            <div>
                                <label htmlFor="projectName" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                                    Project Name
                                </label>
                                <select
                                    id="projectName"
                                    name="projectName"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    required
                                    className="mt-1 block w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md text-base shadow-sm placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                                >
                                    <option value="" disabled>Select a project</option>
                                    {PROJECT_NAMES.map(name => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                    <option value="Other">Other (Please specify)</option>
                                </select>
                                {projectName === 'Other' && (
                                    <div className="mt-4">
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
                            </div>
                           
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                                    Project Front View Photos (up to 4)
                                </label>
                                {frontViewPhotos.length > 0 && (
                                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {frontViewPhotos.map((photo, index) => (
                                            <div key={index} className="relative group aspect-square">
                                                <img src={photo} alt={`Project front view ${index + 1}`} className="w-full h-full object-cover rounded-md border border-slate-300 dark:border-slate-600" />
                                                <button type="button" onClick={() => removeFrontViewPhoto(index)} className="absolute top-1 right-1 p-1 bg-black bg-opacity-60 rounded-full text-white opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-white transition-opacity" aria-label="Remove photo">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {frontViewPhotos.length < 4 && (
                                     <div className="mt-2 flex gap-3">
                                        <label htmlFor="front-view-photo-upload" className="flex-1 flex flex-col items-center justify-center p-4 h-28 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-md cursor-pointer hover:border-orange-500 dark:hover:border-orange-400 transition-colors text-slate-500 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                            <span className="mt-1 text-xs font-medium text-center">Upload Photo</span>
                                        </label>
                                        <input id="front-view-photo-upload" type="file" multiple className="sr-only" onChange={handleFrontViewFileChange} accept="image/*" ref={frontViewFileInputRef} />
                                        
                                        <button type="button" onClick={() => handleOpenCamera({type: 'frontView'})} className="flex-1 flex flex-col items-center justify-center p-4 h-28 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-md cursor-pointer hover:border-orange-500 dark:hover:border-orange-400 transition-colors text-slate-500 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400">
                                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                            <span className="mt-1 text-xs font-medium text-center">Take Photo</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                            <hr className="border-slate-200 dark:border-slate-700" />

                            {issues.map((issue, index) => {
                                const issueSuggestion = suggestions.get(issue.id);
                                const isIssueAnalyzing = analyzing.has(issue.id);

                                return (
                                    <div key={issue.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg space-y-4 relative bg-slate-50 dark:bg-slate-800/50">
                                        <div className="flex justify-between items-center">
                                            <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-100">Issue #{index + 1}</h3>
                                            {issues.length > 1 && (
                                                <button type="button" onClick={() => removeIssue(issue.id)} className="p-1.5 text-slate-500 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500" aria-label="Remove issue">
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
                                            <div className="h-8 mt-2 flex items-center space-x-2">
                                                {isIssueAnalyzing && (
                                                    <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                                                        <Spinner className="w-4 h-4 mr-2" />
                                                        <span>AI is analyzing...</span>
                                                    </div>
                                                )}
                                                {issueSuggestion && !isIssueAnalyzing && (
                                                    <div className="flex items-center space-x-2 transition-opacity duration-300 opacity-100">
                                                        <span className="text-sm text-slate-600 dark:text-slate-300">AI Suggestion:</span>
                                                        <SuggestedTag label={issueSuggestion.priority} colorClasses={PRIORITY_COLORS[issueSuggestion.priority]} />
                                                        <SuggestedTag label={issueSuggestion.category} colorClasses={CATEGORY_COLORS[issueSuggestion.category]} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
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

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                                                Issue Photo (Optional)
                                            </label>
                                            <div className="mt-1">
                                                {!issue.photo ? (
                                                     <div className="flex gap-3">
                                                        <label htmlFor={`issue-photo-upload-${issue.id}`} className="flex-1 flex flex-col items-center justify-center p-4 h-28 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-md cursor-pointer hover:border-orange-500 dark:hover:border-orange-400 transition-colors text-slate-500 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                                            <span className="mt-1 text-xs font-medium text-center">Upload Photo</span>
                                                        </label>
                                                        <input id={`issue-photo-upload-${issue.id}`} type="file" className="sr-only" onChange={(e) => {
                                                            if (e.target.files && e.target.files[0]) {
                                                                const reader = new FileReader();
                                                                reader.onloadend = () => {
                                                                    handleIssueUpdate(issue.id, { photo: reader.result as string });
                                                                };
                                                                reader.readAsDataURL(e.target.files[0]);
                                                            }
                                                        }} accept="image/*" ref={(el) => { if (el) issueFileInputRefs.current.set(issue.id, el); }} />

                                                        <button type="button" onClick={() => handleOpenCamera({ type: 'issue', issueId: issue.id })} className="flex-1 flex flex-col items-center justify-center p-4 h-28 border-2 border-slate-300 dark:border-slate-600 border-dashed rounded-md cursor-pointer hover:border-orange-500 dark:hover:border-orange-400 transition-colors text-slate-500 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                            <span className="mt-1 text-xs font-medium text-center">Take Photo</span>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="relative group">
                                                        <img src={issue.photo} alt="Issue preview" className="w-full h-auto max-h-60 object-contain rounded-md border border-slate-300 dark:border-slate-600" />
                                                        <button type="button" onClick={() => {
                                                            handleIssueUpdate(issue.id, { photo: null });
                                                            const input = issueFileInputRefs.current.get(issue.id);
                                                            if (input) input.value = "";
                                                        }} className="absolute top-2 right-2 p-1.5 bg-black bg-opacity-50 rounded-full text-white opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-white transition-opacity" aria-label="Remove photo">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            <div>
                                <button type="button" onClick={addIssue} className="w-full flex justify-center items-center px-4 py-3 border border-dashed border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110 2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg>
                                    Add Another Issue
                                </button>
                            </div>
                            
                            {error && <p className="text-sm text-red-600 dark:text-red-400 text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-md">{error}</p>}

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isSubmitting || analyzing.size > 0}
                                    className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-slate-400 disabled:cursor-not-allowed"
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
                        </form>
                    </main>
                </>
            )}
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
                     <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/50 flex items-center justify-center space-x-8">
                        {!capturedImage ? (
                            <button onClick={handleCapture} className="p-4 bg-white rounded-full text-slate-800" aria-label="Capture photo">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            </button>
                        ) : (
                            <>
                                <button onClick={handleRetake} className="p-3 bg-white/90 text-slate-800 rounded-full flex items-center gap-2 text-lg font-semibold px-6" aria-label="Retake photo">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 11a8 8 0 0114.24-4.74l.76 1.74M20 13a8 8 0 01-14.24 4.74l-.76-1.74" /></svg>
                                    Retake
                                </button>
                                <button onClick={handleUsePhoto} className="p-3 bg-green-500 text-white rounded-full flex items-center gap-2 text-lg font-semibold px-6" aria-label="Use this photo">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>

                                    Use Photo
                                </button>
                            </>
                        )}
                     </div>
                </div>
            )}
        </div>
    );
}