import React, { useState } from 'react';
import { User } from '../types';
import FormField from './FormField';

interface AuthProps {
    onLoginSuccess: (user: User) => void;
}

// --- Admin Credentials - For demonstration purposes only ---
// In a real production app, this should be handled by a secure backend authentication system.
const ADMIN_EMAIL = 'admin@credence.com';
const ADMIN_PASSWORD = 'admin123';
const MOCK_VERIFICATION_CODE = '123456';

const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const [showVerification, setShowVerification] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [pendingUser, setPendingUser] = useState<{name: string, email: string, password: string} | null>(null);


    const handleSignup = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!name || !email || !password) {
            setError('All fields are required.');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }
        if (email.toLowerCase() === ADMIN_EMAIL) {
            setError('This email is reserved for administration.');
            return;
        }

        const existingUser = localStorage.getItem(`user_${email.toLowerCase()}`);
        if (existingUser) {
            setError('An account with this email already exists.');
            return;
        }
        
        // Store user data temporarily and switch to verification view
        setPendingUser({ name, email: email.toLowerCase(), password });
        setShowVerification(true);
    };

    const handleVerify = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (verificationCode !== MOCK_VERIFICATION_CODE) {
            setError('Invalid verification code. Please try again.');
            return;
        }

        if (pendingUser) {
            const newUser: User = { name: pendingUser.name, email: pendingUser.email, role: 'user', profilePicture: null };
            // Don't store password in localStorage in a real app! This is just for demo.
            localStorage.setItem(`user_${pendingUser.email}`, JSON.stringify({ ...newUser, password: pendingUser.password }));
            
            // Automatically log in the new user
            onLoginSuccess(newUser);
        } else {
            setError("Something went wrong. Please try signing up again.");
            setShowVerification(false);
        }
    };


    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const lowerCaseEmail = email.toLowerCase();

        if (!email || !password) {
            setError('Email and password are required.');
            return;
        }
        
        // --- Admin Login Check ---
        if (lowerCaseEmail === ADMIN_EMAIL) {
            if (password === ADMIN_PASSWORD) {
                const adminUser: User = { name: 'Admin', email: ADMIN_EMAIL, role: 'admin' };
                onLoginSuccess(adminUser);
                return;
            } else {
                setError('Incorrect password for admin account.');
                return;
            }
        }

        // --- Regular User Login Check ---
        const storedUserString = localStorage.getItem(`user_${lowerCaseEmail}`);
        if (!storedUserString) {
            setError('No account found with this email.');
            return;
        }

        const storedUser = JSON.parse(storedUserString);
        // This is a mock authentication check.
        if (storedUser.password !== password) {
            setError('Incorrect password.');
            return;
        }
        
        const user: User = { name: storedUser.name, email: storedUser.email, role: storedUser.role || 'user', profilePicture: storedUser.profilePicture || null };
        onLoginSuccess(user);
    };

    const resetForms = () => {
        setError('');
        setName('');
        setEmail('');
        setPassword('');
        setVerificationCode('');
        setPendingUser(null);
    }

    const toggleView = () => {
        setIsLoginView(!isLoginView);
        resetForms();
    };
    
    const goBackToSignup = () => {
        setShowVerification(false);
        resetForms();
    }

    return (
        <div className="w-full h-full flex flex-col justify-center items-center p-4 bg-gray-200 dark:bg-slate-900">
             <div className="w-full max-w-sm mx-auto bg-white dark:bg-slate-950 rounded-2xl shadow-xl p-6 md:p-8">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-orange-600 dark:text-orange-400 font-display uppercase tracking-wide">
                        <span className="text-3xl">C</span>redence
                    </h1>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 font-semibold tracking-wide">
                        Issue Finding Report
                    </p>
                </div>

                {showVerification ? (
                     <div>
                        <h2 className="text-xl font-semibold text-center text-slate-800 dark:text-slate-100">Verify Your Email</h2>
                        <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-2">
                            A verification code was "sent" to <span className="font-medium">{pendingUser?.email}</span>.
                        </p>
                        <div className="mt-4 p-3 bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-700 rounded-md text-center">
                            <p className="text-sm text-sky-800 dark:text-sky-200">For demonstration purposes, your code is:</p>
                            <p className="text-lg font-bold tracking-widest text-sky-900 dark:text-sky-100 mt-1">{MOCK_VERIFICATION_CODE}</p>
                        </div>
                        <form onSubmit={handleVerify} className="space-y-4 mt-6">
                            <FormField
                                id="verificationCode"
                                label="Verification Code"
                                value={verificationCode}
                                onChange={e => setVerificationCode(e.target.value)}
                                placeholder="Enter the 6-digit code"
                                required
                            />
                             {error && <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>}
                            <button
                                type="submit"
                                className="mt-2 w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                            >
                                Verify & Create Account
                            </button>
                             <button
                                type="button"
                                onClick={goBackToSignup}
                                className="w-full text-center text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400"
                            >
                                Go Back
                            </button>
                        </form>
                     </div>
                ) : (
                    <>
                        <div className="mb-6 flex border-b border-slate-200 dark:border-slate-700">
                            <button 
                                onClick={() => { if(!isLoginView) toggleView() }}
                                className={`flex-1 py-2 text-sm font-medium ${isLoginView ? 'border-b-2 border-orange-500 text-orange-600 dark:text-orange-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                Sign In
                            </button>
                            <button 
                                onClick={() => { if(isLoginView) toggleView() }}
                                className={`flex-1 py-2 text-sm font-medium ${!isLoginView ? 'border-b-2 border-orange-500 text-orange-600 dark:text-orange-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                Create Account
                            </button>
                        </div>

                        <form onSubmit={isLoginView ? handleLogin : handleSignup} className="space-y-4">
                            {!isLoginView && (
                                <FormField
                                    id="name"
                                    label="Full Name"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Enter your full name"
                                    required
                                />
                            )}
                            <FormField
                                id="email"
                                label="Email Address"
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                            />
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    required
                                    className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                                />
                            </div>

                            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                            
                            <div>
                                <button
                                    type="submit"
                                    className="mt-4 w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                                >
                                    {isLoginView ? 'Sign In' : 'Create Account'}
                                </button>
                            </div>
                        </form>
                    </>
                )}
             </div>
        </div>
    );
};

export default Auth;