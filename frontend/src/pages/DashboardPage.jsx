import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatRelative, isOverdue, STATUS_CONFIG, PRIORITY_CONFIG } from '../utils/helpers';
import {
  FolderKanban, CheckCircle2, Clock, AlertTriangle, TrendingUp,
  ArrowRight, Calendar, User2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard/stats').then(r => r.data),
    refetchInterval: 60_000,
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
    </div>
  );

  const { stats, recentTasks = [], tasksByStatus = {}, tasksByPriority = {}, upcomingDeadlines = [], myTasks = [] } = data || {};

  const statusData = Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
    name: cfg.label, value: tasksByStatus[key] || 0
  }));

  const priorityData = Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => ({
    name: cfg.label, value: tasksByPriority[key] || 0, color: cfg.dot.replace('bg-','').replace('-400','')
  }));

  const statCards = [
    { label: 'Total Projects', value: stats?.totalProjects || 0, icon: FolderKanban, color: 'text-brand-400', bg: 'bg-brand-400/10' },
    { label: 'Total Tasks', value: stats?.totalTasks || 0, icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Completed', value: stats?.completedTasks || 0, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-400/10' },
    { label: 'Overdue', value: stats?.overdueTasks || 0, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-400/10' },
  ];

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-400 mt-1">Here's what's happening across your projects</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="stat-card animate-slide-up">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
              <s.icon size={20} className={s.color} />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks by Status Chart */}
        <div className="card p-5 lg:col-span-2">
          <h2 className="font-semibold text-slate-200 mb-4">Tasks by Status</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={statusData} barSize={28}>
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 13 }}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              />
              <Bar dataKey="value" radius={[6,6,0,0]}>
                {statusData.map((_, i) => (
                  <Cell key={i} fill={['#64748b','#3b82f6','#a855f7','#22c55e'][i]} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Upcoming Deadlines */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-200">Upcoming</h2>
            <Calendar size={16} className="text-slate-500" />
          </div>
          {upcomingDeadlines.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">No upcoming deadlines 🎉</p>
          ) : (
            <div className="space-y-3">
              {upcomingDeadlines.map(task => (
                <Link key={task.id} to={`/projects/${task.project_id}/tasks/${task.id}`}
                  className="block p-3 rounded-xl bg-surface-2 hover:bg-surface-3 transition-colors">
                  <p className="text-sm text-slate-200 font-medium line-clamp-1">{task.title}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-slate-500">{task.project_name}</span>
                    <span className="text-xs text-slate-600">·</span>
                    <span className={`text-xs font-medium ${isOverdue(task.due_date) ? 'text-red-400' : 'text-yellow-400'}`}>
                      {formatDate(task.due_date)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Tasks */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-200">My Tasks</h2>
            <span className="badge bg-brand-500/10 text-brand-400 border border-brand-500/20">{stats?.myTasks || 0}</span>
          </div>
          {myTasks.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">No tasks assigned to you</p>
          ) : (
            <div className="space-y-2">
              {myTasks.map(task => {
                const pCfg = PRIORITY_CONFIG[task.priority];
                const sCfg = STATUS_CONFIG[task.status];
                return (
                  <Link key={task.id} to={`/projects/${task.project_id}/tasks/${task.id}`}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-surface-2 transition-colors group">
                    <span className={`mt-0.5 text-lg leading-none ${sCfg?.color}`}>{sCfg?.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 font-medium group-hover:text-white truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500">{task.project_name}</span>
                        {task.due_date && (
                          <span className={`text-xs ${isOverdue(task.due_date) ? 'text-red-400' : 'text-slate-500'}`}>
                            · {formatDate(task.due_date)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`badge border text-xs ${pCfg?.color} ${pCfg?.bg} ${pCfg?.border}`}>
                      {pCfg?.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-200">Recent Tasks</h2>
            <Link to="/projects" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {recentTasks.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">No tasks yet. Create your first project!</p>
          ) : (
            <div className="space-y-2">
              {recentTasks.slice(0, 6).map(task => {
                const sCfg = STATUS_CONFIG[task.status];
                return (
                  <Link key={task.id} to={`/projects/${task.project_id}/tasks/${task.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-2 transition-colors group">
                    <span className={`text-lg leading-none ${sCfg?.color}`}>{sCfg?.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 font-medium truncate group-hover:text-white">{task.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{task.project_name} · {formatRelative(task.updated_at)}</p>
                    </div>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: task.project_color }} />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
