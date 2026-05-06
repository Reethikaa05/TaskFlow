import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from 'date-fns';

export const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20', dot: 'bg-red-400' },
  high:   { label: 'High',   color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20', dot: 'bg-orange-400' },
  medium: { label: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20', dot: 'bg-yellow-400' },
  low:    { label: 'Low',    color: 'text-green-400',  bg: 'bg-green-400/10',  border: 'border-green-400/20',  dot: 'bg-green-400' },
};

export const STATUS_CONFIG = {
  todo:        { label: 'To Do',       color: 'text-slate-400',  bg: 'bg-slate-400/10',  border: 'border-slate-400/20',  icon: '○' },
  in_progress: { label: 'In Progress', color: 'text-blue-400',   bg: 'bg-blue-400/10',   border: 'border-blue-400/20',   icon: '◑' },
  review:      { label: 'Review',      color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20', icon: '◕' },
  done:        { label: 'Done',        color: 'text-green-400',  bg: 'bg-green-400/10',  border: 'border-green-400/20',  icon: '●' },
};

export const PROJECT_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#ef4444','#f97316',
  '#eab308','#22c55e','#14b8a6','#0ea5e9','#64748b',
];

export function formatDate(date) {
  if (!date) return null;
  const d = new Date(date);
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'MMM d, yyyy');
}

export function formatRelative(date) {
  if (!date) return '';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function isOverdue(date) {
  if (!date) return false;
  const d = new Date(date);
  return isPast(d) && !isToday(d);
}

export function getInitials(name) {
  return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function getErrorMessage(err) {
  if (err?.response?.data?.errors?.length) {
    return err.response.data.errors[0].msg;
  }
  return err?.response?.data?.error || 'Something went wrong';
}
