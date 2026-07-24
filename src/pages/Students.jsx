import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, RefreshCw, X, AlertCircle, Users, Download, Eye } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StudentDetailsModal from '../components/StudentDetailsModal';

const GENDERS = ['Male', 'Female', 'Other'];

const emptyForm = {
  roll_number: '', student_name: '', gender: 'Male', dob: '',
  class_id: '', section_id: '', parent_name: '', parent_phone: '',
  address: '', aadhaar: '', admission_number: '', joining_date: '',
  teacher_remarks: ''
};

export default function Students() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [allSections, setAllSections] = useState([]);
  const [filteredSections, setFilteredSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterRisk, setFilterRisk] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [viewDetailsId, setViewDetailsId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [modalSections, setModalSections] = useState([]);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteId, setDeleteId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const promises = [
        api.get('/students', { 
          params: { 
            class_id: filterClass || undefined, 
            section_id: filterSection || undefined, 
            gender: filterGender || undefined,
            teacher_id: filterTeacher || undefined,
            search: search || undefined,
            risk_category: filterRisk || undefined
          } 
        }),
        api.get('/classes'),
        api.get('/sections')
      ];
      
      if (user?.role === 'HEADMASTER') {
        promises.push(api.get('/teachers'));
      }
      
      const res = await Promise.all(promises);
      setStudents(res[0].data);
      setClasses(res[1].data);
      setAllSections(res[2].data);
      
      if (user?.role === 'HEADMASTER' && res[3]) {
        setTeachers(res[3].data);
      }
    } catch {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filterClass, filterSection, filterGender, filterTeacher, filterRisk]);

  const handleSearch = (e) => {
    e.preventDefault();
    load();
  };

  // When filter class changes, update section dropdown
  useEffect(() => {
    if (filterClass) {
      setFilteredSections(allSections.filter(s => String(s.class_id) === String(filterClass)));
    } else {
      setFilteredSections(allSections);
    }
    setFilterSection('');
  }, [filterClass, allSections]);

  // When modal class changes
  const onModalClassChange = (classId) => {
    setForm(f => ({ ...f, class_id: classId, section_id: '' }));
    setModalSections(allSections.filter(s => String(s.class_id) === String(classId)));
  };

  const openAdd = () => {
    setForm(emptyForm);
    setEditId(null);
    setFormError('');
    setModalSections([]);
    setModalOpen(true);
  };

  const openEdit = (s) => {
    setForm({
      roll_number: s.roll_number, student_name: s.student_name,
      gender: s.gender, dob: s.dob || '',
      class_id: String(s.class_id), section_id: String(s.section_id),
      parent_name: s.parent_name, parent_phone: s.parent_phone,
      address: s.address, aadhaar: s.aadhaar || '',
      admission_number: s.admission_number || '',
      joining_date: s.joining_date || '',
      teacher_remarks: s.teacher_remarks || ''
    });
    setModalSections(allSections.filter(sec => String(sec.class_id) === String(s.class_id)));
    setEditId(s.id);
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    if (user?.role === 'HEADMASTER') {
      if (!form.roll_number || !form.student_name || !form.class_id || !form.section_id) {
        setFormError('Roll Number, Name, Class, and Section are required.');
        return;
      }
    }
    
    setSaving(true);
    try {
      const payload = {
        ...form,
        class_id: Number(form.class_id),
        section_id: Number(form.section_id),
        dob: form.dob || null,
        joining_date: form.joining_date || null,
        aadhaar: form.aadhaar || null,
        admission_number: form.admission_number || null,
      };
      
      // If teacher, strip out fields they can't edit
      if (user?.role === 'TEACHER') {
        const teacherPayload = {
          teacher_remarks: form.teacher_remarks,
          parent_phone: form.parent_phone,
          address: form.address
        };
        await api.put(`/students/${editId}`, teacherPayload);
      } else {
        if (editId) {
          await api.put(`/students/${editId}`, payload);
        } else {
          await api.post('/students', payload);
        }
      }
      
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(err?.response?.data?.detail || 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/students/${deleteId}`);
      setDeleteId(null);
      load();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Delete failed.');
    }
  };

  const cls = (id) => classes.find(c => c.id === id)?.class_name || '';
  const sec = (id) => allSections.find(s => s.id === id)?.section_name || '';

  const exportCSV = () => {
    const data = students.map(s => ({
      'Roll Number': s.roll_number,
      'Name': s.student_name,
      'Gender': s.gender,
      'Class': cls(s.class_id),
      'Section': sec(s.section_id),
      'Parent Name': s.parent_name,
      'Parent Phone': s.parent_phone,
      'Admission Number': s.admission_number || 'N/A'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'students.csv';
    link.click();
  };

  const exportExcel = () => {
    const data = students.map(s => ({
      'Roll Number': s.roll_number,
      'Name': s.student_name,
      'Gender': s.gender,
      'Class': cls(s.class_id),
      'Section': sec(s.section_id),
      'Parent Name': s.parent_name,
      'Parent Phone': s.parent_phone,
      'Admission Number': s.admission_number || 'N/A'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, 'students.xlsx');
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text('Students List', 14, 15);
    const tableData = students.map(s => [
      s.roll_number, s.student_name, s.gender, cls(s.class_id), sec(s.section_id), s.parent_phone
    ]);
    doc.autoTable({
      head: [['Roll No', 'Name', 'Gender', 'Class', 'Section', 'Parent Phone']],
      body: tableData,
      startY: 20,
    });
    doc.save('students.pdf');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            Student Management
          </h1>
          <p className="text-sm text-slate-800 mt-0.5">{students.length} students found</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportCSV} className="bg-white border border-slate-200 text-slate-800 px-3 py-1.5 text-sm font-semibold hover:bg-white flex items-center gap-2 transition shadow-sm">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={exportExcel} className="bg-white border border-slate-200 text-slate-800 px-3 py-1.5 text-sm font-semibold hover:bg-white flex items-center gap-2 transition shadow-sm">
            <Download className="w-4 h-4" /> Excel
          </button>
          <button onClick={exportPDF} className="bg-white border border-slate-200 text-slate-800 px-3 py-1.5 text-sm font-semibold hover:bg-white flex items-center gap-2 transition shadow-sm">
            <Download className="w-4 h-4" /> PDF
          </button>
          {user?.role === 'HEADMASTER' && (
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition">
              <Plus className="w-4 h-4" /> Add Student
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-6 flex flex-wrap gap-3 items-center shadow-sm">
        <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto md:flex-1 min-w-[240px]">
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or roll number..."
            className="flex-1 px-3 py-2 border border-slate-200 rounded-full text-sm outline-none focus:border-blue-500 shadow-sm"
          />
          <button type="submit" className="px-4 py-2 bg-slate-800 text-white rounded-full text-sm font-semibold hover:bg-slate-700 transition flex items-center gap-1.5 shadow-sm">
            <Search className="w-4 h-4" /> Search
          </button>
        </form>
            
            <select value={filterRisk} onChange={(e) => setFilterRisk(e.target.value)}
              className="px-3 py-2 border border-slate-200 text-sm outline-none focus:border-blue-500 bg-white rounded-full shadow-sm min-w-[120px]">
              <option value="">All Risks</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
              <option value="Safe">Safe</option>
            </select>
            <select value={filterGender} onChange={(e) => setFilterGender(e.target.value)}
              className="bg-white border border-slate-200 rounded-full px-4 py-1.5 shadow-sm text-sm outline-none focus:border-blue-500 min-w-[120px]">
              <option value="">All Genders</option>
              {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>

            <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
              className="px-3 py-2 border border-slate-200 text-sm outline-none focus:border-blue-500 bg-white">
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
            </select>
            <select value={filterSection} onChange={e => setFilterSection(e.target.value)}
              className="px-3 py-2 border border-slate-200 text-sm outline-none focus:border-blue-500 bg-white">
              <option value="">All Sections</option>
              {filteredSections.map(s => <option key={s.id} value={s.id}>Section {s.section_name}</option>)}
            </select>
            <select value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)}
              className="px-3 py-2 border border-slate-200 text-sm outline-none focus:border-blue-500 bg-white">
              <option value="">All Teachers</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          
        <button onClick={() => { setSearch(''); setFilterClass(''); setFilterSection(''); setFilterGender(''); setFilterTeacher(''); setFilterRisk(''); load(); }}
          className="px-3 py-2 border border-slate-200 text-sm text-slate-800 hover:bg-white transition">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl">
        {loading ? (
          <div className="py-12 flex items-center justify-center gap-2 text-slate-800 text-sm">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading...
          </div>
        ) : error ? (
          <div className="py-10 flex flex-col items-center text-blue-600 gap-2">
            <AlertCircle className="w-6 h-6" /><span className="text-sm">{error}</span>
          </div>
        ) : students.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-800">
            <Users className="w-8 h-8 mx-auto mb-2 text-slate-800" /> No students found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-white border-b border-slate-200 text-xs text-slate-800 uppercase tracking-wider">
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Roll No</th>
                  <th className="px-4 py-3 font-semibold">Student Name</th>
                  <th className="px-4 py-3 font-semibold">Gender</th>
                  <th className="px-4 py-3 font-semibold">Class</th>
                  <th className="px-4 py-3 font-semibold">Section</th>
                  <th className="px-4 py-3 font-semibold">Parent Phone</th>
                  <th className="px-4 py-3 font-semibold">Admission No</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-100">
                {students.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-white transition">
                    <td className="px-4 py-3 text-slate-800 text-xs">{idx + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-800">{s.roll_number}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{s.student_name}</td>
                    <td className="px-4 py-3 text-slate-800">{s.gender}</td>
                    <td className="px-4 py-3 text-slate-800">{cls(s.class_id)}</td>
                    <td className="px-4 py-3 text-slate-800">{sec(s.section_id)}</td>
                    <td className="px-4 py-3 text-slate-800 text-xs">{s.parent_phone}</td>
                    <td className="px-4 py-3 text-slate-800 text-xs">{s.admission_number || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => setViewDetailsId(s.id)}
                          className="p-1.5 border border-slate-200 text-slate-800 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition" title="View Info">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => openEdit(s)}
                          className="p-1.5 border border-slate-200 text-slate-800 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition" title="Edit">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {user?.role === 'HEADMASTER' && (
                          <button onClick={() => setDeleteId(s.id)}
                            className="p-1.5 border border-slate-200 text-slate-800 hover:text-blue-600 hover:border-slate-200 hover:bg-white transition">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-800/40">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
              <h2 className="font-bold text-slate-800">{editId ? 'Edit Student' : 'Add New Student'}</h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-800 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-white border border-slate-200 text-blue-600 text-sm">{formError}</div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <Field label="Roll Number *" value={form.roll_number} onChange={v => setForm(f => ({ ...f, roll_number: v }))} placeholder="e.g. STU10A001" disabled={user?.role === 'TEACHER'} />
                <Field label="Student Name *" value={form.student_name} onChange={v => setForm(f => ({ ...f, student_name: v }))} placeholder="Full name" disabled={user?.role === 'TEACHER'} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5 uppercase tracking-wide">Gender *</label>
                  <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} disabled={user?.role === 'TEACHER'}
                    className="w-full px-3 py-2 border border-slate-200 text-sm outline-none focus:border-blue-500 disabled:bg-white disabled:text-slate-800">
                    {GENDERS.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <Field label="Date of Birth" type="date" value={form.dob} onChange={v => setForm(f => ({ ...f, dob: v }))} disabled={user?.role === 'TEACHER'} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5 uppercase tracking-wide">Class *</label>
                  <select value={form.class_id} onChange={e => onModalClassChange(e.target.value)} disabled={user?.role === 'TEACHER'}
                    className="w-full px-3 py-2 border border-slate-200 text-sm outline-none focus:border-blue-500 disabled:bg-white disabled:text-slate-800">
                    <option value="">Select Class</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5 uppercase tracking-wide">Section *</label>
                  <select value={form.section_id} onChange={e => setForm(f => ({ ...f, section_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 text-sm outline-none focus:border-blue-500 disabled:bg-white disabled:text-slate-800"
                    disabled={!form.class_id || user?.role === 'TEACHER'}>
                    <option value="">Select Section</option>
                    {modalSections.map(s => <option key={s.id} value={s.id}>Section {s.section_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Parent Name *" value={form.parent_name} onChange={v => setForm(f => ({ ...f, parent_name: v }))} placeholder="Parent/Guardian name" disabled={user?.role === 'TEACHER'} />
                <Field label="Parent Phone *" value={form.parent_phone} onChange={v => setForm(f => ({ ...f, parent_phone: v }))} placeholder="+91 XXXXXXXXXX" />
              </div>
              <Field label="Address *" value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} placeholder="Full address" />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Admission Number" value={form.admission_number} onChange={v => setForm(f => ({ ...f, admission_number: v }))} placeholder="Optional" disabled={user?.role === 'TEACHER'} />
                <Field label="Joining Date" type="date" value={form.joining_date} onChange={v => setForm(f => ({ ...f, joining_date: v }))} disabled={user?.role === 'TEACHER'} />
              </div>
              <Field label="Aadhaar Number (optional)" value={form.aadhaar} onChange={v => setForm(f => ({ ...f, aadhaar: v }))} placeholder="XXXX XXXX XXXX" disabled={user?.role === 'TEACHER'} />
              
              {user?.role === 'TEACHER' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5 uppercase tracking-wide">Teacher Remarks</label>
                  <textarea 
                    value={form.teacher_remarks} 
                    onChange={e => setForm(f => ({ ...f, teacher_remarks: e.target.value }))}
                    placeholder="Add observations about student behavior, academic performance, or issues..."
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-200 text-sm outline-none focus:border-blue-500 resize-none"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="px-5 py-2 border border-slate-200 text-slate-800 text-sm font-semibold hover:bg-white transition">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition disabled:opacity-60">
                  {saving ? 'Saving...' : editId ? 'Update Student' : 'Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-800/40">
          <div className="bg-white border border-slate-200 shadow-xl p-6 w-80">
            <h3 className="font-bold text-slate-800 mb-2">Confirm Delete</h3>
            <p className="text-sm text-slate-800 mb-5">This will permanently delete the student and all their attendance records. This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 border border-slate-200 text-slate-800 text-sm font-semibold hover:bg-white">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold hover:bg-blue-600">Delete</button>
            </div>
          </div>
        </div>
      )}

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

function Field({ label, value, onChange, placeholder, type = 'text', disabled = false }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-800 mb-1.5 uppercase tracking-wide">{label}</label>
      <input 
        type={type} 
        value={value} 
        onChange={e => onChange(e.target.value)} 
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-3 py-2 border border-slate-200 text-sm outline-none focus:border-blue-500 disabled:bg-white disabled:text-slate-800" 
      />
    </div>
  );
}
