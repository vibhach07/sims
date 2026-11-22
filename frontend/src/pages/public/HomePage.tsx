import React, { useState, useEffect } from 'react';
import { FacultyAPI, APIFaculty } from '../../services/api';
import { Link } from 'react-router-dom';
import { 
  CheckCircle, ArrowRight, BookOpen, Users, Clock, Award, 
  HelpCircle, ChevronRight, FileText, Sparkles, GraduationCap,
  TrendingUp, Compass, HeartPulse
} from 'lucide-react';
import { CourseCard } from '../../components/courses/CourseCard';
import { AnnouncementTicker } from '../../components/ui/AnnouncementTicker';
import { HeroExamBoard } from '../../components/home/HeroExamBoard';
import { useCourses } from '../../contexts/CourseContext';
import { WhatsAppCounsellorButton } from '../../components/WhatsAppCounsellorButton';
import { FACULTY_DATA } from '../../data/faculty';
import { MOCK_TESTS_DATA } from '../../data/tests';

export const HomePage: React.FC = () => {
  const { courses } = useCourses();
  const [facultyList, setFacultyList] = useState<APIFaculty[]>([]);

  useEffect(() => {
    FacultyAPI.list().then(data => setFacultyList(data)).catch(() => {});
  }, []);

  const featuredCourses = courses.slice(0, 6);

  const categories = [
    {
      title: 'After MSc / B.Tech',
      slug: 'after-msc-btech',
      description: 'Specialized coaching for national lectureship, research fellowships, and PSU recruitment exams.',
      exams: ['GATE', 'CSIR / UGC NET', 'SET', 'AP (PSC)', 'PhD Entrance'],
      icon: GraduationCap,
      badge: 'Advanced Academic'
    },
    {
      title: 'Post Graduate Entrance',
      slug: 'post-graduate-entrance',
      description: 'Comprehensive mentorship for premier Master’s admissions in IITs, NITs, IIMs, and banking recruitments.',
      exams: ['IIT-JAM', 'NIMCET (NIT MCA)', 'CAT', 'Banking (PO / Clerk / SO)'],
      icon: TrendingUp,
      badge: 'Premier Master Tracks'
    },
    {
      title: 'Career & Foundation',
      slug: 'career-foundation',
      description: 'High-impact competitive coaching and rigorous school foundation programs.',
      exams: ['CA Foundation', 'JEE (Main & Adv)', 'NEET', 'AIIMS B.Sc. Nursing', 'Classes X–XII'],
      icon: Compass,
      badge: 'Core Foundation'
    }
  ];

  const bannerPoints = [
    { title: 'Expert Faculties', desc: 'Accomplished mentors with proven track records in national-level competitive mentoring.' },
    { title: 'Result Oriented Preparation', desc: 'Systematic curriculum aligned strictly with recent examination trends and marking schemes.' },
    { title: 'Comprehensive Study Material', desc: 'Concise theory notes, formula summaries, and solved previous 15–25 years question archives.' },
    { title: 'Regular Test Series', desc: 'Simulated computer-based test platform with in-depth analytics, sectional timing, and negative marking drills.' },
    { title: 'Personalized Guidance', desc: 'Individual doubt resolution, test performance reviews, and strategic academic counseling.' }
  ];

  return (
    <div className="space-y-16 lg:space-y-24">
      
      {/* 1. HERO SECTION */}
      <section className="relative bg-gradient-to-b from-[#061426] via-[#091B31] to-[#102846] dark:bg-gradient-to-b dark:from-[#101113] dark:via-[#141619] dark:to-[#181A1D] text-white pt-12 pb-20 lg:py-24 overflow-hidden border-b border-[#D9A52E]/30 dark:border-[#383D44]">
        
        {/* Subtle decorative background glow */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-[#D9A52E]/10 dark:bg-[#D5AD5B]/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-[#102846]/40 dark:hidden rounded-full blur-2xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="space-y-3">
                <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#FFF9ED] leading-tight">
                  Your Success. <br className="hidden sm:inline" />
                  <span className="text-[#D9A52E] drop-shadow-sm">Our Commitment.</span>
                </h1>
                
                <p className="font-serif text-lg sm:text-xl text-[#F0C45B] font-medium italic">
                  "Complete Preparation for a Better Tomorrow."
                </p>
              </div>

              <p className="text-base sm:text-lg text-[#E3D8BE]/90 max-w-2xl leading-relaxed mx-auto lg:mx-0">
                Prepare for competitive examinations with expert faculty, structured study material, regular test series, and personalized academic guidance at SIMS Raipur.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
                <Link
                  to="/courses"
                  className="btn-sims-primary w-full sm:w-auto px-8 py-3.5 text-base font-bold shadow-lg"
                >
                  Explore Courses
                </Link>
                
                <WhatsAppCounsellorButton
                  variant="secondary"
                  className="w-full sm:w-auto px-7 py-3.5 text-base font-medium shadow-md"
                >
                  Talk to Our Counsellor
                </WhatsAppCounsellorButton>
              </div>

              {/* Quick credentials */}
              <div className="pt-6 grid grid-cols-3 gap-4 border-t border-white/10 max-w-lg mx-auto lg:mx-0 text-center lg:text-left">
                <div>
                  <div className="text-xl sm:text-2xl font-bold font-serif text-[#F0C45B]">14+</div>
                  <div className="text-xs text-[#E3D8BE]/70">Exam Programs</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold font-serif text-[#F0C45B]">100%</div>
                  <div className="text-xs text-[#E3D8BE]/70">Exam Aligned</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold font-serif text-[#F0C45B]">Hybrid</div>
                  <div className="text-xs text-[#E3D8BE]/70">Classroom + CBT</div>
                </div>
              </div>

            </div>

            {/* Right Card / Visual Reference Container */}
            <div className="lg:col-span-5 flex justify-center">
              <HeroExamBoard />
            </div>

          </div>
        </div>

      </section>

      {/* HORIZONTAL ANNOUNCEMENT MARQUEE STICKERS */}
      <AnnouncementTicker />

      {/* 2. THREE PROMINENT CATEGORY CARDS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-[#A87519] bg-[#F8F4EA] px-3 py-1 rounded-full border border-[#E3D8BE]">
            Academic Streams
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#061426] mt-3">
            Explore Course Categories
          </h2>
          <p className="text-[#687386] text-sm sm:text-base mt-2">
            Structured batches designed specifically for your stage of academic and professional advancement.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div 
                key={cat.slug}
                tabIndex={0}
                role="region"
                aria-label={`Category: ${cat.title}`}
                className="sims-card sims-card-interactive p-8 flex flex-col justify-between group outline-none"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 rounded-xl bg-[#091B31] text-[#D9A52E] flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Icon className="w-7 h-7" />
                    </div>
                    <span className="text-xs font-semibold text-[#A87519] bg-[#FFF9ED] border border-[#E3D8BE] px-2.5 py-1 rounded-full">
                      {cat.badge}
                    </span>
                  </div>

                  <h3 className="font-serif font-bold text-2xl text-[#061426] mb-3 group-hover:text-[#A87519] transition">
                    {cat.title}
                  </h3>

                  <p className="text-sm text-[#687386] mb-6 leading-relaxed font-normal">
                    {cat.description}
                  </p>

                  <div className="space-y-2 mb-8">
                    <span className="text-xs font-semibold text-[#263347] uppercase tracking-wide block">
                      Target Examinations:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.exams.map((ex, i) => (
                        <span key={i} className="text-xs font-medium bg-[#F8F4EA] text-[#061426] px-2.5 py-1 rounded-md border border-[#E3D8BE]/80">
                          {ex}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <Link
                  to={`/categories/${cat.slug}`}
                  className="btn-sims-secondary w-full py-3 px-4 font-semibold text-sm flex items-center justify-center gap-2"
                >
                  <span>View Courses</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. WHY SIMS — FROM THE OFFICIAL BANNER */}
      <section className="bg-[#091B31] text-white py-16 lg:py-20 border-y border-[#D9A52E]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-[#F0C45B]">
              The SIMS Advantage
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#FFF9ED] mt-2">
              Why Prepare with SIMS Raipur?
            </h2>
            <p className="text-[#E3D8BE]/80 text-sm sm:text-base mt-2">
              Our core academic framework as highlighted in the institute’s official charter.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bannerPoints.map((item, index) => (
              <div 
                key={index} 
                className="bg-[#102846] p-6 rounded-xl border border-[#D9A52E]/20 hover:border-[#D9A52E] transition-all hover:-translate-y-1"
              >
                <div className="w-10 h-10 rounded-lg bg-[#061426] text-[#D9A52E] flex items-center justify-center mb-4 font-serif font-bold text-lg border border-[#D9A52E]/30">
                  0{index + 1}
                </div>
                <h3 className="font-serif font-bold text-xl text-[#F0C45B] mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-[#E3D8BE]/80 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}

            {/* 6th Card: Direct Admissions Assistance */}
            <div className="bg-gradient-to-br from-[#D9A52E] to-[#A87519] p-6 rounded-xl text-[#061426] flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded">
                  Get Started Today
                </span>
                <h3 className="font-serif font-bold text-2xl mt-4 mb-2">
                  Ready to Begin Your Preparation?
                </h3>
                <p className="text-sm font-medium leading-relaxed opacity-90">
                  Book a free one-on-one counseling session at our Raipur center or join online.
                </p>
              </div>
              <WhatsAppCounsellorButton
                variant="secondary"
                className="mt-6 inline-flex items-center justify-center gap-2 px-5 py-3 font-semibold text-sm"
              >
                Connect with Counsellor <ArrowRight className="w-4 h-4 text-[#D9A52E]" />
              </WhatsAppCounsellorButton>
            </div>

          </div>

        </div>
      </section>

      {/* 4. FEATURED COURSES SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#A87519]">
              Curriculum Catalog
            </span>
            <h2 className="font-serif text-3xl font-bold text-[#061426] mt-1">
              Featured Examination Courses
            </h2>
            <p className="text-sm text-[#687386] mt-1">
              Browse popular comprehensive programs covering classroom lectures and online test engine.
            </p>
          </div>
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#061426] hover:text-[#A87519] transition focus:outline-none focus:ring-1 focus:ring-[#D9A52E] rounded px-2 py-1"
          >
            <span>View All Courses</span>
            <ChevronRight className="w-4 h-4 text-[#D9A52E]" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredCourses.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      </section>

      {/* 5. FACULTY HIGHLIGHTS */}
      <section className="bg-[#F8F4EA] py-16 border-y border-[#E3D8BE]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-[#A87519]">
              Academic Leadership
            </span>
            <h2 className="font-serif text-3xl font-bold text-[#061426] mt-2">
              Learn from Renowned Educators
            </h2>
            <p className="text-sm text-[#687386] mt-1">
              Experienced mentors dedicated to student success and competitive excellence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {(facultyList.length > 0 ? facultyList : FACULTY_DATA).slice(0, 3).map((faculty) => (
              <div 
                key={faculty.id} 
                className="bg-white rounded-xl border border-[#E3D8BE] overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between group"
              >
                <div>
                  <img 
                    src={faculty.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(faculty.name)}&background=061426&color=D9A52E&size=400`} 
                    alt={faculty.name} 
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(faculty.name)}&background=061426&color=D9A52E&size=400`;
                    }}
                    className="w-full h-56 object-cover object-top group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="p-6">
                    <span className="text-xs font-semibold text-[#A87519] block mb-1">
                      {faculty.experience}
                    </span>
                    <h3 className="font-serif font-bold text-xl text-[#061426]">
                      {faculty.name}
                    </h3>
                    <p className="text-xs text-[#687386] font-medium mb-3">
                      {faculty.qualification}
                    </p>
                    <p className="text-xs text-[#263347] line-clamp-2 leading-relaxed mb-4">
                      {faculty.specialization}
                    </p>
                  </div>
                </div>
                <div className="p-6 pt-0">
                  <Link
                    to={`/faculty/${faculty.slug}`}
                    className="text-xs font-semibold text-[#091B31] hover:text-[#D9A52E] flex items-center gap-1 transition focus:outline-none focus:ring-1 focus:ring-[#D9A52E] rounded py-1"
                  >
                    View Academic Profile <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              to="/faculty"
              className="btn-sims-secondary inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold"
            >
              Meet Entire Faculty Team
            </Link>
          </div>
        </div>
      </section>

      {/* 6. TEST SERIES & STUDY RESOURCES TEASER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Test series card */}
          <div className="bg-[#061426] text-white p-8 rounded-2xl border border-[#D9A52E]/30 relative overflow-hidden flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#D9A52E]">
                Assessment Engine
              </span>
              <h3 className="font-serif font-bold text-2xl sm:text-3xl text-[#FFF9ED] mt-2 mb-4">
                National Standard Mock Tests
              </h3>
              <p className="text-sm text-[#E3D8BE]/80 leading-relaxed mb-6">
                Practice in an authentic Computer-Based Test (CBT) environment. Test your knowledge with instant scoring, negative marking rules, and in-depth stepwise explanations.
              </p>
              
              <ul className="space-y-2.5 text-xs text-[#FFF9ED]/90 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#D9A52E]" />
                  Sectional and full-length exam papers
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#D9A52E]" />
                  Real-time countdown timer and question palette
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#D9A52E]" />
                  Instant performance analysis & solution keys
                </li>
              </ul>
            </div>

            <Link
              to="/test-series"
              className="btn-sims-primary inline-flex items-center justify-center gap-2 px-6 py-3 font-bold text-sm"
            >
              Take Sample Mock Test <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Study material card */}
          <div className="bg-white p-8 rounded-2xl border-2 border-[#E3D8BE] flex flex-col justify-between shadow-sm">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#A87519]">
                Free Learning Resources
              </span>
              <h3 className="font-serif font-bold text-2xl sm:text-3xl text-[#061426] mt-2 mb-4">
                Curated High-Yield Study Material
              </h3>
              <p className="text-sm text-[#687386] leading-relaxed mb-6">
                Download structured formula handbooks, previous year solved question archives, and exam blueprint analysis designed by SIMS subject matter leads.
              </p>

              <div className="space-y-3 mb-6">
                <div className="p-3 rounded-lg bg-[#F8F4EA] border border-[#E3D8BE]/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-[#A87519]" />
                    <span className="font-medium text-[#061426]">GATE Engineering Maths Formula Book</span>
                  </div>
                  <span className="text-[#687386]">PDF</span>
                </div>
                <div className="p-3 rounded-lg bg-[#F8F4EA] border border-[#E3D8BE]/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-[#A87519]" />
                    <span className="font-medium text-[#061426]">NEET Biology Diagram Atlas</span>
                  </div>
                  <span className="text-[#687386]">PDF</span>
                </div>
              </div>
            </div>

            <Link
              to="/study-material"
              className="btn-sims-secondary inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold text-sm"
            >
              Access Resource Vault <ArrowRight className="w-4 h-4 text-[#D9A52E]" />
            </Link>
          </div>

        </div>
      </section>

      {/* 7. HOW SIMS WORKS */}
      <section className="bg-[#FFF9ED] py-16 border-t border-[#E3D8BE]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-[#A87519]">
            The Journey
          </span>
          <h2 className="font-serif text-3xl font-bold text-[#061426] mt-2 mb-12">
            How SIMS Raipur Accelerates Your Preparation
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="p-6 bg-white rounded-xl border border-[#E3D8BE] shadow-sm">
              <div className="w-12 h-12 rounded-full bg-[#061426] text-[#D9A52E] flex items-center justify-center font-bold mx-auto mb-4">1</div>
              <h4 className="font-serif font-bold text-lg text-[#061426] mb-2">Counselling & Diagnostic</h4>
              <p className="text-xs text-[#687386]">Identify your target exam, baseline strengths, and personalized study roadmap.</p>
            </div>
            <div className="p-6 bg-white rounded-xl border border-[#E3D8BE] shadow-sm">
              <div className="w-12 h-12 rounded-full bg-[#061426] text-[#D9A52E] flex items-center justify-center font-bold mx-auto mb-4">2</div>
              <h4 className="font-serif font-bold text-lg text-[#061426] mb-2">Concept Lectures</h4>
              <p className="text-xs text-[#687386]">Attend comprehensive classroom sessions or access digital interactive modules.</p>
            </div>
            <div className="p-6 bg-white rounded-xl border border-[#E3D8BE] shadow-sm">
              <div className="w-12 h-12 rounded-full bg-[#061426] text-[#D9A52E] flex items-center justify-center font-bold mx-auto mb-4">3</div>
              <h4 className="font-serif font-bold text-lg text-[#061426] mb-2">Rigorous Testing</h4>
              <p className="text-xs text-[#687386]">Regular weekly topic tests and CBT full mocks to build speed and accuracy.</p>
            </div>
            <div className="p-6 bg-white rounded-xl border border-[#E3D8BE] shadow-sm">
              <div className="w-12 h-12 rounded-full bg-[#061426] text-[#D9A52E] flex items-center justify-center font-bold mx-auto mb-4">4</div>
              <h4 className="font-serif font-bold text-lg text-[#061426] mb-2">Rank Attainment</h4>
              <p className="text-xs text-[#687386]">Continuous doubt clearing and final revision drills targeting top percentiles.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. CONTACT CALL TO ACTION BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="bg-gradient-to-r from-[#061426] via-[#091B31] to-[#102846] rounded-2xl p-8 sm:p-12 text-white border-2 border-[#D9A52E]/40 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-center md:text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-[#D9A52E]">
              Visit or Contact SIMS Raipur
            </span>
            <h3 className="font-serif font-bold text-2xl sm:text-3xl text-[#FFF9ED]">
              Need Guidance on Exam Strategy or Batches?
            </h3>
            <p className="text-sm text-[#E3D8BE]/80 max-w-xl">
              Talk directly with our academic counsellors. Visit our center at 3rd Floor, SBI Building, Chaoubey Colony, Samta, Raipur.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <a
              href="tel:8959774702"
              className="btn-sims-primary px-6 py-3 font-bold text-sm text-center"
            >
              Call 8959774702
            </a>
            <Link
              to="/contact"
              className="btn-sims-secondary px-6 py-3 font-medium text-sm text-center"
            >
              Online Enquiry
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};
