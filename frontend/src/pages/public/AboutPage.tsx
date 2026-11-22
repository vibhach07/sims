import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Award, Target, BookOpen, MapPin, Phone, Mail, ArrowRight } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="py-12 bg-[#FFF9ED] min-h-screen space-y-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-bold uppercase tracking-widest text-[#A87519] bg-[#F8F4EA] px-3.5 py-1 rounded-full border border-[#E3D8BE]">
            Institutional Heritage
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-extrabold text-[#061426]">
            About SIMS Raipur
          </h1>
          <p className="font-serif text-lg text-[#A87519] italic">
            "Your Success. Our Commitment. Complete Preparation for a Better Tomorrow."
          </p>
          <p className="text-sm sm:text-base text-[#687386] leading-relaxed">
            SIMS Raipur was founded to bridge the critical gap between university academic curricula and the demanding standards of India’s most competitive examinations.
          </p>
        </div>

        {/* Brand Banner Card */}
        <div className="bg-[#091B31] text-white p-8 sm:p-12 rounded-2xl border-2 border-[#D9A52E]/30 relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-8 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#D9A52E]">
                Our Academic Vision
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#FFF9ED]">
                Building Rigor, Precision, and Conceptual Clarity
              </h2>
              <p className="text-sm text-[#E3D8BE] leading-relaxed">
                Whether preparing for post-M.Sc./B.Tech research careers via GATE and NET, securing premier MCA seats through NIMCET, cracking IIM CAT percentiles, or embarking on medical and engineering careers via NEET and JEE — SIMS Raipur provides a structured, supportive, and benchmarked learning ecosystem.
              </p>
              <div className="pt-2 flex flex-wrap gap-4 text-xs text-[#F0C45B]">
                <span>✓ Classroom Instruction</span>
                <span>✓ CBT Test Engines</span>
                <span>✓ 1-on-1 Mentorship</span>
                <span>✓ High-Yield Library</span>
              </div>
            </div>

            <div className="lg:col-span-4 flex justify-center">
              <img 
                src="/assets/sims-logo.png" 
                alt="SIMS Official Golden Tree Logo" 
                className="w-48 h-auto object-contain rounded-xl border border-[#D9A52E] shadow-2xl"
              />
            </div>

          </div>
        </div>

        {/* Pillars of SIMS */}
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="font-serif text-3xl font-bold text-[#061426]">
              Our Five Guiding Pillars
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-[#E3D8BE] shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#061426] text-[#D9A52E] flex items-center justify-center font-bold">1</div>
              <h3 className="font-serif font-bold text-lg text-[#061426]">Expert Faculties</h3>
              <p className="text-xs text-[#687386] leading-relaxed">Senior subject matter leads and rankers with deep experience in competitive examination trends.</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-[#E3D8BE] shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#061426] text-[#D9A52E] flex items-center justify-center font-bold">2</div>
              <h3 className="font-serif font-bold text-lg text-[#061426]">Result-Oriented Preparation</h3>
              <p className="text-xs text-[#687386] leading-relaxed">Every lesson, test, and homework module directly correlates to previous 20-year examination patterns.</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-[#E3D8BE] shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#061426] text-[#D9A52E] flex items-center justify-center font-bold">3</div>
              <h3 className="font-serif font-bold text-lg text-[#061426]">Comprehensive Study Material</h3>
              <p className="text-xs text-[#687386] leading-relaxed">No generic textbooks. Focused, high-yield theory notes with solved model papers and problem drills.</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-[#E3D8BE] shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#061426] text-[#D9A52E] flex items-center justify-center font-bold">4</div>
              <h3 className="font-serif font-bold text-lg text-[#061426]">Regular Test Series</h3>
              <p className="text-xs text-[#687386] leading-relaxed">Computer-based simulated mock tests matching the real user interface, timing, and negative marking rules.</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-[#E3D8BE] shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#061426] text-[#D9A52E] flex items-center justify-center font-bold">5</div>
              <h3 className="font-serif font-bold text-lg text-[#061426]">Personalized Guidance</h3>
              <p className="text-xs text-[#687386] leading-relaxed">Weekly performance reviews and tailored study plans to address weak academic chapters.</p>
            </div>

            <div className="bg-gradient-to-br from-[#061426] to-[#102846] p-6 rounded-xl text-white flex flex-col justify-between">
              <div>
                <span className="text-xs text-[#D9A52E] uppercase font-semibold">Institute Center</span>
                <h3 className="font-serif font-bold text-xl text-[#FFF9ED] mt-2 mb-2">Raipur Center</h3>
                <p className="text-xs text-[#E3D8BE] leading-relaxed">
                  3rd Floor, SBI Building, Main Road, Chaoubey Colony, Samta, Raipur – 492001
                </p>
              </div>
              <div className="pt-4">
                <Link to="/contact" className="text-xs font-bold text-[#F0C45B] hover:underline flex items-center gap-1">
                  Visit Center or Contact Us &rarr;
                </Link>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
