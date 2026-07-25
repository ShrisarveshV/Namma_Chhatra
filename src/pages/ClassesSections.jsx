import React, { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw, BookOpen, AlertCircle, X } from 'lucide-react';
import api from '../services/api';

export default function ClassesSections() {
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add Class
  const [newClassName, setNewClassName] = useState('');
  const [classError, setClassError] = useState('');

  // Add Section
  const [selectedClassId, setSelectedClassId] = useState('');
  const [newSectionName, setNewSectionName] = useState('');
  const [sectionError, setSectionError] = useState('');

  // Add Assignment
  const [aTeacherId, setATeacherId] = useState('');
  const [aClassId, setAClassId] = useState('');
  const [aSectionId, setASectionId] = useState('');
  const [aSections, setASections] = useState([]);
  const [aError, setAError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [cRes, sRes, aRes, tRes] = await Promise.all([
        api.get('/classes'),
        api.get('/sections'),
        api.get('/assignments'),
        api.get('/teachers'),
      ]);
      setClasses(cRes.data);
      setSections(sRes.data);
      setAssignments(aRes.data);
      setTeachers(tRes.data);
    } catch {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const addClass = async (e) => {
    e.preventDefault();
    setClassError('');
    if (!newClassName.trim()) { setClassError('Class name is required.'); return; }
    try {
      await api.post('/classes', { class_name: newClassName.trim() });
      setNewClassName('');
      load();
    } catch (err) {
      setClassError(err?.response?.data?.detail || 'Failed to add class.');
    }
  };

  const deleteClass = async (id) => {
    if (!window.confirm('Delete this class? This will fail if students are enrolled.')) return;
    try {
      await api.delete(`/classes/${id}`);
      load();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Cannot delete class.');
    }
  };

  const addSection = async (e) => {
    e.preventDefault();
    setSectionError('');
    if (!selectedClassId || !newSectionName.trim()) {
      setSectionError('Select a class and enter section name.');
      return;
    }
    try {
      await api.post('/sections', { class_id: Number(selectedClassId), section_name: newSectionName.trim() });
      setNewSectionName('');
      load();
    } catch (err) {
      setSectionError(err?.response?.data?.detail || 'Failed to add section.');
    }
  };

  const deleteSection = async (id) => {
    if (!window.confirm('Delete this section?')) return;
    try {
      await api.delete(`/sections/${id}`);
      load();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Cannot delete section.');
    }
  };

  const onAClassChange = (cid) => {
    setAClassId(cid);
    setASectionId('');
    setASections(sections.filter(s => String(s.class_id) === String(cid)));
  };

  const addAssignment = async (e) => {
    e.preventDefault();
    setAError('');
    if (!aTeacherId || !aSectionId) { setAError('Select teacher and section.'); return; }
    try {
      await api.post('/assignments', { teacher_id: Number(aTeacherId), section_id: Number(aSectionId) });
      setATeacherId(''); setAClassId(''); setASectionId(''); setASections([]);
      load();
    } catch (err) {
      setAError(err?.response?.data?.detail || 'Assignment failed.');
    }
  };

  const removeAssignment = async (id) => {
    try {
      await api.delete(`/assignments/${id}`);
      load();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Remove failed.');
    }
  };

  if (loading) return (
    <div className="py-12 flex items-center justify-center gap-2 text-slate-800 text-sm">
      <RefreshCw className="w-4 h-4 animate-spin" /> Loading...
    </div>
  );

  if (error) return (
    <div className="py-10 flex flex-col items-center text-blue-600 gap-2">
      <AlertCircle className="w-6 h-6" /><span className="text-sm">{error}</span>
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Classes & Sections</h1>
        <p className="text-sm text-slate-800 mt-0.5">Manage classes, sections, and teacher assignments</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── Classes Panel ── */}
        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
            <h2 className="font-bold text-slate-800">Classes ({classes.length})</h2>
          </div>
          <div className="p-5 space-y-4">
            <form onSubmit={addClass} className="flex gap-2">
              <input value={newClassName} onChange={e => setNewClassName(e.target.value)}
                placeholder="e.g. Class 11"
                className="flex-1 px-3 py-2 border border-slate-200 text-sm outline-none focus:border-blue-500" />
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Add
              </button>
            </form>
            {classError && <p className="text-xs text-blue-600">{classError}</p>}
            <div className="space-y-1.5">
              {classes.length === 0 ? (
                <p className="text-sm text-slate-800 text-center py-4">No classes yet.</p>
              ) : classes.map(c => {
                const secCount = sections.filter(s => s.class_id === c.id).length;
                return (
                  <div key={c.id} className="flex items-center justify-between px-3 py-2.5 bg-white border border-slate-200">
                    <div>
                      <span className="font-semibold text-slate-800 text-sm">{c.class_name}</span>
                      <span className="ml-2 text-xs text-slate-800">{secCount} section{secCount !== 1 ? 's' : ''}</span>
                    </div>
                    <button onClick={() => deleteClass(c.id)}
                      className="p-1 text-slate-800 hover:text-blue-600 hover:bg-white transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Sections Panel ── */}
        <div className="bg-white border border-slate-100 shadow-sm rounded-2xl">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
            <h2 className="font-bold text-slate-800">Sections ({sections.length})</h2>
          </div>
          <div className="p-5 space-y-4">
            <form onSubmit={addSection} className="space-y-2">
              <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 text-sm outline-none focus:border-blue-500">
                <option value="">Select Class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
              </select>
              <div className="flex gap-2">
                <input value={newSectionName} onChange={e => setNewSectionName(e.target.value)}
                  placeholder="Section name (e.g. D)"
                  className="flex-1 px-3 py-2 border border-slate-200 text-sm outline-none focus:border-blue-500" />
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            </form>
            {sectionError && <p className="text-xs text-blue-600">{sectionError}</p>}
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {sections.length === 0 ? (
                <p className="text-sm text-slate-800 text-center py-4">No sections yet.</p>
              ) : classes.map(c => {
                const classSecs = sections.filter(s => s.class_id === c.id);
                if (!classSecs.length) return null;
                return (
                  <div key={c.id}>
                    <div className="text-xs font-semibold text-slate-800 uppercase tracking-wider px-1 py-1.5">{c.class_name}</div>
                    {classSecs.map(s => (
                      <div key={s.id} className="flex items-center justify-between px-3 py-2 bg-white border border-slate-200 mb-1">
                        <span className="text-sm text-slate-800">Section {s.section_name}</span>
                        <button onClick={() => deleteSection(s.id)}
                          className="p-1 text-slate-800 hover:text-blue-600 hover:bg-white transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Teacher Assignments ── */}
      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="font-bold text-slate-800">Teacher — Section Assignments</h2>
          <p className="text-xs text-slate-500 mt-0.5">Assign teachers to class sections</p>
        </div>
        <div className="p-5 space-y-4">
          <form onSubmit={addAssignment} className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5 uppercase tracking-wide">Teacher</label>
              <select value={aTeacherId} onChange={e => setATeacherId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 text-sm outline-none focus:border-blue-500">
                <option value="">Select Teacher</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5 uppercase tracking-wide">Class</label>
              <select value={aClassId} onChange={e => onAClassChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 text-sm outline-none focus:border-blue-500">
                <option value="">Select Class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5 uppercase tracking-wide">Section</label>
              <select value={aSectionId} onChange={e => setASectionId(e.target.value)} disabled={!aClassId}
                className="w-full px-3 py-2 border border-slate-200 text-sm outline-none focus:border-blue-500">
                <option value="">Select Section</option>
                {aSections.map(s => <option key={s.id} value={s.id}>Section {s.section_name}</option>)}
              </select>
            </div>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold hover:bg-blue-600 transition flex items-center gap-1.5 justify-center">
              <Plus className="w-4 h-4" /> Assign
            </button>
          </form>
          {aError && <p className="text-xs text-blue-600">{aError}</p>}

          <div className="overflow-x-auto">
            {assignments.length === 0 ? (
              <p className="text-sm text-slate-800 text-center py-4">No assignments yet.</p>
            ) : (
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-white border-b border-slate-200 text-xs text-slate-800 uppercase tracking-wider">
                    <th className="px-4 py-3 font-semibold">#</th>
                    <th className="px-4 py-3 font-semibold">Teacher</th>
                    <th className="px-4 py-3 font-semibold">Class</th>
                    <th className="px-4 py-3 font-semibold">Section</th>
                    <th className="px-4 py-3 text-right font-semibold">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100">
                  {assignments.map((a, idx) => (
                    <tr key={a.id} className="hover:bg-white transition">
                      <td className="px-4 py-3 text-slate-800 text-xs">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{a.teacher_name}</td>
                      <td className="px-4 py-3 text-slate-800">{a.class_name}</td>
                      <td className="px-4 py-3 text-slate-800">Section {a.section_name}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => removeAssignment(a.id)}
                          className="p-1.5 border border-slate-200 text-slate-800 hover:text-blue-600 hover:border-slate-200 hover:bg-white transition">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
