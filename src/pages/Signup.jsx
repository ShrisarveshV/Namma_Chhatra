import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, User, ArrowRight } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo-removebg-preview.png';

export default function Signup() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'TEACHER'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await api.post('/signup', {
        email: formData.email,
        full_name: formData.fullName,
        role: formData.role,
        password: formData.password
      });

      const loginResult = await login(formData.email, formData.password);
      if (!loginResult.success) {
        throw new Error(loginResult.message || 'Login failed after signup.');
      }

      navigate('/dashboard');
      
    } catch (err) {
      console.error(err);
      let errorMessage = "Failed to sign up. Please try again.";
      if (err.response && err.response.data && err.response.data.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-white font-sans">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2 flex flex-col items-center">
          <Link to="/" className="inline-block mb-2">
            <img src={logo} alt="Namma Chhatra Logo" className="h-20 w-auto object-contain" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Create an Account</h1>
          <p className="text-xs text-slate-800">Join the Namma Chhatra Network</p>
        </div>

        <div className="bg-white p-6 sm:p-8 border border-slate-200 shadow-sm rounded-xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider mb-1.5">Full Name</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  placeholder="John Doe"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 pl-10"
                />
                <User className="w-4 h-4 text-slate-800 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider mb-1.5">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="name@school.edu"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 pl-10"
                />
                <Mail className="w-4 h-4 text-slate-800 absolute left-3.5 top-3" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="••••••••"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 pl-10"
                  />
                  <Lock className="w-4 h-4 text-slate-800 absolute left-3.5 top-3" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider mb-1.5">Confirm</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    placeholder="••••••••"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 pl-10"
                  />
                  <Lock className="w-4 h-4 text-slate-800 absolute left-3.5 top-3" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider mb-1.5">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option value="TEACHER">Teacher</option>
                <option value="HEADMASTER">Headmaster</option>
              </select>
            </div>

            {error && (
              <div className="p-3 bg-white border border-slate-200 text-blue-600 text-xs rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition rounded-xl disabled:opacity-50 mt-2"
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="text-center text-sm text-slate-800">
            Already have an account? <Link to="/login" className="text-blue-600 font-semibold hover:underline">Log in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
