import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, RefreshCw, AlertCircle, ShieldAlert, UserPlus, BookOpen, CheckCircle } from 'lucide-react';
import api from '../services/api';

const TYPE_ICON = {
  'High Risk':    { icon: ShieldAlert, color: 'text-blue-600',    bg: 'bg-white' },
  'New Student':  { icon: UserPlus,    color: 'text-blue-500',   bg: 'bg-blue-50' },
  'New Teacher':  { icon: BookOpen,    color: 'text-indigo-500', bg: 'bg-indigo-50' },
  'default':      { icon: Bell,        color: 'text-slate-800',  bg: 'bg-white' },
};

function timeAgo(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60)  return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getIcon(title) {
  const key = Object.keys(TYPE_ICON).find(k => title?.includes(k));
  return TYPE_ICON[key] || TYPE_ICON.default;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications/');
      setNotifications(res.data);
    } catch {
      setError('Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {}
  };

  const deleteNotif = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch {}
  };

  const displayed = filter === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <span className="bg-slate-800 text-white text-xs font-bold px-2 py-0.5 min-w-[22px] text-center">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-800 mt-0.5">{notifications.length} total, {unreadCount} unread</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-800 text-sm font-semibold hover:bg-white transition">
              <CheckCircle className="w-4 h-4" /> Mark all read
            </button>
          )}
          <button onClick={load} className="p-2 border border-slate-200 text-slate-800 hover:bg-white transition">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-slate-200">
        {[['all', 'All'], ['unread', 'Unread']].map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition ${
              filter === key
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-800 hover:text-slate-800'
            }`}>
            {label}
            {key === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 bg-slate-800 text-white text-[10px] font-bold px-1.5 py-0.5">{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      {loading ? (
        <div className="py-12 flex items-center justify-center gap-2 text-slate-800 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" /> Loading...
        </div>
      ) : error ? (
        <div className="py-10 flex flex-col items-center text-blue-600 gap-2">
          <AlertCircle className="w-6 h-6" /><span className="text-sm">{error}</span>
        </div>
      ) : displayed.length === 0 ? (
        <div className="bg-white border border-slate-200 py-14 text-center">
          <Bell className="w-10 h-10 text-slate-800 mx-auto mb-2" />
          <p className="text-slate-800 text-sm">
            {filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map(n => {
            const { icon: Icon, color, bg } = getIcon(n.title);
            return (
              <div key={n.id}
                className={`bg-white border border-slate-200 flex items-start gap-4 px-5 py-4 transition ${!n.is_read ? 'border-l-4 border-l-blue-500' : ''}`}>
                <div className={`w-9 h-9 flex items-center justify-center flex-shrink-0 ${bg}`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={`text-sm font-bold ${!n.is_read ? 'text-slate-800' : 'text-slate-800'}`}>{n.title}</h3>
                    <span className="text-[11px] text-slate-500 flex-shrink-0">{timeAgo(n.created_at)}</span>
                  </div>
                  <p className="text-xs text-slate-800 mt-1 leading-relaxed">{n.message}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!n.is_read && (
                    <button onClick={() => markRead(n.id)} title="Mark as read"
                      className="p-1.5 border border-slate-200 text-slate-800 hover:text-blue-600 hover:border-slate-200 hover:bg-white transition">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={() => deleteNotif(n.id)} title="Delete"
                    className="p-1.5 border border-slate-200 text-slate-800 hover:text-blue-600 hover:border-slate-200 hover:bg-white transition">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
