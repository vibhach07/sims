import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCourses } from '../../contexts/CourseContext';
import { AuthAPI } from '../../services/api';
import { User, Mail, Phone, Target, Save, CheckCircle2, GraduationCap, BookOpen, Layers, Camera, Trash2, Loader2 } from 'lucide-react';

export const StudentProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { courses } = useCourses();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    targetExam: user?.targetExam || '',
    education_level: '',
    degree: '',
    engineering_branch: '',
    target_paper: '',
    preferred_subjects: [] as string[],
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB.');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        await updateUser({ avatar: base64 });
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
        setIsUploadingAvatar(false);
      };
      reader.onerror = () => {
        setIsUploadingAvatar(false);
        alert('Failed to read image file.');
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Avatar upload error:', err);
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!confirm('Remove profile photo?')) return;
    setIsUploadingAvatar(true);
    try {
      await updateUser({ avatar: '' });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
        phone: user.phone || prev.phone,
        targetExam: user.targetExam || prev.targetExam,
      }));
    }
  }, [user]);

  useEffect(() => {
    AuthAPI.getPreferences()
      .then((prefs) => {
        if (prefs) {
          setFormData((prev) => ({
            ...prev,
            education_level: prefs.education_level || prev.education_level,
            degree: prefs.degree || prev.degree,
            engineering_branch: prefs.engineering_branch || prev.engineering_branch,
            targetExam: prefs.target_exam || prev.targetExam,
            target_paper: prefs.target_paper || prev.target_paper,
            preferred_subjects: prefs.preferred_subjects || prev.preferred_subjects,
          }));
        }
      })
      .catch(() => {
        /* fallback to local user */
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateUser({
        phone: formData.phone,
        targetExam: formData.targetExam,
      });

      await AuthAPI.updatePreferences({
        education_level: formData.education_level,
        degree: formData.degree,
        engineering_branch: formData.engineering_branch,
        target_exam: formData.targetExam,
        target_paper: formData.target_paper,
        preferred_subjects: formData.preferred_subjects,
      });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-serif font-bold text-3xl text-[#061426]">
          Student Profile &amp; Learning Preferences
        </h1>
        <p className="text-sm text-[#687386] mt-1">
          Customize your academic background and target examination focus for personalized course recommendations.
        </p>
      </div>

      <div className="bg-white rounded-2xl border-2 border-[#E3D8BE] shadow-sm p-6 sm:p-8 space-y-6">
        
        {savedSuccess && (
          <div className="p-3.5 rounded-xl bg-green-50 border border-green-200 text-green-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span>Learning preferences saved to backend database successfully!</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#E3D8BE]">
          <div className="flex items-center gap-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarFileSelect}
              accept="image/png,image/jpeg,image/webp,image/jpg"
              className="hidden"
            />
            
            <div className="relative group">
              {user?.avatar && !user.avatar.includes('unsplash') ? (
                <img 
                  src={user.avatar} 
                  alt={user?.name || "Student Avatar"} 
                  className="w-16 h-16 rounded-full border-2 border-[#D9A52E] object-cover shadow-sm"
                />
              ) : (
                <div className="w-16 h-16 rounded-full border-2 border-[#D9A52E] bg-[#D9A52E]/15 text-[#D9A52E] font-bold text-2xl flex items-center justify-center shadow-sm">
                  {(user?.name || 'S').charAt(0).toUpperCase()}
                </div>
              )}
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[9px] font-semibold cursor-pointer"
                title="Click to change photo"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <>
                    <Camera className="w-4 h-4 mb-0.5 text-[#F0C45B]" />
                    <span>Change</span>
                  </>
                )}
              </button>
            </div>

            <div>
              <h3 className="font-serif font-bold text-lg text-[#061426]">{user?.name || 'Student'}</h3>
              <p className="text-xs text-[#687386]">Student Account • SIMS Learning Portal</p>
              <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-800 px-2 py-0.5 rounded">
                Verified Student
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="px-3.5 py-1.5 rounded-lg border border-[#D9A52E] bg-[#D9A52E]/10 hover:bg-[#D9A52E]/20 text-[#A87519] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              {isUploadingAvatar ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5" />
                  <span>{user?.avatar && !user.avatar.includes('unsplash') ? 'Change Photo' : 'Upload Photo'}</span>
                </>
              )}
            </button>

            {user?.avatar && !user.avatar.includes('unsplash') && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={isUploadingAvatar}
                className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 text-xs transition cursor-pointer"
                title="Remove photo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#263347] mb-1.5">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#687386]" />
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full pl-9 pr-3.5 py-2 text-sm rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#263347] mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#687386]" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-9 pr-3.5 py-2 text-sm rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#263347] mb-1.5">Contact Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#687386]" />
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-9 pr-3.5 py-2 text-sm rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#E3D8BE]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#A87519] mb-3">
              Academic Background &amp; Target Examination
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#263347] mb-1.5">Education Level</label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#687386]" />
                  <select
                    value={formData.education_level}
                    onChange={(e) => setFormData({ ...formData, education_level: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2 text-sm rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none bg-white"
                  >
                    <option value="">-- Select Education Level --</option>
                    <option value="School Class 10">School Class 10</option>
                    <option value="School Class 11-12">School Class 11-12</option>
                    <option value="Undergraduate (Pursuing)">Undergraduate (Pursuing)</option>
                    <option value="B.Tech / B.E.">B.Tech / B.E.</option>
                    <option value="B.Sc. / BCA / BIT">B.Sc. / BCA / BIT</option>
                    <option value="M.Sc. / MCA / M.Tech">M.Sc. / MCA / M.Tech</option>
                    <option value="Working Professional">Working Professional</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#263347] mb-1.5">Degree / Branch</label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#687386]" />
                  <input
                    type="text"
                    placeholder="e.g. CS, Mechanical, Mathematics"
                    value={formData.engineering_branch}
                    onChange={(e) => setFormData({ ...formData, engineering_branch: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2 text-sm rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-[#263347] mb-1.5">Target Competitive Exam</label>
                <div className="relative">
                  <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#687386]" />
                  <select
                    value={formData.targetExam}
                    onChange={(e) => setFormData({ ...formData, targetExam: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2 text-sm rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none bg-white"
                  >
                    <option value="">-- Select Target Exam --</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.target_exam}>{c.target_exam} ({c.title})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#263347] mb-1.5">Target Paper / Subject Code</label>
                <div className="relative">
                  <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#687386]" />
                  <input
                    type="text"
                    placeholder="e.g. CS, EC, MA, CA Foundation"
                    value={formData.target_paper}
                    onChange={(e) => setFormData({ ...formData, target_paper: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2 text-sm rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2.5 rounded-lg bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] font-bold text-xs flex items-center justify-center gap-2 shadow transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Preferences…' : 'Save Learning Preferences'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
