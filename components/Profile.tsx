import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import ImageCropModal from './ImageCropModal';
import Spinner from './Spinner';
import FeedbackMessage from './FeedbackMessage';

// New type for the active tab
type ProfileTab = 'personal' | 'official' | 'security';

interface ProfileProps {
  currentUser: User;
  onUpdateUser: (updatedData: Partial<Omit<User, 'id' | 'permissions' | 'role'>>) => Promise<void>;
  initialState?: { initialTab?: ProfileTab } | null;
}

const ProfileField: React.FC<{ label: string, value: string, readOnly?: boolean }> = ({ label, value, readOnly = true }) => (
    <div>
        <label className="block text-sm font-medium text-slate-500">{label}</label>
        <p className={`mt-1 block w-full px-3 py-2 border rounded-md text-sm ${readOnly ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-default' : 'bg-white text-slate-900 border-slate-300'}`}>
            {value}
        </p>
    </div>
);

const Profile: React.FC<ProfileProps> = ({ currentUser, onUpdateUser, initialState }) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialState?.initialTab || 'personal');
  const canEdit = currentUser.permissions.profile.edit;
  const isAdmin = currentUser.role === 'admin';

  const [profileData, setProfileData] = useState({
      userName: currentUser.name,
      dateOfBirth: '2000-09-05',
      nationality: 'Bangladeshi',
      mobileNumber: '01896-055404',
      religion: 'Islam',
      gender: 'Male',
      employeeId: currentUser.employeeId,
      designation: currentUser.designation,
      department: currentUser.department || 'Management Information System (MIS)',
      division: 'Admin Office',
  });
  
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [passwordVisibility, setPasswordVisibility] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    setProfileData(prev => ({
        ...prev,
        userName: currentUser.name,
        employeeId: currentUser.employeeId,
        designation: currentUser.designation,
        department: currentUser.department,
    }));
  }, [currentUser.name, currentUser.employeeId, currentUser.designation, currentUser.department]);

  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type });
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswords(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    await onUpdateUser({ name: profileData.userName, employeeId: profileData.employeeId, designation: profileData.designation, department: profileData.department });
    setIsSaving(false);
    showFeedback(`Profile updated successfully!`, 'success');
  };

  const handleUpdatePassword = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      showFeedback("New passwords do not match.", 'error');
      return;
    }
    if (passwords.newPassword.length < 8) {
      showFeedback("Password must be at least 8 characters long.", 'error');
      return;
    }
    
    setIsSaving(true);
    await onUpdateUser({ password: passwords.newPassword });
    setIsSaving(false);
    showFeedback(`Password updated successfully!`, 'success');
    setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };
  
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    e.target.value = ''; // Reset input to allow re-uploading the same file
  };

  const handleCroppedImageSave = async (croppedImageBase64: string) => {
    setIsSaving(true); // Technically saving the user profile
    await onUpdateUser({ avatar: croppedImageBase64 });
    setIsSaving(false);
    setIsCropModalOpen(false);
    setImageToCrop(null);
    showFeedback("Profile photo updated!", "success");
  };

  const renderPersonalForm = () => (
    <div className="space-y-8">
        <div>
            <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-3 mb-6">Personal Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="userName" className="block text-sm font-medium text-slate-700">Full Name</label>
                    <input type="text" id="userName" name="userName" value={profileData.userName} onChange={handleInputChange} readOnly={!canEdit} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50 read-only:bg-slate-100 read-only:cursor-not-allowed" />
                </div>
                <div>
                    <label htmlFor="dateOfBirth" className="block text-sm font-medium text-slate-700">Date of Birth</label>
                    <input type="date" id="dateOfBirth" name="dateOfBirth" value={profileData.dateOfBirth} onChange={handleInputChange} readOnly={!canEdit} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50 read-only:bg-slate-100 read-only:cursor-not-allowed" />
                </div>
                <div>
                    <label htmlFor="nationality" className="block text-sm font-medium text-slate-700">Nationality</label>
                    <input type="text" id="nationality" name="nationality" value={profileData.nationality} onChange={handleInputChange} readOnly={!canEdit} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50 read-only:bg-slate-100 read-only:cursor-not-allowed" />
                </div>
                 <div>
                    <label htmlFor="religion" className="block text-sm font-medium text-slate-700">Religion</label>
                    <input type="text" id="religion" name="religion" value={profileData.religion} onChange={handleInputChange} readOnly={!canEdit} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50 read-only:bg-slate-100 read-only:cursor-not-allowed" />
                </div>
                 <div>
                    <label htmlFor="gender" className="block text-sm font-medium text-slate-700">Gender</label>
                    <select id="gender" name="gender" value={profileData.gender} onChange={handleInputChange} disabled={!canEdit} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50 disabled:bg-slate-100 disabled:cursor-not-allowed">
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                        <option>Prefer not to say</option>
                    </select>
                </div>
            </div>
        </div>
        <div>
            <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-3 mb-6">Contact Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ProfileField label="Email Address" value={currentUser.email} />
                <div>
                    <label htmlFor="mobileNumber" className="block text-sm font-medium text-slate-700">Mobile Number</label>
                    <input type="tel" id="mobileNumber" name="mobileNumber" value={profileData.mobileNumber} onChange={handleInputChange} readOnly={!canEdit} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50 read-only:bg-slate-100 read-only:cursor-not-allowed" />
                </div>
            </div>
        </div>
    </div>
  );

  const renderOfficialForm = () => (
    <div>
        <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-3 mb-6">Official Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label htmlFor="employeeId" className="block text-sm font-medium text-slate-700">Employee ID</label>
                <input type="text" id="employeeId" name="employeeId" value={profileData.employeeId} onChange={handleInputChange} readOnly={!isAdmin || !canEdit} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50 read-only:bg-slate-100 read-only:cursor-not-allowed" />
            </div>
            <div>
                <label htmlFor="designation" className="block text-sm font-medium text-slate-700">Designation</label>
                <input type="text" id="designation" name="designation" value={profileData.designation} onChange={handleInputChange} readOnly={!canEdit} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50 read-only:bg-slate-100 read-only:cursor-not-allowed" />
            </div>
            <div>
                <label htmlFor="department" className="block text-sm font-medium text-slate-700">Department</label>
                <input type="text" id="department" name="department" value={profileData.department} onChange={handleInputChange} readOnly={!canEdit} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50 read-only:bg-slate-100 read-only:cursor-not-allowed" />
            </div>
            <div>
                <label htmlFor="division" className="block text-sm font-medium text-slate-700">Division</label>
                <input type="text" id="division" name="division" value={profileData.division} onChange={handleInputChange} readOnly={!canEdit} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50 read-only:bg-slate-100 read-only:cursor-not-allowed" />
            </div>
        </div>
    </div>
  );

  const renderSecurityForm = () => (
     <div>
        <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-200 pb-3 mb-6">Change Password</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
            <div className="relative">
                <label htmlFor="currentPassword">Current Password</label>
                <input type={passwordVisibility.current ? 'text' : 'password'} id="currentPassword" name="currentPassword" value={passwords.currentPassword} onChange={handlePasswordChange} readOnly={!canEdit} className="mt-1 block w-full px-3 py-2 pr-10 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50 read-only:bg-slate-100 read-only:cursor-not-allowed" />
                <button type="button" onClick={() => setPasswordVisibility(p => ({...p, current: !p.current}))} className="absolute inset-y-0 right-0 top-6 flex items-center pr-3 text-slate-400 hover:text-slate-600">
                     {passwordVisibility.current ? <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zM10 12a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /><path d="M10 17a9.953 9.953 0 01-4.522-.992l.938-1.172A6.002 6.002 0 0010 15c2.21 0 4.21-.898 5.68-2.356l1.248 1.56A10.005 10.005 0 0110 17z" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>}
                </button>
            </div>
            <div /> 
            <div className="relative">
                <label htmlFor="newPassword">New Password</label>
                <input type={passwordVisibility.new ? 'text' : 'password'} id="newPassword" name="newPassword" value={passwords.newPassword} onChange={handlePasswordChange} readOnly={!canEdit} className="mt-1 block w-full px-3 py-2 pr-10 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50 read-only:bg-slate-100 read-only:cursor-not-allowed" />
                 <button type="button" onClick={() => setPasswordVisibility(p => ({...p, new: !p.new}))} className="absolute inset-y-0 right-0 top-6 flex items-center pr-3 text-slate-400 hover:text-slate-600">
                     {passwordVisibility.new ? <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zM10 12a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /><path d="M10 17a9.953 9.953 0 01-4.522-.992l.938-1.172A6.002 6.002 0 0010 15c2.21 0 4.21-.898 5.68-2.356l1.248 1.56A10.005 10.005 0 0110 17z" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>}
                </button>
            </div>
             <div className="relative">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input type={passwordVisibility.confirm ? 'text' : 'password'} id="confirmPassword" name="confirmPassword" value={passwords.confirmPassword} onChange={handlePasswordChange} readOnly={!canEdit} className="mt-1 block w-full px-3 py-2 pr-10 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50 read-only:bg-slate-100 read-only:cursor-not-allowed" />
                 <button type="button" onClick={() => setPasswordVisibility(p => ({...p, confirm: !p.confirm}))} className="absolute inset-y-0 right-0 top-6 flex items-center pr-3 text-slate-400 hover:text-slate-600">
                     {passwordVisibility.confirm ? <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zM10 12a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /><path d="M10 17a9.953 9.953 0 01-4.522-.992l.938-1.172A6.002 6.002 0 0010 15c2.21 0 4.21-.898 5.68-2.356l1.248 1.56A10.005 10.005 0 0110 17z" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>}
                </button>
            </div>
        </div>
    </div>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'personal': return renderPersonalForm();
      case 'official': return renderOfficialForm();
      case 'security': return renderSecurityForm();
      default: return null;
    }
  };
  
  const getTabClasses = (tab: ProfileTab) => {
      return activeTab === tab
        ? 'border-orange-500 text-orange-600'
        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300';
  }

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
                 <div className="w-28 h-28 rounded-full bg-orange-100 border-4 border-white flex items-center justify-center shadow-lg overflow-hidden">
                     {currentUser.avatar ? (
                        <img src={currentUser.avatar} alt="Profile" className="w-full h-full object-cover" />
                     ) : (
                        <span className="font-bold text-4xl text-orange-600">{currentUser.name.match(/\b(\w)/g)?.join('').slice(0,2).toUpperCase()}</span>
                     )}
                 </div>
                 {canEdit && (
                     <button onClick={() => avatarInputRef.current?.click()} className="absolute -bottom-1 -right-1 p-2 bg-white rounded-full shadow-md hover:bg-slate-100 transition-colors" aria-label="Change profile photo" disabled={isSaving}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-600" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                        <input type="file" ref={avatarInputRef} onChange={handleAvatarChange} className="sr-only" accept="image/*" />
                     </button>
                 )}
            </div>
            <div className="text-center sm:text-left">
                <h2 className="text-3xl font-bold text-slate-800">{currentUser.name}</h2>
                <p className="text-slate-500">{currentUser.designation}</p>
                <span className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${currentUser.role === 'admin' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-800'}`}>
                    {currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}
                </span>
            </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/80">
            <div className="border-b border-slate-200">
                <nav className="flex space-x-4 px-6" aria-label="Tabs">
                    <button onClick={() => setActiveTab('personal')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${getTabClasses('personal')}`}>Personal</button>
                    <button onClick={() => setActiveTab('official')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${getTabClasses('official')}`}>Official</button>
                    <button onClick={() => setActiveTab('security')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${getTabClasses('security')}`}>Security</button>
                </nav>
            </div>
            <div className="p-6 sm:p-8">
                <div className="fade-in" key={activeTab}>
                    {renderActiveTab()}
                </div>
            </div>
            {canEdit && (
                <div className="bg-slate-50/70 px-6 py-4 rounded-b-2xl border-t border-slate-200 flex justify-end">
                     <button
                        onClick={activeTab === 'security' ? handleUpdatePassword : handleSaveChanges}
                        disabled={isSaving}
                        className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 hover:-translate-y-0.5 active:translate-y-0 disabled:bg-slate-400 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {isSaving ? <Spinner className="w-5 h-5" /> : (activeTab === 'security' ? 'Update Password' : 'Save Changes')}
                    </button>
                </div>
            )}
        </div>
      </div>
      
      {feedback && <FeedbackMessage message={feedback.message} type={feedback.type} onDismiss={() => setFeedback(null)} />}
      
      <ImageCropModal 
        isOpen={isCropModalOpen}
        onClose={() => {
            setIsCropModalOpen(false);
            setImageToCrop(null);
        }}
        onSave={handleCroppedImageSave}
        imageSrc={imageToCrop}
      />
    </>
  );
};

export default Profile;