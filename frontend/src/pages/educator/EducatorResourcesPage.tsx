import React, { useEffect, useState } from 'react';
import { 
  StudyResourcesAPI, APIStudyResource 
} from '../../services/api';
import { 
  FileText, Plus, Send, Trash2, Edit2, Search, CheckCircle2, 
  Clock, XCircle, AlertCircle, Loader2, Download, ExternalLink, X
} from 'lucide-react';

export const EducatorResourcesPage: React.FC = () => {
  const [resources, setResources] = useState<APIStudyResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<APIStudyResource | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    exam: 'CSIR NET',
    category: 'after-msc-btech',
    resource_type: 'notes',
    file_format: 'PDF',
    pages: 20,
    description: '',
    file_url: 'https://simsraipuredu.in/resources/sample-handbook.pdf',
  });

  const loadResources = async () => {
    setLoading(true);
    try {
      const data = await StudyResourcesAPI.list({ my_resources: true });
      setResources(data);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to load study resources.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, []);

  const openCreateModal = () => {
    setEditingResource(null);
    setFormData({
      title: '',
      slug: '',
      exam: 'CSIR NET',
      category: 'after-msc-btech',
      resource_type: 'notes',
      file_format: 'PDF',
      pages: 20,
      description: '',
      file_url: 'https://simsraipuredu.in/resources/sample-handbook.pdf',
    });
    setModalOpen(true);
  };

  const openEditModal = (r: APIStudyResource) => {
    setEditingResource(r);
    setFormData({
      title: r.title,
      slug: r.slug,
      exam: r.exam,
      category: r.category,
      resource_type: r.resource_type,
      file_format: r.file_format,
      pages: r.pages,
      description: r.description,
      file_url: r.file_url,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingResource) {
        await StudyResourcesAPI.update(editingResource.slug, formData);
        setMsg({ type: 'success', text: 'Resource updated successfully.' });
      } else {
        await StudyResourcesAPI.create(formData);
        setMsg({ type: 'success', text: 'Resource created as draft.' });
      }
      setModalOpen(false);
      await loadResources();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to save resource.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitReview = async (slug: string) => {
    try {
      const res = await StudyResourcesAPI.submitReview(slug);
      setMsg({ type: 'success', text: res.message || 'Submitted for review.' });
      await loadResources();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to submit review.' });
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm('Are you sure you want to delete this study resource?')) return;
    try {
      await StudyResourcesAPI.delete(slug);
      setMsg({ type: 'success', text: 'Resource deleted.' });
      await loadResources();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to delete resource.' });
    }
  };

  const filteredResources = resources.filter((r) => {
    const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.exam.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.review_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif font-bold text-3xl text-[#061426]">Study Material</h1>
          <p className="text-sm text-slate-500 mt-1">Upload study resources, lecture notes, formula sheets and submit for admin review.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] font-bold text-xs flex items-center gap-2 shadow"
        >
          <Plus className="w-4 h-4" /> Add Study Resource
        </button>
      </div>

      {msg && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between ${
            msg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="font-bold ml-2">×</button>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#E3D8BE]">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search resources by title or exam..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Review Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved (Live)</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E3D8BE] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#F8F4EA] text-[#263347] border-b border-[#E3D8BE]">
              <tr>
                <th className="text-left p-4">Resource</th>
                <th className="text-left p-4">Exam & Category</th>
                <th className="text-center p-4">Format / Pages</th>
                <th className="text-left p-4">Review Status</th>
                <th className="text-right p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3D8BE]/40">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">Loading resources...</td>
                </tr>
              ) : filteredResources.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No study material found. Add a new resource using the button above.
                  </td>
                </tr>
              ) : (
                filteredResources.map((r) => {
                  const canSubmit = r.review_status === 'draft' || r.review_status === 'rejected';
                  return (
                    <tr key={r.id} className="hover:bg-[#FFF9ED] transition">
                      <td className="p-4">
                        <div className="font-semibold text-[#061426] text-sm flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[#A87519]" />
                          <span>{r.title}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 capitalize">{r.resource_type}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-800">{r.exam}</div>
                        <div className="text-[11px] text-slate-400">{r.category}</div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="font-bold text-slate-800 uppercase">{r.file_format}</span>
                        <span className="text-[11px] text-slate-400 block">{r.pages} pages</span>
                      </td>
                      <td className="p-4">
                        {r.review_status === 'approved' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Approved
                          </span>
                        ) : r.review_status === 'pending' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            <Clock className="w-3 h-3 text-amber-600" /> Pending Review
                          </span>
                        ) : r.review_status === 'rejected' ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                              <XCircle className="w-3 h-3 text-rose-600" /> Rejected
                            </span>
                            {r.review_note && (
                              <div className="text-[10px] text-rose-700 bg-rose-50 p-1 rounded max-w-xs leading-tight">
                                Note: {r.review_note}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            Draft
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canSubmit && (
                            <button
                              onClick={() => handleSubmitReview(r.slug)}
                              className="px-2.5 py-1.5 rounded-lg bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] font-bold text-[11px] flex items-center gap-1 shadow-sm transition"
                              title="Submit for admin approval"
                            >
                              <Send className="w-3 h-3" />
                              <span>Submit</span>
                            </button>
                          )}
                          <button
                            onClick={() => openEditModal(r)}
                            className="p-1.5 rounded bg-slate-50 text-slate-600 hover:text-[#061426] border border-slate-200"
                            title="Edit Resource"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(r.slug)}
                            className="p-1.5 rounded bg-slate-50 text-slate-600 hover:text-rose-600 border border-slate-200"
                            title="Delete Resource"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-serif font-bold text-xl text-[#061426]">
                {editingResource ? 'Edit Study Resource' : 'Add New Study Resource'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      title,
                      slug: !editingResource
                        ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
                        : prev.slug,
                    }));
                  }}
                  className="w-full p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#D9A52E]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Slug *</label>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingResource)}
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 focus:outline-none disabled:bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Exam *</label>
                  <input
                    type="text"
                    required
                    value={formData.exam}
                    onChange={(e) => setFormData({ ...formData, exam: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Resource Type</label>
                  <select
                    value={formData.resource_type}
                    onChange={(e) => setFormData({ ...formData, resource_type: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="notes">Notes</option>
                    <option value="formula-sheet">Formula Sheet</option>
                    <option value="pyq">PYQ</option>
                    <option value="syllabus">Syllabus</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">File Format</label>
                  <input
                    type="text"
                    value={formData.file_format}
                    onChange={(e) => setFormData({ ...formData, file_format: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Number of Pages</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.pages}
                    onChange={(e) => setFormData({ ...formData, pages: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">File Download URL (HTTPS) *</label>
                <input
                  type="url"
                  required
                  value={formData.file_url}
                  onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full p-2.5 rounded-lg border border-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-[11px]">
                Pricing & Public Catalog Listing are managed by administrators upon review submission.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] font-bold shadow disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingResource ? 'Save Changes' : 'Create Draft'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EducatorResourcesPage;
