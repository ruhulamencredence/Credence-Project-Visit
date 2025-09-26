import React, { useState, useEffect } from 'react';
import Spinner from './Spinner';
import FeedbackMessage from './FeedbackMessage';

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<boolean>;
}

// Simple email regex for client-side validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    // Add feedback state for toast notifications
    const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        // Client-side email validation
        if (!EMAIL_REGEX.test(email)) {
            setError('Please enter a valid email address.');
            return;
        }

        setIsLoggingIn(true);
        const success = await onLogin(email, password);
        if (!success) {
            setError('Invalid email or password. Please try again.');
        }
        // No need to set success state, as the App component handles navigation
        setIsLoggingIn(false);
    };
    
    const handleForgotPassword = () => {
        if (!email) {
            setError("Please enter your email address first, then click 'Forgot Password?'.");
            return;
        }
        if (!EMAIL_REGEX.test(email)) {
             setError("Please enter a valid email address to reset the password.");
            return;
        }
        setError(''); // Clear previous errors
        setFeedback({ 
            message: `If an account with the email ${email} exists, password reset instructions have been sent.`,
            type: 'info' 
        });
    };
    
    const hasError = !!error;
    const inputClasses = `mt-1 block w-full px-3 py-2 bg-white border rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50 ${hasError ? 'border-red-500 text-red-900 placeholder-red-300' : 'border-slate-300'}`;
    const passwordInputClasses = `block w-full px-3 py-2 pr-10 bg-white border rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50 ${hasError ? 'border-red-500 text-red-900 placeholder-red-300' : 'border-slate-300'}`;


    return (
        <>
            <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <h1 className="font-display text-4xl font-extrabold text-orange-600 uppercase tracking-wider">
                            <span className="text-5xl">P</span>recision
                        </h1>
                        <p className="text-xs text-slate-500 tracking-widest uppercase -mt-1">Eyes on Every Site</p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
                        <h2 className="text-2xl font-bold text-slate-800 text-center">Welcome Back</h2>
                        <p className="text-slate-500 text-center mt-1 text-sm">Sign in to continue</p>
                        
                        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                           <fieldset disabled={isLoggingIn} className="space-y-6">
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                                            Email Address
                                        </label>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            autoComplete="username"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className={inputClasses}
                                            placeholder="you@example.com"
                                            aria-invalid={hasError}
                                            aria-describedby={hasError ? 'login-error' : undefined}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="password"className="block text-sm font-medium text-slate-700">
                                            Password
                                        </label>
                                        <div className="relative mt-1">
                                            <input
                                                id="password"
                                                name="password"
                                                type={isPasswordVisible ? 'text' : 'password'}
                                                autoComplete="current-password"
                                                required
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className={passwordInputClasses}
                                                placeholder="••••••••"
                                                aria-invalid={hasError}
                                                aria-describedby={hasError ? 'login-error' : undefined}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setIsPasswordVisible(prev => !prev)}
                                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded-r-md"
                                                aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                                            >
                                                {isPasswordVisible ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zM10 12a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                                      <path d="M10 17a9.953 9.953 0 01-4.522-.992l.938-1.172A6.002 6.002 0 0010 15c2.21 0 4.21-.898 5.68-2.356l1.248 1.56A10.005 10.005 0 0110 17z" />
                                                    </svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {error && <p id="login-error" role="alert" className="text-sm text-red-600 text-center p-2 bg-red-50 rounded-md">{error}</p>}

                                <div>
                                    <button
                                        type="submit"
                                        className="w-full flex justify-center items-center px-4 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-slate-400 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none"
                                    >
                                        {isLoggingIn ? <Spinner className="w-5 h-5" /> : 'Log In'}
                                    </button>
                                </div>
                            </fieldset>
                        </form>
                        
                        <div className="text-center mt-6">
                            <button type="button" onClick={handleForgotPassword} className="text-sm font-medium text-orange-600 hover:text-orange-500 disabled:text-slate-400" disabled={isLoggingIn}>
                                Forgot Password?
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {feedback && <FeedbackMessage message={feedback.message} type={feedback.type} onDismiss={() => setFeedback(null)} />}
        </>
    );
};

export default Login;