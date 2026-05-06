import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { STATUS_CONFIG, getErrorMessage, getInitials, formatDate } from '../utils/helpers';
import TaskCard from '../components/tasks/TaskCard';
import TaskModal from '../components/tasks/TaskModal';
import {
  Plus, Settings, Users, Activity, Filter, Search, Loader2,
  X, UserPlus, Crown, Shield, Trash2, ChevronLeft, ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';

function AddMemberModal({ projectId, onClose }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');

  const mut = useMutation({
    mutationFn: () => api.post(`/projects/${projectId}/members`, { email, role }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries(['project', projectId]); toast.success('Member added!'); onClose(); },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal p-6 max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Add Member</h2>
          <button onClick={onClose} className="btn-ghost p-1"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); mut.mutate(); }} className="space-y-4">
          <div>
            <label className="label">Email Address</label>
            <input className="input" type="email" required value={email}
              placeholder="teammate@company.com" onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={role} onChange={e => setRole(e.target.value)}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={mut.isPending} className="btn-primary flex-1 justify-center">
              {mut.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [view, setView] = useState('board');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const { data: projectData, isLoading: projLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get(`/projects/${projectId}`).then(r => r.data),
  });

  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', projectId, filterStatus, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (search) params.set('search', search);
      return api.get(`/projects/${projectId}/tasks?${params}`).then(r => r.data);
    },
  });

  const removeMemberMut = useMutation({
    mutationFn: (userId) => api.delete(`/projects/${projectId}/members/${userId}`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries(['project', projectId]); toast.success('Member removed'); },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteProjectMut = useMutation({
    mutationFn: () => api.delete(`/projects/${projectId}`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries(['projects']); toast.success('Project deleted'); navigate('/projects'); },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (projLoading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
    </div>
  );

  const { project } = projectData || {};
  const tasks = tasksData?.tasks || [];
  const isAdmin = project?.my_role === 'admin';

  const tasksByStatus = Object.keys(STATUS_CONFIG).reduce((acc, status) => {
    acc[status] = tasks.filter(t => t.status === status);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-5 border-b border-white/5 flex items-center gap-4">
        <button onClick={() => navigate('/projects')} className="btn-ghost p-2">
          <ArrowLeft size={18} />
        </button>

        <div className="flex items-center gap-3 flex-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: project?.color + '20' }}>
            <div className="w-3.5 h-3.5 rounded-md" style={{ background: project?.color }} />
          </div>
          <div>
            <h1 className="font-bold text-white text-lg leading-tight">{project?.name}</h1>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>{project?.task_count} tasks</span>
              <span>·</span>
              <span>{project?.progress}% complete</span>
              {project?.due_date && <><span>·</span><span>Due {formatDate(project.due_date)}</span></>}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="hidden lg:flex items-center gap-3 w-48">
          <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${project?.progress || 0}%`, background: project?.color }} />
          </div>
          <span className="text-xs text-slate-500 w-8">{project?.progress}%</span>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <button onClick={() => setShowAddMember(true)} className="btn-secondary text-sm py-1.5">
              <UserPlus size={15} /> Add Member
            </button>
          )}
          <button onClick={() => setShowCreateTask(true)} className="btn-primary text-sm py-1.5">
            <Plus size={16} /> New Task
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-8 flex items-center gap-1 border-b border-white/5 pt-2">
        {[
          { key: 'board', label: 'Board' },
          { key: 'members', label: `Members (${project?.members?.length || 0})` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setView(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
              view === tab.key
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}>
            {tab.label}
          </button>
        ))}

        {view === 'board' && (
          <div className="ml-auto flex items-center gap-2 pb-1">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search tasks..." className="input text-sm py-1.5 pl-8 w-44" />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="input text-sm py-1.5 w-36">
              <option value="">All Status</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {view === 'board' && (
          <div className="flex gap-4 h-full min-w-max">
            {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
              const columnTasks = tasksByStatus[status] || [];
              return (
                <div key={status} className="flex flex-col w-72 flex-shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-base leading-none ${cfg.color}`}>{cfg.icon}</span>
                      <span className="text-sm font-medium text-slate-300">{cfg.label}</span>
                      <span className={`badge text-xs ${cfg.color} ${cfg.bg} ${cfg.border} border`}>
                        {columnTasks.length}
                      </span>
                    </div>
                    <button onClick={() => setShowCreateTask(true)}
                      className="text-slate-600 hover:text-slate-400 transition-colors p-1">
                      <Plus size={14} />
                    </button>
                  </div>

                  <div className="flex flex-col gap-2.5 flex-1">
                    {tasksLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
                      </div>
                    ) : columnTasks.length === 0 ? (
                      <div className="border-2 border-dashed border-white/5 rounded-2xl h-20 flex items-center justify-center">
                        <p className="text-xs text-slate-600">Drop tasks here</p>
                      </div>
                    ) : (
                      columnTasks.map(task => (
                        <TaskCard key={task.id} task={task} projectId={projectId} projectRole={project?.my_role} />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {view === 'members' && (
          <div className="max-w-2xl space-y-3">
            {project?.members?.map(member => (
              <div key={member.id} className="card p-4 flex items-center gap-4">
                <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-xl" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-200">{member.name}</span>
                    {member.id === project.owner_id && (
                      <span className="badge bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 text-xs">
                        <Crown size={10} /> Owner
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">{member.email}</p>
                </div>
                <span className={`badge text-xs ${member.role === 'admin'
                  ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                  : 'bg-surface-3 text-slate-400'}`}>
                  {member.role}
                </span>
                {isAdmin && member.id !== user.id && member.id !== project.owner_id && (
                  <button onClick={() => removeMemberMut.mutate(member.id)}
                    className="text-slate-600 hover:text-red-400 transition-colors p-1">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}

            {isAdmin && (
              <div className="pt-4 border-t border-white/5">
                {project?.owner_id === user.id && (
                  <button onClick={() => { if(confirm('Delete this entire project? This cannot be undone.')) deleteProjectMut.mutate(); }}
                    className="btn-danger text-sm">
                    <Trash2 size={15} /> Delete Project
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showCreateTask && (
        <TaskModal projectId={projectId} members={project?.members || []} onClose={() => setShowCreateTask(false)} />
      )}
      {showAddMember && <AddMemberModal projectId={projectId} onClose={() => setShowAddMember(false)} />}
    </div>
  );
}
