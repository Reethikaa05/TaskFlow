import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { Database } from 'lucide-react';

export default function DatabasePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'db'],
    queryFn: () => api.get('/admin/db').then(res => res.data.db),
  });

  if (isLoading) return <div className="p-8">Loading database...</div>;

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <Database className="text-brand-400" /> Inbuilt Database Viewer
          </h1>
          <p className="text-slate-400">View the raw SQLite tables and data in real-time.</p>
        </div>

        {Object.entries(data || {}).map(([tableName, rows]) => (
          <div key={tableName} className="bg-surface-1 border border-white/5 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02]">
              <h2 className="text-lg font-semibold text-white capitalize">{tableName}</h2>
              <p className="text-sm text-slate-500">{rows.length} records</p>
            </div>
            <div className="overflow-x-auto">
              {rows.length === 0 ? (
                <div className="px-6 py-4 text-sm text-slate-500 italic">No records found.</div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-400">
                      {Object.keys(rows[0]).map((col) => (
                        <th key={col} className="px-6 py-3 font-medium whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {rows.map((row, i) => (
                      <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                        {Object.entries(row).map(([col, val], j) => (
                          <td key={j} className="px-6 py-3 whitespace-nowrap text-slate-300">
                            {val === null ? <span className="text-slate-600">NULL</span> : String(val).substring(0, 50) + (String(val).length > 50 ? '...' : '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
