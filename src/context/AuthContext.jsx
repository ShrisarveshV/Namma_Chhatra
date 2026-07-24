import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedToken = localStorage.getItem('nammachhatra_token');
        if (savedToken) {
          setToken(savedToken);
          api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
          await fetchUserProfile(savedToken);
        }
      } catch (err) {
        console.warn('Auth init warning:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const fetchUserProfile = async (accessToken = null) => {
    try {
      const activeToken = accessToken || token || localStorage.getItem('nammachhatra_token');
      if (!activeToken) return;

      api.defaults.headers.common['Authorization'] = `Bearer ${activeToken}`;

      const response = await api.get('/auth/me');
      setUser({
        id: response.data.user_id,
        email: response.data.email,
        full_name: response.data.full_name,
        role: response.data.role
      });
    } catch (err) {
      console.error('Error setting user profile:', err);
      setUser(null);
      setToken(null);
      localStorage.removeItem('nammachhatra_token');
      delete api.defaults.headers.common['Authorization'];
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('/login', { email, password });
      const accessToken = response.data.access_token;

      localStorage.setItem('nammachhatra_token', accessToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      setToken(accessToken);

      setUser({
        id: response.data.user_id,
        email: response.data.email,
        full_name: response.data.full_name,
        role: response.data.role
      });

      return { success: true };
    } catch (err) {
      return { success: false, message: err?.response?.data?.detail || err.message || 'Login failed.' };
    }
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('nammachhatra_token');
    delete api.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser: fetchUserProfile }}>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center bg-white text-slate-800 font-sans">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            Loading Namma Chhatra...
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
