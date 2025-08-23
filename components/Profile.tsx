import React, { useState, useRef } from 'react';
import { User } from '../types';
import FormField from './FormField';
import Spinner from './Spinner';

interface ProfileProps {
  user: User;
  onClose: () => void;
  onUpdateUser: (updatedData: Partial<User>) => void;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
}

const Profile: React.FC<ProfileProps> = ({ user, onClose, onUpdateUser, onChangePassword }) => {
  const [name, setName] = useState(user.name);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [updateMessage, setUpdateMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [isUpdatingDetails, setIsUpdatingDetails] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateUser({ profilePicture: reader.result as string });
        setUpdateMessage('Profile picture updated!');
        setTimeout(() => setUpdateMessage(''), 3000);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingDetails(true);
    if (name !== user.name) {
      onUpdateUser({ name });
    }
    setUpdateMessage('Profile details saved!');
    setTimeout(() => {
        setUpdateMessage('');
        setIsUpdatingDetails(false);
    }, 2000);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
        setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
        return;
    }
    
    setIsChangingPassword(true);
    setPasswordMessage(null);
    const result = await onChangePassword(currentPassword, newPassword);
    
    if (result.success) {
      setPasswordMessage({ type: 'success', text: result.message });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPasswordMessage({ type: 'error', text: result.message });
    }
    setIsChangingPassword(false);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">My Profile</h2>
          <button onClick={onClose} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Close profile settings">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 max-h-[80vh] overflow-y-auto space-y-8">
            {/* Profile Picture Section */}
            <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                    {user.profilePicture ? (
                        <img src={user.profilePicture} alt="Profile" className="w-28 h-28 rounded-full object-cover border-4 border-slate-200 dark:border-slate-700" />
                    ) : (
                        <div className="w-28 h-28 rounded-full bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center border-4 border-slate-200 dark:border-slate-700">
                            <span className="text-4xl font-bold text-orange-600 dark:text-orange-300">{getInitials(user.name)}</span>
                        </div>
                    )}
                    <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 p-2 bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-800 rounded-full hover:bg-slate-800 dark:hover:bg-white transition" aria-label="Change profile picture">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleProfilePicChange} accept="image/*" className="sr-only" />
                </div>
            </div>

            {/* User Details Form */}
            <form onSubmit={handleDetailsSubmit} className="space-y-4">
                <h3 className="text-md font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2">Personal Information</h3>
                <FormField
                    id="profileName"
                    label="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    required
                />
                <FormField
                    id="profileEmail"
                    label="Email Address"
                    type="email"
                    value={user.email}
                    onChange={() => {}} // No-op, read-only
                    placeholder="Your email address"
                    required
                />
                 <div>
                    <button type="submit" disabled={isUpdatingDetails || name === user.name} className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-slate-400 disabled:cursor-not-allowed">
                        {isUpdatingDetails ? <Spinner className="w-5 h-5" /> : 'Save Details'}
                    </button>
                    {updateMessage && <p className="text-sm text-green-600 dark:text-green-400 mt-2 text-center">{updateMessage}</p>}
                </div>
            </form>

            {/* Password Change Form */}
            {user.role !== 'admin' && (
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <h3 className="text-md font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2">Change Password</h3>
                    <FormField
                        id="currentPassword"
                        label="Current Password"
                        as="input"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter your current password"
                        required
                    />
                    <FormField
                        id="newPassword"
                        label="New Password"
                        as="input"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter your new password"
                        required
                    />
                    <FormField
                        id="confirmPassword"
                        label="Confirm New Password"
                        as="input"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your new password"
                        required
                    />
                    <div>
                        <button type="submit" disabled={isChangingPassword} className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:bg-slate-400 disabled:cursor-not-allowed">
                            {isChangingPassword ? <Spinner className="w-5 h-5" /> : 'Change Password'}
                        </button>
                        {passwordMessage && (
                            <p className={`text-sm mt-2 text-center ${passwordMessage.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {passwordMessage.text}
                            </p>
                        )}
                    </div>
                </form>
            )}

        </div>
      </div>
    </div>
  );
};

export default Profile;