import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardCheck, RefreshCw, AlertCircle, CheckCircle2,
  UserCheck, UserX, Clock, CalendarDays, Users, Send,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
const STATUS_OPTIONS = [
  { value: 'Present', label: 'Present', icon: UserCheck,  color: 'text-green-700 bg-green-50 border-green-200',  active: 'bg-green-500 text-white border-green-500 shadow-md shadow-green-200' },
  { value: 'Absent',  label: 'Absent',  icon: UserX,     color: 'text-red-700   bg-red-50   border-red-200',    active: 'bg-red-500   text-white border-red-500   shadow-md shadow-red-200'   },
  { value: 'Late',    label: 'Late',    icon: Clock,     color: 'text-slate-500 bg-slate-50 border-slate-200',  active: 'bg-white text-slate-800 border-slate-800 shadow-sm' },
];

export default function MarkAttendance() {
  const { user } = useAuth();

  // ── Filter state ─────────────────────────────────────────────────────────
  const [filterDate, setFilterDate]       = useState(new Date().toISOString().split('T')[0]);
  const [classesList, setClassesList]     = useState([]);
  const [sectionsList, setSectionsList]   = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  // ── Students state ───────────────────────────────────────────────────────
  const [students, setStudents]           = useState([]);
  const [attendance, setAttendance]       = useState({}); // { [studentId]: 'Present'|'Absent'|'Late' }
  const [loadingStudents, setLoadingStudents] = useState(false);

  // ── Submission state ─────────────────────────────────────────────────────
  const [submitting, setSubmitting]   = useState(false);
  const [toast, setToast]             = useState(null);
  const [submitted, setSubmitted]     = useState(false);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Load classes/sections once ────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [clsRes, secRes] = await Promise.all([
          api.get('/classes'),
          api.get('/sections'),
        ]);
        setClassesList(clsRes.data);
        setSectionsList(secRes.data);

        // For teacher: auto-pick first available section
        if (clsRes.data.length === 1) setSelectedClass(String(clsRes.data[0].id));
        if (secRes.data.length === 1) setSelectedSection(String(secRes.data[0].id));
      } catch (err) {
        console.error('Failed to load classes/sections', err);
      }
    };
    load();
  }, []);

  // ── Fetch students when section/date changes ──────────────────────────────
  const fetchStudents = useCallback(async () => {
    if (!selectedSection) {
      setStudents([]);
      return;
    }
    setLoadingStudents(true);
    try {
      const params = new URLSearchParams({ section_id: selectedSection });
      const res = await api.get(`/students?${params.toString()}`);
      const list = res.data;
      setStudents(list);

      // Pre-fill with existing attendance for the date if any
      const attParams = new URLSearchParams({
        section_id: selectedSection,
        filter_date: filterDate,
      });
      try {
        const attRes = await api.get(`/attendance/details?${attParams.toString()}`);
        const existing = {};
        attRes.data.forEach((rec) => {
          existing[rec.student_id] = rec.status;
        });
        // Default unrecorded students to "Present"
        const defaults = {};
        list.forEach((s) => {
          defaults[s.id] = existing[s.id] || 'Present';
        });
        setAttendance(defaults);
      } catch {
        // If attendance details fails, just default all to Present
        const defaults = {};
        list.forEach((s) => { defaults[s.id] = 'Present'; });
        setAttendance(defaults);
      }

      setSubmitted(false);
    } catch (err) {
      console.error('Failed to load students', err);
    } finally {
      setLoadingStudents(false);
    }
  }, [selectedSection, filterDate]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const setStudentStatus = (studentId, status) => {
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
  };

  // ── Mark all shortcuts ────────────────────────────────────────────────────
  const markAll = (status) => {
    const updated = {};
    students.forEach((s) => { updated[s.id] = status; });
    setAttendance(updated);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!students.length) return;
    setSubmitting(true);
    try {
      const records = students.map((s) => ({
        student_id: s.id,
        status: attendance[s.id] || 'Present',
        attendance_date: filterDate,
      }));
      await api.post('/attendance/bulk', { records });
      setSubmitted(true);
      showToast('success', `Attendance saved for ${records.length} students on ${new Date(filterDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.`);
    } catch (err) {
      showToast('error', 'Failed to save attendance. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Summary counts ────────────────────────────────────────────────────────
  const counts = students.reduce(
    (acc, s) => {
      const st = attendance[s.id] || 'Present';
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    },
    { Present: 0, Absent: 0, Late: 0 },
  );

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl text-sm font-medium animate-fade-in
            ${toast.type === 'success' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'}`}
        >
          {toast.type === 'success'
            ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          Mark Daily Attendance
        </h1>
        <p className="text-slate-500 mt-1.5 text-sm">
          Select a date and section, mark each student's status, then submit. Records feed into the AI risk model.
        </p>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3">
        {/* Date */}
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-slate-400" />
          <input
            type="date"
            id="att-date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
          />
        </div>

        {/* Class */}
        <select
          id="att-class"
          value={selectedClass}
          onChange={(e) => { setSelectedClass(e.target.value); setSelectedSection(''); }}
          className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none text-slate-800 focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Class</option>
          {classesList.map((c) => (
            <option key={c.id} value={c.id}>{c.class_name}</option>
          ))}
        </select>

        {/* Section */}
        <select
          id="att-section"
          value={selectedSection}
          onChange={(e) => setSelectedSection(e.target.value)}
          disabled={!selectedClass}
          className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none text-slate-800 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <option value="">Select Section</option>
          {sectionsList
            .filter((s) => !selectedClass || s.class_id == selectedClass)
            .map((s) => (
              <option key={s.id} value={s.id}>{s.section_name}</option>
            ))}
        </select>

        {/* Quick mark-all buttons */}
        {students.length > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Mark all:</span>
            {STATUS_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => markAll(value)}
                className="px-3 py-1 text-xs font-semibold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Summary pills ───────────────────────────────────────────────── */}
      {students.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-100 shadow-sm rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg"><Users className="w-5 h-5 text-slate-500" /></div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total</p>
              <p className="text-2xl font-bold text-slate-800">{students.length}</p>
            </div>
          </div>
          <div className="bg-white border border-slate-100 shadow-sm rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg"><UserCheck className="w-5 h-5 text-slate-700" /></div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Present</p>
              <p className="text-2xl font-bold text-slate-800">{counts.Present}</p>
            </div>
          </div>
          <div className="bg-white border border-slate-100 shadow-sm rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg"><UserX className="w-5 h-5 text-slate-700" /></div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Absent</p>
              <p className="text-2xl font-bold text-slate-800">{counts.Absent}</p>
            </div>
          </div>
          <div className="bg-white border border-slate-100 shadow-sm rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg"><Clock className="w-5 h-5 text-slate-700" /></div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Late</p>
              <p className="text-2xl font-bold text-slate-800">{counts.Late}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Student list ─────────────────────────────────────────────────── */}
      {!selectedSection ? (
        <div className="text-center p-16 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5">
            <ClipboardCheck className="w-10 h-10 text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700">Select a Class &amp; Section</h3>
          <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto">
            Choose a date, class, and section above to load students and mark their attendance.
          </p>
        </div>
      ) : loadingStudents ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 flex justify-center items-center gap-3 text-slate-500">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
          <span className="text-sm font-medium">Loading students…</span>
        </div>
      ) : students.length === 0 ? (
        <div className="text-center p-16 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5">
            <Users className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700">No Students Found</h3>
          <p className="text-slate-500 text-sm mt-2">No students are enrolled in the selected section.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">
              {students.length} Students — {new Date(filterDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            {submitted && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved
              </span>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {students.map((student, idx) => {
              const currentStatus = attendance[student.id] || 'Present';
              return (
                <div
                  key={student.id}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/60 transition"
                >
                  {/* Left: index + student info */}
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="text-xs text-slate-400 font-medium w-6 text-right flex-shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{student.student_name}</p>
                      <p className="text-xs text-slate-500">{student.roll_number}</p>
                    </div>
                  </div>

                  {/* Right: status toggle buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {STATUS_OPTIONS.map(({ value, label, icon: Icon, color, active }) => (
                      <button
                        key={value}
                        id={`status-${student.id}-${value}`}
                        onClick={() => setStudentStatus(student.id, value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-150
                          ${currentStatus === value ? active : color} `}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Submit button ──────────────────────────────────────────── */}
          <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              Submitting will update attendance records used by the AI risk model.
            </p>
            <button
              id="submit-attendance-btn"
              onClick={handleSubmit}
              disabled={submitting || students.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {submitting ? 'Saving…' : 'Submit Daily Attendance'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
