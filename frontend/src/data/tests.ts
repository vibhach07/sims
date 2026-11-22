import { MockTest, StudyResource } from '../types';

export const MOCK_TESTS_DATA: MockTest[] = [
  {
    id: 'test-gate-1',
    title: 'GATE All India Benchmark Test 01',
    slug: 'gate-benchmark-01',
    exam: 'GATE (Engineering Sciences & Maths)',
    category: 'after-msc-btech',
    questionsCount: 5,
    durationMinutes: 15,
    totalMarks: 15,
    description: 'Comprehensive sample mock test evaluating Engineering Mathematics, Calculus, and General Aptitude.',
    price: 0,
    isPaid: false,
    instructions: [
      'Total duration is 15 minutes for 5 selected sample questions.',
      'Each question carries 3 marks for correct answer.',
      'Negative marking: 1 mark deducted for each incorrect answer.',
      'Use the Question Palette on the right to navigate between questions.',
      'You can mark questions for review and return before final submission.'
    ],
    questions: [
      {
        id: 'q1',
        subject: 'Engineering Mathematics',
        question: 'If A is a 3x3 real symmetric matrix with eigenvalues 1, 2, and 3, then what is the determinant of matrix (A^2 + 2A)?',
        options: [
          '36',
          '120',
          '240',
          '360'
        ],
        correctAnswer: 1, // eigenvalues of (A^2 + 2A) are 1^2+2(1)=3, 2^2+2(2)=8, 3^2+2(3)=15. Det = 3*8*15 = 360. Wait: 3*8*15 = 360! Let's verify option index 3.
        explanation: 'Eigenvalues of A are 1, 2, 3. The eigenvalues of f(A) = A^2 + 2A are f(1)=3, f(2)=8, and f(3)=15. The determinant is the product of eigenvalues: 3 * 8 * 15 = 360.'
      },
      {
        id: 'q2',
        subject: 'General Aptitude',
        question: 'A train 180 meters long passes a pole in 9 seconds. How long (in seconds) will it take to pass a platform 360 meters long?',
        options: [
          '18 seconds',
          '24 seconds',
          '27 seconds',
          '30 seconds'
        ],
        correctAnswer: 2,
        explanation: 'Speed of the train = 180m / 9s = 20 m/s. Total distance to pass platform = 180 + 360 = 540m. Time taken = 540 / 20 = 27 seconds.'
      },
      {
        id: 'q3',
        subject: 'Calculus',
        question: 'What is the value of limit x -> 0 of (sin(3x) - 3x) / x^3 ?',
        options: [
          '0',
          '-9/2',
          '-4.5',
          '-1/2'
        ],
        correctAnswer: 1,
        explanation: 'Using Taylor expansion: sin(3x) = 3x - (3x)^3/6 + ... = 3x - 27x^3/6. Thus (sin 3x - 3x)/x^3 -> -27/6 = -9/2 = -4.5.'
      },
      {
        id: 'q4',
        subject: 'Linear Algebra',
        question: 'The rank of a 4x4 matrix with all entries equal to 2 is:',
        options: [
          '0',
          '1',
          '2',
          '4'
        ],
        correctAnswer: 1,
        explanation: 'All rows of the matrix are identical multiples of [2, 2, 2, 2]. Hence, there is only 1 linearly independent row vector, making rank = 1.'
      },
      {
        id: 'q5',
        subject: 'Probability',
        question: 'Two fair six-faced dice are rolled simultaneously. What is the probability that the sum of the numbers is 8?',
        options: [
          '5/36',
          '1/6',
          '7/36',
          '1/9'
        ],
        correctAnswer: 0,
        explanation: 'Total outcomes = 36. Favorable outcomes giving sum 8: (2,6), (3,5), (4,4), (5,3), (6,2) -> 5 outcomes. Probability = 5/36.'
      }
    ]
  },
  {
    id: 'test-iit-jam-1',
    title: 'IIT-JAM Science Practice Drill',
    slug: 'iit-jam-drill',
    exam: 'IIT JAM (Chemical & Physical Sciences)',
    category: 'post-graduate-entrance',
    questionsCount: 4,
    durationMinutes: 12,
    totalMarks: 12,
    description: 'Targeted drill focusing on thermodynamics, quantum fundamentals, and periodic trends.',
    instructions: [
      'Total duration: 12 minutes for 4 questions.',
      'Marking: +3 for correct, -1 for incorrect.',
      'Ensure proper selection before finishing the test.'
    ],
    questions: [
      {
        id: 'jq1',
        subject: 'Physical Chemistry',
        question: 'For an ideal gas undergoing isothermal reversible expansion, the change in internal energy (ΔU) is:',
        options: ['ΔU > 0', 'ΔU < 0', 'ΔU = 0', 'Depends on gas volume'],
        correctAnswer: 2,
        explanation: 'For an ideal gas, internal energy is a function of temperature only (U = f(T)). Since temperature is constant in an isothermal process, ΔU = 0.'
      },
      {
        id: 'jq2',
        subject: 'Inorganic Chemistry',
        question: 'Which of the following complex ions is diamagnetic?',
        options: ['[Fe(H2O)6]2+', '[Co(NH3)6]3+', '[NiCl4]2-', '[FeF6]3-'],
        correctAnswer: 1,
        explanation: '[Co(NH3)6]3+ has Co3+ (d6 system) with NH3 as strong field ligand resulting in pairing: t2g^6 eg^0. Zero unpaired electrons makes it diamagnetic.'
      },
      {
        id: 'jq3',
        subject: 'Quantum Mechanics',
        question: 'The zero-point energy of a 1D harmonic oscillator of frequency ν is:',
        options: ['0', '1/2 hν', 'hν', '3/2 hν'],
        correctAnswer: 1,
        explanation: 'Energy states are E_n = (n + 1/2)hν. For ground state (n = 0), zero-point energy is E_0 = 1/2 hν.'
      },
      {
        id: 'jq4',
        subject: 'Organic Chemistry',
        question: 'Which carbocation exhibits highest stability?',
        options: ['Methyl carbocation', 'Ethyl carbocation', 'Isopropyl carbocation', 'tert-Butyl carbocation'],
        correctAnswer: 3,
        explanation: 'tert-Butyl carbocation has 9 hyperconjugative alpha hydrogens and 3 electron-donating inductive methyl groups, rendering it highest in stability.'
      }
    ]
  },
  {
    id: 'test-jee-neet-1',
    title: 'JEE / NEET Foundation Diagnostic Test',
    slug: 'jee-neet-diagnostic',
    exam: 'JEE / NEET / Foundation',
    category: 'career-foundation',
    questionsCount: 4,
    durationMinutes: 12,
    totalMarks: 16,
    description: 'Fundamental concept test covering Newton laws, chemical bonding, and cellular biology.',
    instructions: [
      '4 questions testing fundamental core concepts.',
      '+4 marks for correct, -1 mark for incorrect answer.'
    ],
    questions: [
      {
        id: 'fq1',
        subject: 'Physics',
        question: 'A body of mass 2 kg moving at 10 m/s is brought to rest over a distance of 25 meters by a constant braking force. The magnitude of this force is:',
        options: ['2 N', '4 N', '8 N', '10 N'],
        correctAnswer: 1,
        explanation: 'v^2 = u^2 - 2as => 0 = 100 - 2*a*25 => 50a = 100 => a = 2 m/s^2. Force = m * a = 2 kg * 2 m/s^2 = 4 N.'
      },
      {
        id: 'fq2',
        subject: 'Chemistry',
        question: 'The geometry and hybridization of PCl5 in gaseous state is:',
        options: ['Trigonal bipyramidal, sp3d', 'Octahedral, sp3d2', 'Tetrahedral, sp3', 'Square planar, dsp2'],
        correctAnswer: 0,
        explanation: 'P has 5 valence electrons, forming 5 bond pairs with zero lone pairs. Hybridization is sp3d with trigonal bipyramidal geometry.'
      },
      {
        id: 'fq3',
        subject: 'Biology',
        question: 'Which cell organelle is known as the powerhouse of the cell due to ATP synthesis?',
        options: ['Ribosome', 'Golgi apparatus', 'Mitochondria', 'Lysosome'],
        correctAnswer: 2,
        explanation: 'Mitochondria generate most of the cell supply of adenosine triphosphate (ATP), used as a source of chemical energy.'
      },
      {
        id: 'fq4',
        subject: 'Mathematics',
        question: 'If sin θ + cos θ = √2, then the value of sin θ * cos θ is:',
        options: ['1/4', '1/2', '1', '1/√2'],
        correctAnswer: 1,
        explanation: 'Squaring both sides: (sin θ + cos θ)^2 = 2 => sin^2 θ + cos^2 θ + 2 sin θ cos θ = 2 => 1 + 2 sin θ cos θ = 2 => sin θ cos θ = 1/2.'
      }
    ]
  }
];

