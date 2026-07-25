import React, { useState, useEffect } from 'react';
import { Bell, LogOut, User, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import logo from '../assets/logo-removebg-preview.png';
import { useTranslation } from 'react-i18next';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(newLang);
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications/');
      setNotifications(res.data);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  };

  const unreadCount = notifications.filter(n => n.is_read === 0).length;

  return (
    <nav className="bg-white px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm font-sans">
      <div className="flex items-center gap-3">
        <div className="hidden sm:block">
          <img src={logo} alt="Namma Chhatra Logo" className="h-10 w-auto object-contain" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-slate-800 tracking-tight leading-none">Namma Chhatra</h1>
          <div className="hidden md:flex flex-col text-xs text-slate-500 font-medium tracking-wide">
            {t('navbar.tagline', 'Learning Never Exhausts The Mind')}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4 sm:gap-6 relative">
        <button
          onClick={toggleLanguage}
          className="relative px-3 py-1 text-sm font-bold text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all border border-slate-200"
          title="Toggle Language"
        >
          {i18n.language === 'en' ? 'A/अ' : 'अ/A'}
        </button>

        <button 
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-full transition-all duration-300"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-blue-600 rounded-full text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
              {unreadCount}
            </span>
          )}
        </button>
        
        {/* Notifications Dropdown */}
        {showNotifications && (
          <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-slate-100 shadow-lg z-50 rounded-2xl overflow-hidden">
            <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-sm text-slate-800">{t('navbar.notifications', 'Notifications')}</h3>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:underline font-semibold">
                  {t('navbar.mark_all_read', 'Mark all read')}
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">{t('navbar.no_notifications', 'No notifications')}</div>
              ) : (
                notifications.map((notif) => (
                  <div key={notif.id} className={`p-4 border-b border-slate-50 last:border-b-0 transition-colors ${notif.is_read === 0 ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">{notif.title}</h4>
                        <p className="text-xs text-slate-500 mt-1">{notif.message}</p>
                      </div>
                      {notif.is_read === 0 && (
                        <button onClick={() => markAsRead(notif.id)} className="text-slate-400 hover:text-blue-600" title="Mark as read">
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-3 pl-4 sm:pl-6 border-l border-slate-200">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-bold text-slate-800">{t('navbar.welcome', 'Welcome')}, {user?.full_name || 'User'}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
            <User className="w-5 h-5" />
          </div>
          <button 
            onClick={logout}
            className="ml-2 p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-all duration-300"
            title={t('navbar.sign_out', 'Sign Out')}
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>
  );
}
