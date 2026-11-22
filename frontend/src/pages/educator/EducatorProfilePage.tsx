import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { EducatorProfileAPI, APIFaculty } from '../../services/api';
import { ImageInput, ImageInputValue } from '../../components/common/ImageInput';
import { UserCheck, Save, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';

export const EducatorProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [faculty, setFaculty] = useState<APIFaculty | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    role: '',
    specialization: '',
    qualification: '',
    experience: '',
    bio: '',
  });

  const [imageVal, setImageVal] = useState<ImageInputValue>({ file: null, url: '' });

  const loadProfile = async () => {
    setLoading(true);
    try {
      const profile = await EducatorProfileAPI.get();
      setFaculty(profile);
      setFormData({
        name: profile.name || user?.name || '',
        role: profile.role || 'Educator',
        specialization: profile.specialization || '',
        qualification: profile.qualification || '',
        experience: profile.experience || '',
        bio: profile.bio || '',
      });
      setImageVal({ file: null, url: profile.image && profile.image.startsWith('http') ? profile.image : '' });
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message || 'Failed to load educator profile.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      if (imageVal.file) {
        const fd = new FormData();
        fd.append('name', formData.name);
        fd.append('role', formData.role);
        fd.append('specialization', formData.specialization);
        fd.append('qualification', formData.qualification);
        fd.append('experience', formData.experience);
        fd.append('bio', formData.bio);
        fd.append('photo', imageVal.file);

        const updated = await EducatorProfileAPI.update(fd);
        setFaculty(updated);
      } else {
        const payload: any = {
          name: formData.name,
          role: formData.role,
          specialization: formData.specialization,
          qualification: formData.qualification,
          experience: formData.experience,
          bio: formData.bio,
          image: imageVal.url || '',
        };
        const updated = await EducatorProfileAPI.update(payload);
        setFaculty(updated);
      }
      setMsg({ type: 'success', text: 'Faculty profile updated successfully.' });
      await loadProfile();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to update faculty profile.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#D9A52E] mx-auto" />
        <p className="text-sm text-slate-500">Loading educator profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif font-bold text-3xl text-[#061426]">My Educator Profile</h1>
        <p className="text-sm text-slate-500 mt-1">
          Edit your public faculty profile and bio displayed on the public SIMS faculty directory.
        </p>
      </div>

      {/* Live Badge / Note */}
      <div className="bg-white p-4 rounded-xl border border-[#E3D8BE] flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#A87519] flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-900">Directory Live Status</div>
            <div className="text-[11px] text-slate-500">
              {faculty?.isActive
                ? 'Your profile is currently live and visible on the public Faculty Directory.'
                : 'Visibility is controlled by administrators for quality and credentials verification.'}
            </div>
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-[10px] font-bold ${
            faculty?.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
          }`}
        >
          {faculty?.isActive ? 'Published Live' : 'Under Review / Draft'}
        </span>
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

      {/* Profile Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#E3D8BE] p-6 space-y-4 shadow-sm text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Display Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#D9A52E]"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Academic Role *</label>
            <input
              type="text"
              required
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              placeholder="e.g. Senior Faculty / CSIR NET Mentor"
              className="w-full p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#D9A52E]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Specialization *</label>
            <input
              type="text"
              required
              value={formData.specialization}
              onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
              placeholder="e.g. Mathematics, Quantum Physics"
              className="w-full p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#D9A52E]"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Highest Qualification *</label>
            <input
              type="text"
              required
              value={formData.qualification}
              onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
              placeholder="e.g. Ph.D. / M.Sc. IIT Kanpur"
              className="w-full p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#D9A52E]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Teaching Experience *</label>
            <input
              type="text"
              required
              value={formData.experience}
              onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
              placeholder="e.g. 7+ Years Experience"
              className="w-full p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#D9A52E]"
            />
          </div>
          <div>
            <ImageInput
              label="Profile Photo / Avatar"
              currentImageUrl={faculty?.image}
              value={imageVal}
              onChange={setImageVal}
            />
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Academic Bio</label>
          <textarea
            rows={4}
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            placeholder="Share your teaching philosophy, achievements and mentoring track record..."
            className="w-full p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#D9A52E]"
          />
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] font-bold shadow flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Profile</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default EducatorProfilePage;
