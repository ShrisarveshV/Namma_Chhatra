import React from 'react';
import { RefreshCw, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * SchoolOverviewBar
 * 
 * Renders the "School Overview" control strip that contains:
 *  - AI Risk Scores last-updated timestamp
 *  - Batch evaluate button (HEADMASTER only)
 *  - CSV export buttons (HEADMASTER only)
 *  - Date / Teacher / Class / Section filter dropdowns
 *
 * Props:
 *   lastEvaluatedAt   – string | null
 *   isEvaluating      – bool
 *   onEvaluate        – () => void
 *   onExport          – (type: 'students'|'attendance') => void
 *   filterDate        – string
 *   onFilterDate      – (val) => void
 *   targetTeacher     – string
 *   onTargetTeacher   – (val) => void
 *   teachersList      – array
 *   targetClass       – string
 *   onTargetClass     – (val) => void
 *   classesList       – array
 *   targetSection     – string
 *   onTargetSection   – (val) => void
 *   sectionsList      – array
 */
export default function SchoolOverviewBar({
  lastEvaluatedAt,
  isEvaluating,
  onEvaluate,
  onExport,
  filterDate,
  onFilterDate,
  targetTeacher,
  onTargetTeacher,
  teachersList = [],
  targetClass,
  onTargetClass,
  classesList = [],
  targetSection,
  onTargetSection,
  sectionsList = [],
}) {
  const { user } = useAuth();
  const isHeadmaster = user?.role === 'HEADMASTER';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      {/* Left side: title + evaluate */}
      <div className="flex items-center gap-3">
        <h2 className="font-bold text-slate-800 text-lg">School Overview</h2>
        {isHeadmaster && (
          <button
            onClick={onEvaluate}
            disabled={isEvaluating}
            title="Run batch AI evaluation"
            className="p-1.5 bg-white hover:bg-slate-50 text-slate-800 transition border border-slate-200 rounded disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isEvaluating ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        )}
      </div>

      {/* Right side: exports + filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* CSV exports — headmaster only */}
        {isHeadmaster && (
          <>
            <div className="flex bg-white border border-slate-200 overflow-hidden rounded">
              <div className="px-3 py-1.5 bg-white border-r border-slate-200 text-xs font-semibold text-slate-800 flex items-center">
                <Download className="w-3.5 h-3.5 mr-1" /> Students
              </div>
              <button
                onClick={() => onExport('students')}
                className="px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition"
              >
                CSV
              </button>
            </div>
            <div className="flex bg-white border border-slate-200 overflow-hidden rounded">
              <div className="px-3 py-1.5 bg-white border-r border-slate-200 text-xs font-semibold text-slate-800 flex items-center">
                <Download className="w-3.5 h-3.5 mr-1" /> Attendance
              </div>
              <button
                onClick={() => onExport('attendance')}
                className="px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition"
              >
                CSV
              </button>
            </div>
          </>
        )}

        {/* Date filter */}
        <input
          type="date"
          value={filterDate}
          onChange={(e) => onFilterDate(e.target.value)}
          className="bg-white border border-slate-200 rounded-full px-4 py-1.5 shadow-sm text-sm outline-none focus:border-slate-300 text-slate-800"
          title="Date Filter"
        />

        {/* Teacher filter — headmaster only */}
        {isHeadmaster && (
          <select
            value={targetTeacher}
            onChange={(e) => onTargetTeacher(e.target.value)}
            className="bg-white border border-slate-200 rounded-full px-4 py-1.5 shadow-sm text-sm outline-none text-slate-800"
          >
            <option value="">All Teachers</option>
            {teachersList.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name}
              </option>
            ))}
          </select>
        )}

        {/* Class filter */}
        <select
          value={targetClass}
          onChange={(e) => onTargetClass(e.target.value)}
          className="bg-white border border-slate-200 rounded-full px-4 py-1.5 shadow-sm text-sm outline-none text-slate-800"
        >
          <option value="">All Classes</option>
          {classesList.map((c) => (
            <option key={c.id} value={c.id}>
              {c.class_name}
            </option>
          ))}
        </select>

        {/* Section filter */}
        <select
          value={targetSection}
          onChange={(e) => onTargetSection(e.target.value)}
          className="bg-white border border-slate-200 rounded-full px-4 py-1.5 shadow-sm text-sm outline-none text-slate-800"
        >
          <option value="">All Sections</option>
          {sectionsList
            .filter((s) => !targetClass || s.class_id == targetClass)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.section_name}
              </option>
            ))}
        </select>
      </div>
    </div>
  );
}
