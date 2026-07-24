import React, { useState, useEffect } from 'react';
import { X, User, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import api from '../services/api';

export default function StudentDetailsModal({ studentId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingFlag, setUpdatingFlag] = useState(false);
  const [flagSuccess, setFlagSuccess] = useState(false);

  const toggleCounseling = async () => {
    setUpdatingFlag(true);
    try {
      const newFlag = !data.counseling_flag;
      await api.patch(`/students/${studentId}/counseling`, { counseling_flag: newFlag });
      setData(prev => ({ ...prev, counseling_flag: newFlag }));
      setFlagSuccess(true);
      setTimeout(() => setFlagSuccess(false), 2000);
    } catch (err) {
      alert('Failed to update counseling flag.');
    } finally {
      setUpdatingFlag(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(`/students/${studentId}/details`);
        setData(res.data);
      } catch (err) {
        setError('Failed to load student details.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [studentId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-800/50">
        <div className="bg-white p-8 border border-slate-200 text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-800 font-medium">Loading details...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-800/50">
        <div className="bg-white p-8 border border-slate-200 max-w-sm w-full">
          <h2 className="text-xl font-bold text-blue-600 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6" /> Error
          </h2>
          <p className="text-slate-800 mb-6">{error || 'Student not found.'}</p>
          <button onClick={onClose} className="w-full bg-slate-800 text-white py-2 font-semibold hover:bg-slate-800 transition">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-800/50 p-4">
      <div className="bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <User className="w-6 h-6 text-blue-600" />
              Student Absent Details
            </h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-800 hover:text-slate-800 hover:bg-white transition rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Core Info */}
            <div className="space-y-4">
              <div className="bg-white p-4 border border-slate-200">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Student Identity</h3>
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <div className="text-slate-800">Roll Number:</div>
                  <div className="font-semibold text-slate-800">{data.roll_number}</div>
                  
                  <div className="text-slate-800">Name:</div>
                  <div className="font-semibold text-slate-800">{data.student_name}</div>
                  
                  <div className="text-slate-800">Class:</div>
                  <div className="font-medium text-slate-800">{data.class_name}</div>
                  
                  <div className="text-slate-800">Section:</div>
                  <div className="font-medium text-slate-800">{data.section_name}</div>
                </div>
              </div>

              <div className="bg-white p-4 border border-slate-200">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Contact Information</h3>
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <div className="text-slate-800">Parent Name:</div>
                  <div className="font-semibold text-slate-800">{data.parent_name}</div>
                  
                  <div className="text-slate-800">Parent Phone:</div>
                  <div className="font-semibold text-slate-800">{data.parent_phone}</div>
                </div>
              </div>
            </div>

            {/* Right Column: Attendance & Risk */}
            <div className="space-y-4">
              <div className="bg-white p-4 border border-slate-200">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Attendance Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 border border-slate-200 text-center">
                    <div className="text-2xl font-bold text-blue-600">{data.attendance_percentage}%</div>
                    <div className="text-xs text-slate-800 font-medium">Overall Attendance</div>
                  </div>
                  <div className="bg-white p-3 border border-slate-200 text-center">
                    <div className={`text-2xl font-bold ${data.consecutive_absent >= 3 ? 'text-blue-600' : 'text-slate-800'}`}>
                      {data.consecutive_absent} Days
                    </div>
                    <div className="text-xs text-slate-800 font-medium">Consecutive Absent</div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 border border-slate-200">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> AI Risk Analysis
                </h3>
                <div className="mb-2">
                  <span className="text-sm font-semibold text-slate-800">Risk Score:</span>
                  <span className="ml-2 text-sm text-slate-900 font-bold">{data.risk_score}% ({data.risk_level})</span>
                </div>
                <div className="text-sm text-slate-800 font-semibold mb-1">Key Risk Drivers:</div>
                <ul className="text-sm text-slate-900 leading-relaxed font-medium list-disc pl-5 mb-4">
                  {(() => {
                    try {
                      const r = JSON.parse(data.risk_reason);
                      if (Array.isArray(r)) {
                        return r.map((reason, i) => <li key={i}>{reason}</li>);
                      }
                      return <li>{data.risk_reason}</li>;
                    } catch {
                      return <li>{data.risk_reason}</li>;
                    }
                  })()}
                </ul>
                <div className="text-sm text-slate-800 font-semibold mb-2">Quick Actions:</div>
                <div className="flex gap-2">
                  <button 
                    onClick={toggleCounseling}
                    disabled={updatingFlag}
                    className={`px-3 py-1.5 text-xs font-semibold rounded transition flex items-center gap-1
                      ${data.counseling_flag 
                        ? 'bg-blue-600 text-white border border-blue-600 hover:bg-blue-700' 
                        : 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100'} 
                      disabled:opacity-50`}
                  >
                    {updatingFlag ? 'Updating...' : flagSuccess ? 'Updated!' : data.counseling_flag ? 'Unflag Counseling' : 'Flag for Counseling'}
                  </button>
                  <button className="px-3 py-1.5 bg-white text-slate-800 border border-slate-200 text-xs font-semibold rounded hover:bg-slate-50 transition">
                    Contact Parent
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Teacher Remarks</h3>
            <div className="bg-white p-4 border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap font-medium">
              {data.teacher_remarks}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Recent Attendance History</h3>
            {data.history.length === 0 ? (
              <p className="text-sm text-slate-800 italic">No attendance records found.</p>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {data.history.map((record, idx) => (
                  <div key={idx} className="flex flex-col items-center bg-white border border-slate-200 p-2 min-w-[70px]">
                    <div className="text-[10px] font-bold text-slate-800 uppercase mb-1">
                      {new Date(record.attendance_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    {record.status === 'Present' ? (
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                    ) : record.status === 'Absent' ? (
                      <X className="w-5 h-5 text-blue-600 bg-white rounded-full" />
                    ) : (
                      <Clock className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-slate-800 hover:bg-slate-800 text-white text-sm font-semibold transition">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
