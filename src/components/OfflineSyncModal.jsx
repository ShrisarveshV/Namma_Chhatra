import React, { useState } from 'react';
import { X, WifiOff, RefreshCw, CheckCircle, Database } from 'lucide-react';
import api from '../services/api';

export default function OfflineSyncModal({ isOpen, onClose, onSyncComplete }) {
  const [syncing, setSyncing] = useState(false);
  const [syncResponse, setSyncResponse] = useState(null);

  // Mock queued offline scans
  const [offlineQueue, setOfflineQueue] = useState([
    { rfid: 'RFID-1002', timestamp: '08:22:15', date: new Date().toISOString().split('T')[0] },
    { rfid: 'RFID-1005', timestamp: '08:24:00', date: new Date().toISOString().split('T')[0] },
    { rfid: 'RFID-1008', timestamp: '08:29:45', date: new Date().toISOString().split('T')[0] },
    { rfid: 'RFID-1011', timestamp: '08:31:10', date: new Date().toISOString().split('T')[0] },
  ]);

  if (!isOpen) return null;

  const handleSync = async () => {
    if (offlineQueue.length === 0) return;
    setSyncing(true);
    setSyncResponse(null);

    try {
      const res = await api.post('/attendance/sync-offline', { scans: offlineQueue });
      setSyncResponse(res.data);
      setOfflineQueue([]);
      if (onSyncComplete) onSyncComplete();
    } catch (err) {
      setSyncResponse({ error: err.response?.data?.detail || 'Sync failed' });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-800/40 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
        
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white text-blue-600 border border-blue-600">
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Offline Attendance Sync Queue</h2>
              <p className="text-xs text-slate-800">Local Cache • Auto-Reconciliation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-800 hover:text-slate-800 hover:bg-white rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-800">
            <span>Pending Offline Scans ({offlineQueue.length})</span>
            <span className="text-blue-600 font-medium">Status: Cached locally</span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {offlineQueue.length > 0 ? (
              offlineQueue.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 shadow-sm rounded-2xl text-xs">
                  <div className="flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-blue-600" />
                    <span className="font-semibold text-slate-800">{item.rfid}</span>
                  </div>
                  <span className="text-slate-800">{item.date} {item.timestamp}</span>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-slate-800 text-xs bg-white rounded-xl border border-slate-200">
                Queue empty. All offline attendance logs have been synchronized!
              </div>
            )}
          </div>

          {syncResponse && (
            <div className={`p-3.5 rounded-xl border text-xs space-y-1 ${syncResponse.error ? 'bg-white border-slate-200 text-blue-600' : 'bg-white border-slate-200 text-blue-600'}`}>
              <div className="font-semibold flex items-center gap-1.5">
                <CheckCircle className={`w-4 h-4 ${syncResponse.error ? 'text-blue-600' : 'text-blue-600'}`} />
                {syncResponse.error || syncResponse.message}
              </div>
              {!syncResponse.error && syncResponse.total_scans !== undefined && (
                <div>Total: {syncResponse.total_scans} | Synced: {syncResponse.success_count} | Duplicates Ignored: {syncResponse.duplicate_count}</div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-800 hover:text-slate-800 font-medium">
            Close
          </button>
          <button
            onClick={handleSync}
            disabled={syncing || offlineQueue.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-600 text-white font-medium text-sm transition disabled:opacity-50"
          >
            {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sync Now
          </button>
        </div>

      </div>
    </div>
  );
}