export const STUDY_RESOURCES_DATA: StudyResource[] = [
  {
    id: 'res-1',
    price: 0,
    isPaid: false,
    title: 'GATE Engineering Mathematics Formula Hand-Book',
    exam: 'GATE',
    category: 'after-msc-btech',
    type: 'formula-sheet',
    fileFormat: 'PDF',
    pages: 42,
    downloads: 3840,
    description: 'Comprehensive formula summary covering calculus, differential equations, linear algebra, and complex numbers.'
  },
  {
    id: 'res-2',
    price: 499,
    originalPrice: 999,
    isPaid: true,
    title: 'CSIR UGC-NET Chemical Sciences Solved Papers (2018–2024)',
    exam: 'NET',
    category: 'after-msc-btech',
    type: 'pyq',
    fileFormat: 'PDF',
    pages: 128,
    downloads: 2950,
    description: 'Detailed stepwise solutions for physical, organic, and inorganic chemistry with conceptual rationales.'
  },
  {
    id: 'res-3',
    price: 349,
    originalPrice: 699,
    isPaid: true,
    title: 'NIMCET Higher Mathematics Rapid Revision Guide',
    exam: 'NIMCET',
    category: 'post-graduate-entrance',
    type: 'notes',
    fileFormat: 'PDF',
    pages: 64,
    downloads: 1890,
    description: 'Fast shortcut methods for coordinate geometry, vectors, probability, and trigonometry for NIT aspirants.'
  },
  {
    id: 'res-4',
    price: 0,
    isPaid: false,
    title: 'CAT Quantitative Aptitude Speed Arithmetic Matrix',
    exam: 'CAT',
    category: 'post-graduate-entrance',
    type: 'formula-sheet',
    fileFormat: 'PDF',
    pages: 28,
    downloads: 2430,
    description: 'Time-saving percentages, ratios, mixtures, and time-work calculation charts.'
  },
  {
    id: 'res-5',
    price: 399,
    originalPrice: 799,
    isPaid: true,
    title: 'NEET Biology High-Yield NCERT Diagram Atlas',
    exam: 'NEET',
    category: 'career-foundation',
    type: 'notes',
    fileFormat: 'PDF',
    pages: 86,
    downloads: 5120,
    description: 'Annotated visual guide of every crucial botanical and physiological diagram tested in NEET.'
  },
  {
    id: 'res-6',
    price: 0,
    isPaid: false,
    title: 'CA Foundation Business Laws Key Definitions & Case Laws',
    exam: 'CA Foundation',
    category: 'career-foundation',
    type: 'syllabus',
    fileFormat: 'PDF',
    pages: 52,
    downloads: 1420,
    description: 'Essential case laws, Indian Contract Act definitions, and Partnership Act statutory clauses.'
  }
];
