/// <reference types="vite/client" />
import { COURSES_DATA } from './courses';
import { APICourse } from '../services/api';

export interface HeroExamPlate {
  id: string;
  label: string;
  slug?: string;
  destination: string;
  categoryFallback: string;
  ariaLabel: string;
  isSplit?: boolean;
  splitHalves?: {
    label: string;
    slug: string;
    destination: string;
    categoryFallback: string;
    ariaLabel: string;
  }[];
}

export const HERO_LEFT_PLATES: HeroExamPlate[] = [
  {
    id: 'net-set',
    label: 'NET/SET',
    destination: '/courses/net',
    categoryFallback: 'after-msc-btech',
    ariaLabel: 'UGC NET and SET coaching programs',
    isSplit: true,
    splitHalves: [
      {
        label: 'NET',
        slug: 'net',
        destination: '/courses/net',
        categoryFallback: 'after-msc-btech',
        ariaLabel: 'UGC NET coaching: view course details',
      },
      {
        label: 'SET',
        slug: 'set',
        destination: '/courses/set',
        categoryFallback: 'after-msc-btech',
        ariaLabel: 'State Eligibility Test (SET) coaching: view course details',
      },
    ],
  },
  {
    id: 'gate',
    label: 'GATE',
    slug: 'gate',
    destination: '/courses/gate',
    categoryFallback: 'after-msc-btech',
    ariaLabel: 'GATE coaching: view course details',
  },
  {
    id: 'cat',
    label: 'CAT',
    slug: 'cat',
    destination: '/courses/cat',
    categoryFallback: 'post-graduate-entrance',
    ariaLabel: 'CAT MBA entrance coaching: view course details',
  },
  {
    id: 'iit-jam',
    label: 'IIT-JAM',
    slug: 'iit-jam',
    destination: '/courses/iit-jam',
    categoryFallback: 'post-graduate-entrance',
    ariaLabel: 'IIT-JAM coaching: view course details',
  },
  {
    id: 'nimcet',
    label: 'NIMCET',
    slug: 'nimcet',
    destination: '/courses/nimcet',
    categoryFallback: 'post-graduate-entrance',
    ariaLabel: 'NIMCET MCA entrance coaching: view course details',
  },
];

export const HERO_RIGHT_PLATES: HeroExamPlate[] = [
  {
    id: 'banking',
    label: 'Banking',
    slug: 'banking',
    destination: '/courses/banking',
    categoryFallback: 'post-graduate-entrance',
    ariaLabel: 'Banking & IBPS coaching: view course details',
  },
  {
    id: 'jee',
    label: 'JEE',
    slug: 'jee',
    destination: '/courses/jee',
    categoryFallback: 'career-foundation',
    ariaLabel: 'IIT-JEE coaching: view course details',
  },
  {
    id: 'neet',
    label: 'NEET',
    slug: 'neet',
    destination: '/courses/neet',
    categoryFallback: 'career-foundation',
    ariaLabel: 'NEET Medical coaching: view course details',
  },
  {
    id: 'ca',
    label: 'CA',
    slug: 'ca-foundation',
    destination: '/courses/ca-foundation',
    categoryFallback: 'career-foundation',
    ariaLabel: 'CA Foundation coaching: view course details',
  },
  {
    id: 'x-xii',
    label: 'X–XII',
    destination: '/categories/career-foundation',
    categoryFallback: 'career-foundation',
    ariaLabel: 'Classes 10th to 12th Career Foundation coaching: explore category',
  },
];

export const HERO_NURSING_PLATE: HeroExamPlate = {
  id: 'aiims-nursing',
  label: 'AIIMS B.Sc Nursing',
  slug: 'aiims-nursing',
  destination: '/courses/aiims-nursing',
  categoryFallback: 'career-foundation',
  ariaLabel: 'AIIMS B.Sc Nursing coaching: view course details',
};

const warnedSlugs = new Set<string>();

/**
 * Resolves destination path verifying against static COURSES_DATA and live API courses.
 * Falls back to /categories/:categoryFallback if slug is unmatched.
 */
export function resolvePlateDestination(
  destination: string,
  slug?: string,
  categoryFallback?: string,
  liveCourses?: APICourse[]
): string {
  // If destination is already a category or direct route, use it
  if (!slug) {
    return destination;
  }

  const normalizedSlug = slug.toLowerCase();

  // Check in static courses
  const existsInStatic = COURSES_DATA.some(
    (c) => c.slug.toLowerCase() === normalizedSlug
  );

  // Check in live courses (if passed)
  const existsInLive = liveCourses
    ? liveCourses.some((c) => c.slug.toLowerCase() === normalizedSlug)
    : false;

  if (existsInStatic || existsInLive) {
    return `/courses/${slug}`;
  }

  // Not found in static or live courses
  const fallback = categoryFallback
    ? `/categories/${categoryFallback}`
    : '/courses';

  const isDev = Boolean(
    typeof import.meta !== 'undefined' && import.meta?.env?.DEV
  );
  if (isDev && !warnedSlugs.has(slug)) {
    warnedSlugs.add(slug);
    console.warn(
      `[HeroExamBoard] Course slug "${slug}" not found in courses. Falling back to "${fallback}".`
    );
  }

  return fallback;
}
