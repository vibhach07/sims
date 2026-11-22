import React, { useEffect, useState } from 'react';
import { EnquiriesAPI, APIEnquiry } from '../../services/api';
import { CheckCircle2, Phone, Mail, Loader2, AlertCircle } from 'lucide-react';

export const AdminEnquiriesPage: React.FC = () => {
  const [enquiries, setEnquiries] = useState<APIEnquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEnquiries = () => {
    setIsLoading(true);
    EnquiriesAPI.list()
      .then(data => setEnquiries(data))
      .catch(err => setError(err.message || 'Failed to fetch enquiries.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const updateStatus = async (id: number, status: 'new' | 'contacted' | 'enrolled') => {
    try {
      await EnquiriesAPI.updateStatus(id, status);
      setEnquiries(prev => prev.map(e => e.id === id ? { ...e, status } : e));
    } catch (err: any) {
      alert(err.message || 'Failed to update enquiry status.');
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#D9A52E] mx-auto" />
        <p className="text-sm text-[#687386]">Loading enquiries from PostgreSQL database...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif font-bold text-3xl text-[#061426]">Admissions Enquiries</h1>
        <p className="text-sm text-[#687386] mt-1">
          Enquiries submitted via the SIMS contact form. Manage status and counseling follow-ups.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {enquiries.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-[#E3D8BE]">
          <p className="text-sm text-[#687386]">No student enquiries recorded yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border-2 border-[#E3D8BE] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#F8F4EA] text-[#263347] border-b border-[#E3D8BE]">
                <tr>
                  <th className="text-left p-4">Name</th>
                  <th className="text-left p-4">Contact</th>
                  <th className="text-left p-4">Course Interested</th>
                  <th className="text-left p-4">Message</th>
                  <th className="text-left p-4">Date</th>
                  <th className="text-center p-4">Status</th>
                  <th className="text-right p-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3D8BE]/40">
                {enquiries.map((enq) => (
                  <tr key={enq.id} className="hover:bg-[#FFF9ED] transition">
                    <td className="p-4 font-semibold text-[#061426]">{enq.name}</td>
                    <td className="p-4 space-y-1">
                      <div className="flex items-center gap-1.5 text-[#263347]">
                        <Mail className="w-3.5 h-3.5 text-[#687386]" />
                        <span>{enq.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#687386]">
                        <Phone className="w-3.5 h-3.5 text-[#687386]" />
                        <span>{enq.phone}</span>
                      </div>
                    </td>
                    <td className="p-4 font-medium text-[#061426]">{enq.courseInterested}</td>
                    <td className="p-4 text-[#687386] max-w-xs truncate" title={enq.message}>
                      {enq.message || '—'}
                    </td>
                    <td className="p-4 text-[#687386]">{enq.date || new Date(enq.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        enq.status === 'new' 
                          ? 'bg-amber-100 text-amber-800' 
                          : enq.status === 'contacted' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                      }`}>
                        {enq.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <select
                        value={enq.status}
                        onChange={(e) => updateStatus(enq.id, e.target.value as any)}
                        className="p-1 rounded border border-[#E3D8BE] text-xs bg-white text-[#061426]"
                      >
                        <option value="new">Mark New</option>
                        <option value="contacted">Mark Contacted</option>
                        <option value="enrolled">Mark Enrolled</option>
                      </select>
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
