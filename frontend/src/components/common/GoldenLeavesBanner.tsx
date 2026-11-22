import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Phone } from 'lucide-react';

// Leaf configs — deterministic so no hydration mismatch
const LEAVES = [
  { left: '3%',  delay: 0,    duration: 3.2, size: 13, char: '🍂' },
  { left: '8%',  delay: 0.7,  duration: 2.8, size: 11, char: '🍃' },
  { left: '14%', delay: 1.4,  duration: 3.6, size: 14, char: '🍂' },
  { left: '20%', delay: 0.3,  duration: 2.5, size: 10, char: '🍁' },
  { left: '27%', delay: 1.9,  duration: 3.1, size: 12, char: '🍃' },
  { left: '34%', delay: 0.6,  duration: 2.9, size: 13, char: '🍂' },
  { left: '41%', delay: 1.2,  duration: 3.4, size: 11, char: '🍁' },
  { left: '48%', delay: 2.1,  duration: 2.7, size: 14, char: '🍃' },
  { left: '55%', delay: 0.9,  duration: 3.0, size: 10, char: '🍂' },
  { left: '62%', delay: 1.6,  duration: 3.5, size: 12, char: '🍁' },
  { left: '69%', delay: 0.4,  duration: 2.6, size: 13, char: '🍃' },
  { left: '76%', delay: 2.3,  duration: 3.2, size: 11, char: '🍂' },
  { left: '83%', delay: 1.0,  duration: 2.9, size: 14, char: '🍁' },
  { left: '90%', delay: 1.7,  duration: 3.3, size: 10, char: '🍃' },
  { left: '96%', delay: 0.2,  duration: 2.8, size: 12, char: '🍂' },
];

interface GoldenLeavesBannerProps {
  phone?: string;
}

export const GoldenLeavesBanner: React.FC<GoldenLeavesBannerProps> = ({
  phone = '8959774702',
}) => {
  return (
    <div
      className="relative overflow-hidden hidden sm:flex items-center justify-between"
      style={{
        height: '36px',
        background: 'linear-gradient(90deg, #03090F 0%, #061426 30%, #091B31 60%, #03090F 100%)',
        borderBottom: '1px solid rgba(217,165,46,0.25)',
      }}
    >
      {/* Subtle gold line at very top */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, #D9A52E55, transparent)' }}
      />

      {/* Falling Leaves */}
      {LEAVES.map((leaf, i) => (
        <span
          key={i}
          className="leaf-particle"
          style={{
            left: leaf.left,
            fontSize: `${leaf.size}px`,
            animationDuration: `${leaf.duration}s, ${leaf.duration * 0.7}s`,
            animationDelay: `${leaf.delay}s, ${leaf.delay * 0.5}s`,
            animationIterationCount: 'infinite, infinite',
            filter: 'sepia(1) saturate(3) hue-rotate(5deg) brightness(0.9)',
          }}
        >
          {leaf.char}
        </span>
      ))}

      {/* Left — Phone */}
      <div className="relative z-10 flex items-center gap-1.5 pl-4 sm:pl-6 lg:pl-8 shrink-0">
        <Phone className="w-3 h-3 text-[#D9A52E]" />
        <a
          href={`tel:${phone}`}
          className="text-[11px] text-[#E3D8BE]/90 hover:text-[#F0C45B] transition font-medium tracking-wide"
        >
          {phone}
        </a>
      </div>

      {/* Center — Shimmer tagline */}
      <div className="relative z-10 absolute left-1/2 -translate-x-1/2 pointer-events-none hidden md:block">
        <span
          className="gold-shimmer-text text-[11px] font-semibold tracking-[0.18em] uppercase whitespace-nowrap"
        >
          ✦ Excellence in Education Since 1998 ✦
        </span>
      </div>

      {/* Right — Enquiry */}
      <div className="relative z-10 flex items-center gap-3 pr-4 sm:pr-6 lg:pr-8 shrink-0">
        <Link
          to="/contact"
          className="text-[11px] text-[#D9A52E] hover:text-[#F0C45B] transition font-semibold tracking-wide border border-[#D9A52E]/30 hover:border-[#D9A52E]/60 px-2.5 py-0.5 rounded-full"
        >
          Enquiry Desk
        </Link>
      </div>

      {/* Subtle bottom gold glow */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, #D9A52E40, transparent)' }}
      />
    </div>
  );
};

export default GoldenLeavesBanner;

