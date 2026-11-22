import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { APIFaculty } from '../../services/api';
import { ArrowRight, GraduationCap, Award, BookOpen, Star, Users, RotateCcw } from 'lucide-react';

interface FacultyFlipCardProps {
  faculty: APIFaculty;
  isFlipped?: boolean;
  onFlipToggle?: () => void;
}

export const FacultyFlipCard: React.FC<FacultyFlipCardProps> = ({
  faculty,
  isFlipped: controlledFlipped,
  onFlipToggle,
}) => {
  const [internalFlipped, setInternalFlipped] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const isFlipped = controlledFlipped !== undefined ? controlledFlipped : internalFlipped;

  const handleToggle = () => {
    if (onFlipToggle) onFlipToggle();
    else setInternalFlipped((p) => !p);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  };

  const programsCount = (faculty.coursesTaught || []).length;
  const avatarFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(faculty.name)}&background=061426&color=D9A52E&size=400`;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Faculty card for ${faculty.name}. Click to flip and view bio.`}
      aria-pressed={isFlipped}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      className={`faculty-flip-wrapper outline-none select-none w-full h-[480px]${isFlipped ? ' flipped' : ''}`}
    >
      <div className="faculty-flip-inner">

        {/* ── FRONT ── */}
        <div className="faculty-flip-front sims-card sims-card-interactive flex flex-col bg-white dark:bg-[#1E2024] border border-[#E3D8BE] dark:border-[#383D44] shadow-md hover:shadow-xl hover:border-[#D9A52E]/60 transition-shadow duration-300">

          {/* Photo */}
          <div className="relative overflow-hidden flex-shrink-0" style={{ height: '220px' }}>
            {/* Skeleton */}
            {!imgLoaded && (
              <div className="absolute inset-0 bg-gradient-to-br from-[#F0E8D0] to-[#E3D8BE] dark:from-[#22252A] dark:to-[#2C3036] animate-pulse" />
            )}
            <img
              src={faculty.image || avatarFallback}
              alt={faculty.name}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={(e) => {
                (e.target as HTMLImageElement).src = avatarFallback;
                setImgLoaded(true);
              }}
              className={`w-full h-full object-cover object-top transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            {/* Experience badge */}
            <div className="absolute bottom-3 left-3 bg-[#D9A52E] text-[#061426] px-2.5 py-1 rounded-md text-[11px] font-bold shadow">
              {faculty.experience || 'Faculty'}
            </div>
            {/* Flip hint */}
            <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white/80 px-2 py-1 rounded-full text-[10px] flex items-center gap-1 font-medium">
              <RotateCcw className="w-3 h-3" /> Flip
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-col flex-1 p-4 justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#A87519] dark:text-[#D5AD5B] uppercase tracking-wider block mb-1 truncate">
                {faculty.role || 'Senior Faculty'}
              </span>
              <h3 className="font-serif font-bold text-lg text-[#061426] dark:text-[#F1EEE7] truncate leading-snug">
                {faculty.name}
              </h3>
              <p className="text-xs text-[#687386] dark:text-[#85878B] mt-0.5 truncate">
                {faculty.qualification}
              </p>
              <div className="mt-3 py-2 px-3 bg-[#F8F4EA] dark:bg-[#22252A] rounded-lg text-xs text-[#263347] dark:text-[#B8B6B0] border border-[#E3D8BE]/50 dark:border-[#383D44] truncate">
                <strong className="text-[#061426] dark:text-[#F1EEE7]">Subject:</strong>{' '}
                {faculty.specialization}
              </div>
            </div>

            <div className="pt-3 border-t border-[#E3D8BE]/40 dark:border-[#383D44] flex items-center justify-between text-xs text-[#687386] dark:text-[#85878B] mt-3">
              <div className="flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-[#A87519] dark:text-[#D5AD5B]" />
                <span>{programsCount} Program{programsCount !== 1 ? 's' : ''}</span>
              </div>
              <span className="text-[10px] text-[#A87519] dark:text-[#D5AD5B] font-semibold flex items-center gap-1 animate-pulse">
                Tap to flip ↻
              </span>
            </div>
          </div>
        </div>

        {/* ── BACK ── */}
        <div className="faculty-flip-back flex flex-col bg-[#061426] dark:bg-[#0D1520] border-2 border-[#D9A52E]/70 shadow-2xl">
          {/* Gold accent top bar */}
          <div className="h-1.5 bg-gradient-to-r from-[#A87519] via-[#F0C45B] to-[#A87519] flex-shrink-0" />

          <div className="flex flex-col flex-1 p-5 overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-white/10 flex-shrink-0">
              <div className="min-w-0">
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#D9A52E] block mb-0.5">
                  Academic Profile
                </span>
                <h4 className="font-serif font-bold text-lg text-white truncate leading-snug">
                  {faculty.name}
                </h4>
                <p className="text-xs text-white/50 truncate">{faculty.role}</p>
              </div>
              <span className="text-[10px] bg-[#D9A52E]/15 text-[#F0C45B] px-2 py-1 rounded border border-[#D9A52E]/40 font-bold flex-shrink-0 whitespace-nowrap">
                {faculty.experience}
              </span>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-2 mt-3 flex-shrink-0">
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                <span className="text-[9px] text-white/40 block font-medium mb-0.5">Students Mentored</span>
                <span className="font-bold text-white text-sm flex items-center gap-1">
                  <Users className="w-3 h-3 text-[#D9A52E]" /> 1,200+
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                <span className="text-[9px] text-white/40 block font-medium mb-0.5">Rating</span>
                <span className="font-bold text-white text-sm flex items-center gap-1">
                  <Star className="w-3 h-3 text-[#D9A52E] fill-[#D9A52E]" /> Top Rated
                </span>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto mt-3 space-y-3 pr-0.5 min-h-0">
              {/* Credentials */}
              <div>
                <span className="text-[10px] font-bold text-[#D9A52E] flex items-center gap-1 mb-1">
                  <GraduationCap className="w-3 h-3" /> Credentials
                </span>
                <p className="text-[11px] text-white/60 leading-relaxed">{faculty.qualification}</p>
              </div>

              {/* Bio */}
              {faculty.bio && (
                <div>
                  <span className="text-[10px] font-bold text-[#D9A52E] flex items-center gap-1 mb-1">
                    <Award className="w-3 h-3" /> About
                  </span>
                  <p className="text-[11px] text-white/60 leading-relaxed line-clamp-4">{faculty.bio}</p>
                </div>
              )}

              {/* Programs */}
              {faculty.coursesTaught && faculty.coursesTaught.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-[#D9A52E] flex items-center gap-1 mb-1.5">
                    <BookOpen className="w-3 h-3" /> Programs Taught
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {faculty.coursesTaught.slice(0, 4).map((c, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-white/8 border border-white/15 text-[9px] font-mono text-white/70 uppercase"
                      >
                        {c}
                      </span>
                    ))}
                    {faculty.coursesTaught.length > 4 && (
                      <span className="px-1.5 py-0.5 text-[9px] text-white/40">
                        +{faculty.coursesTaught.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* CTA */}
            <div
              className="pt-3 mt-2 border-t border-white/10 flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <Link
                to={`/faculty/${faculty.slug}`}
                className="w-full py-2.5 px-4 rounded-xl bg-[#D9A52E] hover:bg-[#F0C45B] text-[#061426] text-xs font-bold text-center transition flex items-center justify-center gap-1.5 shadow-lg"
              >
                <span>View Full Profile</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default FacultyFlipCard;
