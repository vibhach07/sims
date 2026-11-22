import React from 'react';
import { Link } from 'react-router-dom';

export const LegalPages: React.FC<{ type: 'privacy' | 'terms' }> = ({ type }) => {
  const isPrivacy = type === 'privacy';
  return (
    <div className="py-16 bg-[#FFF9ED] min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 bg-white p-8 sm:p-12 rounded-2xl border border-[#E3D8BE] shadow-sm">
        <span className="text-xs font-bold uppercase tracking-wider text-[#A87519] bg-[#F8F4EA] px-3 py-1 rounded">
          Legal & Compliance
        </span>
        <h1 className="font-serif text-3xl font-bold text-[#061426]">
          {isPrivacy ? 'Privacy Policy' : 'Terms & Conditions of Admission'}
        </h1>
        <p className="text-xs text-[#687386]">Effective Date: Academic Session 2026–2027 • SIMS Raipur</p>
        
        <div className="space-y-4 text-sm text-[#263347] leading-relaxed pt-4 border-t border-[#E3D8BE]">
          <h3 className="font-serif font-bold text-lg text-[#061426]">1. Institutional Overview</h3>
          <p>
            SIMS Raipur provides educational training, mock assessment engines, and academic resources for competitive tests. Student privacy and academic integrity are preserved strictly in accordance with local regulations.
          </p>

          <h3 className="font-serif font-bold text-lg text-[#061426]">2. Classroom & Digital Resource Usage</h3>
          <p>
            All lecture materials, video recordings, model papers, and formula guides provided via the SIMS online classroom or physical Raipur center are copyrighted property of SIMS Raipur. Unauthorized duplication, screen recording, or digital distribution is strictly prohibited.
          </p>

          <h3 className="font-serif font-bold text-lg text-[#061426]">3. Test Engine & Fair Play</h3>
          <p>
            The SIMS Computer-Based Test (CBT) platform simulates actual examination conditions. All timer records, scoring metrics, and rank lists generated reflect simulated performance under timed constraints.
          </p>

          <h3 className="font-serif font-bold text-lg text-[#061426]">4. Contact & Center Enquiries</h3>
          <p>
            For official inquiries regarding enrollment, fee structures, or policies, visit our center at 3rd Floor, SBI Building, Main Road, Chaoubey Colony, Samta, Raipur – 492001 or contact 8959774702.
          </p>
        </div>

        <div className="pt-6 border-t border-[#E3D8BE]">
          <Link to="/" className="text-xs font-bold text-[#061426] hover:text-[#A87519]">
            &larr; Return to SIMS Raipur Homepage
          </Link>
        </div>
      </div>
    </div>
  );
};
