import React, { useState, useEffect } from 'react';
import { ShieldAlert, Download, Search, AlertCircle, Eye } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import api from '../services/api';
import StudentDetailsModal from '../components/StudentDetailsModal';

export default function HighRiskStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  useEffect(() => {
    fetchHighRisk();
  }, []);

  const fetchHighRisk = async () => {
    try {
      const res = await api.get('/high-risk');
      setStudents(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = students.filter(s => 
    s.student_name.toLowerCase().includes(search.toLowerCase()) || 
    s.roll_number.toLowerCase().includes(search.toLowerCase())
  );

  const getRiskColor = (level) => {
    switch (level?.toUpperCase()) {
      case 'HIGH':
      case 'HIGH RISK': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'MEDIUM':
      case 'MEDIUM RISK': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'LOW':
      case 'LOW RISK': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const exportCSV = () => {
    const data = filtered.map(s => ({
      'Roll Number': s.roll_number,
      'Name': s.student_name,
      'Class': s.class_name,
      'Section': s.section_name,
      'Risk Score': s.risk_score,
      'Risk Level': s.risk_level,
      'Reason': s.reason
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'high_risk_students.csv';
    link.click();
  };

  const exportExcel = () => {
    const data = filtered.map(s => ({
      'Roll Number': s.roll_number,
      'Name': s.student_name,
      'Class': s.class_name,
      'Section': s.section_name,
      'Risk Score': s.risk_score,
      'Risk Level': s.risk_level,
      'Reason': s.reason
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "High Risk");
    XLSX.writeFile(wb, 'high_risk_students.xlsx');
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text('High Risk Students Report', 14, 15);
    const tableData = filtered.map(s => [
      s.roll_number, s.student_name, s.class_name, s.section_name, s.risk_score, s.risk_level, s.reason
    ]);
    doc.autoTable({
      head: [['Roll', 'Name', 'Class', 'Section', 'Score', 'Level', 'Reason']],
      body: tableData,
      startY: 20,
    });
    doc.save('high_risk_students.pdf');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            High Risk Students
          </h1>
          <p className="text-sm text-slate-800 mt-1">Students requiring immediate attention.</p>
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

      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl">
        <div className="p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-800" />
            <input
              type="text"
              placeholder="Search by name or roll number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-200 text-xs uppercase tracking-wider text-slate-800">
                <th className="p-4 font-semibold">Roll Number</th>
                <th className="p-4 font-semibold">Student Name</th>
                <th className="p-4 font-semibold">Class</th>
                <th className="p-4 font-semibold">Section</th>
                <th className="p-4 font-semibold">Risk Score</th>
                <th className="p-4 font-semibold">Reason</th>
                <th className="p-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-800">Loading students...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-800">
                    <AlertCircle className="w-8 h-8 mx-auto text-slate-800 mb-2" />
                    No high risk students found.
                  </td>
                </tr>
              ) : (
                filtered.map(student => (
                  <tr key={student.id} className="hover:bg-white transition">
                    <td className="p-4 font-medium text-slate-800">{student.roll_number}</td>
                    <td className="p-4 font-semibold text-slate-800">{student.student_name}</td>
                    <td className="p-4 text-slate-800">{student.class_name}</td>
                    <td className="p-4 text-slate-800">{student.section_name}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-1 border text-xs font-bold ${getRiskColor(student.risk_level)}`}>
                        {student.risk_score}% - {student.risk_level}
                      </span>
                    </td>
                    <td className="p-4 text-slate-800 text-xs max-w-xs truncate" title={student.reason}>
                      {(() => {
                        try {
                          const r = JSON.parse(student.reason);
                          return Array.isArray(r) ? r.join(', ') : student.reason;
                        } catch {
                          return student.reason;
                        }
                      })()}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => setSelectedStudentId(student.id)}
                        className="text-blue-600 hover:text-blue-800 font-semibold flex items-center justify-end gap-1 ml-auto"
                      >
                        <Eye className="w-4 h-4" /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedStudentId && (
        <StudentDetailsModal
          studentId={selectedStudentId}
          onClose={() => setSelectedStudentId(null)}
        />
      )}
    </div>
  );
}
