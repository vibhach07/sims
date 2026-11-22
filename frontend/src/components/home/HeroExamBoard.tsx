import React from 'react';
import { Link } from 'react-router-dom';
import { useSite } from '../../contexts/SiteContext';
import { useCourses } from '../../contexts/CourseContext';
import {
  HERO_LEFT_PLATES,
  HERO_RIGHT_PLATES,
  HERO_NURSING_PLATE,
  resolvePlateDestination,
} from '../../data/heroExams';

export const HeroExamBoard: React.FC = () => {
  const { primaryCentre } = useSite();
  const { courses: liveCourses } = useCourses();

  const addressText =
    primaryCentre?.address ||
    '3rd Floor, SBI Building, Main Road, Chaoubey Colony, Samta, Raipur – 492001';
  const mapLink = primaryCentre?.map_link || primaryCentre?.maps_url;

  const nursingUrl = resolvePlateDestination(
    HERO_NURSING_PLATE.destination,
    HERO_NURSING_PLATE.slug,
    HERO_NURSING_PLATE.categoryFallback,
    liveCourses
  );

  return (
    <div className="w-full max-w-lg lg:max-w-none bg-[#091B31]/95 dark:bg-[#181A1D] p-3 sm:p-5 rounded-2xl border-2 border-[#D9A52E]/40 dark:border-[#383D44] shadow-2xl relative flex flex-col gap-3">
      {/* Clickable Exam Board Grid */}
      <nav aria-label="Exam programs">
        <div
          className="grid gap-2 sm:gap-2.5 items-stretch w-full [grid-template-areas:'center_center''left_right'] lg:[grid-template-areas:'left_center_right'] lg:grid-cols-[1fr_1.35fr_1fr]"
        >
          {/* LEFT COLUMN PLATES */}
          <div
            style={{ gridArea: 'left' }}
            className="flex flex-col justify-between gap-2"
          >
            {HERO_LEFT_PLATES.map((plate) => {
              if (plate.isSplit && plate.splitHalves) {
                const [halfLeft, halfRight] = plate.splitHalves;
                const urlLeft = resolvePlateDestination(
                  halfLeft.destination,
                  halfLeft.slug,
                  halfLeft.categoryFallback,
                  liveCourses
                );
                const urlRight = resolvePlateDestination(
                  halfRight.destination,
                  halfRight.slug,
                  halfRight.categoryFallback,
                  liveCourses
                );

                return (
                  <div
                    key={plate.id}
                    className="rounded-lg bg-[#0F243D] border border-[#D9A52E]/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_2px_4px_rgba(0,0,0,0.3)] flex items-stretch h-11 sm:h-12 lg:h-[46px] xl:h-[48px] min-h-[44px] overflow-hidden"
                  >
                    <Link
                      to={urlLeft}
                      aria-label={halfLeft.ariaLabel}
                      className="flex-1 flex items-center justify-center text-[#F0C45B] hover:text-white font-bold text-xs sm:text-sm tracking-wider uppercase transition-all duration-150 motion-reduce:transition-none hover:bg-[#D9A52E]/15 border-r border-[#D9A52E]/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9A52E]"
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.85)' }}
                    >
                      {halfLeft.label}
                    </Link>
                    <Link
                      to={urlRight}
                      aria-label={halfRight.ariaLabel}
                      className="flex-1 flex items-center justify-center text-[#F0C45B] hover:text-white font-bold text-xs sm:text-sm tracking-wider uppercase transition-all duration-150 motion-reduce:transition-none hover:bg-[#D9A52E]/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9A52E]"
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.85)' }}
                    >
                      {halfRight.label}
                    </Link>
                  </div>
                );
              }

              const url = resolvePlateDestination(
                plate.destination,
                plate.slug,
                plate.categoryFallback,
                liveCourses
              );

              return (
                <Link
                  key={plate.id}
                  to={url}
                  aria-label={plate.ariaLabel}
                  className="rounded-lg bg-[#0F243D] border border-[#D9A52E]/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_2px_4px_rgba(0,0,0,0.3)] flex items-center justify-center text-[#F0C45B] hover:text-white hover:border-[#D9A52E]/60 hover:-translate-y-0.5 active:translate-y-0 text-xs sm:text-sm font-bold uppercase tracking-wider text-center h-11 sm:h-12 lg:h-[46px] xl:h-[48px] min-h-[44px] px-1 sm:px-2 transition-all duration-150 motion-reduce:transition-none motion-reduce:transform-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9A52E] focus-visible:ring-offset-1 focus-visible:ring-offset-[#061426] whitespace-nowrap"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.85)' }}
                >
                  {plate.label}
                </Link>
              );
            })}
          </div>

          {/* CENTRE RECEPTION PANEL */}
          <div
            style={{ gridArea: 'center' }}
            className="w-full max-w-sm lg:max-w-none mx-auto mb-2 lg:mb-0 rounded-xl bg-[#061426] dark:bg-[#101113] border-2 border-[#D9A52E]/50 dark:border-[#383D44] shadow-xl p-3 sm:p-4 flex flex-col items-center justify-center text-center relative overflow-hidden"
          >
            {/* Tree Logo Emblem */}
            <img
              src="/assets/sims-logo.png"
              alt="SIMS Raipur Golden Tree Emblem"
              className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 object-contain drop-shadow-md select-none outline-none border-0 pointer-events-none"
              style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
              loading="eager"
            />

            {/* Large Serif SIMS */}
            <h3
              className="font-serif font-bold text-3xl sm:text-4xl lg:text-[40px] text-[#F0C45B] tracking-wider leading-none mt-1 select-none"
              style={{ textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}
            >
              SIMS
            </h3>

            {/* Raipur with flanking thin gold rules */}
            <div className="flex items-center justify-center gap-2 w-full max-w-[150px] my-1.5 select-none">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#D9A52E] to-[#D9A52E]" />
              <span className="font-serif text-[11px] sm:text-xs uppercase tracking-[0.25em] text-[#E3D8BE] font-bold">
                Raipur
              </span>
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-[#D9A52E] to-[#D9A52E]" />
            </div>

            {/* Caption */}
            <p className="text-[10px] sm:text-[11px] text-[#E3D8BE]/80 tracking-wide text-center">
              Academic Year 2026–2027 Admissions
            </p>
          </div>

          {/* RIGHT COLUMN PLATES */}
          <div
            style={{ gridArea: 'right' }}
            className="flex flex-col justify-between gap-2"
          >
            {HERO_RIGHT_PLATES.map((plate) => {
              const url = resolvePlateDestination(
                plate.destination,
                plate.slug,
                plate.categoryFallback,
                liveCourses
              );

              return (
                <Link
                  key={plate.id}
                  to={url}
                  aria-label={plate.ariaLabel}
                  className="rounded-lg bg-[#0F243D] border border-[#D9A52E]/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_2px_4px_rgba(0,0,0,0.3)] flex items-center justify-center text-[#F0C45B] hover:text-white hover:border-[#D9A52E]/60 hover:-translate-y-0.5 active:translate-y-0 text-xs sm:text-sm font-bold uppercase tracking-wider text-center h-11 sm:h-12 lg:h-[46px] xl:h-[48px] min-h-[44px] px-1 sm:px-2 transition-all duration-150 motion-reduce:transition-none motion-reduce:transform-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9A52E] focus-visible:ring-offset-1 focus-visible:ring-offset-[#061426] whitespace-nowrap"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.85)' }}
                >
                  {plate.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Under Board Section */}
      <div className="pt-1 flex flex-col gap-2.5">
        {/* Wide Plate: AIIMS B.Sc Nursing */}
        <Link
          to={nursingUrl}
          aria-label={HERO_NURSING_PLATE.ariaLabel}
          className="w-full rounded-lg bg-[#0F243D] border border-[#D9A52E]/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_2px_4px_rgba(0,0,0,0.3)] flex items-center justify-center text-[#F0C45B] hover:text-white hover:border-[#D9A52E]/60 hover:-translate-y-0.5 active:translate-y-0 text-xs sm:text-sm font-bold uppercase tracking-wider text-center h-11 min-h-[44px] px-3 transition-all duration-150 motion-reduce:transition-none motion-reduce:transform-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9A52E] focus-visible:ring-offset-1 focus-visible:ring-offset-[#061426]"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.85)' }}
        >
          {HERO_NURSING_PLATE.label}
        </Link>

        {/* Address & Helpline */}
        <div className="pt-1 text-center text-xs text-[#E3D8BE]/85 space-y-1">
          <div className="font-semibold text-white/95 text-[11px] uppercase tracking-wider">
            Center Location:
          </div>
          {mapLink ? (
            <a
              href={mapLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-[#E3D8BE] hover:text-[#F0C45B] transition leading-snug hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-[#D9A52E]"
              aria-label="View SIMS Raipur center location on Google Maps"
            >
              {addressText}
            </a>
          ) : (
            <p className="leading-snug">{addressText}</p>
          )}
          <div>
            <a
              href="tel:8959774702"
              className="inline-block text-[#F0C45B] hover:text-white font-semibold pt-0.5 transition hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-[#D9A52E]"
              aria-label="Call SIMS Raipur direct helpline 8959774702"
            >
              Direct Helpline: 8959774702
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroExamBoard;
