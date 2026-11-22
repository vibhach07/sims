import { Course } from '../types';

export const COURSES_DATA: Course[] = [
  // --- CATEGORY A: After MSc / B.Tech ---
  {
    id: 'course-gate',
    slug: 'gate',
    title: 'GATE — Graduate Aptitude Test in Engineering',
    subtitle: 'Comprehensive coaching for PSU recruitment & M.Tech admissions in IISc / IITs',
    category: 'after-msc-btech',
    categoryLabel: 'After MSc / B.Tech',
    targetExam: 'GATE (Engineering & Sciences)',
    iconName: 'GraduationCap',
    badge: 'Flagship Program',
    duration: '10 to 12 Months',
    format: 'Classroom / Live Interactive / Recorded Backups',
    language: 'English & Hindi (Bilingual)',
    feeStatus: 'Enquire for Batch Fees & Scholarship',
    price: 21000,
    originalPrice: 28000,
    isPaid: true,
    shortDescription: 'Master foundational engineering mathematics, general aptitude, and core subject disciplines with national benchmark mock tests.',
    longDescription: 'The SIMS Raipur GATE coaching program provides graduate engineers and MSc science students with the exact conceptual rigor, formula application speed, and multi-concept question solving skills needed to rank within top percentiles for PSU recruitments and premier institute admissions.',
    subjects: ['Engineering Mathematics', 'General Aptitude', 'Core Branch Subjects', 'Previous Year Questions Analysis'],
    objectives: [
      'Master high-yield mathematical concepts and computational shortcuts',
      'Solve previous 25-year GATE questions with stepwise precision',
      'Acquire deep subject knowledge across core technical modules',
      'Build speed and negative-marking mitigation tactics through full-length CBT tests'
    ],
    curriculum: [
      {
        id: 'mod-g1',
        title: 'Module 1: Engineering Mathematics & Numerical Methods',
        description: 'Linear algebra, calculus, differential equations, complex variables and probability distributions.',
        lessons: [
          {
            id: 'les-g1-1',
            title: 'Linear Algebra: Eigenvalues & Vector Spaces',
            duration: '48 mins',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            summary: 'Detailed derivation of eigenvalues, Cayley-Hamilton theorem, and orthogonal decomposition techniques.',
            resources: [
              { name: 'Eigenvalues_Quick_Notes.pdf', url: '#', size: '2.4 MB' },
              { name: 'GATE_PYQ_Set_Maths.pdf', url: '#', size: '4.1 MB' }
            ]
          },
          {
            id: 'les-g1-2',
            title: 'Calculus: Multiple Integrals & Vector Fields',
            duration: '54 mins',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
            summary: "Stokes' and Gauss divergence theorems with solved engineering application scenarios."
          },
          {
            id: 'les-g1-3',
            title: 'Probability Distributions & Bayes Formulation',
            duration: '42 mins',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            summary: 'Binomial, Poisson, and Normal distributions with previous 10-year question patterns.'
          }
        ]
      },
      {
        id: 'mod-g2',
        title: 'Module 2: General Aptitude & Verbal Reasoning',
        description: 'Numerical reasoning, spatial aptitude, data interpretation, and deductive logic.',
        lessons: [
          {
            id: 'les-g2-1',
            title: 'Speed Calculations & Percentages in Aptitude',
            duration: '38 mins',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
            summary: 'Mental math frameworks for rapid numerical problem solving.'
          },
          {
            id: 'les-g2-2',
            title: 'Spatial Visualization & Reasoning Puzzles',
            duration: '45 mins',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
            summary: 'Mastering modern 2D and 3D folding and rotation questions.'
          }
        ]
      },
      {
        id: 'mod-g3',
        title: 'Module 3: Core Technical & Practice Assessment',
        description: 'System design, signal modeling, and core branch specialization papers.',
        lessons: [
          {
            id: 'les-g3-1',
            title: 'System Analysis & Transfer Function Models',
            duration: '60 mins',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
            summary: 'State space representation and time-domain analysis for competitive accuracy.'
          }
        ]
      }
    ],
    faqs: [
      { question: 'Who is eligible for this course?', answer: 'Graduates or final-year students of B.Tech, BE, M.Sc., MCA or equivalent technical streams.' },
      { question: 'Does SIMS provide test series with this course?', answer: 'Yes, full enrollment includes 45+ topic tests, 15 subject tests, and 12 national-level mock CBT exams.' },
      { question: 'Are recorded backups provided if a live session is missed?', answer: 'Yes, all enrolled classroom and online students receive portal access to recorded lecture backups.' }
    ],
    facultyIds: ['fac-1', 'fac-6']
  },
  {
    id: 'course-net',
    slug: 'net',
    title: 'NET — National Eligibility Test (UGC / CSIR)',
    subtitle: 'Focused preparation for Junior Research Fellowship (JRF) & Assistant Professor eligibility',
    category: 'after-msc-btech',
    categoryLabel: 'After MSc / B.Tech',
    targetExam: 'UGC NET / CSIR NET',
    iconName: 'Award',
    badge: 'Research & Academia',
    duration: '6 to 8 Months',
    format: 'Classroom & Online Hybrid',
    language: 'English & Hindi',
    feeStatus: 'Enquire for Fee Structure',
    price: 21999,
    originalPrice: 28000,
    isPaid: true,
    shortDescription: 'Rigorous subject-specific coaching covering Paper 1 general teaching/research aptitude and Paper 2 advanced domain sciences.',
    longDescription: 'SIMS Raipur NET preparation blends comprehensive coverage of Paper 1 research pedagogy with high-level conceptual clarity in Paper 2 disciplines. Designed to guarantee JRF cut-off clearance through intensive revision cycles and PYQ decoding.',
    subjects: ['Teaching & Research Aptitude (Paper 1)', 'Chemical Sciences', 'Mathematical Sciences', 'Physical Sciences', 'Life Sciences'],
    objectives: [
      'Master Paper 1 scoring strategies to secure 70+ marks out of 100',
      'Build thorough mastery of Paper 2 domain-specific theories and derivations',
      'Analyze 15 years of UGC / CSIR question trends',
      'Complete regular timed weekly mock assessments'
    ],
    curriculum: [
      {
        id: 'mod-n1',
        title: 'Paper 1: Research Methodology & Teaching Aptitude',
        description: 'Philosophy of research, hypothesis testing, sampling methods, and higher education systems.',
        lessons: [
          { id: 'les-n1-1', title: 'Research Types, Methods & Steps', duration: '50 mins',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', summary: 'Qualitative vs quantitative methods, action research, and thesis writing ethics.' },
          { id: 'les-n1-2', title: 'Data Interpretation & ICT in Research', duration: '40 mins',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', summary: 'Statistical inference, e-governance initiatives, and academic databases.' }
        ]
      },
      {
        id: 'mod-n2',
        title: 'Paper 2: Core Advanced Domain Sciences',
        description: 'Advanced theoretical frameworks, reaction mechanisms, and mathematical proofs.',
        lessons: [
          { id: 'les-n2-1', title: 'Thermodynamics & Reaction Kinetics', duration: '65 mins',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', summary: 'Statistical thermodynamics, partition functions, and transition state theory.' }
        ]
      }
    ],
    faqs: [
      { question: 'What is the passing percentage needed in post-graduation?', answer: 'General category candidates require at least 55% marks in their Master’s degree (50% for reserved categories).' },
      { question: 'Is coaching available for both Paper 1 and Paper 2?', answer: 'Yes, full packages cover both Paper 1 common modules and Paper 2 specialization.' }
    ],
    facultyIds: ['fac-1', 'fac-2']
  },
  {
    id: 'course-set',
    slug: 'set',
    title: 'SET — State Eligibility Test',
    subtitle: 'State-level Assistant Professorship qualification for universities and colleges',
    category: 'after-msc-btech',
    categoryLabel: 'After MSc / B.Tech',
    targetExam: 'State SET (CG SET & Regional States)',
    iconName: 'BookOpen',
    duration: '5 to 6 Months',
    format: 'Classroom & Online Live',
    language: 'Hindi & English',
    feeStatus: 'Enquire for Fee Structure',
    price: 16999,
    originalPrice: 22000,
    isPaid: true,
    shortDescription: 'Tailored state syllabus coverage, regional exam patterns, and focused doubt clarification for state lecturer eligibility.',
    longDescription: 'Specifically formulated for state eligibility examinations like CG-SET. We bridge state commission syllabus requirements with targeted question banks and localized teaching-aptitude modules.',
    subjects: ['General Paper on Teaching & Research', 'Subject Specialization', 'State Syllabus Orientations', 'Model Test Series'],
    objectives: [
      'Cover complete state-commission syllabus with exam-oriented focus',
      'Practice state-specific previous year examination papers',
      'Strengthen high-weightage topics through weekend revision camps'
    ],
    curriculum: [
      {
        id: 'mod-s1',
        title: 'Module 1: General Paper & Communication',
        description: 'Teaching methods, classroom communication dynamics, and higher education governance.',
        lessons: [
          { id: 'les-s1-1', title: 'Higher Education Regulatory Frameworks in India', duration: '45 mins',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', summary: 'UGC, NAAC, NIRF, and State University structures.' }
        ]
      }
    ],
    faqs: [
      { question: 'Does SET qualify me for national lectureship?', answer: 'SET certifies eligibility for colleges and universities within the specific state.' }
    ],
    facultyIds: ['fac-1', 'fac-2']
  },
  {
    id: 'course-ap-psc',
    slug: 'ap-psc',
    title: 'AP (PSC) — Assistant Professor / PSC Preparation',
    subtitle: 'Competitive recruitment exams conducted by Public Service Commissions for collegiate education',
    category: 'after-msc-btech',
    categoryLabel: 'After MSc / B.Tech',
    targetExam: 'State PSC Assistant Professor Examination',
    iconName: 'Briefcase',
    duration: '6 to 9 Months',
    format: 'Classroom + Digital Support',
    language: 'Hindi & English',
    feeStatus: 'Enquire for Fee Structure',
    price: 18999,
    originalPrice: 25000,
    isPaid: true,
    shortDescription: 'Comprehensive training for State Public Service Commission Assistant Professor written exams and interview guidance.',
    longDescription: 'SIMS Raipur provides structured preparation targeting State PSC Assistant Professor recruitments. The curriculum balances in-depth subject mastery with state general studies and interview mentorship.',
    subjects: ['Subject Specialization Paper', 'State General Knowledge & Polity', 'Interview & Mock Panel Sessions'],
    objectives: [
      'Comprehensive syllabus completion aligned to recent PSC gazette notifications',
      'Targeted State GK, history, economy, and current affairs integration',
      'Rigorous multiple choice practice tests with negative marking tactics'
    ],
    curriculum: [
      {
        id: 'mod-ap1',
        title: 'Module 1: General Studies of the State',
        description: 'State geography, tribal heritage, administrative history, and governance schemes.',
        lessons: [
          { id: 'les-ap1-1', title: 'State Constitution, History & Geography', duration: '50 mins',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', summary: 'Key milestones, dynasties, rivers, minerals, and demographic indicators.' }
        ]
      }
    ],
    faqs: [
      { question: 'Are interview preparation sessions included?', answer: 'Yes, students qualifying the written examination receive mock interview sessions with retired academic administrators.' }
    ],
    facultyIds: ['fac-2', 'fac-1']
  },
  {
    id: 'course-phd-entrance',
    slug: 'phd-entrance',
    title: 'PhD Entrance Exam Preparation',
    subtitle: 'Guidance for Central, State Universities, NITs & IIT PhD research admissions (RET / PET)',
    category: 'after-msc-btech',
    categoryLabel: 'After MSc / B.Tech',
    targetExam: 'University Ph.D. Entrance Tests (PET / RET)',
    iconName: 'FileCheck',
    duration: '4 to 6 Months',
    format: 'Classroom / Online Hybrid',
    language: 'English & Hindi',
    feeStatus: 'Enquire for Fee Structure',
    price: 14999,
    originalPrice: 20000,
    isPaid: true,
    shortDescription: 'Targeted preparation for research methodology, academic writing fundamentals, subject depth, and research proposal drafting.',
    longDescription: 'Designed for scholars aiming to clear university PhD entrance tests (RET/PET/DRC). We mentor students on research methodology, advanced conceptual review, and formulation of viable research proposals.',
    subjects: ['Research Methodology & Statistics', 'Subject Specialization Papers', 'Research Proposal Guidance', 'Mock VIVA'],
    objectives: [
      'Master quantitative and qualitative research tools and statistical analysis',
      'Review fundamental domain questions asked in leading university entrances',
      'Draft a professional, academically sound Statement of Purpose / Research Proposal'
    ],
    curriculum: [
      {
        id: 'mod-ph1',
        title: 'Module 1: Research Design & Statistical Inference',
        description: 'Hypothesis framing, parametric & non-parametric tests, ANOVA, and SPSS/R overview.',
        lessons: [
          { id: 'les-ph1-1', title: 'Formulating Research Hypotheses & Sampling Designs', duration: '55 mins',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', summary: 'Sampling error minimization, pilot studies, and ethical clearances.' }
        ]
      }
    ],
    faqs: [
      { question: 'Do you help with research proposal drafting?', answer: 'Yes, senior faculty provide one-on-one reviews for your synopsis outline.' }
    ],
    facultyIds: ['fac-1', 'fac-5']
  },

  // --- CATEGORY B: Post Graduate Entrance ---
  {
    id: 'course-iit-jam',
    slug: 'iit-jam',
    title: 'IIT-JAM — Joint Admission Test for Masters',
    subtitle: 'Coaching for M.Sc. & Joint M.Sc.-Ph.D. admissions at IITs, IISc & IISERs',
    category: 'post-graduate-entrance',
    categoryLabel: 'Post Graduate Entrance',
    targetExam: 'IIT JAM (Physics, Chemistry, Mathematics, Biotech)',
    iconName: 'Compass',
    badge: 'Popular Choice',
    duration: '8 to 10 Months',
    format: 'Classroom & Digital Interactive',
    language: 'English & Hindi',
    feeStatus: 'Enquire for Fee Structure',
    price: 19999,
    originalPrice: 26000,
    isPaid: true,
    shortDescription: 'In-depth conceptual lectures, numerical problem workshops, and simulated CBT tests for premier master degree admissions.',
    longDescription: 'SIMS Raipur IIT-JAM curriculum transforms undergraduate science students into top-ranking aspirants. We focus heavily on solving tricky NAT (Numerical Answer Type) and MSQ (Multiple Select Questions) sections with accuracy.',
    subjects: ['Physical & Organic Chemistry', 'Higher Calculus & Linear Algebra', 'Modern Physics', 'Biotechnology Modules'],
    objectives: [
      'Build thorough grasp of B.Sc. level syllabus mapped strictly to IIT-JAM trends',
      'Master Numerical Answer Type (NAT) precision without negative marking fear',
      'Solve previous 15-year papers with detailed step analysis'
    ],
    curriculum: [
      {
        id: 'mod-jam1',
        title: 'Module 1: Physical & Inorganic Chemistry Foundation',
        description: 'Quantum chemistry, atomic structure, chemical kinetics and coordination compounds.',
        lessons: [
          { id: 'les-jam1-1', title: 'Schrödinger Wave Equation & Particle in a Box', duration: '52 mins',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', summary: 'Quantum postulates, boundary conditions, and 1D/3D energy level calculations.' },
          { id: 'les-jam1-2', title: 'Coordination Chemistry: Crystal Field Theory', duration: '48 mins',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', summary: 'Octahedral and tetrahedral splitting, magnetic properties, and Jahn-Teller effect.' }
        ]
      }
    ],
    faqs: [
      { question: 'When should I start IIT-JAM preparation?', answer: 'Students in their 2nd or final year of B.Sc. are ideally positioned to start.' }
    ],
    facultyIds: ['fac-2', 'fac-1']
  },
  {
    id: 'course-nimcet',
    slug: 'nimcet',
    title: 'NIMCET — NIT MCA Common Entrance Test',
    subtitle: 'Gateway to prestigious MCA programs across National Institutes of Technology (NITs)',
    category: 'post-graduate-entrance',
    categoryLabel: 'Post Graduate Entrance',
    targetExam: 'NIMCET (National NITs)',
    iconName: 'Cpu',
    badge: 'High Selection Rate',
    duration: '9 to 12 Months',
    format: 'Classroom + Computer Lab Practice',
    language: 'English & Hindi',
    feeStatus: 'Enquire for Fee Structure',
    price: 18499,
    originalPrice: 24000,
    isPaid: true,
    shortDescription: 'Intensive Mathematics (600 marks weightage), Analytical Ability, Computer Awareness, and General English training.',
    longDescription: 'Since Mathematics holds the majority weightage in NIMCET, our specialized faculty trains students in fast graphical solutions, coordinate geometry shortcuts, and probability theory to maximize NIT cut-off clearance.',
    subjects: ['Higher Mathematics (600 Marks)', 'Analytical Ability & Logical Reasoning (360 Marks)', 'Computer Awareness (80 Marks)', 'General English (80 Marks)'],
    objectives: [
      'Master 11th & 12th + B.Sc./BCA level mathematics with speed tips',
      'Solve 50 math questions in under 60 minutes with 90%+ accuracy',
      'Practice regular computer-based mock tests mirroring the actual NIT portal'
    ],
    curriculum: [
      {
        id: 'mod-nim1',
        title: 'Module 1: Coordinate Geometry & Vectors',
        description: 'Conic sections, straight lines, 3D geometry, and vector products.',
        lessons: [
          { id: 'les-nim1-1', title: 'Conics: Parabola, Ellipse & Hyperbola Equations', duration: '58 mins',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4', summary: 'Focal properties, tangents, normals, and shortcut forms for rapid identification.' }
        ]
      },
      {
        id: 'mod-nim2',
        title: 'Module 2: Computer Awareness & Digital Logic',
        description: 'Binary arithmetic, logic gates, Boolean algebra, and CPU architecture.',
        lessons: [
          { id: 'les-nim2-1', title: 'Number Representation & Boolean Simplification', duration: '45 mins',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', summary: "K-maps, SOP, POS and 2's complement arithmetic." }
        ]
      }
    ],
    faqs: [
      { question: 'Can non-CS students appear for NIMCET?', answer: 'Yes, any graduate with Mathematics or Statistics as one of the subjects and 60% aggregate marks is eligible.' }
    ],
    facultyIds: ['fac-3']
  },
  {
    id: 'course-cat',
    slug: 'cat',
    title: 'CAT — Common Admission Test',
    subtitle: 'Elite mentorship for IIMs & Top Business Schools in India',
    category: 'post-graduate-entrance',
    categoryLabel: 'Post Graduate Entrance',
    targetExam: 'IIM CAT, XAT, SNAP',
    iconName: 'TrendingUp',
    duration: '8 to 12 Months',
    format: 'Interactive Classroom & Online Mentorship',
    language: 'English',
    feeStatus: 'Enquire for Fee Structure',
    price: 22499,
    originalPrice: 30000,
    isPaid: true,
    shortDescription: 'Comprehensive training in Quantitative Aptitude, DILR puzzles, VARC comprehension, and percentile-maximizing test tactics.',
    longDescription: 'Our CAT module emphasizes cognitive speed, reading comprehension under time pressure, and complex set selection in Data Interpretation & Logical Reasoning. Mentored by 99+ percentilers.',
    subjects: ['Quantitative Aptitude (QA)', 'Data Interpretation & Logical Reasoning (DILR)', 'Verbal Ability & Reading Comprehension (VARC)'],
    objectives: [
      'Develop speed-reading and structural passage analysis for VARC',
      'Master non-standard logic puzzle solving and table interpretation',
      'Gain mastery in arithmetic, algebra, and modern mathematics'
    ],
    curriculum: [
      {
        id: 'mod-cat1',
        title: 'Module 1: Quantitative Aptitude — Arithmetic & Algebra',
        description: 'Percentages, profit & loss, mixtures, quadratic equations and sequences.',
        lessons: [
          { id: 'les-cat1-1', title: 'Percentages, Ratios & Alligations Matrix', duration: '52 mins',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', summary: 'Mental shortcuts to eliminate variable calculations in complex word problems.' }
        ]
      }
    ],
    faqs: [
      { question: 'Do you also provide GD/PI and WAT training?', answer: 'Yes, CAT enrolled students receive complete Stage 2 interview prep upon receiving interview calls.' }
    ],
    facultyIds: ['fac-3']
  },
  {
    id: 'course-banking',
    slug: 'banking',
    title: 'Banking Exams (IBPS PO / Clerk, SBI PO / Clerk, RBI & SO)',
    subtitle: 'Speed-accuracy coaching for nationalized bank recruitment examinations',
    category: 'post-graduate-entrance',
    categoryLabel: 'Post Graduate Entrance',
    targetExam: 'IBPS PO / Clerk, SBI PO / Clerk, RBI Assistant / Grade B',
    iconName: 'Landmark',
    duration: '4 to 6 Months',
    format: 'Classroom & Online Live',
    language: 'Hindi & English',
    feeStatus: 'Enquire for Fee Structure',
    price: 12999,
    originalPrice: 18000,
    isPaid: true,
    shortDescription: 'High-speed shortcuts for Quantitative Aptitude, Reasoning, Banking Awareness, and English with daily speed drills.',
    longDescription: 'Banking exams demand extreme calculation speed and rapid puzzle solving. SIMS provides daily speed drill tests, current banking awareness digests, and computer-based prelims + mains simulations.',
    subjects: ['Reasoning Ability & Puzzles', 'Quantitative Aptitude & Simplification', 'English Language', 'General & Banking Awareness', 'Computer Knowledge'],
    objectives: [
      'Solve 35 simplification and arithmetic questions in 20 minutes',
      'Crack circular, linear, and floor puzzles under 3 minutes per set',
      'Master updated RBI monetary policy and economic current affairs'
    ],
    curriculum: [
      {
        id: 'mod-bk1',
        title: 'Module 1: High-Speed Simplification & Quadratic Equations',
        description: 'Vedic maths, approximations, number series and inequalities.',
        lessons: [
          { id: 'les-bk1-1', title: 'Square roots, Cubes & Fraction-Percentage Table', duration: '40 mins',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', summary: 'Foundational tables to eliminate pen-paper work during online exams.' }
        ]
      }
    ],
    faqs: [
      { question: 'Are subcategories like PO, Clerk and SO covered together?', answer: 'Yes, foundation concepts are taught together with specialized advanced batch tracks for PO and SO modules.' }
    ],
    facultyIds: ['fac-3', 'fac-4']
  },

  // --- CATEGORY C: Career & Foundation ---
  {
    id: 'course-ca-foundation',
    slug: 'ca-foundation',
    title: 'CA Foundation — Chartered Accountancy Entry Level',
    subtitle: 'Comprehensive coaching according to the latest ICAI curriculum',
    category: 'career-foundation',
    categoryLabel: 'Career & Foundation',
    targetExam: 'ICAI CA Foundation Exam',
    iconName: 'Receipt',
    duration: '5 to 7 Months',
    format: 'Classroom & Video Backups',
    language: 'English & Hindi',
    feeStatus: 'Enquire for Fee Structure',
    price: 15999,
    originalPrice: 21000,
    isPaid: true,
    shortDescription: 'In-depth mentorship covering Accounting, Business Laws, Quantitative Aptitude, and Business Economics with ICAI module mapping.',
    longDescription: 'SIMS Raipur CA Foundation program is led by qualified Chartered Accountants. We build a rock-solid accounting base for class 12 pass-outs, with extensive practice on subjective legal drafting and objective mathematics.',
    subjects: ['Accounting (Paper 1)', 'Business Laws (Paper 2)', 'Quantitative Aptitude (Paper 3)', 'Business Economics (Paper 4)'],
    objectives: [
      'Master dual-entry accounting principles and financial statement drafting',
      'Learn legal drafting and case-law citation for Business Laws',
      'Complete 100% of ICAI study material exercises and past 10 RTPs/MTPs'
    ],
    curriculum: [
      {
        id: 'mod-ca1',
        title: 'Module 1: Principles & Practice of Accounting',
        description: 'Journal, ledger, trial balance, depreciation, bills of exchange, partnership, and company accounts.',
        lessons: [
          { id: 'les-ca1-1', title: 'Accounting Process & Rectification of Errors', duration: '55 mins',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', summary: 'Step-by-step treatment of suspense accounts and error correction post trial balance.' }
        ]
      }
    ],
    faqs: [
      { question: 'Is the course updated for the latest new scheme of ICAI?', answer: 'Yes, all materials and classes strictly follow the updated ICAI scheme of education.' }
    ],
    facultyIds: ['fac-4']
  },
  {
    id: 'course-jee',
    slug: 'jee',
    title: 'JEE — Joint Entrance Examination (Main & Advanced)',
    subtitle: 'Premier engineering coaching for IITs, NITs, IIITs and top engineering institutions',
    category: 'career-foundation',
    categoryLabel: 'Career & Foundation',
    targetExam: 'JEE Main & JEE Advanced',
    iconName: 'Atom',
    badge: 'Comprehensive',
    duration: '1 to 2 Years (Target / Foundation)',
    format: 'Intensive Classroom + Digital Test Engine',
    language: 'English & Hindi',
    feeStatus: 'Enquire for Fee Structure',
    price: 28999,
    originalPrice: 38000,
    isPaid: true,
    shortDescription: 'Deep fundamental mastery of Physics, Chemistry, and Mathematics with rigorous problem solving from basic to advanced levels.',
    longDescription: 'The SIMS Raipur JEE program develops scientific intuition, multi-concept application, and stamina for long exams. With personalized mentor sessions and weekly full-length CBT tests.',
    subjects: ['Physics (Mechanics, Electromagnetism, Modern Physics)', 'Chemistry (Organic, Inorganic, Physical)', 'Mathematics (Calculus, Algebra, Coordinate)'],
    objectives: [
      'Transform textbook theories into creative problem-solving agility',
      'Complete systematic revision of 11th and 12th standards',
      'Simulate actual JEE Advanced multi-correct and matrix match challenges'
    ],
    curriculum: [
      {
        id: 'mod-jee1',
        title: 'Module 1: Mechanics & Newton’s Laws',
        description: 'Kinematics, dynamics, work energy power, rotational mechanics.',
        lessons: [
          { id: 'les-jee1-1', title: 'Rotational Dynamics: Moment of Inertia & Rolling', duration: '60 mins',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', summary: 'Parallel and perpendicular axis theorems with rolling without slipping dynamics.' }
        ]
      }
    ],
    faqs: [
      { question: 'Are separate batches run for 11th, 12th and 12th pass/droppers?', answer: 'Yes, dedicated batches are conducted according to school schedule and dropper needs.' }
    ],
    facultyIds: ['fac-6', 'fac-1', 'fac-2']
  },
  {
    id: 'course-neet',
    slug: 'neet',
    title: 'NEET — National Eligibility cum Entrance Test (UG)',
    subtitle: 'Complete preparation for MBBS, BDS & premier medical college admissions',
    category: 'career-foundation',
    categoryLabel: 'Career & Foundation',
    targetExam: 'NEET UG (NTA)',
    iconName: 'Stethoscope',
    badge: 'Premier Medical',
    duration: '1 to 2 Years (Target / Foundation)',
    format: 'Classroom & Digital Learning App',
    language: 'English & Hindi',
    feeStatus: 'Enquire for Fee Structure',
    price: 29999,
    originalPrice: 40000,
    isPaid: true,
    shortDescription: '100% NCERT line-by-line Biology mastery, formula application in Physics, and thorough Chemistry practice.',
    longDescription: 'Targeting 680+ scores in NEET requires zero error in NCERT Biology combined with high-scoring capability in Physics and Chemistry. SIMS offers memory-retention flashcards and high-frequency question series.',
    subjects: ['Biology (Botany & Zoology)', 'Physics', 'Chemistry'],
    objectives: [
      'Line-by-line mastery of 11th & 12th NCERT Biology textbooks',
      'High-speed physics problem solving with formula memory tools',
      'Full syllabus mock tests every Sunday matching NTA time and pattern'
    ],
    curriculum: [
      {
        id: 'mod-nt1',
        title: 'Module 1: Human Physiology & Cell Biology',
        description: 'Digestion, respiration, cardiovascular system, nervous system and endocrine integration.',
        lessons: [
          { id: 'les-nt1-1', title: 'Neural Control & Conduction of Nerve Impulses', duration: '50 mins',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', summary: 'Action potential generation, synaptic transmission, and CNS architecture.' }
        ]
      }
    ],
    faqs: [
      { question: 'How many mock tests are conducted before NEET?', answer: 'Students write over 35 part-syllabus tests and 25 full-syllabus all-India benchmark tests.' }
    ],
    facultyIds: ['fac-5', 'fac-2', 'fac-6']
  },
  {
    id: 'course-aiims-nursing',
    slug: 'aiims-nursing',
    title: 'AIIMS B.Sc. Nursing Entrance Exam',
    subtitle: 'Dedicated preparation for Nursing entrance across AIIMS New Delhi and regional institutes',
    category: 'career-foundation',
    categoryLabel: 'Career & Foundation',
    targetExam: 'AIIMS B.Sc. (Hons.) Nursing Entrance',
    iconName: 'HeartPulse',
    duration: '5 to 7 Months',
    format: 'Classroom & Online Live',
    language: 'Hindi & English',
    feeStatus: 'Enquire for Fee Structure',
    price: 17499,
    originalPrice: 23000,
    isPaid: true,
    shortDescription: 'Targeted coaching for Biology (30 marks), Chemistry (30 marks), Physics (30 marks), and General Knowledge (10 marks).',
    longDescription: 'SIMS Raipur has designed a dedicated fast-track batch for female aspirants targeting AIIMS B.Sc. Nursing seats. Focused on concise question practice and medical aptitude.',
    subjects: ['Biology (Botany & Zoology)', 'Chemistry', 'Physics', 'General Knowledge'],
    objectives: [
      'Master high-yield questions for 100-mark single paper exam',
      'Review previous year AIIMS nursing examination papers',
      'Build speed and confidence through weekly computer-based tests'
    ],
    curriculum: [
      {
        id: 'mod-an1',
        title: 'Module 1: Biology & Human Health',
        description: 'Reproduction, genetics, biotechnology and human welfare.',
        lessons: [
          { id: 'les-an1-1', title: 'Human Health & Diseases: Immunity & Vaccines', duration: '45 mins',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', summary: 'Antigen-antibody reactions, lymphoid organs, and infectious diseases review.' }
        ]
      }
    ],
    faqs: [
      { question: 'Who is eligible for AIIMS B.Sc. Nursing?', answer: 'Female candidates having passed 10+2 with Physics, Chemistry, Biology and English with at least 55% aggregate marks.' }
    ],
    facultyIds: ['fac-5']
  },
  {
    id: 'course-foundation-x-xii',
    slug: 'foundation-x-xii',
    title: 'Classes X–XII Foundation & Board Excellence',
    subtitle: 'Integrated conceptual foundation for CBSE/State Board + Competitive Aptitude',
    category: 'career-foundation',
    categoryLabel: 'Career & Foundation',
    targetExam: 'School Boards (X, XI, XII) + Early Olympiads / NTSE / Foundation',
    iconName: 'Sparkles',
    duration: 'Annual Academic Sessions',
    format: 'Classroom + Interactive Homework Support',
    language: 'English & Hindi',
    feeStatus: 'Enquire for Fee Structure',
    price: 16499,
    originalPrice: 22000,
    isPaid: true,
    shortDescription: 'Strong fundamental grounding in Mathematics and Science for high schoolers to ace board exams and lay the groundwork for future competitive success.',
    longDescription: 'Early foundation creates top rankers. We guide students in Classes X, XI, and XII to balance school board exam excellence with analytical problem-solving skills needed for future career exams.',
    subjects: ['Class X: Science & Mathematics', 'Class XI-XII: Physics, Chemistry, Maths & Biology', 'Aptitude & Mental Ability'],
    objectives: [
      'Build crystal-clear clarity in NCERT core concepts',
      'Develop systematic subjective answer writing for board exams',
      'Cultivate analytical thinking through junior competitive problem sets'
    ],
    curriculum: [
      {
        id: 'mod-fn1',
        title: 'Module 1: Core Mathematical Structures & Proofs',
        description: 'Quadratic equations, coordinate geometry, trigonometry, and surface areas.',
        lessons: [
          { id: 'les-fn1-1', title: 'Trigonometric Identities & Applications to Heights', duration: '46 mins',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', summary: 'Standard trigonometric values, complementary angle theorems, and elevation problems.' }
        ]
      }
    ],
    faqs: [
      { question: 'Can I filter this course by specific classes (X, XI or XII)?', answer: 'Yes, in the course catalog and admissions desk, distinct section tracks are available for Class X, Class XI, and Class XII.' }
    ],
    facultyIds: ['fac-6', 'fac-1', 'fac-5']
  }
];
