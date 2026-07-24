import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, X, AlertCircle, UserCheck } from 'lucide-react';
import api from '../services/api';

const emptyForm = {
  full_name: '', email: '', password: '', phone: '', employee_id: '', section_id: '',
};

export default function Teachers() {
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [allSections, setAllSections] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Assign modal
  const [assignModal, setAssignModal] = useState(false);
  const [assignTeacherId, setAssignTeacherId] = useState(null);
  const [assignClassId, setAssignClassId] = useState('');
  const [assignSectionId, setAssignSectionId] = useState('');
  const [assignSections, setAssignSections] = useState([]);
  const [assignError, setAssignError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [tRes, cRes, sRes, aRes] = await Promise.all([
        api.get('/teachers'),
        api.get('/classes'),
        api.get('/sections'),
        api.get('/assignments'),
      ]);
      setTeachers(tRes.data);
      setClasses(cRes.data);
      setAllSections(sRes.data);
      setAssignments(aRes.data);
    } catch {
      setError('Failed to load teachers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setForm(emptyForm);
    setEditId(null);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (t) => {
    setForm({
      full_name: t.full_name, email: t.email, password: '',
      phone: t.phone || '', employee_id: t.employee_id || '',
      section_id: '',
    });
    setEditId(t.id);
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.full_name || !form.email || (!editId && !form.password) || !form.employee_id) {
      setFormError('Name, Email, Employee ID are required. Password required for new teachers.');
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        const payload = { full_name: form.full_name, email: form.email, phone: form.phone, employee_id: form.employee_id };
        if (form.password) payload.password = form.password;
        await api.put(`/teachers/${editId}`, payload);
      } else {
        const payload = {
          full_name: form.full_name, email: form.email, password: form.password,
          phone: form.phone, employee_id: form.employee_id,
          section_ids: form.section_id ? [Number(form.section_id)] : [],
        };
        await api.post('/teachers', payload);
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
      await api.delete(`/teachers/${deleteId}`);
      setDeleteId(null);
      load();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Delete failed.');
    }
  };

  const openAssign = (teacherId) => {
    setAssignTeacherId(teacherId);
    setAssignClassId('');
    setAssignSectionId('');
    setAssignSections([]);
    setAssignError('');
    setAssignModal(true);
  };

  const onAssignClass = (cid) => {
    setAssignClassId(cid);
    setAssignSectionId('');
    setAssignSections(allSections.filter(s => String(s.class_id) === String(cid)));
  };

  const handleAddAssignment = async () => {
    if (!assignTeacherId || !assignSectionId) {
      setAssignError('Please select a class and section.');
      return;
    }
    try {
      await api.post('/assignments', { teacher_id: assignTeacherId, section_id: Number(assignSectionId) });
      setAssignModal(false);
      load();
    } catch (err) {
      setAssignError(err?.response?.data?.detail || 'Assignment failed.');
    }
  };

  const handleRemoveAssignment = async (aid) => {
    try {
      await api.delete(`/assignments/${aid}`);
      load();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Remove failed.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Teacher Management</h1>
          <p className="text-sm text-slate-800 mt-0.5">{teachers.length} teachers registered</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition">
          <Plus className="w-4 h-4" /> Add Teacher
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
        ) : teachers.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-800">
            <UserCheck className="w-8 h-8 mx-auto mb-2 text-slate-800" /> No teachers found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-white border-b border-slate-200 text-xs text-slate-800 uppercase tracking-wider">
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Employee ID</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Assigned Classes</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-100">
                {teachers.map((t, idx) => (
                  <tr key={t.id} className="hover:bg-white transition align-top">
                    <td className="px-4 py-3 text-slate-800 text-xs">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{t.full_name}</td>
                    <td className="px-4 py-3 text-slate-800 text-xs">{t.email}</td>
                    <td className="px-4 py-3 text-slate-800 font-mono text-xs">{t.employee_id}</td>
                    <td className="px-4 py-3 text-slate-800 text-xs">{t.phone || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {t.assignments?.map(a => (
                          <div key={a.assignment_id} className="flex items-center gap-1 bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs text-blue-700">
                            <span>{a.class_name} - {a.section_name}</span>
                            <button onClick={() => handleRemoveAssignment(a.assignment_id)}
                              className="text-blue-400 hover:text-blue-600 ml-1"><X className="w-3 h-3" /></button>
                          </div>
                        ))}
                        <button onClick={() => openAssign(t.id)}
                          className="px-2 py-0.5 border border-dashed border-slate-200 text-xs text-slate-800 hover:border-blue-400 hover:text-blue-600 transition">
                          + Assign
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => openEdit(t)}
                          className="p-1.5 border border-slate-200 text-slate-800 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteId(t.id)}
                          className="p-1.5 border border-slate-200 text-slate-800 hover:text-blue-600 hover:border-slate-200 hover:bg-white transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
          <div className="bg-white w-full max-w-lg border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
              <h2 className="font-bold text-slate-800">{editId ? 'Edit Teacher' : 'Add New Teacher'}</h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-800 hover:text-slate-800"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && <div className="p-3 bg-white border border-slate-200 text-blue-600 text-sm">{formError}</div>}
              <div className="grid grid-cols-2 gap-4">
                <TF label="Full Name *" value={form.full_name} onChange={v => setForm(f => ({ ...f, full_name: v }))} placeholder="Teacher name" />
                <TF label="Email *" type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="email@school.com" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <TF label={editId ? 'New Password (leave blank to keep)' : 'Password *'} type="password"
                  value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} placeholder="••••••••" />
                <TF label="Phone" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="+91 XXXXXXXXXX" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <TF label="Employee ID *" value={form.employee_id} onChange={v => setForm(f => ({ ...f, employee_id: v }))} placeholder="EMP1001" />
                {!editId && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5 uppercase tracking-wide">Assign Section</label>
                    <select value={form.section_id} onChange={e => setForm(f => ({ ...f, section_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 text-sm outline-none focus:border-blue-500">
                      <option value="">No section (assign later)</option>
                      {allSections.map(s => {
                        const cls = classes.find(c => c.id === s.class_id);
                        return <option key={s.id} value={s.id}>{cls?.class_name} — Section {s.section_name}</option>;
                      })}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="px-5 py-2 border border-slate-200 text-slate-800 text-sm font-semibold hover:bg-white transition">Cancel</button>
                <button type="submit" disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition disabled:opacity-60">
                  {saving ? 'Saving...' : editId ? 'Update Teacher' : 'Add Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Section Modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-800/40">
          <div className="bg-white w-80 border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white">
              <h2 className="font-bold text-slate-800 text-sm">Assign Section</h2>
              <button onClick={() => setAssignModal(false)}><X className="w-4 h-4 text-slate-800" /></button>
            </div>
            <div className="p-5 space-y-3">
              {assignError && <div className="p-2 bg-white border border-slate-200 text-blue-600 text-xs">{assignError}</div>}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5 uppercase tracking-wide">Class</label>
                <select value={assignClassId} onChange={e => onAssignClass(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 text-sm outline-none focus:border-blue-500">
                  <option value="">Select Class</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5 uppercase tracking-wide">Section</label>
                <select value={assignSectionId} onChange={e => setAssignSectionId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 text-sm outline-none focus:border-blue-500" disabled={!assignClassId}>
                  <option value="">Select Section</option>
                  {assignSections.map(s => <option key={s.id} value={s.id}>Section {s.section_name}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setAssignModal(false)}
                  className="flex-1 py-2 border border-slate-200 text-sm text-slate-800 font-semibold hover:bg-white">Cancel</button>
                <button onClick={handleAddAssignment}
                  className="flex-1 py-2 bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">Assign</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-800/40">
          <div className="bg-white border border-slate-200 shadow-xl p-6 w-80">
            <h3 className="font-bold text-slate-800 mb-2">Confirm Delete</h3>
            <p className="text-sm text-slate-800 mb-5">This will permanently delete the teacher account and all their section assignments.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 border border-slate-200 text-slate-800 text-sm font-semibold hover:bg-white">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold hover:bg-blue-600">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TF({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-800 mb-1.5 uppercase tracking-wide">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 border border-slate-200 text-sm outline-none focus:border-blue-500" />
    </div>
  );
}
