import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, BarChart3, BookOpen,
  ShieldAlert, Search, Bell, UserCheck, User, LogOut, CalendarCheck, Cpu,
  HeartHandshake, ClipboardCheck
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

export default function Sidebar({ role }) {
  const { t } = useTranslation();
  const [unreadCount, setUnreadCount] = useState(0);
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/notifications/');
        setUnreadCount(res.data.filter(n => !n.is_read).length);
      } catch {}
    };
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navByRole = {
    TEACHER: [
      { path: '/dashboard/overview',              label: t('sidebar.dashboard', 'Dashboard'),           icon: LayoutDashboard },
      { path: '/dashboard/mark-attendance',       label: t('sidebar.mark_attendance', 'Mark Attendance'),     icon: ClipboardCheck },
      { path: '/dashboard/attendance-management', label: t('sidebar.attendance_records', 'Attendance Records'),  icon: CalendarCheck },
      { path: '/dashboard/students',              label: t('sidebar.student_management', 'Student Management'),  icon: Users },
      { path: '/dashboard/high-risk',             label: t('sidebar.high_risk', 'High Risk Students'),  icon: ShieldAlert },
      { path: '/dashboard/counseling',            label: t('sidebar.counseling_roster', 'Counseling Roster'),   icon: HeartHandshake },
      { path: '/dashboard/ai-analysis',           label: t('sidebar.ai_analysis', 'AI Analysis'),         icon: Cpu },
      { path: '/dashboard/analytics',             label: t('sidebar.attendance_graph', 'Attendance Graph'),    icon: BarChart3 },
      { path: '/dashboard/notifications',         label: t('sidebar.notifications', 'Notifications'),       icon: Bell, badge: true },
    ],
    HEADMASTER: [
      { path: '/dashboard/overview',              label: t('sidebar.dashboard', 'Dashboard'),            icon: LayoutDashboard },
      { path: '/dashboard/students',              label: t('sidebar.students', 'Students'),             icon: Users },
      { path: '/dashboard/teachers',              label: t('sidebar.teachers', 'Teachers'),             icon: UserCheck },
      { path: '/dashboard/classes',               label: t('sidebar.classes', 'Classes & Sections'),   icon: BookOpen },
      { path: '/dashboard/attendance-management', label: t('sidebar.attendance', 'Attendance'),           icon: CalendarCheck },
      { path: '/dashboard/analytics',             label: t('sidebar.analytics', 'Analytics'),            icon: BarChart3 },
      { path: '/dashboard/high-risk',             label: t('sidebar.high_risk', 'High Risk Students'),   icon: ShieldAlert },
      { path: '/dashboard/counseling',            label: t('sidebar.counseling_roster', 'Counseling Roster'),    icon: HeartHandshake },
      { path: '/dashboard/ai-analysis',           label: t('sidebar.ai_analysis', 'AI Analysis'),          icon: Cpu },
      { path: '/dashboard/notifications',         label: t('sidebar.notifications', 'Notifications'),        icon: Bell, badge: true },
    ],
  };

  const navItems = navByRole[role] || navByRole.TEACHER;

  return (
    <aside className="w-64 bg-white p-4 flex flex-col justify-between hidden md:flex sticky top-[65px] h-[calc(100vh-65px)] overflow-y-auto shadow-sm">
      <div>
        <nav className="space-y-1.5 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-300 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && unreadCount > 0 && (
                      <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-sm">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 mt-4 border-t border-slate-100 space-y-1.5">
        <NavLink
          to="/dashboard/profile"
          className={({ isActive }) =>
            `w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-300 ${
              isActive
                ? 'bg-blue-50 text-blue-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <User className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              <span className="flex-1">{t('sidebar.profile', 'Profile')}</span>
            </>
          )}
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all duration-300"
        >
          <LogOut className="w-5 h-5 flex-shrink-0 text-slate-400 group-hover:text-red-600" />
          <span className="flex-1 text-left">{t('sidebar.logout', 'Logout')}</span>
        </button>
      </div>
    </aside>
  );
}
