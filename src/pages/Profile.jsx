import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, Calendar, Key, Camera } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { refreshUser } = useAuth();
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    phone: '',
    dob: '',
    password: '',
    profile_photo: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = React.useRef(null);
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/profile');
      setProfile({
        ...res.data,
        password: '' // Don't pre-fill password
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const formData = new FormData();
      if (profile.full_name) formData.append('full_name', profile.full_name);
      if (profile.email) formData.append('email', profile.email);
      if (profile.phone) formData.append('phone', profile.phone);
      if (profile.dob) formData.append('dob', profile.dob);
      if (profile.password) formData.append('password', profile.password);
      if (selectedFile) formData.append('profile_photo', selectedFile);

      await api.put('/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await refreshUser();
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err?.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Loading profile...</div>;

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl">
        <div className="p-6 border-b border-slate-200 bg-white flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">My Profile</h1>
            <p className="text-sm text-slate-800">Manage your personal information and security.</p>
          </div>
          {message && (
            <div className={`text-sm px-3 py-1.5 font-medium ${message.includes('success') ? 'bg-white text-blue-600' : 'bg-white text-blue-600'}`}>
              {message}
            </div>
          )}
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="flex items-center gap-6 pb-6 border-b border-slate-200">
              <div 
                className="w-24 h-24 bg-white border border-slate-200 flex items-center justify-center relative overflow-hidden group rounded-full cursor-pointer flex-shrink-0"
                onClick={() => fileInputRef.current.click()}
              >
                {previewUrl || profile.profile_photo ? (
                  <img src={previewUrl || profile.profile_photo} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-slate-800" />
                )}
                <div className="absolute inset-0 bg-slate-800/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-800 mb-1">Profile Photo</label>
                <p className="text-xs text-slate-500 mb-2">Click the avatar to upload a new photo.</p>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1 flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-800" /> Full Name
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={profile.full_name || ''}
                  onChange={handleChange}
                  className="w-full border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-800" /> Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={profile.email || ''}
                  onChange={handleChange}
                  className="w-full border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                  readOnly // Usually email shouldn't be easily changed, but we allow it if they want
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-800" /> Phone Number
                </label>
                <input
                  type="text"
                  name="phone"
                  value={profile.phone || ''}
                  onChange={handleChange}
                  className="w-full border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-800" /> Date of Birth
                </label>
                <input
                  type="date"
                  name="dob"
                  value={profile.dob || ''}
                  onChange={handleChange}
                  className="w-full border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 mb-4">Security</h3>
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1 flex items-center gap-2">
                  <Key className="w-4 h-4 text-slate-800" /> New Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={profile.password}
                  onChange={handleChange}
                  placeholder="Leave blank to keep current password"
                  className="w-full md:w-1/2 border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="pt-6 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 text-sm font-semibold transition disabled:opacity-50"
              >
                {saving ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
