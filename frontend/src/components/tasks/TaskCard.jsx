import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';
import { formatDate, isOverdue, STATUS_CONFIG, PRIORITY_CONFIG } from '../../utils/helpers';
import { Calendar, MessageSquare, Trash2, User2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TaskCard({ task, projectId, projectRole, onEdit }) {
  const qc = useQueryClient();
  const sCfg = STATUS_CONFIG[task.status];
  const pCfg = PRIORITY_CONFIG[task.priority];
  const overdue = isOverdue(task.due_date);

  const deleteMut = useMutation({
    mutationFn: () => api.delete(`/projects/${projectId}/tasks/${task.id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries(['tasks', projectId]);
      qc.invalidateQueries(['dashboard']);
      toast.success('Task deleted');
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to delete'),
  });

  const statusMut = useMutation({
    mutationFn: (status) => api.put(`/projects/${projectId}/tasks/${task.id}`, { status }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries(['tasks', projectId]),
  });

  const handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Delete this task?')) deleteMut.mutate();
  };

  const handleStatusCycle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const order = ['todo', 'in_progress', 'review', 'done'];
    const next = order[(order.indexOf(task.status) + 1) % order.length];
    statusMut.mutate(next);
  };

  return (
    <Link to={`/projects/${projectId}/tasks/${task.id}`}
      className="card-hover p-4 flex flex-col gap-3 group cursor-pointer">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={handleStatusCycle} title="Cycle status"
          className={`mt-0.5 text-lg leading-none flex-shrink-0 hover:scale-110 transition-transform ${sCfg?.color}`}>
          {sCfg?.icon}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium group-hover:text-white transition-colors leading-snug
            ${task.status === 'done' ? 'line-through text-slate-500' : 'text-slate-200'}`}>
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.description}</p>
          )}
        </div>
      </div>

      {/* Tags */}
      {task.tags?.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {task.tags.map(tag => (
            <span key={tag} className="badge bg-surface-3 text-slate-400 text-xs">{tag}</span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`badge border text-xs ${pCfg?.color} ${pCfg?.bg} ${pCfg?.border}`}>
          {pCfg?.label}
        </span>

        {task.due_date && (
          <span className={`flex items-center gap-1 text-xs ${overdue ? 'text-red-400' : 'text-slate-500'}`}>
            <Calendar size={11} />
            {formatDate(task.due_date)}
          </span>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {task.comment_count > 0 && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <MessageSquare size={11} />
              {task.comment_count}
            </span>
          )}

          {task.assignee_avatar ? (
            <img src={task.assignee_avatar} alt={task.assignee_name}
              title={task.assignee_name} className="w-5 h-5 rounded-full" />
          ) : task.assignee_name ? (
            <div className="w-5 h-5 rounded-full bg-brand-500/30 flex items-center justify-center" title={task.assignee_name}>
              <User2 size={10} className="text-brand-300" />
            </div>
          ) : null}

          <button onClick={handleDelete}
            className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-0.5">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </Link>
  );
}
