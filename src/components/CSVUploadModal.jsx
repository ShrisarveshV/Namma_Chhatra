import React, { useState } from 'react';
import { X, UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../services/api';

export default function CSVUploadModal({ isOpen, onClose, onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/attendance/upload-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult({ success: true, data: res.data });
      if (onUploadComplete) onUploadComplete();
    } catch (err) {
      setResult({
        success: false,
        message: err.response?.data?.detail || 'CSV upload failed'
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-800/40 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
        
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-white">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            Bulk CSV Attendance Import
          </h2>
          <button onClick={onClose} className="p-2 text-slate-800 hover:text-slate-800 hover:bg-white rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-800">
            Upload CSV with columns: <code className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-xl">student_id</code> or <code className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-xl">rfid</code>, <code className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-xl">date</code>, <code className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-xl">time</code>, <code className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-xl">status</code>.
          </p>

          <label className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer bg-white hover:bg-blue-50/50 transition group">
            <UploadCloud className="w-10 h-10 text-slate-800 group-hover:text-blue-500 mb-2 transition" />
            <span className="text-sm font-medium text-slate-800">
              {file ? file.name : "Click to choose CSV file or drag here"}
            </span>
            <span className="text-xs text-slate-800 mt-1">Supports .csv files up to 5MB</span>
            <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
          </label>

          {result && (
            <div className={`p-4 rounded-xl text-xs space-y-1 border ${result.success ? 'bg-white border-slate-200 text-blue-600' : 'bg-white border-slate-200 text-blue-600'}`}>
              {result.success ? (
                <div>
                  <div className="font-semibold text-sm flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    CSV Import Successful!
                  </div>
                  <div>Processed: {result.data.processed} | Added: {result.data.added} | Duplicate Skipped: {result.data.skipped}</div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertCircle className="w-4 h-4 text-blue-600" />
                  {result.message}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-800 hover:text-slate-800 font-medium">
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition disabled:opacity-50"
          >
            {uploading ? 'Processing...' : 'Upload & Import'}
          </button>
        </div>

      </div>
    </div>
  );
}
