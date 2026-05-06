import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { STATUS_CONFIG, PRIORITY_CONFIG, formatDate, formatRelative, isOverdue, getErrorMessage } from '../utils/helpers';
import TaskModal from '../components/tasks/TaskModal';
import { ArrowLeft, Edit2, Trash2, Send, Loader2, Calendar, User2, Tag, MessageSquare, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TaskDetailPage() {
  const { projectId, taskId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [comment, setComment] = useState('');

  const { data: projectData } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get(`/projects/${projectId}`).then(r => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => api.get(`/projects/${projectId}/tasks/${taskId}`).then(r => r.data),
  });

  const deleteMut = useMutation({
    mutationFn: () => api.delete(`/projects/${projectId}/tasks/${taskId}`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries(['tasks', projectId]); toast.success('Task deleted'); navigate(`/projects/${projectId}`); },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const commentMut = useMutation({
    mutationFn: () => api.post(`/projects/${projectId}/tasks/${taskId}/comments`, { content: comment }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries(['task', taskId]); setComment(''); toast.success('Comment added'); },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteCommentMut = useMutation({
    mutationFn: (cId) => api.delete(`/projects/${projectId}/tasks/${taskId}/comments/${cId}`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries(['task', taskId]),
  });

  const statusMut = useMutation({
    mutationFn: (status) => api.put(`/projects/${projectId}/tasks/${taskId}`, { status }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries(['task', taskId]); qc.invalidateQueries(['tasks', projectId]); },
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
    </div>
  );

  const { task } = data || {};
  const project = projectData?.project;
  const sCfg = STATUS_CONFIG[task?.status];
  const pCfg = PRIORITY_CONFIG[task?.priority];
  const overdue = isOverdue(task?.due_date);

  return (
    <div className="max-w-3xl mx-auto p-8 animate-fade-in">
      {/* Back */}
      <button onClick={() => navigate(`/projects/${projectId}`)}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm mb-6 transition-colors">
        <ArrowLeft size={16} /> Back to {project?.name}
      </button>

      <div className="card p-6 mb-5">
        {/* Header */}
        <div className="flex items-start gap-4 mb-5">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`badge border text-xs ${pCfg?.color} ${pCfg?.bg} ${pCfg?.border}`}>{pCfg?.label}</span>
              <span className={`badge border text-xs ${sCfg?.color} ${sCfg?.bg} ${sCfg?.border}`}>{sCfg?.label}</span>
            </div>
            <h1 className="text-2xl font-bold text-white">{task?.title}</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowEdit(true)} className="btn-secondary text-sm py-1.5">
              <Edit2 size={14} /> Edit
            </button>
            <button onClick={() => { if(confirm('Delete this task?')) deleteMut.mutate(); }}
              className="btn-danger text-sm py-1.5">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {task?.description && (
          <p className="text-slate-400 leading-relaxed mb-5 whitespace-pre-wrap">{task.description}</p>
        )}

        {/* Meta */}
        <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-white/5 mb-4">
          <div>
            <p className="text-xs text-slate-600 uppercase tracking-wider mb-1.5">Status</p>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(STATUS_CONFIG).map(([s, c]) => (
                <button key={s} onClick={() => statusMut.mutate(s)}
                  className={`badge border text-xs cursor-pointer transition-all ${
                    task?.status === s
                      ? `${c.color} ${c.bg} ${c.border} ring-1 ring-current`
                      : 'text-slate-600 bg-surface-3 border-white/5 hover:border-white/10'
                  }`}>
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-600 uppercase tracking-wider mb-1.5">Assignee</p>
            {task?.assignee_name ? (
              <div className="flex items-center gap-2">
                <img src={task.assignee_avatar} alt={task.assignee_name} className="w-6 h-6 rounded-full" />
                <span className="text-sm text-slate-300">{task.assignee_name}</span>
              </div>
            ) : <span className="text-sm text-slate-500">Unassigned</span>}
          </div>

          <div>
            <p className="text-xs text-slate-600 uppercase tracking-wider mb-1.5">Due Date</p>
            {task?.due_date ? (
              <span className={`text-sm font-medium ${overdue ? 'text-red-400' : 'text-slate-300'}`}>
                {formatDate(task.due_date)}
                {overdue && ' (Overdue)'}
              </span>
            ) : <span className="text-sm text-slate-500">No due date</span>}
          </div>

          <div>
            <p className="text-xs text-slate-600 uppercase tracking-wider mb-1.5">Created by</p>
            <div className="flex items-center gap-2">
              <img src={task?.created_by_avatar} alt={task?.created_by_name} className="w-6 h-6 rounded-full" />
              <span className="text-sm text-slate-300">{task?.created_by_name}</span>
            </div>
          </div>
        </div>

        {/* Tags */}
        {task?.tags?.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {task.tags.map(tag => (
              <span key={tag} className="badge bg-surface-3 text-slate-400">{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Comments */}
      <div className="card p-6">
        <h2 className="font-semibold text-slate-200 mb-5 flex items-center gap-2">
          <MessageSquare size={16} className="text-slate-500" />
          Comments ({task?.comments?.length || 0})
        </h2>

        {task?.comments?.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">No comments yet. Be the first to comment.</p>
        ) : (
          <div className="space-y-4 mb-5">
            {task.comments.map(c => (
              <div key={c.id} className="flex gap-3">
                <img src={c.user_avatar} alt={c.user_name} className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-slate-300">{c.user_name}</span>
                    <span className="text-xs text-slate-600">{formatRelative(c.created_at)}</span>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">{c.content}</p>
                </div>
                {(c.user_id === user.id || project?.my_role === 'admin') && (
                  <button onClick={() => deleteCommentMut.mutate(c.id)}
                    className="text-slate-700 hover:text-red-400 transition-colors flex-shrink-0 p-1">
                    <X size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-white/5">
          <img src={user?.avatar} alt={user?.name} className="w-7 h-7 rounded-full flex-shrink-0" />
          <div className="flex-1 flex gap-2">
            <textarea
              value={comment} onChange={e => setComment(e.target.value)}
              placeholder="Add a comment..."
              className="input resize-none text-sm py-2" rows={2}
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) { e.preventDefault(); if(comment.trim()) commentMut.mutate(); } }}
            />
            <button onClick={() => { if(comment.trim()) commentMut.mutate(); }}
              disabled={!comment.trim() || commentMut.isPending} className="btn-primary px-3 self-end">
              {commentMut.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>

      {showEdit && (
        <TaskModal projectId={projectId} members={project?.members || []} task={task}
          onClose={() => { setShowEdit(false); qc.invalidateQueries(['task', taskId]); }} />
      )}
    </div>
  );
}
