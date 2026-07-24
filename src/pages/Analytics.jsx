import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AttendanceRateLine, PresentAbsentBar, ClassWiseBar, SectionWiseBar, RiskBreakdownDoughnut, AttendanceTrendChart, RiskDoughnut } from '../components/Charts';
import api from '../services/api';

const TABS = [
  { key: 'trend', label: 'Attendance Trend' },
  { key: 'class', label: 'Class-wise' },
  { key: 'section', label: 'Section-wise' },
  { key: 'risk', label: 'Risk Distribution' },
];

const TEACHER_TABS = [
  { key: 'trend', label: 'Weekly Trend' },
  { key: 'risk', label: 'Risk Distribution' },
];

export default function Analytics() {
  const { user } = useAuth();
  const isHeadmaster = user?.role === 'HEADMASTER';
  const tabs = isHeadmaster ? TABS : TEACHER_TABS;

  const [activeTab, setActiveTab] = useState(tabs[0].key);
  const [trendData, setTrendData] = useState(null);
  const [classData, setClassData] = useState([]);
  const [sectionData, setSectionData] = useState([]);
  const [riskData, setRiskData] = useState(null);
  const [teacherData, setTeacherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      if (isHeadmaster) {
        const [trend, cls, sec] = await Promise.all([
          api.get('/analytics/attendance', { params: { days: 30 } }),
          api.get('/analytics/class-wise'),
          api.get('/analytics/section-wise'),
        ]);
        setTrendData(trend.data);
        setClassData(cls.data);
        setSectionData(sec.data);
        // Derive risk from headmaster dashboard
        const dash = await api.get('/headmaster/dashboard');
        setRiskData(dash.data.risk_breakdown);
      } else {
        const res = await api.get('/teacher/analytics');
        setTeacherData(res.data);
      }
    } catch {
      setError('Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="py-12 flex items-center justify-center gap-2 text-slate-800 text-sm">
      <RefreshCw className="w-4 h-4 animate-spin" /> Loading analytics...
    </div>
  );

  if (error) return (
    <div className="py-10 flex flex-col items-center text-blue-600 gap-2">
      <AlertCircle className="w-6 h-6" /><span className="text-sm">{error}</span>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            {isHeadmaster ? 'School Analytics' : 'Class Analytics'}
          </h1>
          <p className="text-sm text-slate-800 mt-0.5">
            {isHeadmaster ? 'School-wide attendance and risk data' : 'Your assigned section analytics'}
          </p>
        </div>
        <button onClick={load} className="p-2 border border-slate-200 text-slate-800 hover:bg-white transition">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition ${
              activeTab === t.key
                ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                : 'border-transparent text-slate-800 hover:text-slate-800 hover:bg-white'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Headmaster Charts */}
      {isHeadmaster && activeTab === 'trend' && trendData && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6">
            <h3 className="font-bold text-slate-800 mb-1">30-Day Attendance Rate</h3>
            <p className="text-xs text-slate-800 mb-4">Daily attendance rate percentage across the school</p>
            <div className="h-80">
              <AttendanceRateLine chartData={trendData} />
            </div>
          </div>
          <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6">
            <h3 className="font-bold text-slate-800 mb-1">Present vs Absent (Daily)</h3>
            <p className="text-xs text-slate-800 mb-4">Daily count of present and absent students</p>
            <div className="h-72">
              <PresentAbsentBar chartData={trendData} />
            </div>
          </div>
        </div>
      )}

      {isHeadmaster && activeTab === 'class' && (
        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6">
          <h3 className="font-bold text-slate-800 mb-1">Class-wise Attendance (Last 7 Days)</h3>
          <p className="text-xs text-slate-800 mb-4">Average attendance rate per class</p>
          <div className="h-80">
            <ClassWiseBar data={classData} />
          </div>
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {classData.map(c => (
              <div key={c.class_name} className="bg-white border border-slate-200 p-3 text-center">
                <div className="text-xs font-semibold text-slate-800 uppercase">{c.class_name}</div>
                <div className="text-2xl font-bold mt-1 text-slate-800">
                  {c.attendance_rate}%
                </div>
                <div className="text-[10px] text-slate-500">{c.student_count} students</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isHeadmaster && activeTab === 'section' && (
        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6">
          <h3 className="font-bold text-slate-800 mb-1">Section-wise Attendance (Last 7 Days)</h3>
          <p className="text-xs text-slate-800 mb-4">Attendance rate per class section</p>
          <div className="h-[480px]">
            <SectionWiseBar data={sectionData} />
          </div>
        </div>
      )}

      {isHeadmaster && activeTab === 'risk' && riskData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6">
            <h3 className="font-bold text-slate-800 mb-1">Risk Level Distribution</h3>
            <p className="text-xs text-slate-800 mb-4">Student breakdown by dropout risk level</p>
            <div className="h-64">
              <RiskBreakdownDoughnut breakdown={riskData} />
            </div>
          </div>
          <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6">
            <h3 className="font-bold text-slate-800 mb-4">Risk Summary</h3>
            <div className="space-y-3">
              {[
                { key: 'RED', label: 'High Risk (81-100)', color: 'bg-red-500', text: 'text-red-700', bg: 'bg-white border-slate-200' },
                { key: 'ORANGE', label: 'Medium Risk (61-80)', color: 'bg-blue-600', text: 'text-slate-800', bg: 'bg-white border-slate-200' },
                { key: 'YELLOW', label: 'Low Risk (40-60)', color: 'bg-blue-600', text: 'text-slate-800', bg: 'bg-white border-slate-200' },
                { key: 'SAFE', label: 'Safe (0-39)', color: 'bg-red-500', text: 'text-red-700', bg: 'bg-white border-slate-200' },
              ].map(r => (
                <div key={r.key} className={`flex items-center justify-between p-3 border ${r.bg}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${r.color}`} />
                    <span className={`text-sm font-semibold ${r.text}`}>{r.label}</span>
                  </div>
                  <span className={`text-xl font-bold ${r.text}`}>{riskData[r.key] ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Teacher Charts */}
      {!isHeadmaster && activeTab === 'trend' && teacherData && (
        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6">
          <h3 className="font-bold text-slate-800 mb-1">30-Day Attendance Trend</h3>
          <p className="text-xs text-slate-800 mb-4">Daily present and absent count for your assigned students</p>
          <div className="h-80">
            <AttendanceTrendChart graphData={{
              labels: teacherData.labels,
              datasets: [
                { label: 'Present', data: teacherData.present },
                { label: 'Absent', data: teacherData.absent },
              ]
            }} />
          </div>
        </div>
      )}

      {!isHeadmaster && activeTab === 'risk' && teacherData?.risk && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6">
            <h3 className="font-bold text-slate-800 mb-1">Risk Distribution — My Students</h3>
            <p className="text-xs text-slate-800 mb-4">Risk level breakdown for your class</p>
            <div className="h-64">
              <RiskDoughnut risk={teacherData.risk} />
            </div>
          </div>
          <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6">
            <h3 className="font-bold text-slate-800 mb-4">Risk Summary</h3>
            <div className="space-y-3">
              {[
                { key: 'High', label: 'High Risk', color: 'bg-red-500', text: 'text-red-700', bg: 'bg-white border-slate-200' },
                { key: 'Medium', label: 'Medium Risk', color: 'bg-blue-600', text: 'text-slate-800', bg: 'bg-white border-slate-200' },
                { key: 'Low', label: 'Low Risk', color: 'bg-blue-600', text: 'text-slate-800', bg: 'bg-white border-slate-200' },
                { key: 'Safe', label: 'Safe', color: 'bg-red-500', text: 'text-red-700', bg: 'bg-white border-slate-200' },
              ].map(r => (
                <div key={r.key} className={`flex items-center justify-between p-3 border ${r.bg}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${r.color}`} />
                    <span className={`text-sm font-semibold ${r.text}`}>{r.label}</span>
                  </div>
                  <span className={`text-xl font-bold ${r.text}`}>{teacherData.risk[r.key] ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
