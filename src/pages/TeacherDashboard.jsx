import React, { useState, useEffect } from 'react';
import { Users, AlertCircle, RefreshCw, BookOpen, UserMinus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import StudentDetailsModal from '../components/StudentDetailsModal';
import api from '../services/api';

export default function TeacherDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [isExplainModalOpen, setIsExplainModalOpen] = useState(false);
  
  // Filters
  const [targetClass, setTargetClass] = useState('');
  const [targetSection, setTargetSection] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [classesList, setClassesList] = useState([]);
  const [sectionsList, setSectionsList] = useState([]);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (targetClass) params.append('class', targetClass);
      if (targetSection) params.append('section', targetSection);
      if (filterDate) params.append('date', filterDate);
      
      const [res, classesRes, sectionsRes] = await Promise.all([
        api.get(`/teacher/dashboard?${params.toString()}`),
        api.get('/classes'),
        api.get('/sections')
      ]);
      setStats(res.data);
      if (classesList.length === 0) setClassesList(classesRes.data);
      if (sectionsList.length === 0) setSectionsList(sectionsRes.data);
    } catch (err) {
      setError(t('teacher.errors.fetch_failed', 'Failed to fetch teacher dashboard data.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [targetClass, targetSection, filterDate]);

  const openStudentDetails = (roll) => {
    const s = stats?.assigned_students?.find(x => x.roll === roll);
    if (s) {
      setSelectedStudentId(s.id);
      setIsExplainModalOpen(true);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-800">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" /> {t('teacher.loading', 'Loading Dashboard...')}
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-800">
        <AlertCircle className="w-12 h-12 text-slate-800 mb-3" />
        <p>{error}</p>
        <button onClick={fetchMetrics} className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-semibold">{t('teacher.retry', 'Retry')}</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Control bar ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <h2 className="font-bold text-slate-800 text-lg">{t('teacher.dashboard_title', 'My Class Dashboard')}</h2>
          <button onClick={fetchMetrics} className="p-1.5 bg-white hover:bg-white text-slate-800 transition border border-slate-200">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input 
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="bg-white border border-slate-200 rounded-full px-4 py-1.5 shadow-sm text-sm outline-none focus:border-slate-200 text-slate-800"
          />
          <select value={targetClass} onChange={(e) => setTargetClass(e.target.value)}
            className="bg-white border border-slate-200 rounded-full px-4 py-1.5 shadow-sm text-sm outline-none text-slate-800">
            <option value="">{t('teacher.filters.all_classes', 'All Classes')}</option>
            {classesList.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
          </select>
          <select value={targetSection} onChange={(e) => setTargetSection(e.target.value)}
            className="bg-white border border-slate-200 rounded-full px-4 py-1.5 shadow-sm text-sm outline-none text-slate-800">
            <option value="">{t('teacher.filters.all_sections', 'All Sections')}</option>
            {sectionsList.filter(s => !targetClass || s.class_id == targetClass).map(s => <option key={s.id} value={s.id}>{s.section_name}</option>)}
          </select>
        </div>
      </div>

      {/* ── KPI Cards (White Backgrounds, Black Text) ────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-800 uppercase tracking-wide">{t('teacher.kpi.total_assigned', 'Total Assigned')}</div>
            <div className="text-4xl font-bold text-slate-800 mt-1">{stats?.total_students ?? 0}</div>
            <div className="text-[11px] text-slate-500 mt-1">{t('teacher.kpi.assigned_desc', 'Students in your classes')}</div>
          </div>
          <div className="p-3 bg-white text-slate-800 border border-slate-200 rounded-xl"><Users className="w-6 h-6" /></div>
        </div>

        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-800 uppercase tracking-wide">{t('teacher.kpi.present_today', 'Present Today')}</div>
            <div className="text-4xl font-bold text-slate-800 mt-1">{stats?.present_today ?? 0}</div>
            <div className="text-[11px] text-slate-500 mt-1">{t('teacher.kpi.present_desc', 'Rate:')} {stats?.attendance_rate_today ?? 0}%</div>
          </div>
          <div className="p-3 bg-white text-slate-800 border border-slate-200 rounded-xl"><BookOpen className="w-6 h-6" /></div>
        </div>

        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-800 uppercase tracking-wide">{t('teacher.kpi.absent_today', 'Absent Today')}</div>
            <div className="text-4xl font-bold text-slate-800 mt-1">{stats?.absent_today ?? 0}</div>
            <div className="text-[11px] text-slate-500 mt-1">{t('teacher.kpi.absent_desc', 'Total absentees')}</div>
          </div>
          <div className="p-3 bg-white text-slate-800 border border-slate-200 rounded-xl"><UserMinus className="w-6 h-6" /></div>
        </div>

        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-800 uppercase tracking-wide">{t('teacher.kpi.high_risk', 'High Risk')}</div>
            <div className="text-4xl font-bold text-slate-800 mt-1">{stats?.high_risk_count ?? 0}</div>
            <div className="text-[11px] text-slate-500 mt-1">{t('teacher.kpi.high_risk_desc', 'Students needing attention')}</div>
          </div>
          <div className="p-3 bg-white text-slate-800 border border-slate-200 rounded-xl"><AlertCircle className="w-6 h-6" /></div>
        </div>
      </div>

      {/* ── Main Grid ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5">

        {/* Absent Today Table */}
        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800">{t('teacher.absent_table.title', 'Absent Today')}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{t('teacher.absent_table.subtitle', 'Students from your assigned sections currently absent')}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            {!stats?.absent_students || stats.absent_students.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-800">{t('teacher.absent_table.empty', 'No students are absent today.')}</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-800 uppercase tracking-wider text-xs bg-white">
                    <th className="py-3 px-4 font-semibold">{t('teacher.absent_table.col_roll', 'Roll No')}</th>
                    <th className="py-3 px-4 font-semibold">{t('teacher.absent_table.col_name', 'Student Name')}</th>
                    <th className="py-3 px-4 font-semibold">{t('teacher.absent_table.col_risk', 'Risk Level')}</th>
                    <th className="py-3 px-4 font-semibold">{t('teacher.absent_table.col_phone', 'Parent Phone')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100">
                  {stats.absent_students.map((absent, idx) => (
                    <tr key={idx} className="hover:bg-white transition cursor-pointer" onClick={() => openStudentDetails(absent.student_id)}>
                      <td className="py-3 px-4 text-slate-800 text-xs font-medium">{absent.student_id}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{absent.name}</td>
                      <td className="py-3 px-4">
                        <span className="text-blue-700 font-medium text-xs px-2 py-1 border border-blue-200 bg-blue-50 rounded-xl">
                          {absent.risk_level}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-800 text-xs">{absent.parent_phone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* High Risk Students */}
        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6 flex flex-col h-[400px]">
          <h3 className="text-base font-bold text-slate-800 mb-1">{t('teacher.high_risk_table.title', 'High Risk Students')}</h3>
          <p className="text-xs text-slate-800 mb-4">{t('teacher.high_risk_table.subtitle', 'Top priority students in your classes')}</p>
          <div className="flex-1 overflow-y-auto pr-2">
            {!stats?.high_risk_students || stats.high_risk_students.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-800">{t('teacher.high_risk_table.empty', 'No high-risk students found.')}</div>
            ) : (
              <div className="space-y-3">
                {stats.high_risk_students.map((student, idx) => (
                  <div key={idx} className="flex flex-col gap-1 p-3 border border-slate-200 rounded-xl bg-white hover:bg-white transition cursor-pointer" onClick={() => openStudentDetails(student.student_id)}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-sm">{student.name}</span>
                      <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 border border-blue-200">
                        {t('teacher.high_risk_table.score', 'Score')}: {student.risk_score}
                      </span>
                    </div>
                    <div className="text-xs text-slate-800">{t('teacher.high_risk_table.roll', 'Roll')}: {student.student_id}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isExplainModalOpen && selectedStudentId && (
        <StudentDetailsModal
          studentId={selectedStudentId}
          onClose={() => setIsExplainModalOpen(false)}
        />
      )}
    </div>
  );
}
