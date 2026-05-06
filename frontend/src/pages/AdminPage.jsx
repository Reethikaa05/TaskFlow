import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Shield, ShieldAlert, Trash2, User } from 'lucide-react';
import { getInitials } from '../utils/helpers';

export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState('');

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => api.get('/admin/users').then(res => res.data.users),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }) => api.put(`/admin/users/${id}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin', 'users']);
      setErrorMsg('');
    },
    onError: (err) => {
      setErrorMsg(err.response?.data?.error || 'Failed to update role');
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin', 'users']);
      setErrorMsg('');
    },
    onError: (err) => {
      setErrorMsg(err.response?.data?.error || 'Failed to delete user');
    }
  });

  const handleRoleChange = (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    updateRoleMutation.mutate({ id: userId, role: newRole });
  };

  const handleDelete = (userId) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      deleteUserMutation.mutate(userId);
    }
  };

  if (isLoading) return <div className="p-8">Loading users...</div>;

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Admin Panel</h1>
          <p className="text-slate-400">Manage platform users and their access levels.</p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {errorMsg}
          </div>
        )}

        <div className="bg-surface-1 border border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-sm font-medium text-slate-400">
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Joined</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users?.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {u.avatar ? (
                          <img src={u.avatar} alt="" className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold">
                            {getInitials(u.name)}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-slate-200">
                            {u.name}
                            {u.id === currentUser.id && <span className="ml-2 text-xs bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded-full">You</span>}
                          </div>
                          <div className="text-sm text-slate-500">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {u.role === 'admin' ? (
                          <span className="flex items-center gap-1 text-sm text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-lg">
                            <Shield size={14} /> Admin
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-sm text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg">
                            <User size={14} /> Member
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRoleChange(u.id, u.role)}
                          disabled={u.id === currentUser.id}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            u.id === currentUser.id 
                              ? 'text-slate-600 bg-slate-800 cursor-not-allowed'
                              : 'text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {u.role === 'admin' ? 'Demote to Member' : 'Make Admin'}
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          disabled={u.id === currentUser.id}
                          className={`p-1.5 rounded-lg transition-colors ${
                            u.id === currentUser.id
                              ? 'text-slate-600 cursor-not-allowed'
                              : 'text-red-400 hover:bg-red-500/10'
                          }`}
                          title="Delete User"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
