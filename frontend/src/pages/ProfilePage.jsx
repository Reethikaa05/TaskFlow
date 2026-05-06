import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/helpers';
import { User, Lock, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });

  const profileMut = useMutation({
    mutationFn: () => api.put('/auth/profile', { name }).then(r => r.data),
    onSuccess: (data) => { updateUser(data.user); toast.success('Profile updated!'); },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const pwMut = useMutation({
    mutationFn: () => api.put('/auth/password', {
      currentPassword: pwForm.currentPassword,
      newPassword: pwForm.newPassword
    }).then(r => r.data),
    onSuccess: () => { toast.success('Password changed!'); setPwForm({ currentPassword: '', newPassword: '', confirm: '' }); },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const handlePwSubmit = (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) return toast.error('Passwords do not match');
    if (pwForm.newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    pwMut.mutate();
  };

  return (
    <div className="p-8 max-w-xl animate-fade-in">
      <h1 className="text-2xl font-bold text-white mb-2">Profile Settings</h1>
      <p className="text-slate-400 mb-8">Manage your account information</p>

      {/* Avatar */}
      <div className="card p-6 mb-5">
        <div className="flex items-center gap-4 mb-6">
          <img src={user?.avatar} alt={user?.name} className="w-16 h-16 rounded-2xl" />
          <div>
            <h2 className="font-semibold text-white text-lg">{user?.name}</h2>
            <p className="text-slate-500 text-sm">{user?.email}</p>
          </div>
        </div>

        <h3 className="font-medium text-slate-300 flex items-center gap-2 mb-4 text-sm">
          <User size={16} className="text-slate-500" /> Personal Information
        </h3>

        <form onSubmit={e => { e.preventDefault(); profileMut.mutate(); }} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={50} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input opacity-50 cursor-not-allowed" value={user?.email} disabled />
            <p className="text-xs text-slate-600 mt-1">Email cannot be changed</p>
          </div>
          <button type="submit" disabled={profileMut.isPending || name === user?.name} className="btn-primary">
            {profileMut.isPending ? <Loader2 size={16} className="animate-spin" /> : <><Save size={15} /> Save Changes</>}
          </button>
        </form>
      </div>

      {/* Password */}
      <div className="card p-6">
        <h3 className="font-medium text-slate-300 flex items-center gap-2 mb-4 text-sm">
          <Lock size={16} className="text-slate-500" /> Change Password
        </h3>
        <form onSubmit={handlePwSubmit} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input type="password" className="input" required value={pwForm.currentPassword}
              onChange={e => setPwForm(p => ({ ...p, currentPassword: e.target.value }))} />
          </div>
          <div>
            <label className="label">New Password</label>
            <input type="password" className="input" required minLength={6} value={pwForm.newPassword}
              onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))} />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input type="password" className="input" required value={pwForm.confirm}
              onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} />
          </div>
          <button type="submit" disabled={pwMut.isPending} className="btn-primary">
            {pwMut.isPending ? <Loader2 size={16} className="animate-spin" /> : <><Lock size={15} /> Update Password</>}
          </button>
        </form>
      </div>
    </div>
  );
}
