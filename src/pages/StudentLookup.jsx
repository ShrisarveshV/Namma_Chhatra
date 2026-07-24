import React, { useState } from 'react';
import { Search, User, Phone, MapPin, ShieldAlert, Calendar, BookOpen, UserCheck, RefreshCw } from 'lucide-react';
import api from '../services/api';

const RISK_STYLES = {
  High:    { bg: 'bg-blue-50 border-blue-200',    text: 'text-blue-600',    label: 'High Risk' },
  Medium:  { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-600', label: 'Medium Risk' },
  Low:     { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-600', label: 'Low Risk' },
  Safe:    { bg: 'bg-blue-50 border-blue-200',  text: 'text-blue-600',  label: 'Safe' },
  Unknown: { bg: 'bg-white border-slate-200',  text: 'text-slate-800',  label: 'Unknown' },
};

export default function StudentLookup() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setSearched(false);
    try {
      const res = await api.get('/students/lookup', { params: { q: query.trim() } });
      setResults(res.data);
      setSearched(true);
    } catch {
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const riskStyle = (level) => RISK_STYLES[level] || RISK_STYLES.Unknown;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Student Lookup</h1>
        <p className="text-sm text-slate-800 mt-0.5">Search by roll number, student name, or admission number</p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-800" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Enter roll number, student name, or admission number..."
            className="w-full pl-10 pr-4 py-3 border border-slate-200 text-sm outline-none focus:border-blue-500 bg-white"
          />
        </div>
        <button type="submit" disabled={loading}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition disabled:opacity-60 flex items-center gap-2">
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Search
        </button>
      </form>

      {error && (
        <div className="p-3 bg-white border border-slate-200 text-blue-600 text-sm">{error}</div>
      )}

      {searched && results.length === 0 && (
        <div className="bg-white border border-slate-200 p-10 text-center">
          <User className="w-10 h-10 text-slate-800 mx-auto mb-2" />
          <p className="text-slate-800 text-sm">No student found matching <strong>"{query}"</strong></p>
          <p className="text-slate-800 text-xs mt-1">Try a different roll number, name, or admission number.</p>
        </div>
      )}

      {/* Results */}
      <div className="space-y-4">
        {results.map(s => {
          const rs = riskStyle(s.risk_level);
          const attColor = s.attendance_percentage >= 85 ? 'text-blue-600' : s.attendance_percentage >= 70 ? 'text-blue-600' : 'text-blue-600';
          return (
            <div key={s.id} className="bg-white border border-slate-100 shadow-sm rounded-2xl">
              {/* Header */}
              <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200">
                <div className="flex items-center gap-4">
                  {/* Photo placeholder */}
                  <div className="w-12 h-12 bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-slate-800" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-800">{s.student_name}</h2>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-slate-800 font-mono">{s.roll_number}</span>
                      <span className="text-xs text-slate-800">|</span>
                      <span className="text-xs text-slate-800">{s.class_name} — Section {s.section_name}</span>
                      {s.gender && <><span className="text-xs text-slate-800">|</span><span className="text-xs text-slate-800">{s.gender}</span></>}
                    </div>
                  </div>
                </div>
                <div className={`px-3 py-1.5 border text-xs font-bold ${rs.bg} ${rs.text}`}>
                  {rs.label} — {s.risk_score}%
                </div>
              </div>

              {/* Details grid */}
              <div className="p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                <InfoCard icon={<BookOpen className="w-4 h-4" />} label="Class / Section" value={`${s.class_name} / Section ${s.section_name}`} />
                <InfoCard icon={<UserCheck className="w-4 h-4" />} label="Class Teacher" value={s.teacher_name || 'Unassigned'} />
                <InfoCard icon={<Phone className="w-4 h-4" />} label="Parent Name" value={s.parent_name} />
                <InfoCard icon={<Phone className="w-4 h-4" />} label="Parent Phone" value={s.parent_phone} />
                <InfoCard icon={<MapPin className="w-4 h-4" />} label="Address" value={s.address} />
                <InfoCard icon={<Calendar className="w-4 h-4" />} label="Date of Birth" value={s.dob || '—'} />
                {s.admission_number && <InfoCard icon={<BookOpen className="w-4 h-4" />} label="Admission No." value={s.admission_number} />}
                <InfoCard icon={<Calendar className="w-4 h-4" />} label="Last Attendance" value={s.last_attendance_date ? `${s.last_attendance_date} — ${s.last_attendance_status}` : '—'} />
              </div>

              {/* Stats bar */}
              <div className="border-t border-slate-200 px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${attColor}`}>{s.attendance_percentage}%</div>
                  <div className="text-xs text-slate-500 mt-0.5">Attendance Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-800">{s.total_days}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Total Days Recorded</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${rs.text}`}>{s.risk_score}%</div>
                  <div className="text-xs text-slate-500 mt-0.5">Dropout Risk Score</div>
                </div>
                <div className="text-center">
                  <div className={`text-sm font-bold ${rs.text} mt-2`}>{s.risk_level}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Risk Level</div>
                </div>
              </div>

              {/* Risk reason */}
              {s.risk_reason && (
                <div className={`px-6 py-3 border-t border-slate-200 flex items-start gap-2 ${s.risk_level === 'High' ? 'bg-white' : s.risk_level === 'Medium' ? 'bg-white' : 'bg-white'}`}>
                  <ShieldAlert className={`w-4 h-4 mt-0.5 flex-shrink-0 ${rs.text}`} />
                  <p className={`text-xs font-medium ${rs.text}`}>Prediction reason: {s.risk_reason}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-slate-800 uppercase tracking-wide font-semibold mb-1">
        {icon}{label}
      </div>
      <div className="text-sm text-slate-800 font-medium">{value}</div>
    </div>
  );
}
