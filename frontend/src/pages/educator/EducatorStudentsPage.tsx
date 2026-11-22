import React, { useEffect, useState } from 'react';
import { ProgressAPI, APIEducatorStudentItem } from '../../services/api';
import { Users, Search, Loader2, AlertCircle } from 'lucide-react';

export const EducatorStudentsPage: React.FC = () => {
  const [students, setStudents] = useState<APIEducatorStudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ProgressAPI.educatorStudents()
      .then((data) => setStudents(data))
      .catch((err) => setError(err.message || 'Failed to load students roster.'))
      .finally(() => setLoading(false));
  }, []);

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.course.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif font-bold text-3xl text-[#061426]">My Students</h1>
          <p className="text-sm text-slate-500 mt-1">
            Scoped roster of candidates enrolled in your courses or participating in your mock examinations.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search */}
      <div className="bg-white p-3.5 rounded-xl border border-[#E3D8BE] flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-400 ml-1" />
        <input
          type="text"
          placeholder="Search by student name, email, or course..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-xs bg-transparent focus:outline-none"
        />
      </div>

      <div className="bg-white rounded-2xl border border-[#E3D8BE] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#F8F4EA] text-[#263347] border-b border-[#E3D8BE]">
              <tr>
                <th className="text-left p-4">Candidate</th>
                <th className="text-left p-4">Course / Program</th>
                <th className="text-center p-4">Mock Tests Taken</th>
                <th className="text-center p-4">Avg Score</th>
                <th className="text-left p-4">Last Active</th>
                <th className="text-center p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3D8BE]/40">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-[#D9A52E] mx-auto mb-2" />
                    <span>Loading student roster...</span>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500">
                    No candidates found in your courses or test series.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-[#FFF9ED] transition">
                    <td className="p-4">
                      <div className="font-semibold text-[#061426] text-sm">{s.name}</div>
                      <div className="text-[11px] text-slate-400">{s.email}</div>
                    </td>
                    <td className="p-4 text-slate-700">{s.course}</td>
                    <td className="p-4 text-center font-bold text-slate-900">{s.attemptsCount}</td>
                    <td className="p-4 text-center">
                      <span className={`font-bold ${s.avgScore >= 70 ? 'text-emerald-700' : s.avgScore >= 50 ? 'text-amber-700' : 'text-red-600'}`}>
                        {s.avgScore}%
                      </span>
                    </td>
                    <td className="p-4 text-slate-500">{s.lastActive}</td>
                    <td className="p-4 text-center">
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
                        {s.status}
                      </span>
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
};

export default EducatorStudentsPage;
