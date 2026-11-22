import React, { useEffect, useState } from 'react';
import { DashboardAPI, APIEducatorStudent } from '../../services/api';
import { Users, Mail, BookOpen, Clock, Loader2, AlertCircle } from 'lucide-react';

export const AdminStudentsPage: React.FC = () => {
  const [students, setStudents] = useState<APIEducatorStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    DashboardAPI.educatorStudents()
      .then(data => setStudents(data))
      .catch(err => setError(err.message || 'Failed to fetch student directory.'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="py-20 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#D9A52E] mx-auto" />
        <p className="text-sm text-[#687386]">Loading student roster from PostgreSQL database...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif font-bold text-3xl text-[#061426]">Student Directory Administration</h1>
          <p className="text-sm text-[#687386] mt-1">
            Registered student candidates, program enrolments, and assessment participation.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {students.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-[#E3D8BE]">
          <p className="text-sm text-[#687386]">No registered students found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border-2 border-[#E3D8BE] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#F8F4EA] text-[#263347] border-b border-[#E3D8BE]">
                <tr>
                  <th className="text-left p-4">Roll ID</th>
                  <th className="text-left p-4">Student</th>
                  <th className="text-left p-4">Enrolled Program</th>
                  <th className="text-center p-4">Tests Taken</th>
                  <th className="text-center p-4">Avg Score</th>
                  <th className="text-left p-4">Last Activity</th>
                  <th className="text-center p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3D8BE]/40">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-[#FFF9ED] transition">
                    <td className="p-4 font-mono font-semibold text-[#A87519]">{student.id}</td>
                    <td className="p-4 font-semibold text-[#061426]">
                      <div>{student.name}</div>
                      <div className="text-[11px] text-[#687386] font-normal">{student.email}</div>
                    </td>
                    <td className="p-4 text-[#263347] font-medium">{student.course}</td>
                    <td className="p-4 text-center font-bold text-[#061426]">{student.attemptsCount}</td>
                    <td className="p-4 text-center font-bold text-emerald-700">{student.avgScore}%</td>
                    <td className="p-4 text-[#687386]">{student.lastActive}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        student.status === 'Active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {student.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
