import React, { useState } from 'react';
import { Shield, Lock, Mail, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo-removebg-preview.png';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    const res = await login(email, password);
    setLoading(false);
    if (!res.success) {
      setError(res.message || "Failed to authenticate");
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-white relative font-sans">
      <div className="w-full max-w-md space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2 flex flex-col items-center">
          <Link to="/" className="inline-block mb-2">
            <img src={logo} alt="Namma Chhatra Logo" className="h-20 w-auto object-contain" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Namma Chhatra</h1>
          <p className="text-xs text-slate-800 mt-2">
            Sign in to your account
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white p-6 sm:p-8 border border-slate-200 shadow-sm rounded-xl space-y-6">
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider mb-1.5">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="name@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 pl-10 transition"
                />
                <Mail className="w-4 h-4 text-slate-800 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 pl-10 transition"
                />
                <Lock className="w-4 h-4 text-slate-800 absolute left-3.5 top-3" />
              </div>
            </div>

            {error && (
               <div className="p-3 bg-white border border-slate-200 text-blue-600 text-xs rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition rounded-xl disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="text-center text-sm text-slate-800 pt-4 border-t border-slate-200">
            Don't have an account? <Link to="/signup" className="text-blue-600 font-semibold hover:underline">Sign up</Link>
          </div>

        </div>

        <p className="text-center text-xs text-slate-800">
          Namma Chhatra • Learning never exhausts the mind.
        </p>

      </div>
    </div>
  );
}
