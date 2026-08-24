import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Lock, Mail } from 'lucide-react';
import { db } from '../lib/db';
import { useAuthStore } from '../lib/store';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('admin@thirdeye.com');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const users = await db.users.getAll();
      const user = users.find(u => u.email === email);
      
      // Mock password check
      if (user && password) {
        if (!user.isActive) {
          setError('Your account is inactive. Please contact administrator.');
        } else {
          login(user);
          navigate('/');
        }
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-bg-panel rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-3">
              <Eye className="w-10 h-10 text-accent-600" />
              <span className="text-3xl font-bold text-text-base tracking-wider">THIRD EYE</span>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-text-base mb-2 text-center">Welcome Back</h2>
          <p className="text-text-muted text-center mb-8">Sign in to access the ERP dashboard</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-text-base mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-border-subtle rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-text-base">Password</label>
                <a href="#" className="text-sm text-accent-600 hover:text-accent-700 font-medium">Forgot?</a>
              </div>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-border-subtle rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500 outline-none transition-all"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent-600 text-white font-medium py-2.5 rounded-lg hover:bg-accent-700 focus:ring-4 focus:ring-accent-200 transition-all disabled:opacity-70"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
        <div className="px-8 py-4 bg-bg-base border-t border-slate-100 text-center">
          <p className="text-sm text-text-muted">
            Don't have an account? <a href="#" className="text-accent-600 font-medium hover:underline">Contact Admin</a>
          </p>
        </div>
      </div>
    </div>
  );
};
