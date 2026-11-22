import React, { useEffect, useState } from 'react';
import { AuditAPI, APIAuditLog } from '../../services/api';
import { Activity, Loader2, AlertCircle, Calendar } from 'lucide-react';

export const EducatorActivityPage: React.FC = () => {
  const [logs, setLogs] = useState<APIAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    AuditAPI.educatorActivity()
      .then((data) => setLogs(data.results || []))
      .catch((e: any) => setError(e.message || 'Failed to load activity logs.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif font-bold text-3xl text-[#061426]">My Activity Log</h1>
        <p className="text-sm text-slate-500 mt-1">
          Immutable audit record of all curriculum modifications, reviews, and resource management actions.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E3D8BE] overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 text-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#D9A52E] mx-auto" />
            <p className="text-xs text-slate-400">Loading audit log...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <Activity className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-sm font-semibold text-slate-700">No activity yet</div>
            <p className="text-xs text-slate-400">
              Actions such as creating courses, uploading tests and submitting reviews will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <div key={log.id} className="p-4 sm:p-5 flex items-start justify-between gap-4 text-xs hover:bg-slate-50 transition">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                      {log.action.replace('_', ' ')}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {log.object_type.replace('_', ' ')}: {log.object_title}
                    </span>
                  </div>

                  {log.changes && Object.keys(log.changes).length > 0 && (
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 font-mono text-[11px] text-slate-600">
                      {Object.entries(log.changes).map(([k, v]) => (
                        <div key={k} className="truncate">
                          <span className="font-semibold text-slate-700">{k}:</span>{' '}
                          {Array.isArray(v) && v.length === 2 ? (
                            <span>
                              <span className="text-rose-600 line-through">{String(v[0] ?? 'empty')}</span>
                              {' → '}
                              <span className="text-emerald-700 font-bold">{String(v[1] ?? 'empty')}</span>
                            </span>
                          ) : (
                            <span>{JSON.stringify(v)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-right flex-shrink-0 text-[10px] text-slate-400">
                  <div>{new Date(log.created_at).toLocaleDateString()}</div>
                  <div>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EducatorActivityPage;
