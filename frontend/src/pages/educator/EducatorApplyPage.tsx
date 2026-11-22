import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthAPI } from '../../services/api';
import { 
  GraduationCap, CheckCircle2, AlertCircle, Loader2, ArrowRight, 
  Video, FileText, Send, UserCheck, ShieldCheck
} from 'lucide-react';

export const EducatorApplyPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subjects: '',
    qualification: '',
    experience: '',
    bio: '',
    demo_link: '',
    resume_link: '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.demo_link.startsWith('https://')) {
      setError('Lecture video / demo link must start with https://');
      return;
    }
    if (formData.resume_link && !formData.resume_link.startsWith('https://')) {
      setError('Resume link must start with https://');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await AuthAPI.applyEducator(formData);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="py-20 bg-[#FFF9ED] min-h-screen flex items-center justify-center px-4">
        <div className="max-w-lg w-full bg-white rounded-2xl border-2 border-[#E3D8BE] shadow-xl p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 text-green-700 flex items-center justify-center mx-auto border border-green-200">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="font-serif font-bold text-2xl text-[#061426]">
            Application Submitted
          </h2>
          <p className="text-sm text-[#687386] leading-relaxed">
            Thank you, <strong>{formData.name}</strong>. Your faculty onboarding dossier has been forwarded to the SIMS Academic Review Board.
          </p>
          <div className="p-4 bg-[#F8F4EA] rounded-xl text-xs text-[#263347] text-left space-y-2 border border-[#E3D8BE]">
            <div className="flex items-center gap-2 font-bold text-[#A87519]">
              <ShieldCheck className="w-4 h-4" /> Next Steps
            </div>
            <p>1. Our academic coordinators will review your demo lecture and credentials.</p>
            <p>2. Upon approval, you will receive an invitation email at <strong>{formData.email}</strong> with a secure link to activate your educator studio account.</p>
          </div>
          <div className="pt-2">
            <Link
              to="/educator/login"
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-lg bg-[#D9A52E] text-[#061426] text-xs font-bold hover:bg-[#F0C45B] shadow transition"
            >
              Go to Educator Studio Login <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-16 bg-[#FFF9ED] min-h-screen px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E3D8BE]/50 text-[#A87519] text-xs font-bold border border-[#D9A52E]/30">
            <GraduationCap className="w-4 h-4" /> SIMS Academic Faculty Recruitment
          </div>
          <h1 className="font-serif font-bold text-3xl sm:text-4xl text-[#061426]">
            Join the SIMS Educator Faculty
          </h1>
          <p className="text-sm text-[#687386] max-w-xl mx-auto">
            Design master curriculums, produce interactive video series, and coach top national GATE &amp; NIMCET rankers.
          </p>
        </div>

        {/* Application Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border-2 border-[#E3D8BE] shadow-xl p-6 sm:p-10 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#263347] mb-1.5">Full Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                placeholder="Dr. Rajesh Kumar"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#263347] mb-1.5">Email Address *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                placeholder="rajesh@university.edu"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#263347] mb-1.5">Phone Number *</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#263347] mb-1.5">Primary Subject Expertise *</label>
              <input
                type="text"
                required
                value={formData.subjects}
                onChange={(e) => setFormData(p => ({ ...p, subjects: e.target.value }))}
                placeholder="e.g. Higher Mathematics, Algorithms"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#263347] mb-1.5">Highest Qualification *</label>
              <input
                type="text"
                required
                value={formData.qualification}
                onChange={(e) => setFormData(p => ({ ...p, qualification: e.target.value }))}
                placeholder="e.g. M.Tech / PhD in CS, IIT Kharagpur"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#263347] mb-1.5">Teaching Experience *</label>
              <input
                type="text"
                required
                value={formData.experience}
                onChange={(e) => setFormData(p => ({ ...p, experience: e.target.value }))}
                placeholder="e.g. 7+ Years in GATE Coaching"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#263347] mb-1.5">Academic Bio / Profile Summary *</label>
            <textarea
              rows={3}
              required
              value={formData.bio}
              onChange={(e) => setFormData(p => ({ ...p, bio: e.target.value }))}
              placeholder="Brief description of teaching style, past ranks mentored, publications, etc."
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#263347] mb-1.5">Demo Lecture URL (https://) *</label>
              <div className="relative">
                <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#687386]" />
                <input
                  type="url"
                  required
                  value={formData.demo_link}
                  onChange={(e) => setFormData(p => ({ ...p, demo_link: e.target.value }))}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-[#687386] mt-1">A public YouTube, Vimeo, or Google Drive lecture sample.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#263347] mb-1.5">Resume / CV Link (https://, optional)</label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#687386]" />
                <input
                  type="url"
                  value={formData.resume_link}
                  onChange={(e) => setFormData(p => ({ ...p, resume_link: e.target.value }))}
                  placeholder="https://drive.google.com/file/..."
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E3D8BE] flex items-center justify-between">
            <Link to="/educator/login" className="text-xs text-[#687386] hover:text-[#061426]">
              Already registered? <span className="text-[#A87519] font-bold underline">Login</span>
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-lg bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] text-xs font-bold shadow flex items-center gap-2 transition disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting Application...</>
              ) : (
                <><Send className="w-4 h-4" /> Submit Faculty Dossier</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EducatorApplyPage;
