import React, { useState, useEffect, useCallback } from 'react';
import {
  HeartHandshake, RefreshCw, AlertCircle, Phone, UserX, CheckCircle2, Users, Eye,
} from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import StudentDetailsModal from '../components/StudentDetailsModal';
import api from '../services/api';

export default function CounselingRoster() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unflagging, setUnflagging] = useState(null);
  const [viewDetailsId, setViewDetailsId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchRoster = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/counseling-roster');
      setStudents(res.data);
    } catch (err) {
      setError('Failed to load counseling roster. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  const handleUnflag = async (studentId, studentName) => {
    setUnflagging(studentId);
    try {
      await api.patch(`/students/${studentId}/counseling`, { counseling_flag: false });
      setStudents((prev) => prev.filter((s) => s.id !== studentId));
      showToast('success', `${studentName} has been removed from the counseling roster.`);
    } catch (err) {
      showToast('error', 'Failed to unflag student. Please try again.');
    } finally {
      setUnflagging(null);
    }
  };

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="h-8 w-56 bg-slate-100 rounded-lg animate-pulse" />
          <div className="h-4 w-80 bg-slate-100 rounded mt-3 animate-pulse" />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          <div className="flex justify-center items-center gap-3 text-slate-500">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
            <span className="text-sm font-medium">Loading counseling roster…</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <HeartHandshake className="w-7 h-7 text-violet-600" />
            Counseling Roster
          </h1>
        </div>
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-xl border border-slate-200 shadow-sm gap-4">
          <AlertCircle className="w-12 h-12 text-red-400" />
          <p className="text-slate-600 font-medium">{error}</p>
          <button
            onClick={fetchRoster}
            className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition shadow-md shadow-blue-500/20"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl text-sm font-medium transition-all animate-fade-in
            ${toast.type === 'success'
              ? 'bg-blue-600 text-white shadow-blue-500/30'
              : 'bg-red-600 text-white shadow-red-500/30'}`}
        >
          {toast.type === 'success'
            ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              Counseling Roster
            </h1>
            <p className="text-slate-500 mt-1.5 text-sm">
              Students flagged for counseling intervention. Remove them once counseling is complete.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Student count badge */}
            <div className="flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-full text-sm font-semibold">
              <Users className="w-4 h-4" />
              {students.length} {students.length === 1 ? 'Student' : 'Students'} Flagged
            </div>
            {/* Refresh */}
            <button
              onClick={fetchRoster}
              title="Refresh roster"
              className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Table / Empty ───────────────────────────────────────────────── */}
      {students.length === 0 ? (
        <div className="text-center p-16 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5">
            <HeartHandshake className="w-10 h-10 text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700">No Students Currently Flagged</h3>
          <p className="text-slate-500 text-sm mt-2 max-w-sm mx-auto">
            Once students are marked for counseling (e.g. from the Students page), they will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-5 font-semibold">Student</th>
                  <th className="py-3.5 px-5 font-semibold">Class &amp; Section</th>
                  <th className="py-3.5 px-5 font-semibold">AI Risk</th>
                  <th className="py-3.5 px-5 font-semibold">Parent Contact</th>
                  <th className="py-3.5 px-5 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => (
                  <tr
                    key={student.id}
                    className="hover:bg-slate-50/70 transition group"
                  >
                    {/* Student name + roll */}
                    <td className="py-4 px-5">
                      <p className="font-semibold text-slate-900 group-hover:text-blue-700 transition text-sm">
                        {student.student_name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{student.roll_number}</p>
                    </td>

                    {/* Class & section */}
                    <td className="py-4 px-5">
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700">
                        {student.class_name}
                        <span className="text-slate-400">–</span>
                        Sec {student.section_name}
                      </span>
                    </td>

                    {/* AI risk */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm">
                          {student.risk_score != null ? `${student.risk_score}%` : 'N/A'}
                        </span>
                        <RiskBadge level={student.risk_level || 'SAFE'} />
                      </div>
                    </td>

                    {/* Parent contact */}
                    <td className="py-4 px-5">
                      <p className="text-sm font-medium text-slate-700">{student.parent_name || '—'}</p>
                      {student.parent_phone && (
                        <a
                          href={`tel:${student.parent_phone}`}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-0.5 transition"
                        >
                          <Phone className="w-3 h-3" />
                          {student.parent_phone}
                        </a>
                      )}
                    </td>

                    {/* Actions: View Info + Unflag */}
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setViewDetailsId(student.id)}
                          title="View student profile"
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Info
                        </button>
                        <button
                          onClick={() => handleUnflag(student.id, student.student_name)}
                          disabled={unflagging === student.id}
                          title="Remove from counseling roster"
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {unflagging === student.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <UserX className="w-3.5 h-3.5" />
                          )}
                          {unflagging === student.id ? 'Removing…' : 'Unflag'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Student Details Modal */}
      {viewDetailsId && (
        <StudentDetailsModal
          studentId={viewDetailsId}
          onClose={() => setViewDetailsId(null)}
        />
      )}
    </div>
  );
}
