import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { User, Permissions, Role } from '../types';
import Avatar from './Avatar';
import FormField from './FormField';
import Spinner from './Spinner';

interface AdminPanelProps {
    allUsers: User[];
    onPermissionsChange: (userId: number, newPermissions: Permissions) => void;
    currentAdminId: number;
    onInviteUser: (name: string, email: string, role: Role) => void;
    onDeleteUser: (userId: number) => Promise<void>;
    onPasswordChange: (userId: number, newPassword: string) => Promise<void>;
    originalAdminUser: User | null;
    onSwitchAccount: (targetUserId: number) => void;
    onSwitchBack: () => void;
}

const ModalWrapper: React.FC<{ isOpen: boolean, onClose: () => void, children: React.ReactNode }> = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div onClick={e => e.stopPropagation()}>{children}</div>
        </div>
    );
};

const InviteUserModal: React.FC<{ isOpen: boolean; onClose: () => void; onInvite: (name: string, email: string, role: Role) => void }> = ({ isOpen, onClose, onInvite }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<Role>('user');

    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onInvite(name, email, role); onClose(); setName(''); setEmail(''); setRole('user'); };

    return (
        <ModalWrapper isOpen={isOpen} onClose={onClose}>
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
                <h2 className="text-xl font-bold text-slate-800">Invite User</h2>
                <FormField id="invite-name" label="Full Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Jane Doe" required />
                <FormField id="invite-email" label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane.doe@example.com" required />
                <div>
                    <label htmlFor="invite-role" className="block text-sm font-medium text-slate-700">Role</label>
                    <select id="invite-role" value={role} onChange={e => setRole(e.target.value as Role)} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500">
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <div className="flex justify-end pt-2 gap-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700">Add</button>
                </div>
            </form>
        </ModalWrapper>
    );
};

const UserRow: React.FC<{ user: User; isSelected: boolean; onSelect: (id: number) => void; onEditPermissions: (u: User) => void; onDelete: (u: User) => void }> = ({ user, isSelected, onSelect, onEditPermissions, onDelete }) => (
    <div className={`p-4 border-b flex items-center gap-4 ${isSelected ? 'bg-orange-50' : 'hover:bg-slate-50'}`} onClick={() => onSelect(user.id)}>
        <input type="checkbox" checked={isSelected} onChange={() => onSelect(user.id)} />
        <Avatar name={user.name} />
        <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{user.name}</p>
            <p className="text-sm text-slate-500 truncate">{user.email}</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => onEditPermissions(user)} className="text-sm text-orange-600">Edit</button>
            <button onClick={() => onDelete(user)} className="text-sm text-red-600">Delete</button>
        </div>
    </div>
);

const AdminPanel: React.FC<AdminPanelProps> = ({ allUsers, onPermissionsChange, currentAdminId, onInviteUser, onDeleteUser, onPasswordChange }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

    const filteredUsers = useMemo(() => allUsers.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase())), [allUsers, searchTerm]);

    const toggleSelectUser = useCallback((id: number) => {
        setSelectedUserIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }, []);

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Admin Panel</h2>
                <button onClick={() => setIsInviteModalOpen(true)} className="px-4 py-2 bg-orange-600 text-white rounded">Invite</button>
            </div>
            <input type="text" placeholder="Search users..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2 border rounded" />
            <div className="bg-white rounded-xl border">
                {filteredUsers.map(user => (
                    <UserRow key={user.id} user={user} isSelected={selectedUserIds.includes(user.id)} onSelect={toggleSelectUser} onEditPermissions={() => {}} onDelete={() => {}} />
                ))}
            </div>
            <InviteUserModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} onInvite={onInviteUser} />
        </div>
    );
};

export default AdminPanel;