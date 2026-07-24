import React, { useState, useEffect } from 'react';
import { School, Users, ShieldAlert, RefreshCw, AlertCircle, TrendingUp, BookOpen, UserCheck } from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import StudentDetailsModal from '../components/StudentDetailsModal';
import SchoolOverviewBar from '../components/SchoolOverviewBar';
import api from '../services/api';

export default function HeadmasterDashboard() {
  const [stats, setStats] = useState(null);
  const [teacherLeaves, setTeacherLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isExplainModalOpen, setIsExplainModalOpen] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [targetClass, setTargetClass] = useState('');
  const [targetSection, setTargetSection] = useState('');
  const [targetTeacher, setTargetTeacher] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [teachersList, setTeachersList] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [sectionsList, setSectionsList] = useState([]);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (targetClass) params.append('class', targetClass);
      if (targetSection) params.append('section', targetSection);
      if (targetTeacher) params.append('teacher_id', targetTeacher);
      if (filterDate) {
        params.append('start_date', filterDate);
        params.append('end_date', filterDate);
      }
      
      const [res, leavesRes, teachersRes, classesRes, sectionsRes] = await Promise.all([
        api.get(`/headmaster/dashboard?${params.toString()}`),
        api.get('/teacher-leaves'),
        api.get('/teachers'),
        api.get('/classes'),
        api.get('/sections')
      ]);
      setStats(res.data);
      setTeacherLeaves(leavesRes.data);
      if (teachersList.length === 0) setTeachersList(teachersRes.data);
      if (classesList.length === 0) setClassesList(classesRes.data);
      if (sectionsList.length === 0) setSectionsList(sectionsRes.data);
    } catch (err) {
      setError('Failed to fetch dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [targetClass, targetSection, targetTeacher, filterDate]);

  const runBatchEvaluation = async () => {
    setIsEvaluating(true);
    try {
      await api.post('/ai/evaluate-all');
      await fetchMetrics(); // Refresh data to get new timestamps and scores
    } catch (err) {
      console.error('Failed to run batch evaluation:', err);
      alert('Batch evaluation failed.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const openExplainability = (student) => {
    setSelectedStudent({
      ...student,
      latest_risk_score: student.risk_score,
      latest_risk_level: student.risk_level,
      latest_risk_reasons: student.reasons,
      attendance_percentage_30d: student.attendance_percentage_30d || 58.0,
      consecutive_absent_days: student.consecutive_absent_days || 5,
      exam_average: student.exam_average || 42.0,
      student_class: student.class_section?.replace('Class ', '').split('-')[0] || '10',
      section: student.class_section?.split(' Sec ')[1] || 'A',
    });
    setIsExplainModalOpen(true);
  };

  const handleExport = async (type) => {
    try {
      const endpoint = type === 'students' ? '/export/students' : '/export/attendance';
      const response = await api.get(endpoint, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_export.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert('Export failed. Please try again.');
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-800">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" /> Loading Dashboard Data...
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-800">
        <AlertCircle className="w-12 h-12 text-blue-600 mb-3" />
        <p>{error}</p>
        <button onClick={fetchMetrics} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold">Retry</button>
      </div>
    );
  }

  const riskData = stats?.risk_breakdown || {};
  const totalRisk = (riskData.RED || 0) + (riskData.ORANGE || 0) + (riskData.YELLOW || 0) + (riskData.SAFE || 0);

  return (
    <div className="space-y-5">

      {/* ── Control bar ───────────────────────────────────────────────── */}
      <SchoolOverviewBar
        lastEvaluatedAt={stats?.last_evaluated_at}
        isEvaluating={isEvaluating}
        onEvaluate={runBatchEvaluation}
        onExport={handleExport}
        filterDate={filterDate}
        onFilterDate={setFilterDate}
        targetTeacher={targetTeacher}
        onTargetTeacher={setTargetTeacher}
        teachersList={teachersList}
        targetClass={targetClass}
        onTargetClass={setTargetClass}
        classesList={classesList}
        targetSection={targetSection}
        onTargetSection={setTargetSection}
        sectionsList={sectionsList}
      />

      {/* ── KPI Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-800 uppercase tracking-wide">Attendance Rate</div>
            <div className="text-4xl font-bold text-slate-800 mt-1">{stats?.school_attendance_rate ?? 0}%</div>
            <div className="text-[11px] text-slate-500 mt-1">7-day average (all classes)</div>
          </div>
          <div className="p-3 bg-white text-slate-800 border border-slate-200 rounded-xl"><School className="w-7 h-7" /></div>
        </div>

        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-800 uppercase tracking-wide">Total Strength</div>
            <div className="text-4xl font-bold text-slate-800 mt-1">{stats?.total_students ?? 0}</div>
            <div className="text-[11px] text-slate-500 mt-1">Enrolled across all classes</div>
          </div>
          <div className="p-3 bg-white text-slate-800 border border-slate-200 rounded-xl"><Users className="w-7 h-7" /></div>
        </div>

        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-800 uppercase tracking-wide">Active Teachers</div>
            <div className="text-4xl font-bold text-slate-800 mt-1">{stats?.total_teachers ?? 0}</div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">All present today</div>
          </div>
          <div className="p-3 bg-white text-slate-800 border border-slate-200 rounded-xl"><UserCheck className="w-7 h-7" /></div>
        </div>

        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-800 uppercase tracking-wide">Critical Red Alerts</div>
            <div className="text-4xl font-bold text-slate-800 mt-1">{riskData.RED ?? 0}</div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">Needs immediate action</div>
          </div>
          <div className="p-3 bg-white text-slate-800 border border-slate-200 rounded-xl"><ShieldAlert className="w-7 h-7" /></div>
        </div>
      </div>

      {/* ── Risk Summary Row ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'High Risk', count: riskData.RED || 0 },
          { label: 'Medium Risk', count: riskData.ORANGE || 0 },
          { label: 'Low Risk', count: riskData.YELLOW || 0 },
          { label: 'Safe', count: riskData.SAFE || 0 },
        ].map((r) => (
          <div key={r.label} className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-800">{r.label}</div>
              <div className="text-2xl font-bold text-slate-800 mt-1">{r.count}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {totalRisk > 0 ? Math.round((r.count / totalRisk) * 100) : 0}% of students
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Area ──────────────────────── */}
      <div className="flex flex-col gap-5">

        {/* Teachers on Leave Table */}
        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600" /> Teachers on Leave
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Recent leave records</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            {!teacherLeaves || teacherLeaves.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-800">No teachers on leave found.</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-800 uppercase tracking-wider text-xs bg-white">
                    <th className="py-3 px-4 font-semibold">Teacher ID</th>
                    <th className="py-3 px-4 font-semibold">Teacher Name</th>
                    <th className="py-3 px-4 font-semibold">Date</th>
                    <th className="py-3 px-4 font-semibold">Leave Type</th>
                    <th className="py-3 px-4 font-semibold">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100">
                  {teacherLeaves.slice(0, 10).map((leave) => (
                    <tr key={leave.id} className="hover:bg-white transition">
                      <td className="py-3 px-4 text-slate-800 text-xs font-medium">TCH-{leave.teacher_id}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{leave.teacher_name}</td>
                      <td className="py-3 px-4 text-slate-800 text-xs">{leave.leave_date}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold rounded-xl">
                          {leave.leave_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-800 text-xs max-w-[200px] truncate">{leave.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ── Class-wise Attendance ──────────────────────────────────────── */}
      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-500" />
          <h3 className="text-base font-bold text-slate-800">Class-wise Attendance Rates</h3>
          <span className="text-xs text-slate-800 ml-1">(last 7 school days)</span>
        </div>
        {!stats?.class_attendance_comparison || stats.class_attendance_comparison.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-800">No data available</div>
        ) : (
          <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {stats.class_attendance_comparison.map((c) => {
              const rate = c.attendance_rate || 0;
              const barColor = rate >= 85 ? 'bg-slate-800' : rate >= 70 ? 'bg-blue-600' : 'bg-slate-800';
              return (
                <div key={c.class_name} className="p-4 bg-white border border-slate-200">
                  <div className="text-xs font-semibold text-slate-800 uppercase tracking-wide">{c.class_name}</div>
                  <div className="text-2xl font-bold text-slate-800 mt-1">{rate}%</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{c.student_count} Students</div>
                  <div className="mt-3 h-1.5 bg-white rounded-full overflow-hidden">
                    <div className={`h-full ${barColor} rounded-full`} style={{ width: `${rate}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Teacher Gate Check-In ──────────────────────────────────────── */}
      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-500" />
          <h3 className="text-base font-bold text-slate-800">Teacher Gate Check-In Status</h3>
        </div>
        {!stats?.teacher_attendance_summary || stats.teacher_attendance_summary.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-800">No teacher data available</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-800 uppercase tracking-wider text-xs bg-white">
                  <th className="py-3 px-4 font-semibold">#</th>
                  <th className="py-3 px-4 font-semibold">Teacher Name</th>
                  <th className="py-3 px-4 font-semibold">Assigned Class / Section</th>
                  <th className="py-3 px-4 font-semibold">Check-In Time</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-100">
                {stats.teacher_attendance_summary.map((t, idx) => (
                  <tr key={idx} className="hover:bg-white transition">
                    <td className="py-3 px-4 text-slate-800 text-xs">{idx + 1}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{t.teacher_name}</td>
                    <td className="py-3 px-4 text-slate-800 text-xs">{t.assigned_class}</td>
                    <td className="py-3 px-4 text-slate-800 font-medium">{t.time}</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-xl bg-white text-blue-600 border border-slate-200 font-semibold text-xs">
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isExplainModalOpen && selectedStudent && (
        <StudentDetailsModal
          studentId={selectedStudent.id}
          onClose={() => setIsExplainModalOpen(false)}
        />
      )}
    </div>
  );
}
