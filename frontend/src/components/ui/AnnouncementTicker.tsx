import React from 'react';
import { Link } from 'react-router-dom';
import { InfiniteSlider } from './infinite-slider';
import { 
  GraduationCap, 
  FileCheck, 
  Compass, 
  Award, 
  Briefcase, 
  BookOpen, 
  Sparkles,
  ArrowRight
} from 'lucide-react';

export interface AnnouncementItem {
  id: string;
  label: string;
  highlight?: boolean;
  tag?: string;
  icon: React.ComponentType<{ className?: string }>;
  link: string;
}

export const SIMS_ANNOUNCEMENTS: AnnouncementItem[] = [
  {
    id: 'ann-admissions',
    label: 'Admissions Open 2026–27',
    highlight: true,
    tag: 'Batch Enrollment',
    icon: Sparkles,
    link: '/contact',
  },
  {
    id: 'ann-gate',
    label: 'New GATE Test Series',
    highlight: false,
    tag: 'CBT Engine',
    icon: FileCheck,
    link: '/test-series',
  },
  {
    id: 'ann-jam',
    label: 'IIT-JAM Preparation',
    highlight: false,
    tag: 'MSc Entrance',
    icon: GraduationCap,
    link: '/categories/post-graduate-entrance',
  },
  {
    id: 'ann-net',
    label: 'NET / SET Exam Preparation',
    highlight: false,
    tag: 'Lectureship & JRF',
    icon: Award,
    link: '/categories/after-msc-btech',
  },
  {
    id: 'ann-jee-neet',
    label: 'JEE & NEET Preparation',
    highlight: false,
    tag: 'Target & Foundation',
    icon: Compass,
    link: '/categories/career-foundation',
  },
  {
    id: 'ann-ca',
    label: 'CA Foundation Courses',
    highlight: false,
    tag: 'Commerce & ICAI',
    icon: BookOpen,
    link: '/categories/career-foundation',
  },
  {
    id: 'ann-bank',
    label: 'Banking Exam Preparation',
    highlight: false,
    tag: 'IBPS / SBI Batches',
    icon: Briefcase,
    link: '/categories/post-graduate-entrance',
  },
];

export const AnnouncementTicker: React.FC = () => {
  return (
    <div className="w-full bg-[#061426] border-y border-[#D9A52E]/30 py-2.5 overflow-hidden shadow-inner relative z-20">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-3">
        {/* Institutional Bulletin Tag (Static Desktop Pillar) */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#091B31] border border-[#D9A52E]/40 text-[#F0C45B] text-[11px] font-bold uppercase tracking-wider flex-shrink-0">
          <span className="w-2 h-2 rounded-full bg-[#D9A52E] animate-pulse"></span>
          Updates
        </div>

        {/* Marquee Runner */}
        <div className="flex-1 overflow-hidden">
          <InfiniteSlider gap={16} duration={32} durationOnHover={55} className="py-0.5">
            {SIMS_ANNOUNCEMENTS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  to={item.link}
                  className={`inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all group select-none whitespace-nowrap outline-none focus-visible:ring-1 focus-visible:ring-[#D9A52E] ${
                    item.highlight
                      ? 'bg-gradient-to-r from-[#D9A52E] via-[#F0C45B] to-[#D9A52E] text-[#061426] font-bold shadow-sm hover:brightness-105 border border-[#F0C45B]'
                      : 'bg-[#091B31] hover:bg-[#102846] text-[#FFF9ED] border border-[#D9A52E]/30 hover:border-[#D9A52E]'
                  }`}
                >
                  <span className={`p-1 rounded ${item.highlight ? 'bg-black/10' : 'bg-[#061426]'}`}>
                    <Icon className={`w-3.5 h-3.5 ${item.highlight ? 'text-[#061426]' : 'text-[#D9A52E]'}`} />
                  </span>

                  <span className="tracking-wide">{item.label}</span>

                  {item.tag && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider ${
                        item.highlight
                          ? 'bg-[#061426]/15 text-[#061426]'
                          : 'bg-[#102846] text-[#E3D8BE] border border-white/5'
                      }`}
                    >
                      {item.tag}
                    </span>
                  )}

                  <ArrowRight
                    className={`w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5 ${
                      item.highlight ? 'text-[#061426]' : 'text-[#D9A52E]'
                    }`}
                  />
                </Link>
              );
            })}
          </InfiniteSlider>
        </div>
      </div>
    </div>
  );
};
