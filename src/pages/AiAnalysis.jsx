import React, { useState, useEffect } from 'react';
import { ShieldAlert, Search, RefreshCw, AlertCircle, CheckCircle2, TrendingDown, Eye } from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import StudentDetailsModal from '../components/StudentDetailsModal';
import SchoolOverviewBar from '../components/SchoolOverviewBar';
import api from '../services/api';

export default function AiAnalysis() {
  // ── Manual prediction state ──────────────────────────────────────────────
  const [rollNumber, setRollNumber] = useState('');
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  const [error, setError] = useState(null);

  // ── High-risk roster state ───────────────────────────────────────────────
  const [highRiskStudents, setHighRiskStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [viewDetailsId, setViewDetailsId] = useState(null);

  // ── School Overview Bar state ────────────────────────────────────────────
  const [lastEvaluatedAt, setLastEvaluatedAt] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetTeacher, setTargetTeacher] = useState('');
  const [targetClass, setTargetClass] = useState('');
  const [targetSection, setTargetSection] = useState('');
  const [teachersList, setTeachersList] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [sectionsList, setSectionsList] = useState([]);

  // ── Fetch high-risk roster + overview metadata ───────────────────────────
  const fetchData = async () => {
    try {
      setLoadingStudents(true);
      const params = new URLSearchParams();
      if (targetClass) params.append('class', targetClass);
      if (targetSection) params.append('section', targetSection);
      if (targetTeacher) params.append('teacher_id', targetTeacher);
      if (filterDate) {
        params.append('start_date', filterDate);
        params.append('end_date', filterDate);
      }

      const [dashRes, teachersRes, classesRes, sectionsRes] = await Promise.all([
        api.get(`/headmaster/dashboard?${params.toString()}`),
        api.get('/teachers'),
        api.get('/classes'),
        api.get('/sections'),
      ]);

      setHighRiskStudents(dashRes.data.top_risk_students || []);
      setLastEvaluatedAt(dashRes.data.last_evaluated_at || null);
      if (teachersList.length === 0) setTeachersList(teachersRes.data);
      if (classesList.length === 0) setClassesList(classesRes.data);
      if (sectionsList.length === 0) setSectionsList(sectionsRes.data);
    } catch (err) {
      console.error('Error fetching AI Analysis data:', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [targetClass, targetSection, targetTeacher, filterDate]);

  // ── Batch evaluate ───────────────────────────────────────────────────────
  const runBatchEvaluation = async () => {
    setIsEvaluating(true);
    try {
      await api.post('/ai/evaluate-all');
      await fetchData();
    } catch (err) {
      console.error('Batch evaluation failed:', err);
      alert('Batch evaluation failed.');
    } finally {
      setIsEvaluating(false);
    }
  };

  // ── CSV export ───────────────────────────────────────────────────────────
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

  // ── Manual prediction ────────────────────────────────────────────────────
  const handlePredict = async (e) => {
    e.preventDefault();
    if (!rollNumber.trim()) return;

    setIsPredicting(true);
    setError(null);
    setPredictionResult(null);

    try {
      const res = await api.post('/ai/predict', { roll_number: rollNumber.trim() });
      setPredictionResult(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Student not found. Please check the roll number.');
      } else {
        setError('Failed to run AI prediction. Ensure the backend is running.');
      }
    } finally {
      setIsPredicting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── School Overview Bar ─────────────────────────────────────────── */}
      <SchoolOverviewBar
        lastEvaluatedAt={lastEvaluatedAt}
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

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-xl font-bold text-slate-800">
            AI Risk Analysis &amp; Predictions
          </h1>
          {lastEvaluatedAt && (
            <div className="text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
              Last Updated: {new Date(lastEvaluatedAt.endsWith('Z') ? lastEvaluatedAt : lastEvaluatedAt + 'Z').toLocaleString()}
            </div>
          )}
        </div>
        <p className="text-sm text-slate-500 mt-2">
          Central hub for the AI Early Warning System. Run manual predictions on specific students and monitor the high-risk roster.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Manual Prediction Tool */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              Manual Prediction Tool
            </h2>

            <form onSubmit={handlePredict} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Enter Student Roll Number
                </label>
                <input
                  type="text"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="e.g. AI-TEST-001"
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                />
              </div>
              <button
                type="submit"
                disabled={isPredicting || !rollNumber.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50 flex justify-center items-center gap-2 shadow-md shadow-blue-500/20"
              >
                {isPredicting ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Run AI Prediction'}
              </button>
            </form>

            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-start gap-2 text-sm border border-red-100">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {/* Result Card */}
            {predictionResult && (
              <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden bg-slate-50 shadow-sm animate-fade-in">
                <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="font-semibold text-slate-800">Prediction Result</h3>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Student Name</p>
                    <p className="font-medium text-slate-900">{predictionResult.student_name}</p>
                    <p className="text-sm text-slate-500">{predictionResult.roll_number}</p>
                  </div>

                  <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <div>
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Risk Score</p>
                      <p className="text-xl font-bold text-slate-800">
                        {predictionResult.dropout_risk_score !== null
                          ? `${predictionResult.dropout_risk_score.toFixed(1)}%`
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <RiskBadge level={predictionResult.dropout_risk_level || 'SAFE'} />
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">AI Reasoning</p>
                    {predictionResult.risk_reasons ? (
                      <ul className="space-y-1">
                        {(() => {
                          let reasonsList = [];
                          try {
                            reasonsList = JSON.parse(predictionResult.risk_reasons);
                          } catch (e) {
                            reasonsList =
                              typeof predictionResult.risk_reasons === 'string'
                                ? predictionResult.risk_reasons.split('|')
                                : [];
                          }
                          return reasonsList.map((reason, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2 text-sm text-slate-700 bg-white p-2 rounded border border-slate-100 shadow-sm"
                            >
                              <TrendingDown className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                              <span>{reason}</span>
                            </li>
                          ));
                        })()}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-500 italic">No specific reasons provided.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: High-Risk Roster */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                High-Risk Roster
              </h2>
            </div>

            {loadingStudents ? (
              <div className="flex justify-center items-center p-12">
                <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
              </div>
            ) : highRiskStudents.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4 font-semibold">Student</th>
                      <th className="py-3 px-4 font-semibold">Risk Score</th>
                      <th className="py-3 px-4 font-semibold">Level</th>
                      <th className="py-3 px-4 font-semibold">Primary Reason</th>
                      <th className="py-3 px-4 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {highRiskStudents.map((student, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition group">
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-900 group-hover:text-blue-600 transition">
                            {student.name}
                          </p>
                          <p className="text-xs text-slate-500">{student.student_id}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-700">
                            {student.risk_score ? `${student.risk_score}%` : 'N/A'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <RiskBadge level={student.risk_level || 'SAFE'} />
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm text-slate-600 line-clamp-2" title={student.reasons}>
                            {(() => {
                              if (!student.reasons) return 'N/A';
                              try {
                                const parsed = JSON.parse(student.reasons);
                                return parsed.length > 0 ? parsed.join(', ') : 'N/A';
                              } catch (e) {
                                return student.reasons.split('|').join(', ');
                              }
                            })()}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setViewDetailsId(student.id)}
                            className="p-1.5 border border-slate-200 text-slate-800 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition rounded inline-flex items-center"
                            title="View Info"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center p-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldAlert className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-800">No High-Risk Students Found</h3>
                <p className="text-slate-500 text-sm mt-2 max-w-sm mx-auto">
                  The AI prediction engine has not flagged any students with a high dropout risk.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View Details Modal */}
      {viewDetailsId && (
        <StudentDetailsModal
          studentId={viewDetailsId}
          onClose={() => setViewDetailsId(null)}
        />
      )}
    </div>
  );
}
