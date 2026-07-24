import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, BarChart3, BookOpen,
  ShieldAlert, Search, Bell, UserCheck, User, LogOut, CalendarCheck, Cpu,
  HeartHandshake, ClipboardCheck
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Sidebar({ role }) {
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
      { path: '/dashboard/overview',              label: 'Dashboard',           icon: LayoutDashboard },
      { path: '/dashboard/mark-attendance',       label: 'Mark Attendance',     icon: ClipboardCheck },
      { path: '/dashboard/attendance-management', label: "Attendance Records",  icon: CalendarCheck },
      { path: '/dashboard/students',              label: 'Student Management',  icon: Users },
      { path: '/dashboard/high-risk',             label: 'High Risk Students',  icon: ShieldAlert },
      { path: '/dashboard/counseling',            label: 'Counseling Roster',   icon: HeartHandshake },
      { path: '/dashboard/ai-analysis',           label: 'AI Analysis',         icon: Cpu },
      { path: '/dashboard/analytics',             label: 'Attendance Graph',    icon: BarChart3 },
      { path: '/dashboard/notifications',         label: 'Notifications',       icon: Bell, badge: true },
    ],
    HEADMASTER: [
      { path: '/dashboard/overview',              label: 'Dashboard',            icon: LayoutDashboard },
      { path: '/dashboard/students',              label: 'Students',             icon: Users },
      { path: '/dashboard/teachers',              label: 'Teachers',             icon: UserCheck },
      { path: '/dashboard/classes',               label: 'Classes & Sections',   icon: BookOpen },
      { path: '/dashboard/attendance-management', label: 'Attendance',           icon: CalendarCheck },
      { path: '/dashboard/analytics',             label: 'Analytics',            icon: BarChart3 },
      { path: '/dashboard/high-risk',             label: 'High Risk Students',   icon: ShieldAlert },
      { path: '/dashboard/counseling',            label: 'Counseling Roster',    icon: HeartHandshake },
      { path: '/dashboard/ai-analysis',           label: 'AI Analysis',          icon: Cpu },
      { path: '/dashboard/notifications',         label: 'Notifications',        icon: Bell, badge: true },
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
              <span className="flex-1">Profile</span>
            </>
          )}
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all duration-300"
        >
          <LogOut className="w-5 h-5 flex-shrink-0 text-slate-400 group-hover:text-red-600" />
          <span className="flex-1 text-left">Logout</span>
        </button>
      </div>
    </aside>
  );
}
