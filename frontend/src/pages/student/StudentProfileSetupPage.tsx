import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCourses } from '../../contexts/CourseContext';
import { AuthAPI } from '../../services/api';
import { CheckCircle2, ArrowRight, User, Mail, Phone, Target, Layers, Sparkles, Loader2 } from 'lucide-react';

export const StudentProfileSetupPage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { courses } = useCourses();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [targetExam, setTargetExam] = useState(user?.targetExam || '');
  const [targetPaper, setTargetPaper] = useState('');
  const [educationLevel, setEducationLevel] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      if (!name && user.name) setName(user.name);
      if (!phone && user.phone) setPhone(user.phone);
      if (!targetExam && user.targetExam) setTargetExam(user.targetExam);
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      await updateUser({
        name: name.trim() || user?.name,
        phone: phone.trim(),
        targetExam: targetExam.trim(),
      });

      if (targetExam || targetPaper || educationLevel) {
        await AuthAPI.updatePreferences({
          education_level: educationLevel,
          target_exam: targetExam,
          target_paper: targetPaper,
        }).catch(() => {});
      }

      navigate('/student/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    navigate('/student/dashboard');
  };

  const displayName = name || user?.name || 'Student';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="py-12 px-4 bg-[#FFF9ED] min-h-screen flex items-center justify-center">
      <div className="max-w-xl w-full bg-white rounded-3xl border-2 border-[#E3D8BE] shadow-2xl overflow-hidden">
        
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-[#061426] via-[#091B31] to-[#102846] text-white p-8 text-center border-b border-[#D9A52E]/30 relative">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D9A52E]/20 text-[#F0C45B] border border-[#D9A52E]/30 text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Google Account Linked
          </div>

          <h1 className="font-serif font-bold text-2xl sm:text-3xl text-[#FFF9ED]">
            Complete Your Profile
          </h1>
          <p className="text-xs sm:text-sm text-[#E3D8BE]/80 mt-1.5 max-w-md mx-auto">
            Set your target examination so we can tailor test series, practice papers, and batch schedules for you.
          </p>

          {/* User Avatar Circle */}
          <div className="mt-5 flex justify-center">
            <div className="w-20 h-20 rounded-full border-2 border-[#D9A52E] overflow-hidden bg-[#D9A52E]/20 text-[#F0C45B] font-bold text-2xl flex items-center justify-center shadow-lg">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{initial}</span>
              )}
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 sm:p-8 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-[#263347] mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#687386]" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none"
                />
              </div>
            </div>

            {/* Email (Readonly) */}
            <div>
              <label className="block text-xs font-semibold text-[#263347] mb-1.5">
                Google Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#687386]" />
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-[#E3D8BE] bg-slate-50 text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Contact Phone */}
            <div>
              <label className="block text-xs font-semibold text-[#263347] mb-1.5">
                Phone Number <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#687386]" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none"
                />
              </div>
            </div>

            {/* Target Exam */}
            <div>
              <label className="block text-xs font-semibold text-[#263347] mb-1.5">
                Target Exam <span className="text-slate-400 font-normal">(Recommended)</span>
              </label>
              <div className="relative">
                <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#687386]" />
                <select
                  value={targetExam}
                  onChange={(e) => setTargetExam(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none bg-white"
                >
                  <option value="">-- Choose Target Exam --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.target_exam}>
                      {c.target_exam}
                    </option>
                  ))}
                  <option value="GATE">GATE</option>
                  <option value="CSIR-NET / UGC-NET">CSIR-NET / UGC-NET</option>
                  <option value="IIT-JAM">IIT-JAM</option>
                  <option value="NIMCET">NIMCET</option>
                  <option value="JEE (Main & Advanced)">JEE (Main & Advanced)</option>
                  <option value="NEET (UG Medical)">NEET (UG Medical)</option>
                  <option value="PSC / Technical Exams">PSC / Technical Exams</option>
                  <option value="Foundation & Boards">Foundation & Boards</option>
                </select>
              </div>
            </div>
          </div>

          {/* Target Subject / Paper */}
          <div>
            <label className="block text-xs font-semibold text-[#263347] mb-1.5">
              Subject Code / Target Stream <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#687386]" />
              <input
                type="text"
                value={targetPaper}
                onChange={(e) => setTargetPaper(e.target.value)}
                placeholder="e.g. Computer Science, Mathematics, Mechanical, Physics"
                className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:flex-1 py-3 px-5 rounded-xl bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] font-bold text-sm shadow flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Profile…</span>
                </>
              ) : (
                <>
                  <span>Save &amp; Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSkip}
              disabled={isSaving}
              className="w-full sm:w-auto py-3 px-5 rounded-xl border border-[#E3D8BE] hover:bg-[#F8F4EA] text-[#687386] hover:text-[#061426] font-semibold text-sm transition text-center cursor-pointer"
            >
              Skip for Now
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default StudentProfileSetupPage;

