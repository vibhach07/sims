import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Phone, Mail, MapPin, Globe, ArrowRight, ShieldCheck, 
  Award, ExternalLink, Navigation, Instagram, Facebook, Youtube, MessageCircle 
} from 'lucide-react';
import { useSite } from '../../contexts/SiteContext';
import { useAuth } from '../../contexts/AuthContext';
import { WhatsAppCounsellorButton } from '../WhatsAppCounsellorButton';

export const Footer: React.FC = () => {
  const { settings, centres } = useSite();
  const { user } = useAuth();

  return (
    <footer className="bg-[#061426] text-[#FFF9ED] border-t border-[#D9A52E]/30 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-white/10">
          
          {/* Col 1: Institute Brand & Mission */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img 
                src="/assets/sims-logo.png" 
                alt="SIMS Raipur Logo" 
                className="h-12 sm:h-14 w-auto object-contain"
              />
              <div className="flex flex-col justify-center">
                <span 
                  className="font-serif font-bold text-2xl sm:text-3xl tracking-[0.16em] text-[#F0C45B] leading-none select-none"
                  style={{ fontFamily: "'Cinzel', serif" }}
                >
                  SIMS
                </span>
                <span 
                  className="font-montserrat font-semibold text-[10px] sm:text-[11px] tracking-[0.34em] text-[#FFF9ED]/90 uppercase mt-1 leading-none select-none"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  RAIPUR
                </span>
              </div>
            </div>

            <p className="text-xs font-serif text-[#D9A52E] italic">
              "Your Success. Our Commitment."
            </p>
            <p className="text-sm text-[#E3D8BE]/80 leading-relaxed">
              Complete Preparation for a Better Tomorrow. Premier coaching institute dedicated to GATE, NET, SET, IIT-JAM, NIMCET, CAT, JEE, NEET, and Foundation programs.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#102846] text-[#F0C45B] text-xs font-medium border border-[#D9A52E]/30">
                <ShieldCheck className="w-3.5 h-3.5 text-[#D9A52E]" />
                Official Raipur Center
              </span>
            </div>

            {/* Social Media Channels */}
            <div className="pt-3 space-y-2.5">
              <span className="text-xs font-semibold text-[#F0C45B] tracking-wider uppercase block">
                Connect With Us
              </span>
              <div className="flex items-center gap-2.5">
                <a
                  href={settings.instagram_url || 'https://www.instagram.com/simsraipur'}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="SIMS Raipur Instagram"
                  className="w-9 h-9 rounded-xl bg-[#102846] border border-[#D9A52E]/30 flex items-center justify-center text-[#E3D8BE] hover:text-[#E4405F] hover:border-[#E4405F] hover:bg-[#1C3B63] transition-all transform hover:scale-110 shadow-xs"
                  title="Follow on Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </a>
                <a
                  href={settings.facebook_url || 'https://www.facebook.com/simsraipur'}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="SIMS Raipur Facebook"
                  className="w-9 h-9 rounded-xl bg-[#102846] border border-[#D9A52E]/30 flex items-center justify-center text-[#E3D8BE] hover:text-[#1877F2] hover:border-[#1877F2] hover:bg-[#1C3B63] transition-all transform hover:scale-110 shadow-xs"
                  title="Follow on Facebook"
                >
                  <Facebook className="w-4 h-4" />
                </a>
                <a
                  href={settings.youtube_url || 'https://www.youtube.com/@simsraipur'}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="SIMS Raipur YouTube"
                  className="w-9 h-9 rounded-xl bg-[#102846] border border-[#D9A52E]/30 flex items-center justify-center text-[#E3D8BE] hover:text-[#FF0000] hover:border-[#FF0000] hover:bg-[#1C3B63] transition-all transform hover:scale-110 shadow-xs"
                  title="Subscribe on YouTube"
                >
                  <Youtube className="w-4 h-4" />
                </a>
                <a
                  href={`https://wa.me/${settings.whatsapp_counsellor_number || '918959774702'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="SIMS Raipur WhatsApp"
                  className="w-9 h-9 rounded-xl bg-[#102846] border border-[#D9A52E]/30 flex items-center justify-center text-[#E3D8BE] hover:text-[#25D366] hover:border-[#25D366] hover:bg-[#1C3B63] transition-all transform hover:scale-110 shadow-xs"
                  title="Chat on WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Col 2: Course Categories */}
          <div className="space-y-4">
            <h3 className="font-serif font-bold text-base text-[#F0C45B] tracking-wide border-b border-[#D9A52E]/20 pb-2">
              Course Categories
            </h3>
            <ul className="space-y-2 text-sm text-[#FFF9ED]/80">
              <li>
                <Link to="/categories/after-msc-btech" className="hover:text-[#F0C45B] transition flex items-center gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-[#D9A52E]" />
                  After MSc / B.Tech (GATE, NET, SET)
                </Link>
              </li>
              <li>
                <Link to="/categories/post-graduate-entrance" className="hover:text-[#F0C45B] transition flex items-center gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-[#D9A52E]" />
                  Post Graduate Entrance (JAM, NIMCET, CAT)
                </Link>
              </li>
              <li>
                <Link to="/categories/career-foundation" className="hover:text-[#F0C45B] transition flex items-center gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-[#D9A52E]" />
                  Career & Foundation (JEE, NEET, CA, X-XII)
                </Link>
              </li>
              <li>
                <Link to="/courses" className="hover:text-[#F0C45B] transition flex items-center gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-[#D9A52E]" />
                  All Exam Catalogs
                </Link>
              </li>
              <li>
                <Link to="/test-series" className="hover:text-[#F0C45B] transition flex items-center gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-[#D9A52E]" />
                  Mock Test Series
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Quick Navigation & Portals */}
          <div className="space-y-4">
            <h3 className="font-serif font-bold text-base text-[#F0C45B] tracking-wide border-b border-[#D9A52E]/20 pb-2">
              Quick Links & Portals
            </h3>
            <ul className="space-y-2 text-sm text-[#FFF9ED]/80">
              <li><Link to="/about" className="hover:text-[#F0C45B] transition">About SIMS Raipur</Link></li>
              <li><Link to="/faculty" className="hover:text-[#F0C45B] transition">Faculty Directory</Link></li>
              <li><Link to="/study-material" className="hover:text-[#F0C45B] transition">Free Study Resources</Link></li>
              <li><Link to="/student/dashboard" className="hover:text-[#F0C45B] transition">Student Learning Dashboard</Link></li>
              {user?.role !== 'student' && (user?.role === 'educator' || user?.isStaff || user?.role === 'admin' || user?.role === 'superadmin') && (
                <li><Link to="/educator/dashboard" className="hover:text-[#F0C45B] transition">Educator Workspace</Link></li>
              )}
              {user?.role !== 'student' && (user?.isStaff || user?.role === 'admin' || user?.role === 'superadmin') && (
                <li><Link to="/admin/dashboard" className="hover:text-[#F0C45B] transition">Admin Portal</Link></li>
              )}
              <li><Link to="/privacy-policy" className="hover:text-[#F0C45B] transition">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-[#F0C45B] transition">Terms & Conditions</Link></li>
            </ul>
          </div>

          {/* Col 4: Verified Contact Information & Centres */}
          <div className="space-y-4">
            <h3 className="font-serif font-bold text-base text-[#F0C45B] tracking-wide border-b border-[#D9A52E]/20 pb-2">
              Contact & Institute Center
            </h3>
            <div className="space-y-4 text-sm text-[#FFF9ED]/80">
              {centres.filter((c) => !c.name.toLowerCase().includes('crawl')).slice(0, 2).map((c) => (
                <div key={c.id} className="space-y-1.5 pb-2 border-b border-white/5 last:border-0 last:pb-0">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-[#D9A52E] flex-shrink-0 mt-0.5" />
                    <a
                      href={c.map_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[#F0C45B] transition leading-snug text-xs sm:text-sm block font-medium"
                      title="Open location on Google Maps"
                    >
                      <span className="font-semibold text-white block">{c.name}</span>
                      <span className="text-[#E3D8BE]/80">{c.address}</span>
                    </a>
                  </div>

                  <div className="flex items-center gap-2 pl-6 pt-0.5">
                    <a
                      href={c.map_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#D9A52E] hover:text-[#F0C45B] hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" /> Open in Maps
                    </a>
                    <span className="text-white/30">•</span>
                    <a
                      href={c.directions_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#D9A52E] hover:text-[#F0C45B] hover:underline"
                    >
                      <Navigation className="w-3 h-3" /> Get directions
                    </a>
                  </div>
                </div>
              ))}

              <div className="flex items-center gap-3 pt-1">
                <Phone className="w-4 h-4 text-[#D9A52E] flex-shrink-0" />
                <a href={`tel:${settings.support_phone}`} className="hover:text-[#F0C45B] transition font-medium text-xs sm:text-sm">
                  {settings.support_phone}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-[#D9A52E] flex-shrink-0" />
                <a href={`mailto:${settings.support_email}`} className="hover:text-[#F0C45B] transition text-xs sm:text-sm">
                  {settings.support_email}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-[#D9A52E] flex-shrink-0" />
                <a href={settings.website_url || 'https://simsraipuredu.in'} target="_blank" rel="noreferrer" className="hover:text-[#F0C45B] transition text-xs sm:text-sm">
                  simsraipuredu.in
                </a>
              </div>
              <div className="pt-2">
                <span className="text-[11px] font-semibold text-[#D9A52E] uppercase tracking-wider block mb-2">
                  Official Social Channels
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={settings.instagram_url || 'https://www.instagram.com/simsraipur'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-[#102846] hover:bg-[#1C3B63] text-[#E3D8BE] hover:text-[#E4405F] border border-[#D9A52E]/30 transition"
                    title="Instagram"
                    aria-label="Instagram"
                  >
                    <Instagram className="w-4 h-4" />
                  </a>
                  <a
                    href={settings.facebook_url || 'https://www.facebook.com/simsraipur'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-[#102846] hover:bg-[#1C3B63] text-[#E3D8BE] hover:text-[#1877F2] border border-[#D9A52E]/30 transition"
                    title="Facebook"
                    aria-label="Facebook"
                  >
                    <Facebook className="w-4 h-4" />
                  </a>
                  <a
                    href={settings.youtube_url || 'https://www.youtube.com/@simsraipur'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-[#102846] hover:bg-[#1C3B63] text-[#E3D8BE] hover:text-[#FF0000] border border-[#D9A52E]/30 transition"
                    title="YouTube"
                    aria-label="YouTube"
                  >
                    <Youtube className="w-4 h-4" />
                  </a>
                  <a
                    href={`https://wa.me/${settings.whatsapp_counsellor_number || '918959774702'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-[#102846] hover:bg-[#1C3B63] text-[#E3D8BE] hover:text-[#25D366] border border-[#D9A52E]/30 transition"
                    title="WhatsApp"
                    aria-label="WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
            <div className="pt-2">
              <WhatsAppCounsellorButton variant="primary" className="w-full">
                Book Free Counselling
              </WhatsAppCounsellorButton>
            </div>
          </div>

        </div>

        {/* Bottom copyright disclaimer */}
        <div className="pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-[#E3D8BE]/60 gap-4">
          <p>© {new Date().getFullYear()} SIMS Raipur. All rights reserved.</p>
          <div className="flex items-center gap-3 text-xs text-[#E3D8BE]/80">
            <span className="text-[#D9A52E] font-medium">Follow Us:</span>
            <a href={settings.instagram_url || 'https://www.instagram.com/simsraipur'} target="_blank" rel="noopener noreferrer" className="hover:text-[#F0C45B] transition">Instagram</a>
            <span>•</span>
            <a href={settings.facebook_url || 'https://www.facebook.com/simsraipur'} target="_blank" rel="noopener noreferrer" className="hover:text-[#F0C45B] transition">Facebook</a>
            <span>•</span>
            <a href={settings.youtube_url || 'https://www.youtube.com/@simsraipur'} target="_blank" rel="noopener noreferrer" className="hover:text-[#F0C45B] transition">YouTube</a>
            <span>•</span>
            <a href={`https://wa.me/${settings.whatsapp_counsellor_number || '918959774702'}`} target="_blank" rel="noopener noreferrer" className="hover:text-[#25D366] transition">WhatsApp</a>
          </div>
        </div>

      </div>
    </footer>
  );
};
