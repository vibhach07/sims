import React, { useEffect, useState } from 'react';
import {
  AdminFacultyAPI,
  CoursesAPI,
  APIFaculty,
  APICourse,
} from '../../services/api';
import { ImageInput, ImageInputValue } from '../../components/common/ImageInput';
import {
  GraduationCap,
  PlusCircle,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  UserCheck,
  UserX,
  Shield,
  Send,
  Eye,
  EyeOff,
  ArrowUpDown,
} from 'lucide-react';

export const AdminFacultyPage: React.FC = () => {
  const [faculty, setFaculty] = useState<APIFaculty[]>([]);
  const [courses, setCourses] = useState<APICourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Drawer / Form state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<APIFaculty | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    role: '',
    specialization: '',
    qualification: '',
    experience: '',
    bio: '',
    emailPublic: '',
    displayOrder: 0,
    isActive: true,
    coursesTaught: [] as string[],
  });

  const [imageVal, setImageVal] = useState<ImageInputValue>({ file: null, url: '' });

  // Educator Access grant form
  const [grantEmail, setGrantEmail] = useState('');
  const [isGranting, setIsGranting] = useState(false);
  const [grantError, setGrantError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [facData, courseData] = await Promise.all([
        AdminFacultyAPI.list(),
        CoursesAPI.list().catch(() => [] as APICourse[]),
      ]);
      // Sort by display order
      const sorted = [...facData].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      setFaculty(sorted);
      setCourses(courseData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch faculty records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdd = () => {
    setEditingFaculty(null);
    setFormData({
      name: '',
      slug: '',
      role: 'Senior Academic Director',
      specialization: '',
      qualification: '',
      experience: '10+ Years',
      bio: '',
      emailPublic: '',
      displayOrder: (faculty.length + 1) * 10,
      isActive: true,
      coursesTaught: courses.length > 0 ? [courses[0].slug] : [],
    });
    setImageVal({ file: null, url: '' });
    setGrantEmail('');
    setGrantError(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (fac: APIFaculty) => {
    setEditingFaculty(fac);
    setFormData({
      name: fac.name,
      slug: fac.slug,
      role: fac.role,
      specialization: fac.specialization,
      qualification: fac.qualification,
      experience: fac.experience,
      bio: fac.bio,
      emailPublic: fac.emailPublic || '',
      displayOrder: fac.displayOrder || 0,
      isActive: fac.isActive !== undefined ? fac.isActive : true,
      coursesTaught: fac.coursesTaught || [],
    });
    setImageVal({ file: null, url: fac.image && fac.image.startsWith('http') ? fac.image : '' });
    setGrantEmail(fac.account?.email || '');
    setGrantError(null);
    setIsDrawerOpen(true);
  };

  const handleToggleActive = async (fac: APIFaculty) => {
    try {
      const updated = await AdminFacultyAPI.update(fac.id, { isActive: !fac.isActive });
      setFaculty(prev => prev.map(f => f.id === fac.id ? { ...f, isActive: updated.isActive } : f));
      setSuccessMsg(`Status updated for ${fac.name}`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to toggle faculty status.');
    }
  };

  const handleDelete = async (fac: APIFaculty) => {
    if (!confirm(`Are you sure you want to delete profile for ${fac.name}?`)) return;
    try {
      await AdminFacultyAPI.delete(fac.id);
      setFaculty(prev => prev.filter(f => f.id !== fac.id));
      setSuccessMsg(`Faculty profile deleted.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to delete faculty member.');
    }
  };

  const handleGrantEducator = async () => {
    if (!editingFaculty) return;
    if (!grantEmail.trim()) {
      setGrantError('Please enter an educator email address.');
      return;
    }
    setIsGranting(true);
    setGrantError(null);
    try {
      const res = await AdminFacultyAPI.grantEducator(editingFaculty.id, grantEmail.trim());
      setEditingFaculty(res.faculty);
      setFaculty(prev => prev.map(f => f.id === res.faculty.id ? res.faculty : f));
      setSuccessMsg(res.message);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setGrantError(err.message || 'Failed to grant educator access.');
    } finally {
      setIsGranting(false);
    }
  };

  const handleRevokeEducator = async () => {
    if (!editingFaculty) return;
    if (!confirm('Revoke educator portal login for this faculty member? Their role will become student.')) return;
    setIsGranting(true);
    setGrantError(null);
    try {
      const res = await AdminFacultyAPI.revokeEducator(editingFaculty.id);
      setEditingFaculty(res.faculty);
      setFaculty(prev => prev.map(f => f.id === res.faculty.id ? res.faculty : f));
      setSuccessMsg(res.message);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setGrantError(err.message || 'Failed to revoke educator access.');
    } finally {
      setIsGranting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    setIsSubmitting(true);
    setError(null);

    try {
      if (imageVal.file) {
        // Multipart submission
        const fd = new FormData();
        fd.append('name', formData.name);
        if (formData.slug) fd.append('slug', formData.slug);
        fd.append('role', formData.role);
        fd.append('specialization', formData.specialization);
        fd.append('qualification', formData.qualification);
        fd.append('experience', formData.experience);
        fd.append('bio', formData.bio);
        if (formData.emailPublic) fd.append('email_public', formData.emailPublic);
        fd.append('display_order', String(formData.displayOrder));
        fd.append('is_active', String(formData.isActive));
        fd.append('photo', imageVal.file);
        fd.append('courses_taught', JSON.stringify(formData.coursesTaught));

        if (editingFaculty) {
          await AdminFacultyAPI.update(editingFaculty.id, fd);
        } else {
          await AdminFacultyAPI.create(fd);
        }
      } else {
        // JSON payload
        const payload: any = {
          name: formData.name,
          slug: formData.slug || undefined,
          role: formData.role,
          specialization: formData.specialization,
          qualification: formData.qualification,
          experience: formData.experience,
          bio: formData.bio,
          emailPublic: formData.emailPublic || null,
          displayOrder: Number(formData.displayOrder) || 0,
          isActive: formData.isActive,
          coursesTaught: formData.coursesTaught,
          image: imageVal.url || '',
        };

        if (editingFaculty) {
          await AdminFacultyAPI.update(editingFaculty.id, payload);
        } else {
          await AdminFacultyAPI.create(payload);
        }
      }

      setIsDrawerOpen(false);
      await fetchData();
      setSuccessMsg(`Faculty profile ${editingFaculty ? 'updated' : 'created'} successfully.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save faculty record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleCourseSelect = (slug: string) => {
    setFormData(prev => {
      const exists = prev.coursesTaught.includes(slug);
      return {
        ...prev,
        coursesTaught: exists
          ? prev.coursesTaught.filter(s => s !== slug)
          : [...prev.coursesTaught, slug],
      };
    });
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#D9A52E] mx-auto" />
        <p className="text-sm text-[#687386]">Loading faculty roster from PostgreSQL...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif font-bold text-3xl text-[#061426]">Faculty Directory Administration</h1>
          <p className="text-sm text-[#687386] mt-1">
            Manage academic profiles, photo uploads, course allocations, and educator workspace logins.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] font-bold text-xs flex items-center gap-2 shadow-sm transition"
        >
          <PlusCircle className="w-4 h-4" /> Add Faculty Member
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Faculty Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {faculty.map((fac) => {
          const avatarUrl =
            fac.image ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(fac.name)}&background=061426&color=D9A52E&size=200`;

          return (
            <div
              key={fac.id}
              className={`bg-white rounded-2xl border transition shadow-sm p-5 flex flex-col justify-between ${
                fac.isActive ? 'border-[#E3D8BE]' : 'border-slate-200 opacity-75'
              }`}
            >
              <div className="space-y-4">
                {/* Top bar: Order & Active toggle */}
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-0.5 rounded-md bg-[#F8F4EA] text-[#A87519] font-mono font-bold text-[10px]">
                    Order #{fac.displayOrder ?? 0}
                  </span>

                  <button
                    onClick={() => handleToggleActive(fac)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                      fac.isActive
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                    title={fac.isActive ? 'Active on directory' : 'Hidden from public'}
                  >
                    {fac.isActive ? (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Public</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Draft</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Faculty Info */}
                <div className="flex items-start gap-3.5">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#D9A52E] flex-shrink-0 bg-slate-100">
                    <img
                      src={avatarUrl}
                      alt={fac.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          fac.name
                        )}&background=061426&color=D9A52E`;
                      }}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif font-bold text-base text-[#061426] truncate">{fac.name}</h3>
                    <p className="text-[11px] font-medium text-[#A87519] truncate">{fac.role}</p>
                    <p className="text-[11px] text-[#687386] truncate">{fac.qualification}</p>
                    <p className="text-[10px] text-[#A3824A] font-semibold">{fac.experience}</p>
                  </div>
                </div>

                {/* Account badge */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-[#687386]">Login Access:</span>
                  {fac.account ? (
                    <span className="flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                      <UserCheck className="w-3 h-3" />
                      <span className="truncate max-w-[140px]">{fac.account.email}</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                      <UserX className="w-3 h-3" />
                      <span>No Account</span>
                    </span>
                  )}
                </div>

                {/* Courses assigned */}
                <div className="flex items-center gap-1.5 text-[11px] text-[#687386]">
                  <GraduationCap className="w-3.5 h-3.5 text-[#D9A52E] flex-shrink-0" />
                  <span className="truncate">
                    {(fac.coursesTaught || []).length} assigned course(s)
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleOpenEdit(fac)}
                  className="px-3 py-1.5 rounded-lg border border-[#E3D8BE] hover:bg-[#F8F4EA] text-[#061426] text-xs font-bold flex items-center gap-1 transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDelete(fac)}
                  className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition"
                  title="Delete Faculty"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Drawer / Edit Modal */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-end">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl p-6 overflow-y-auto space-y-5 flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#E3D8BE]">
                <h3 className="font-serif font-bold text-xl text-[#061426]">
                  {editingFaculty ? `Edit Faculty: ${editingFaculty.name}` : 'Add Faculty Member'}
                </h3>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form id="facultyForm" onSubmit={handleSubmit} className="space-y-4 text-xs">
                {/* Name & Slug */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#263347] mb-1">Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                      className="w-full p-2.5 rounded-lg border border-[#E3D8BE] focus:outline-none focus:border-[#D9A52E]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#263347] mb-1">Slug (auto if blank)</label>
                    <input
                      type="text"
                      value={formData.slug}
                      placeholder="e.g. dr-arun-verma"
                      onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))}
                      className="w-full p-2.5 rounded-lg border border-[#E3D8BE] focus:outline-none focus:border-[#D9A52E]"
                    />
                  </div>
                </div>

                {/* Role & Experience */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#263347] mb-1">Designation / Role *</label>
                    <input
                      type="text"
                      required
                      value={formData.role}
                      onChange={(e) => setFormData((p) => ({ ...p, role: e.target.value }))}
                      className="w-full p-2.5 rounded-lg border border-[#E3D8BE] focus:outline-none focus:border-[#D9A52E]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#263347] mb-1">Experience *</label>
                    <input
                      type="text"
                      required
                      value={formData.experience}
                      onChange={(e) => setFormData((p) => ({ ...p, experience: e.target.value }))}
                      className="w-full p-2.5 rounded-lg border border-[#E3D8BE] focus:outline-none focus:border-[#D9A52E]"
                    />
                  </div>
                </div>

                {/* Qualification & Specialization */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#263347] mb-1">Qualification *</label>
                    <input
                      type="text"
                      required
                      value={formData.qualification}
                      onChange={(e) => setFormData((p) => ({ ...p, qualification: e.target.value }))}
                      className="w-full p-2.5 rounded-lg border border-[#E3D8BE] focus:outline-none focus:border-[#D9A52E]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#263347] mb-1">Specialization</label>
                    <input
                      type="text"
                      value={formData.specialization}
                      onChange={(e) => setFormData((p) => ({ ...p, specialization: e.target.value }))}
                      className="w-full p-2.5 rounded-lg border border-[#E3D8BE] focus:outline-none focus:border-[#D9A52E]"
                    />
                  </div>
                </div>

                {/* Email Public & Display Order */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#263347] mb-1">Public Contact Email</label>
                    <input
                      type="email"
                      value={formData.emailPublic}
                      placeholder="faculty@simsraipur.com"
                      onChange={(e) => setFormData((p) => ({ ...p, emailPublic: e.target.value }))}
                      className="w-full p-2.5 rounded-lg border border-[#E3D8BE] focus:outline-none focus:border-[#D9A52E]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#263347] mb-1">Display Order</label>
                    <input
                      type="number"
                      value={formData.displayOrder}
                      onChange={(e) => setFormData((p) => ({ ...p, displayOrder: parseInt(e.target.value) || 0 }))}
                      className="w-full p-2.5 rounded-lg border border-[#E3D8BE] focus:outline-none focus:border-[#D9A52E]"
                    />
                  </div>
                </div>

                {/* Reusable ImageInput */}
                <ImageInput
                  label="Faculty Photo (Upload JPG/PNG/WebP max 2MB or Paste HTTPS URL)"
                  currentImageUrl={editingFaculty?.image}
                  value={imageVal}
                  onChange={setImageVal}
                />

                {/* Courses Taught Multi-Select */}
                <div>
                  <label className="block font-semibold text-[#263347] mb-1">
                    Assigned Courses ({formData.coursesTaught.length} selected)
                  </label>
                  <div className="max-h-36 overflow-y-auto border border-[#E3D8BE] rounded-lg p-2.5 space-y-1.5 bg-slate-50">
                    {courses.map((c) => {
                      const selected = formData.coursesTaught.includes(c.slug);
                      return (
                        <label
                          key={c.id}
                          className={`flex items-center gap-2 p-1.5 rounded-md cursor-pointer transition ${
                            selected ? 'bg-amber-100/70 font-semibold text-[#061426]' : 'hover:bg-slate-200/50 text-[#687386]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleCourseSelect(c.slug)}
                            className="rounded border-[#E3D8BE] text-[#D9A52E] focus:ring-[#D9A52E]"
                          />
                          <span className="truncate">{c.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono ml-auto">({c.slug})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="block font-semibold text-[#263347] mb-1">Academic Bio</label>
                  <textarea
                    rows={3}
                    value={formData.bio}
                    onChange={(e) => setFormData((p) => ({ ...p, bio: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-[#E3D8BE] focus:outline-none focus:border-[#D9A52E]"
                  />
                </div>

                {/* Active Switch */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isActiveToggle"
                    checked={formData.isActive}
                    onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))}
                    className="rounded text-[#D9A52E] focus:ring-[#D9A52E]"
                  />
                  <label htmlFor="isActiveToggle" className="font-bold text-[#061426]">
                    Publish on public website directory
                  </label>
                </div>
              </form>

              {/* Educator Access Section (only for saved faculty) */}
              {editingFaculty && (
                <div className="p-4 bg-[#F8F4EA] border border-[#E3D8BE] rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#061426]">
                    <Shield className="w-4 h-4 text-[#A87519]" />
                    <span>Educator Portal Access</span>
                  </div>

                  <p className="text-[11px] text-[#687386]">
                    Link this faculty profile to an educator login account. The educator can then access the educator portal and manage their classes.
                  </p>

                  {editingFaculty.account ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs p-2.5 bg-white rounded-lg border border-[#E3D8BE]">
                        <div>
                          <div className="font-bold text-[#061426]">{editingFaculty.account.email}</div>
                          <div className="text-[10px] text-[#687386]">
                            Role: {editingFaculty.account.role} • Status: {editingFaculty.account.status}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRevokeEducator}
                          disabled={isGranting}
                          className="px-3 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold border border-rose-200 transition"
                        >
                          Revoke
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="email"
                          placeholder="educator@simsraipur.com"
                          value={grantEmail}
                          onChange={(e) => setGrantEmail(e.target.value)}
                          className="flex-1 p-2 text-xs rounded-lg border border-[#E3D8BE] bg-white focus:outline-none focus:border-[#D9A52E]"
                        />
                        <button
                          type="button"
                          onClick={handleGrantEducator}
                          disabled={isGranting}
                          className="px-3 py-2 bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
                        >
                          {isGranting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                          <span>Grant Access</span>
                        </button>
                      </div>
                      {grantError && (
                        <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200">
                          {grantError}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Submit / Cancel Buttons */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-[#E3D8BE] text-xs font-bold text-[#061426] hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="facultyForm"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] text-xs font-bold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{editingFaculty ? 'Save Changes' : 'Create Faculty'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFacultyPage;
