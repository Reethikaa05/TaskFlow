import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { formatDate, PROJECT_COLORS, getErrorMessage } from '../utils/helpers';
import { Plus, FolderKanban, Users, CheckSquare, ArrowRight, Loader2, X, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

function CreateProjectModal({ onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', description: '', color: PROJECT_COLORS[0], due_date: '' });
  const mut = useMutation({
    mutationFn: (data) => api.post('/projects', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries(['projects']);
      qc.invalidateQueries(['dashboard']);
      toast.success('Project created!');
      onClose();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal p-6 max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">New Project</h2>
          <button onClick={onClose} className="btn-ghost p-1"><X size={18} /></button>
        </div>

        <form onSubmit={e => { e.preventDefault(); mut.mutate(form); }} className="space-y-4">
          <div>
            <label className="label">Project Name *</label>
            <input className="input" required value={form.name} placeholder="My Awesome Project"
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} maxLength={100} />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={3} value={form.description}
              placeholder="What's this project about?"
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))} maxLength={500} />
          </div>

          <div>
            <label className="label">Color</label>
            <div className="flex gap-2 flex-wrap">
              {PROJECT_COLORS.map(c => (
                <button key={c} type="button"
                  onClick={() => setForm(p => ({ ...p, color: c }))}
                  className={`w-7 h-7 rounded-lg transition-all ${form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-surface-1 scale-110' : 'hover:scale-105'}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>

          <div>
            <label className="label">Due Date</label>
            <input type="date" className="input" value={form.due_date}
              onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={mut.isPending} className="btn-primary flex-1 justify-center">
              {mut.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProjectCard({ project }) {
  return (
    <Link to={`/projects/${project.id}`}
      className="card-hover p-5 flex flex-col gap-4 group animate-slide-up cursor-pointer">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: project.color + '20' }}>
            <div className="w-4 h-4 rounded-md" style={{ background: project.color }} />
          </div>
          <div>
            <h3 className="font-semibold text-white group-hover:text-brand-300 transition-colors">{project.name}</h3>
            <p className="text-xs text-slate-500 capitalize">{project.status}</p>
          </div>
        </div>
        <span className={`badge text-xs px-2 py-0.5 ${project.my_role === 'admin' ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20' : 'bg-surface-3 text-slate-400'}`}>
          {project.my_role}
        </span>
      </div>

      {project.description && (
        <p className="text-sm text-slate-500 line-clamp-2">{project.description}</p>
      )}

      {/* Progress */}
      <div>
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
          <span>{project.done_count}/{project.task_count} tasks</span>
          <span>{project.progress}%</span>
        </div>
        <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${project.progress}%`, background: project.color }} />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <Users size={12} />
          <span>{project.member_count} member{project.member_count !== 1 ? 's' : ''}</span>
        </div>
        {project.due_date && (
          <div className="flex items-center gap-1.5">
            <Calendar size={12} />
            <span>{formatDate(project.due_date)}</span>
          </div>
        )}
        <ArrowRight size={14} className="text-slate-600 group-hover:text-brand-400 transition-colors" />
      </div>
    </Link>
  );
}

export default function ProjectsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then(r => r.data),
  });

  const projects = data?.projects || [];
  const active = projects.filter(p => p.status === 'active');
  const archived = projects.filter(p => p.status !== 'active');

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-slate-400 mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''} total</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={18} /> New Project
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 bg-surface-2 rounded-2xl flex items-center justify-center">
            <FolderKanban size={28} className="text-slate-600" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-slate-300">No projects yet</h3>
            <p className="text-slate-500 text-sm mt-1">Create your first project to get started</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary mt-2">
            <Plus size={16} /> Create Project
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {active.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">Active ({active.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {active.map(p => <ProjectCard key={p.id} project={p} />)}
              </div>
            </div>
          )}
          {archived.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">Archived / Completed ({archived.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 opacity-60">
                {archived.map(p => <ProjectCard key={p.id} project={p} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
