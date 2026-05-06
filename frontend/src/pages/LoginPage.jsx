import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../utils/helpers';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 60%)' }}>
      <div className="w-full max-w-md animate-fade-in">
        {/* Brand */}
        <div className="flex items-center gap-2.5 mb-10 justify-center">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/30">
            <Zap size={20} className="text-white" />
          </div>
          <span className="font-bold text-2xl text-white tracking-tight">TaskFlow</span>
        </div>

        <div className="card p-8">
          <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-slate-400 text-sm mb-8">Sign in to your workspace</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="email" required value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className="input pl-10" placeholder="you@company.com" />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="password" required value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className="input pl-10" placeholder="••••••••" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base mt-2">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <>Sign in <ArrowRight size={16} /></>}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
              Sign up free
            </Link>
          </p>
        </div>

        {/* Demo hint */}
        <div className="mt-6 relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-500/20 to-purple-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all opacity-50"></div>
          <div className="relative p-5 rounded-2xl bg-surface-1/80 backdrop-blur-md border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-purple-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse"></span>
                Demo Accounts
              </p>
              <span className="text-[10px] font-mono bg-white/5 text-slate-400 px-2.5 py-1 rounded-md border border-white/5">
                PW: password123
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/[0.03] p-3 rounded-xl border border-white/[0.05] hover:bg-white/[0.06] hover:border-amber-500/30 transition-all">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs">👑</span>
                  <span className="text-[10px] text-amber-500/80 uppercase font-bold tracking-wider">Admin</span>
                </div>
                <p className="text-sm font-medium text-slate-200">admin@demo.com</p>
              </div>
              <div className="bg-white/[0.03] p-3 rounded-xl border border-white/[0.05] hover:bg-white/[0.06] hover:border-blue-500/30 transition-all">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs">👤</span>
                  <span className="text-[10px] text-blue-500/80 uppercase font-bold tracking-wider">Member</span>
                </div>
                <p className="text-sm font-medium text-slate-200">bob@demo.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
