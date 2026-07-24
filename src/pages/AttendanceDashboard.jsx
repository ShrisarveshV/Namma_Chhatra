import React, { useState, useEffect } from 'react';
import { CalendarCheck, Download, Search, AlertCircle, Users, CheckCircle, XCircle, Clock, ShieldAlert } from 'lucide-react';
import { AttendanceTrendChart } from '../components/Charts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AttendanceDashboard() {
  const [records, setRecords] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [trendData, setTrendData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Filter States
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterLeaveType, setFilterLeaveType] = useState('');
  
  const { user } = useAuth();
  
  useEffect(() => {
    fetchClassesAndSections();
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [selectedClass, selectedSection, selectedTeacher, filterDate, filterStatus, filterLeaveType]);

  const fetchClassesAndSections = async () => {
    try {
      const [clsRes, secRes] = await Promise.all([
        api.get('/classes'),
        api.get('/sections')
      ]);
      setClasses(clsRes.data);
      setSections(secRes.data);
      if (user?.role === 'HEADMASTER') {
        const tRes = await api.get('/teachers');
        setTeachers(tRes.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedClass) params.append('class_id', selectedClass);
      if (selectedSection) params.append('section_id', selectedSection);
      if (selectedTeacher) params.append('teacher_id', selectedTeacher); // Need backend support for this in attendance? 
      // Actually backend attendance doesn't support teacher_id filter in GET /attendance/details yet. I'll need to add it!
      // I'll add teacher_id to /attendance/details and /attendance/analytics in the backend next.
      if (filterDate) params.append('filter_date', filterDate);
      if (filterStatus) params.append('status', filterStatus);
      if (filterLeaveType) params.append('leave_type', filterLeaveType);
      
      const q = params.toString();
      
      const [recRes, statRes, trendRes] = await Promise.all([
        api.get(`/attendance/details?${q}`),
        api.get(`/attendance/analytics?${q}`),
        api.get(`/analytics/attendance`)
      ]);
      setRecords(recRes.data);
      setAnalytics(statRes.data);
      setTrendData(trendRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = records.filter(s => 
    s.student_name.toLowerCase().includes(search.toLowerCase()) || 
    s.roll_number.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'Present': return 'bg-white text-blue-600 border-slate-200';
      case 'Absent': return 'bg-white text-blue-600 border-slate-200';
      case 'Late': return 'bg-white text-blue-600 border-slate-200';
      case 'Leave': return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-white text-slate-800 border-slate-200';
    }
  };

  const exportCSV = () => {
    const data = filtered.map(s => ({
      'Date': s.date,
      'Roll Number': s.roll_number,
      'Name': s.student_name,
      'Class': s.class_name,
      'Section': s.section_name,
      'Status': s.status,
      'Leave Type': s.leave_type || '',
      'Attendance %': s.attendance_percentage + '%'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `attendance_details.csv`;
    link.click();
  };

  const exportExcel = () => {
    const data = filtered.map(s => ({
      'Date': s.date,
      'Roll Number': s.roll_number,
      'Name': s.student_name,
      'Class': s.class_name,
      'Section': s.section_name,
      'Status': s.status,
      'Leave Type': s.leave_type || '',
      'Attendance %': s.attendance_percentage + '%'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Details");
    XLSX.writeFile(wb, `attendance_details.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Attendance Details Report`, 14, 15);
    const tableData = filtered.map(s => [
      s.date, s.roll_number, s.student_name, s.class_name, s.section_name, s.status, s.leave_type || '', s.attendance_percentage + '%'
    ]);
    doc.autoTable({
      head: [['Date', 'Roll', 'Name', 'Class', 'Section', 'Status', 'Leave', 'Att %']],
      body: tableData,
      startY: 20,
    });
    doc.save(`attendance_details.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            Attendance Management
          </h1>
          <p className="text-sm text-slate-800 mt-1">View detailed read-only attendance records and analytics.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={exportCSV} className="bg-white border border-slate-200 text-slate-800 px-3 py-1.5 text-sm font-semibold hover:bg-white flex items-center gap-2 transition shadow-sm">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={exportExcel} className="bg-white border border-slate-200 text-slate-800 px-3 py-1.5 text-sm font-semibold hover:bg-white flex items-center gap-2 transition shadow-sm">
            <Download className="w-4 h-4" /> Excel
          </button>
          <button onClick={exportPDF} className="bg-white border border-slate-200 text-slate-800 px-3 py-1.5 text-sm font-semibold hover:bg-white flex items-center gap-2 transition shadow-sm">
            <Download className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="bg-white p-4 border border-slate-200 shadow-sm flex flex-col items-center text-center">
            <Users className="w-5 h-5 text-slate-800 mb-1" />
            <div className="text-xs font-semibold text-slate-800 uppercase">Total Students</div>
            <div className="text-xl font-bold text-slate-800 mt-1">{analytics.total}</div>
          </div>
          <div className="bg-white p-4 border border-slate-200 shadow-sm flex flex-col items-center text-center">
            <CheckCircle className="w-5 h-5 text-slate-800 mb-1" />
            <div className="text-xs font-semibold text-slate-800 uppercase">Present</div>
            <div className="text-xl font-bold text-slate-800 mt-1">{analytics.present}</div>
          </div>
          <div className="bg-white p-4 border border-slate-200 shadow-sm flex flex-col items-center text-center">
            <XCircle className="w-5 h-5 text-slate-800 mb-1" />
            <div className="text-xs font-semibold text-slate-800 uppercase">Absent</div>
            <div className="text-xl font-bold text-slate-800 mt-1">{analytics.absent}</div>
          </div>
          <div className="bg-white p-4 border border-slate-200 shadow-sm flex flex-col items-center text-center">
            <Clock className="w-5 h-5 text-slate-800 mb-1" />
            <div className="text-xs font-semibold text-slate-800 uppercase">On Leave</div>
            <div className="text-xl font-bold text-slate-800 mt-1">{analytics.leave}</div>
          </div>
          <div className="bg-white p-4 border border-slate-200 shadow-sm flex flex-col items-center text-center">
            <CalendarCheck className="w-5 h-5 text-slate-800 mb-1" />
            <div className="text-xs font-semibold text-slate-800 uppercase">Attendance %</div>
            <div className="text-xl font-bold text-slate-800 mt-1">{analytics.rate}%</div>
          </div>
          <div className="bg-white p-4 border border-slate-200 shadow-sm flex flex-col items-center text-center">
            <ShieldAlert className="w-5 h-5 text-slate-800 mb-1" />
            <div className="text-xs font-semibold text-slate-800 uppercase">High Risk</div>
            <div className="text-xl font-bold text-slate-800 mt-1">{analytics.high_risk_count}</div>
          </div>
        </div>
      )}

      {/* Trend Chart */}
      {trendData && (
        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6">
          <h3 className="text-base font-bold text-slate-800 mb-1">Weekly Attendance Trend</h3>
          <p className="text-xs text-slate-800 mb-4">Present vs Absent</p>
          <div className="h-72">
            {trendData.labels && trendData.labels.length > 0 ? (
              <AttendanceTrendChart graphData={{
                labels: trendData.labels,
                datasets: [
                  { label: "Present", data: trendData.present },
                  { label: "Absent", data: trendData.absent }
                ]
              }} />
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-800">No data available</div>
            )}
          </div>
        </div>
      )}

      {/* Breakdown Analytics */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.keys(analytics.class_wise).length > 0 && (
            <div className="bg-white border border-slate-100 shadow-sm rounded-2xl">
              <div className="px-4 py-3 border-b border-slate-200 bg-white font-bold text-slate-800 text-sm">
                Class-wise Attendance
              </div>
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.entries(analytics.class_wise).map(([cName, rate]) => (
                  <div key={cName} className="flex flex-col items-center justify-center p-3 border border-slate-200 bg-white shadow-sm rounded-xl">
                    <div className="text-xs text-slate-800 font-medium mb-1 uppercase tracking-wider">{cName}</div>
                    <div className="text-2xl font-bold text-slate-800">{rate}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {Object.keys(analytics.section_wise).length > 0 && (
            <div className="bg-white border border-slate-100 shadow-sm rounded-2xl">
              <div className="px-4 py-3 border-b border-slate-200 bg-white font-bold text-slate-800 text-sm">
                Section-wise Attendance
              </div>
              <div className="p-4 flex flex-wrap gap-4">
                {Object.entries(analytics.section_wise).map(([sName, rate]) => {
                  const parts = sName.split(' - ');
                  const cName = parts[0];
                  const secName = parts[1] || '';
                  return (
                    <div key={sName} className="flex flex-col items-center justify-center p-3 border border-slate-200 bg-white shadow-sm min-w-[120px] rounded-xl">
                      <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-1">{cName}</div>
                      <div className="text-sm font-bold text-slate-800 mb-1 border-b border-slate-200 pb-1 w-full text-center">Sec {secName}</div>
                      <div className="text-xl font-bold text-slate-800 mt-1">{rate}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Table & Filters */}
      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl">
        <div className="p-4 border-b border-slate-200 bg-white flex flex-col xl:flex-row gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-800" />
            <input
              type="text"
              placeholder="Search by name or roll number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          
          <div className="flex flex-wrap gap-4">
            <input 
              type="date" 
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
            
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
            >
              <option value="">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Late">Late</option>
              <option value="Leave">Leave</option>
            </select>
            
            {filterStatus === 'Leave' && (
              <select
                value={filterLeaveType}
                onChange={e => setFilterLeaveType(e.target.value)}
                className="border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
              >
                <option value="">All Leave Types</option>
                <option value="Medical Leave">Medical Leave</option>
                <option value="Other Leave Types">Other Leave Types</option>
              </select>
            )}

            <select
              value={selectedClass}
              onChange={e => { setSelectedClass(e.target.value); setSelectedSection(''); }}
              className="border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
            >
              <option value="">All Classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.class_name}</option>
              ))}
            </select>
            <select
              value={selectedSection}
              onChange={e => setSelectedSection(e.target.value)}
              className="border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
              disabled={!selectedClass && classes.length > 0} // Only disable if classes are available but none selected
            >
              <option value="">All Sections</option>
              {sections.filter(s => !selectedClass || s.class_id === parseInt(selectedClass)).map(s => (
                <option key={s.id} value={s.id}>{s.section_name}</option>
              ))}
            </select>
            
            {user?.role === 'HEADMASTER' && (
              <select
                value={selectedTeacher}
                onChange={e => setSelectedTeacher(e.target.value)}
                className="border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
              >
                <option value="">All Teachers</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-200 text-xs uppercase tracking-wider text-slate-800">
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Roll No</th>
                <th className="p-4 font-semibold">Student Name</th>
                <th className="p-4 font-semibold">Class & Section</th>
                <th className="p-4 font-semibold text-center">Status</th>
                <th className="p-4 font-semibold text-center">Leave Type</th>
                <th className="p-4 font-semibold text-center">Attendance %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-800">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      Loading records...
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-800">No attendance records found.</td>
                </tr>
              ) : (
                filtered.map(record => (
                  <tr key={record.id} className="hover:bg-white transition">
                    <td className="p-4 font-medium text-slate-800">{record.date}</td>
                    <td className="p-4 font-medium text-slate-800">{record.roll_number}</td>
                    <td className="p-4 font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        {record.student_name}
                        {record.risk_level === 'High' && (
                          <span className="bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                            High Risk
                          </span>
                        )}
                        {record.risk_level === 'Medium' && (
                          <span className="bg-orange-50 text-orange-600 border border-orange-200 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                            Medium Risk
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-slate-800">{record.class_name} - {record.section_name}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center px-2 py-1 border text-xs font-bold ${getStatusColor(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="p-4 text-center text-slate-800 font-medium">
                      {record.leave_type || '-'}
                    </td>
                    <td className="p-4 text-center font-bold text-slate-800">
                      {record.attendance_percentage}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
