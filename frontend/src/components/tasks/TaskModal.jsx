import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';
import { getErrorMessage, STATUS_CONFIG, PRIORITY_CONFIG } from '../../utils/helpers';
import { X, Loader2, Tag, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TaskModal({ projectId, members = [], onClose, task = null }) {
  const qc = useQueryClient();
  const isEdit = !!task;

  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    assignee_id: task?.assignee_id || '',
    due_date: task?.due_date || '',
    tags: task?.tags || [],
  });
  const [tagInput, setTagInput] = useState('');

  const mut = useMutation({
    mutationFn: (data) => isEdit
      ? api.put(`/projects/${projectId}/tasks/${task.id}`, data).then(r => r.data)
      : api.post(`/projects/${projectId}/tasks`, data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries(['tasks', projectId]);
      qc.invalidateQueries(['dashboard']);
      toast.success(isEdit ? 'Task updated!' : 'Task created!');
      onClose();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) {
      setForm(p => ({ ...p, tags: [...p.tags, t] }));
    }
    setTagInput('');
  };

  const removeTag = (tag) => setForm(p => ({ ...p, tags: p.tags.filter(t => t !== tag) }));

  const handleSubmit = (e) => {
    e.preventDefault();
    mut.mutate({ ...form, assignee_id: form.assignee_id || null });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">{isEdit ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} className="btn-ghost p-1"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input className="input" required value={form.title} maxLength={200}
              placeholder="What needs to be done?" onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={3} value={form.description} maxLength={2000}
              placeholder="Add more details..." onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select className="input" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Assignee</label>
              <select className="input" value={form.assignee_id} onChange={e => setForm(p => ({ ...p, assignee_id: e.target.value }))}>
                <option value="">Unassigned</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Due Date</label>
              <input type="date" className="input" value={form.due_date}
                onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="label">Tags</label>
            <div className="flex gap-2">
              <input className="input" value={tagInput} placeholder="Add tag..."
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} />
              <button type="button" onClick={addTag} className="btn-secondary px-3">
                <Plus size={16} />
              </button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mt-2">
                {form.tags.map(tag => (
                  <span key={tag} className="badge bg-surface-3 text-slate-300 gap-1.5">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-400 transition-colors">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={mut.isPending} className="btn-primary flex-1 justify-center">
              {mut.isPending ? <Loader2 size={16} className="animate-spin" /> : (isEdit ? 'Update Task' : 'Create Task')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
