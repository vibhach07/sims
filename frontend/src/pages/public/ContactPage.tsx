import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Phone, Mail, MapPin, Globe, CheckCircle2, Send, Clock, 
  ShieldCheck, Loader2, AlertCircle, ExternalLink, Navigation, 
  MessageSquare 
} from 'lucide-react';
import { EnquiriesAPI } from '../../services/api';
import { COURSES_DATA } from '../../data/courses';
import { useSite } from '../../contexts/SiteContext';
import { WhatsAppCounsellorButton } from '../../components/WhatsAppCounsellorButton';

export const ContactPage: React.FC = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialCourse = searchParams.get('course') || '';
  const { settings, centres } = useSite();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    courseInterested: initialCourse || (COURSES_DATA[0]?.title || 'GATE & Foundation Coaching'),
    message: ''
  });

  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone) {
      setErrorMsg('Please fill in all required fields (Name, Email, Phone).');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);
    try {
      await EnquiriesAPI.create(formData);
      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit enquiry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-12 bg-[#FFF9ED] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-[#A87519] bg-[#F8F4EA] px-3.5 py-1 rounded-full border border-[#E3D8BE]">
            Admissions & Student Advisory
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-extrabold text-[#061426]">
            Get in Touch with SIMS Raipur
          </h1>
          <p className="text-[#687386] text-sm sm:text-base">
            Have questions about syllabus, class schedules, or admission procedures? Our academic counselors are here to help.
          </p>
          <div className="pt-2 flex justify-center">
            <WhatsAppCounsellorButton 
              course={formData.courseInterested} 
              variant="compact"
            >
              Direct WhatsApp Counsellor Desk
            </WhatsAppCounsellorButton>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Centres & Contact Details */}
          <div className="space-y-6">
            {centres.filter((c) => !c.name.toLowerCase().includes('crawl')).map((c) => (
              <div 
                key={c.id} 
                className="bg-white p-6 rounded-2xl border-2 border-[#E3D8BE] shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-serif font-bold text-xl text-[#061426] flex items-center gap-2">
                    {c.name}
                  </h3>
                  {c.is_primary && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#D9A52E]/20 text-[#061426] border border-[#D9A52E]/40 uppercase">
                      Primary
                    </span>
                  )}
                </div>

                <div className="space-y-3 text-xs text-[#263347]">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-[#A87519] flex-shrink-0 mt-0.5" />
                    <div>
                      <a
                        href={c.map_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[#A87519] hover:underline transition font-medium block leading-relaxed"
                        title="Open on Google Maps"
                      >
                        {c.address}
                      </a>
                      <div className="flex items-center gap-3 mt-2">
                        <a
                          href={c.map_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-bold text-[#A87519] hover:text-[#061426] text-[11px]"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Open in Google Maps
                        </a>
                        <span className="text-slate-300">•</span>
                        <a
                          href={c.directions_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-bold text-[#A87519] hover:text-[#061426] text-[11px]"
                        >
                          <Navigation className="w-3.5 h-3.5" /> Get directions
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <Phone className="w-5 h-5 text-[#A87519] flex-shrink-0" />
                    <a href={`tel:${c.phone || settings.support_phone}`} className="hover:text-[#A87519] font-medium">
                      {c.phone || settings.support_phone}
                    </a>
                  </div>

                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-[#A87519] flex-shrink-0" />
                    <a href={`mailto:${settings.support_email}`} className="hover:text-[#A87519]">
                      {settings.support_email}
                    </a>
                  </div>

                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-[#A87519] flex-shrink-0" />
                    <span>Mon – Sat: 8:00 AM – 7:30 PM (Sunday by appointment)</span>
                  </div>
                </div>

                {/* Optional Embedded Google Map */}
                {c.embed_url && (
                  <div className="pt-2">
                    <iframe
                      src={c.embed_url}
                      title={`Google Map Location for ${c.name}`}
                      width="100%"
                      height="200"
                      style={{ border: 0 }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="rounded-xl shadow-inner border border-[#E3D8BE]"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <div className="bg-white p-8 rounded-2xl border-2 border-[#E3D8BE] shadow-sm">
              {submitted ? (
                <div className="py-12 text-center space-y-4">
                  <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
                  <h3 className="font-serif font-bold text-2xl text-[#061426]">Enquiry Registered Successfully</h3>
                  <p className="text-xs text-[#687386] max-w-md mx-auto">
                    Thank you, <strong>{formData.name}</strong>. Our senior counselor for {formData.courseInterested} will reach out to you within 24 hours.
                  </p>
                  
                  {/* WhatsApp instant counsellor CTA on thank you */}
                  <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <WhatsAppCounsellorButton 
                      course={formData.courseInterested} 
                      variant="primary"
                    >
                      Connect with Counsellor on WhatsApp Now
                    </WhatsAppCounsellorButton>
                    <button
                      onClick={() => {
                        setSubmitted(false);
                        setFormData({
                          name: '',
                          email: '',
                          phone: '',
                          courseInterested: COURSES_DATA[0]?.title || 'GATE Coaching',
                          message: ''
                        });
                      }}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                    >
                      Submit Another Query
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {errorMsg && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#263347] mb-1">Your Full Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                        placeholder="Aarav Sharma"
                        className="w-full p-2.5 text-xs rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#263347] mb-1">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                        placeholder="aarav@example.com"
                        className="w-full p-2.5 text-xs rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#263347] mb-1">Mobile Phone *</label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                        placeholder="9876543210"
                        className="w-full p-2.5 text-xs rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#263347] mb-1">Target Program / Course *</label>
                      <input
                        type="text"
                        required
                        value={formData.courseInterested}
                        onChange={(e) => setFormData(p => ({ ...p, courseInterested: e.target.value }))}
                        className="w-full p-2.5 text-xs rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#263347] mb-1">Message or Queries</label>
                    <textarea
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData(p => ({ ...p, message: e.target.value }))}
                      placeholder="Ask about batch timings, fee concessions, study material..."
                      className="w-full p-2.5 text-xs rounded-lg border border-[#E3D8BE] focus:border-[#D9A52E] focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-lg bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] font-bold text-xs shadow flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Submitting Enquiry...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Send Admissions Enquiry
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
