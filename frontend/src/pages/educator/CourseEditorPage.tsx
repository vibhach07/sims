import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCourses } from '../../contexts/CourseContext';
import { CoursesAPI, APICourseDetail, APILesson } from '../../services/api';
import { 
  Save, ArrowLeft, CheckCircle2, AlertCircle, Loader2,
  Plus, Trash2, Edit2, Video, ChevronDown, ChevronUp, Layers, Eye, Send
} from 'lucide-react';

export const CourseEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { courses, refreshCourses } = useCourses();

  const isEditing = Boolean(id);
  const existingCourse = id ? courses.find(c => String(c.id) === String(id)) : undefined;

  const [formData, setFormData] = useState({
    title: existingCourse?.title || '',
    slug: existingCourse?.slug || '',
    subtitle: existingCourse?.subtitle || '',
    category: existingCourse?.category || 'after-msc-btech',
    target_exam: existingCourse?.target_exam || '',
    duration: existingCourse?.duration || '6 Months',
    format: existingCourse?.format || 'Classroom + Live Online',
    language: existingCourse?.language || 'English & Hindi',
    fee_status: existingCourse?.fee_status || 'Enquire for Fee Structure',
    short_description: existingCourse?.short_description || '',
    banner_image: (existingCourse as any)?.banner_image || (existingCourse as any)?.image_url || '',
    price: existingCourse?.price || '24999.00',
    is_published: existingCourse?.is_published ?? true,
  });

  const [fullCourse, setFullCourse] = useState<APICourseDetail | null>(null);
  const [loadingCurriculum, setLoadingCurriculum] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New Module Form State
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleDesc, setNewModuleDesc] = useState('');
  const [newModuleOrder, setNewModuleOrder] = useState(1);
  const [creatingModule, setCreatingModule] = useState(false);

  // New Lecture Form State
  const [activeModuleIdForLecture, setActiveModuleIdForLecture] = useState<number | null>(null);
  const [lectureForm, setLectureForm] = useState({
    title: '',
    duration: '45 mins',
    video_url: '',
    summary: '',
    order: 1,
    is_free_preview: false,
    instructor_name: 'SIMS Faculty',
  });
  const [creatingLecture, setCreatingLecture] = useState(false);

  // Load course curriculum if editing
  const loadCurriculum = async () => {
    if (!existingCourse?.slug) return;
    setLoadingCurriculum(true);
    try {
      const data = await CoursesAPI.detail(existingCourse.slug);
      setFullCourse(data);
    } catch (e: any) {
      console.warn('Could not load course curriculum', e);
    } finally {
      setLoadingCurriculum(false);
    }
  };

  useEffect(() => {
    if (existingCourse) {
      setFormData({
        title: existingCourse.title || '',
        slug: existingCourse.slug || '',
        subtitle: existingCourse.subtitle || '',
        category: existingCourse.category || 'after-msc-btech',
        target_exam: existingCourse.target_exam || '',
        duration: existingCourse.duration || '6 Months',
        format: existingCourse.format || 'Classroom + Live Online',
        language: existingCourse.language || 'English & Hindi',
        fee_status: existingCourse.fee_status || 'Enquire for Fee Structure',
        short_description: existingCourse.short_description || '',
        banner_image: (existingCourse as any)?.banner_image || (existingCourse as any)?.image_url || '',
        price: existingCourse.price || '24999.00',
        is_published: existingCourse.is_published ?? true,
      });
      loadCurriculum();
    }
  }, [existingCourse]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.slug) {
      setError('Course title and slug are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      if (isEditing && id) {
        await CoursesAPI.updateCourse(Number(id), formData as any);
      } else {
        const created = await CoursesAPI.createCourse(formData as any);
        await refreshCourses();
        navigate(`/educator/courses/${created.id}/edit`);
        return;
      }
      await refreshCourses();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save course. Check permissions and required fields.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add Module
  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!existingCourse?.id || !newModuleTitle) return;
    setCreatingModule(true);
    try {
      await CoursesAPI.createModule({
        course: existingCourse.id,
        title: newModuleTitle,
        description: newModuleDesc,
        order: newModuleOrder,
      });
      setNewModuleTitle('');
      setNewModuleDesc('');
      await loadCurriculum();
    } catch (err: any) {
      alert(err.message || 'Failed to create module');
    } finally {
      setCreatingModule(false);
    }
  };

  // Delete Module
  const handleDeleteModule = async (moduleId: number) => {
    if (!confirm('Are you sure you want to delete this module and its lectures?')) return;
    try {
      await CoursesAPI.deleteModule(moduleId);
      await loadCurriculum();
    } catch (err: any) {
      alert(err.message || 'Failed to delete module');
    }
  };

  // Add Lecture
  const handleAddLecture = async (moduleId: number) => {
    if (!lectureForm.title) return;
    if (lectureForm.video_url && !lectureForm.video_url.startsWith('https://')) {
      alert('Lecture video URL must be a secure link starting with https://');
      return;
    }
    setCreatingLecture(true);
    try {
      await CoursesAPI.createLecture({
        module: moduleId,
        ...lectureForm,
      });
      setLectureForm({
        title: '',
        duration: '45 mins',
        video_url: '',
        summary: '',
        order: 1,
        is_free_preview: false,
        instructor_name: 'SIMS Faculty',
      });
      setActiveModuleIdForLecture(null);
      await loadCurriculum();
    } catch (err: any) {
      alert(err.message || 'Failed to create lecture');
    } finally {
      setCreatingLecture(false);
    }
  };

  // Delete Lecture
  const handleDeleteLecture = async (lectureId: number) => {
    if (!confirm('Are you sure you want to delete this lecture?')) return;
    try {
      await CoursesAPI.deleteLecture(lectureId);
      await loadCurriculum();
    } catch (err: any) {
      alert(err.message || 'Failed to delete lecture');
    }
  };

  // Submit Course for Review
  const handleSubmitReview = async () => {
    if (!id) return;
    const totalLectures = fullCourse?.curriculum?.reduce((sum, m) => sum + (m.lessons?.length || 0), 0) || 0;
    if (totalLectures < 1) {
      alert('Course must have at least 1 lecture before submitting for review.');
      return;
    }
    setSubmittingReview(true);
    try {
      await CoursesAPI.submitReview(Number(id));
      await refreshCourses();
      alert('Course successfully submitted for administrator review.');
    } catch (err: any) {
      alert(err.message || 'Failed to submit course for review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <Link to="/educator/courses" className="inline-flex items-center gap-1.5 text-xs text-[#A87519] hover:underline font-semibold">
          <ArrowLeft className="w-4 h-4" /> Back to Courses
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          {existingCourse && (
            <Link
              to={`/courses/${existingCourse.slug}`}
              target="_blank"
              className="px-3 py-1.5 rounded-lg border border-[#E3D8BE] bg-white text-xs font-semibold text-[#061426] hover:bg-[#F8F4EA] flex items-center gap-1.5 shadow-sm"
              title="Preview Course as Student"
            >
              <Eye className="w-3.5 h-3.5 text-[#A87519]" /> Preview as Student
            </Link>
          )}
          {isEditing && (
            <button
              type="button"
              disabled={submittingReview || (fullCourse?.curriculum?.reduce((sum, m) => sum + (m.lessons?.length || 0), 0) || 0) < 1 || existingCourse?.review_status === 'pending' || existingCourse?.review_status === 'approved'}
              onClick={handleSubmitReview}
              className="px-3.5 py-1.5 rounded-lg bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] text-xs font-bold shadow flex items-center gap-1.5 disabled:opacity-50 transition"
              title={(fullCourse?.curriculum?.reduce((sum, m) => sum + (m.lessons?.length || 0), 0) || 0) < 1 ? 'At least 1 lecture is required before submitting review' : 'Submit course for admin review'}
            >
              {submittingReview ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>{existingCourse?.review_status === 'pending' ? 'In Review' : existingCourse?.review_status === 'approved' ? 'Approved (Live)' : 'Submit for Review'}</span>
            </button>
          )}
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-800 text-sm">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span>Course saved successfully!</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-800 text-sm">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Course Core Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border-2 border-[#E3D8BE] p-6 sm:p-8 space-y-6 shadow-sm">
        <h3 className="font-serif font-bold text-base text-[#061426] border-b border-[#E3D8BE]/50 pb-2">Course Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#263347] mb-1.5">Course Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. GATE — Graduate Aptitude Test"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#263347] mb-1.5">URL Slug *</label>
            <input
              type="text"
              required
              value={formData.slug}
              onChange={(e) => setFormData(p => ({ ...p, slug: e.target.value }))}
              placeholder="e.g. gate-physics"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#263347] mb-1.5">Category *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none bg-white"
            >
              <option value="after-msc-btech">After MSc / B.Tech</option>
              <option value="post-graduate-entrance">Post Graduate Entrance</option>
              <option value="career-foundation">Career & Foundation</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#263347] mb-1.5">Target Exam *</label>
            <input
              type="text"
              value={formData.target_exam}
              onChange={(e) => setFormData(p => ({ ...p, target_exam: e.target.value }))}
              placeholder="e.g. GATE 2027"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#263347] mb-1.5">Course Fee (₹)</label>
            <input
              type="text"
              readOnly
              disabled
              value={formData.price}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Course fee is set by administrators upon review.</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#263347] mb-1.5">Subtitle</label>
          <input
            type="text"
            value={formData.subtitle}
            onChange={(e) => setFormData(p => ({ ...p, subtitle: e.target.value }))}
            placeholder="Comprehensive national coaching program"
            className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none"
          />
        </div>

        {/* Course Banner Image Field */}
        <div>
          <label className="block text-xs font-semibold text-[#263347] mb-1.5">
            Course Banner Image (1280×720 recommended • 16:9)
          </label>
          <input
            type="text"
            value={formData.banner_image}
            onChange={(e) => setFormData(p => ({ ...p, banner_image: e.target.value }))}
            placeholder="https://images.unsplash.com/... or /images/courses/gate-banner.jpg"
            className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none"
          />
          {formData.banner_image && (
            <div className="mt-2 relative rounded-xl overflow-hidden border border-[#E3D8BE] aspect-video max-w-sm">
              <img
                src={formData.banner_image}
                alt="Banner Preview"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <span className="text-[10px] text-slate-500 mt-1 block">
            Used as the high-resolution hero background card on the public course details page.
          </span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#263347] mb-1.5">Summary Description</label>
          <textarea
            rows={3}
            value={formData.short_description}
            onChange={(e) => setFormData(p => ({ ...p, short_description: e.target.value }))}
            placeholder="Overview of syllabus, modules, and target benchmark..."
            className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none"
          />
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
          <div>
            <span className="font-semibold text-slate-800 block">Catalog Visibility</span>
            <span>Courses become live in the public catalog once approved by administration.</span>
          </div>
          <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase bg-slate-200 text-slate-700">
            {formData.is_published ? 'Live / Approved' : 'Draft / In Review'}
          </span>
        </div>

        <div className="pt-4 border-t border-[#E3D8BE] flex justify-end gap-3">
          <Link
            to="/educator/courses"
            className="px-5 py-2.5 rounded-lg border border-[#E3D8BE] text-[#263347] text-xs font-bold hover:bg-[#F8F4EA]"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-lg bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] text-xs font-bold shadow flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Course
              </>
            )}
          </button>
        </div>
      </form>

      {/* Modules & Lectures Management Section (when editing an existing course) */}
      {isEditing && (
        <div className="bg-white rounded-2xl border-2 border-[#E3D8BE] p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E3D8BE]/50 pb-3">
            <div>
              <h3 className="font-serif font-bold text-lg text-[#061426] flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#D9A52E]" /> Curriculum Modules & Lectures
              </h3>
              <p className="text-xs text-[#687386] mt-0.5">Manage chapters, video lessons, and preview locks.</p>
            </div>
          </div>

          {loadingCurriculum ? (
            <div className="p-8 text-center text-[#687386] flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading curriculum structure...
            </div>
          ) : (
            <div className="space-y-6">
              {/* Modules List */}
              {fullCourse?.curriculum && fullCourse.curriculum.length > 0 ? (
                <div className="space-y-4">
                  {fullCourse.curriculum.map((mod) => (
                    <div key={mod.id} className="border border-[#E3D8BE] rounded-xl overflow-hidden bg-[#FFFDF9]">
                      <div className="p-4 bg-[#F8F4EA] flex items-center justify-between border-b border-[#E3D8BE]/60">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-[#A87519] bg-[#E3D8BE]/40 px-2 py-0.5 rounded mr-2">
                            Module {mod.order}
                          </span>
                          <span className="font-bold text-sm text-[#061426]">{mod.title}</span>
                          {mod.description && <p className="text-xs text-[#687386] mt-0.5">{mod.description}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setActiveModuleIdForLecture(activeModuleIdForLecture === mod.id ? null : mod.id)}
                            className="px-2.5 py-1 text-xs font-bold rounded bg-[#D9A52E] text-[#061426] hover:bg-[#c29325] flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Lecture
                          </button>
                          <button
                            onClick={() => handleDeleteModule(mod.id)}
                            className="p-1 text-red-600 hover:text-red-800 rounded hover:bg-red-50"
                            title="Delete Module"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Add Lecture Form inside Module */}
                      {activeModuleIdForLecture === mod.id && (
                        <div className="p-4 bg-[#FFF9ED] border-b border-[#E3D8BE] space-y-3">
                          <h4 className="text-xs font-bold text-[#061426] flex items-center gap-1.5">
                            <Video className="w-4 h-4 text-[#D9A52E]" /> New Lecture for {mod.title}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                              type="text"
                              placeholder="Lecture Title *"
                              value={lectureForm.title}
                              onChange={(e) => setLectureForm(p => ({ ...p, title: e.target.value }))}
                              className="px-3 py-1.5 text-xs rounded border border-[#E3D8BE] bg-white"
                            />
                            <input
                              type="text"
                              placeholder="Duration (e.g. 45 mins)"
                              value={lectureForm.duration}
                              onChange={(e) => setLectureForm(p => ({ ...p, duration: e.target.value }))}
                              className="px-3 py-1.5 text-xs rounded border border-[#E3D8BE] bg-white"
                            />
                            <input
                              type="url"
                              placeholder="Video URL (https://... or YouTube/Vimeo)"
                              value={lectureForm.video_url}
                              onChange={(e) => setLectureForm(p => ({ ...p, video_url: e.target.value }))}
                              className="px-3 py-1.5 text-xs rounded border border-[#E3D8BE] bg-white sm:col-span-2"
                            />
                            <textarea
                              rows={2}
                              placeholder="Summary of topics covered..."
                              value={lectureForm.summary}
                              onChange={(e) => setLectureForm(p => ({ ...p, summary: e.target.value }))}
                              className="px-3 py-1.5 text-xs rounded border border-[#E3D8BE] bg-white sm:col-span-2"
                            />
                            <div className="flex items-center gap-4 text-xs sm:col-span-2">
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={lectureForm.is_free_preview}
                                  onChange={(e) => setLectureForm(p => ({ ...p, is_free_preview: e.target.checked }))}
                                  className="rounded border-[#E3D8BE] text-[#D9A52E] focus:ring-0"
                                />
                                <span>Free Preview (publicly accessible)</span>
                              </label>
                              <div className="flex items-center gap-2 ml-auto">
                                <button
                                  type="button"
                                  onClick={() => setActiveModuleIdForLecture(null)}
                                  className="px-3 py-1 text-xs rounded border border-[#E3D8BE] text-[#687386]"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  disabled={creatingLecture}
                                  onClick={() => handleAddLecture(mod.id)}
                                  className="px-3 py-1 text-xs font-bold rounded bg-[#D9A52E] text-[#061426] hover:bg-[#c29325] disabled:opacity-50"
                                >
                                  {creatingLecture ? 'Saving...' : 'Save Lecture'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Lectures in Module */}
                      <div className="divide-y divide-[#E3D8BE]/40">
                        {mod.lessons && mod.lessons.length > 0 ? (
                          mod.lessons.map((lec) => (
                            <div key={lec.id} className="p-3 pl-6 flex items-center justify-between text-xs hover:bg-[#F8F4EA]/50">
                              <div className="flex items-center gap-3">
                                <span className="text-[#687386] font-mono">{lec.order}.</span>
                                <div>
                                  <div className="font-semibold text-[#061426] flex items-center gap-2">
                                    {lec.title}
                                    {lec.is_free_preview && (
                                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                                        Free Preview
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[#687386] text-[11px] flex items-center gap-3 mt-0.5">
                                    <span>{lec.duration}</span>
                                    {lec.video_url && <span className="text-[#A87519] truncate max-w-xs">{lec.video_url}</span>}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeleteLecture(lec.id)}
                                className="p-1 text-red-500 hover:text-red-700 rounded"
                                title="Delete Lecture"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 pl-6 text-xs text-[#687386] italic">
                            No lectures added to this module yet.
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-[#F8F4EA] rounded-xl text-center text-xs text-[#687386]">
                  No curriculum modules defined yet. Add the first module below.
                </div>
              )}

              {/* Add New Module Form */}
              <form onSubmit={handleAddModule} className="p-4 bg-[#F8F4EA]/70 border border-[#E3D8BE] rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-[#061426] flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-[#D9A52E]" /> Add New Curriculum Module
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Module Title (e.g. Unit 1: Real Analysis) *"
                    value={newModuleTitle}
                    onChange={(e) => setNewModuleTitle(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded border border-[#E3D8BE] bg-white sm:col-span-2"
                  />
                  <input
                    type="number"
                    min={1}
                    placeholder="Order"
                    value={newModuleOrder}
                    onChange={(e) => setNewModuleOrder(Number(e.target.value))}
                    className="px-3 py-1.5 text-xs rounded border border-[#E3D8BE] bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={newModuleDesc}
                    onChange={(e) => setNewModuleDesc(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded border border-[#E3D8BE] bg-white sm:col-span-2"
                  />
                  <button
                    type="submit"
                    disabled={creatingModule}
                    className="px-4 py-1.5 text-xs font-bold rounded bg-[#D9A52E] text-[#061426] hover:bg-[#c29325] flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" /> {creatingModule ? 'Adding...' : 'Add Module'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
