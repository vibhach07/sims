from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model
from django.utils import timezone
from courses.models import CourseCategory, Course, CourseTrack, Subject, Module, Lecture

class Command(BaseCommand):
    help = "Seed dynamic course catalogue, tracks, papers, and subjects from single source of truth"

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("Starting course catalogue population...")

        # 1. CATEGORIES
        categories_data = [
            {
                "name": "After MSc / B.Tech Programs",
                "slug": "after-msc-btech",
                "description": "Specialized programs designed for graduates and postgraduates targeting GATE, CSIR-NET, UGC-NET, SET, Assistant Professor (PSC) recruitments, and University PhD entrance examinations.",
                "icon_name": "GraduationCap",
                "order": 1,
            },
            {
                "name": "Post Graduate Entrance Programs",
                "slug": "post-graduate-entrance",
                "description": "Comprehensive coaching targeting IIT-JAM (M.Sc. at IITs/IISc), NIMCET (MCA at NITs), CAT (IIMs & top B-schools), and Nationalized Banking examinations (IBPS & SBI).",
                "icon_name": "BookOpen",
                "order": 2,
            },
            {
                "name": "Career & Foundation Programs",
                "slug": "career-foundation",
                "description": "Rigorous coaching for CA Foundation, JEE (Main & Advanced), NEET (UG Medical), AIIMS B.Sc. Nursing, and high school Classes X–XII Foundation & Board excellence.",
                "icon_name": "Briefcase",
                "order": 3,
            },
        ]

        User = get_user_model()
        admin_user = User.objects.filter(is_superuser=True).order_by('id').first()
        if not admin_user:
            admin_user = User.objects.filter(is_staff=True).order_by('id').first()

        cat_objs = {}
        for cdata in categories_data:
            cat, created = CourseCategory.objects.get_or_create(
                slug=cdata["slug"],
                defaults=cdata
            )
            cat_objs[cat.slug] = cat
            status = "Created" if created else "Existing"
            self.stdout.write(f"  Category: {cat.name} [{status}]")

        # 2. COURSES & HIERARCHY DEFINITIONS
        catalogue = [
            # ================= CATEGORY 1: AFTER MSC / B.TECH =================
            {
                "category_slug": "after-msc-btech",
                "slug": "gate",
                "title": "GATE (Graduate Aptitude Test in Engineering)",
                "subtitle": "National gateway to M.Tech at IITs/IISc and executive PSU recruitments",
                "category_label": "After MSc / B.Tech",
                "target_exam": "GATE",
                "badge": "Comprehensive",
                "duration": "10-12 Months",
                "format": "Classroom + Live Online",
                "language": "Bilingual (English & Hindi)",
                "fee_status": "Admissions Open",
                "price": 21000.00,
                "original_price": 28000.00,
                "is_paid": True,
                "short_description": "Premier classroom & live interactive program for GATE examination covering Engineering Mathematics, General Aptitude and Core Technical subjects across all major branches.",
                "long_description": "Our GATE program is engineered by top IITians and former PSU executives. It includes 600+ hours of conceptual pedagogy, exhaustive multi-tier topic worksheets, previous 25-year question paper deconstruction, and full-length all-India CBT mock tests mirroring the official IIT interface.",
                "eligibility": "Candidates who have completed or are in the final/pre-final year of B.E./B.Tech or M.Sc./MCA in relevant science or technical disciplines.",
                "exam_overview": "GATE is a computer-based standardized test organized by IISc and 7 IITs on behalf of the National Coordination Board. Total marks: 100 across 65 questions (15 marks General Aptitude, 13 marks Engineering Mathematics, 72 marks Subject Specific).",
                "tracks": [
                    {
                        "name": "Computer Science & Information Technology",
                        "code": "CS",
                        "slug": "cs",
                        "description": "Algorithms, Data Structures, Operating Systems, DBMS, Computer Networks, Theory of Computation, Compiler Design.",
                        "subjects": [
                            "Engineering Mathematics & Discrete Math",
                            "Data Structures & Algorithms",
                            "Operating Systems",
                            "Database Management Systems",
                            "Computer Networks",
                            "Theory of Computation & Compiler Design",
                            "Computer Organization and Architecture",
                            "Digital Logic",
                            "General Aptitude & Verbal Ability"
                        ]
                    },
                    {
                        "name": "Electronics & Communication Engineering",
                        "code": "EC",
                        "slug": "ec",
                        "description": "Signals & Systems, Analog Circuits, Digital Electronics, Electromagnetics, Communications.",
                        "subjects": [
                            "Engineering Mathematics",
                            "Network Theory",
                            "Signals and Systems",
                            "Electronic Devices & Circuits",
                            "Analog Circuits",
                            "Digital Circuits",
                            "Control Systems",
                            "Communications",
                            "Electromagnetics",
                            "General Aptitude"
                        ]
                    },
                    {
                        "name": "Electrical Engineering",
                        "code": "EE",
                        "slug": "ee",
                        "description": "Electrical Machines, Power Systems, Control Systems, Power Electronics.",
                        "subjects": [
                            "Engineering Mathematics",
                            "Electric Circuits",
                            "Electromagnetic Fields",
                            "Signals and Systems",
                            "Electrical Machines",
                            "Power Systems",
                            "Control Systems",
                            "Electrical & Electronic Measurements",
                            "Analog and Digital Electronics",
                            "Power Electronics",
                            "General Aptitude"
                        ]
                    },
                    {
                        "name": "Mechanical Engineering",
                        "code": "ME",
                        "slug": "me",
                        "description": "Thermodynamics, Fluid Mechanics, Manufacturing Science, Theory of Machines.",
                        "subjects": [
                            "Engineering Mathematics",
                            "Engineering Mechanics",
                            "Mechanics of Materials (SOM)",
                            "Theory of Machines & Vibrations",
                            "Machine Design",
                            "Fluid Mechanics & Hydraulics",
                            "Thermodynamics & Heat Transfer",
                            "Manufacturing Technology",
                            "Industrial Engineering",
                            "General Aptitude"
                        ]
                    },
                    {
                        "name": "Civil Engineering",
                        "code": "CE",
                        "slug": "ce",
                        "description": "Structural Analysis, Geotechnical, Environmental, Transportation, Surveying.",
                        "subjects": [
                            "Engineering Mathematics",
                            "Solid Mechanics & Structural Analysis",
                            "Concrete & Steel Structures",
                            "Geotechnical Engineering (Soil Mechanics)",
                            "Water Resources & Fluid Mechanics",
                            "Environmental Engineering",
                            "Transportation Engineering & Surveying",
                            "General Aptitude"
                        ]
                    },
                    {
                        "name": "Data Science & Artificial Intelligence",
                        "code": "DA",
                        "slug": "da",
                        "description": "Probability & Statistics, Linear Algebra, Machine Learning, AI, Python & DSA.",
                        "subjects": [
                            "Probability and Statistics",
                            "Linear Algebra & Calculus",
                            "Programming, Data Structures & Algorithms",
                            "Database Management and Warehousing",
                            "Machine Learning",
                            "Artificial Intelligence",
                            "General Aptitude"
                        ]
                    }
                ]
            },
            {
                "category_slug": "after-msc-btech",
                "slug": "net",
                "title": "UGC-NET / CSIR-NET",
                "subtitle": "National Eligibility Test for Assistant Professorship & Junior Research Fellowship (JRF)",
                "category_label": "After MSc / B.Tech",
                "target_exam": "UGC-NET / CSIR-NET",
                "badge": "JRF Focused",
                "duration": "6-8 Months",
                "format": "Classroom + Online",
                "language": "Bilingual",
                "fee_status": "Admissions Open",
                "price": 24000.00,
                "original_price": 30000.00,
                "is_paid": True,
                "short_description": "Targeted curriculum for Paper-1 General Teaching & Research Aptitude alongside specialized science/humanities Paper-2 subject mastery.",
                "long_description": "Our NET program provides intensive coverage for both CSIR-NET (Mathematical Sciences, Chemical Sciences, Physical Sciences, Life Sciences) and UGC-NET (Computer Science, Economics, Commerce, Management). Learn proven elimination techniques, mock drills, and in-depth conceptual clarity.",
                "eligibility": "Master's degree or equivalent with at least 55% marks (50% for reserved categories) from a recognized university.",
                "exam_overview": "Conducted biannually by NTA. Paper 1: 50 Questions (100 Marks) on Teaching and Research Aptitude. Paper 2: 100 Questions (200 Marks) specific to the candidate's chosen subject.",
                "tracks": [
                    {
                        "name": "CSIR-NET Mathematical Sciences",
                        "code": "MATH",
                        "slug": "math-sciences",
                        "description": "Pure and Applied Mathematics for JRF & Lectureship.",
                        "subjects": [
                            "Part A: General Science & Quantitative Reasoning",
                            "Real Analysis & Metric Spaces",
                            "Linear Algebra",
                            "Complex Analysis",
                            "Modern Algebra (Groups & Rings)",
                            "Ordinary & Partial Differential Equations",
                            "Calculus of Variations & Integral Equations",
                            "Classical Mechanics & Numerical Analysis"
                        ]
                    },
                    {
                        "name": "UGC-NET Computer Science & Applications",
                        "code": "CS",
                        "slug": "cs-applications",
                        "description": "Paper 1 Aptitude and Paper 2 Computer Science.",
                        "subjects": [
                            "Paper 1: Teaching & Research Aptitude",
                            "Discrete Structures & Optimization",
                            "Computer System Architecture",
                            "Programming Languages & Computer Graphics",
                            "DBMS & Software Engineering",
                            "System Software & Operating Systems",
                            "Data Communication & Computer Networks"
                        ]
                    },
                    {
                        "name": "CSIR-NET Physical Sciences",
                        "code": "PHYS",
                        "slug": "physical-sciences",
                        "description": "Physics theory and problem solving for JRF.",
                        "subjects": [
                            "Part A: Research Aptitude & Numerical Reasoning",
                            "Mathematical Methods of Physics",
                            "Classical Mechanics",
                            "Electromagnetic Theory",
                            "Quantum Mechanics",
                            "Thermodynamics and Statistical Physics",
                            "Electronics and Experimental Methods"
                        ]
                    }
                ]
            },
            {
                "category_slug": "after-msc-btech",
                "slug": "set",
                "title": "State Eligibility Test (SET / SLET)",
                "subtitle": "State-level Assistant Professor eligibility certification across CG, MP, and other states",
                "category_label": "After MSc / B.Tech",
                "target_exam": "SET",
                "badge": "State PSC Aligned",
                "duration": "5-6 Months",
                "format": "Classroom / Hybrid",
                "language": "Hindi & English",
                "fee_status": "Admissions Open",
                "price": 18000.00,
                "original_price": 24000.00,
                "is_paid": True,
                "short_description": "Comprehensive state-specific preparation covering Paper 1 reasoning and Paper 2 core discipline with state past-year papers.",
                "long_description": "Tailored for state university Assistant Professor eligibility (including CG-SET, MP-SET, MH-SET). Focuses on high-yield factual and analytical questions, state education policies, and previous 10-year solved question banks.",
                "eligibility": "Candidates with a Master's degree in the subject concerned with minimum 55% marks.",
                "exam_overview": "Follows the UGC-NET pattern adapted by State PSC/Vyapam. Paper 1 assesses General Teaching & Research Aptitude; Paper 2 focuses on core subject expertise.",
                "tracks": [
                    {
                        "name": "General Paper 1 & Sciences",
                        "code": "SET-SCI",
                        "slug": "set-sciences",
                        "description": "General Paper 1 plus Science Subject Masterclasses.",
                        "subjects": [
                            "General Paper 1: Teaching, Research & ICT",
                            "Higher Education System & Governance",
                            "Core Discipline Subject Comprehensive Review",
                            "State SET 10-Year Solved Papers"
                        ]
                    }
                ]
            },
            {
                "category_slug": "after-msc-btech",
                "slug": "appsc",
                "title": "Assistant Professor / PSC Technical Exams",
                "subtitle": "Public Service Commission recruitment examinations for Higher Education Faculty and Polytechnic Lecturers",
                "category_label": "After MSc / B.Tech",
                "target_exam": "APPSC / CGPSC / State PSC",
                "badge": "Recruitment Track",
                "duration": "6 Months",
                "format": "Classroom / Online",
                "language": "Bilingual",
                "fee_status": "Admissions Open",
                "price": 22000.00,
                "original_price": 28000.00,
                "is_paid": True,
                "short_description": "Structured syllabus coaching for State PSC Assistant Professor and Polytechnic Lecturer technical competitive exams.",
                "long_description": "Specialized coaching covering State General Knowledge, Indian Polity, and In-depth Technical Discipline papers. Includes interview guidance and technical mock presentations.",
                "eligibility": "Master's degree in relevant discipline with NET/SET or Ph.D. as per UGC regulations.",
                "exam_overview": "Written examination conducted by State Public Service Commissions comprising General Studies and Subject Technical Papers, followed by an Interview round.",
                "tracks": [
                    {
                        "name": "State GS & Core Subject Technical",
                        "code": "PSC-TECH",
                        "slug": "psc-technical",
                        "description": "State General Knowledge plus core technical domain papers.",
                        "subjects": [
                            "State General Studies & History/Geography/Polity",
                            "Core Discipline In-Depth Syllabus",
                            "Subject Specific Practice & Mock Tests"
                        ]
                    }
                ]
            },
            {
                "category_slug": "after-msc-btech",
                "slug": "phd-entrance",
                "title": "Ph.D. Entrance Examination (RET / PET)",
                "subtitle": "Research Entrance Test coaching for Central, State Universities, IITs, and NITs",
                "category_label": "After MSc / B.Tech",
                "target_exam": "Ph.D. Entrance",
                "badge": "Research Track",
                "duration": "4-5 Months",
                "format": "Online / Hybrid",
                "language": "English & Hindi",
                "fee_status": "Admissions Open",
                "price": 16000.00,
                "original_price": 20000.00,
                "is_paid": True,
                "short_description": "Focused training on Research Methodology, Statistics, Literature Review Formulation, and Advanced Domain Subject Mastery.",
                "long_description": "Designed for candidates preparing for University Ph.D. Research Entrance Tests (RET/PET/CUCET). Includes research proposal drafting workshops and mock interview defense sessions.",
                "eligibility": "Postgraduate degree in related field with 55% aggregate marks.",
                "exam_overview": "50% Research Methodology and 50% Domain Specific Advanced Questions followed by a Presentation/Interview on the Research Proposal.",
                "tracks": [
                    {
                        "name": "Research Methodology & Core Discipline",
                        "code": "RET-CORE",
                        "slug": "ret-core",
                        "description": "Foundational research methods and subject specific depth.",
                        "subjects": [
                            "Research Methodology, Design & Ethics",
                            "Statistical Methods & Data Analysis",
                            "Advanced Domain Subject Core",
                            "Research Proposal Drafting & Presentation Guidance"
                        ]
                    }
                ]
            },

            # ================= CATEGORY 2: POST GRADUATE ENTRANCE =================
            {
                "category_slug": "post-graduate-entrance",
                "slug": "iit-jam",
                "title": "IIT-JAM (Joint Admission test for Masters)",
                "subtitle": "Direct entry into M.Sc., Joint M.Sc.-Ph.D. programs at IITs, IISc, and IISERs",
                "category_label": "Post Graduate Entrance",
                "target_exam": "IIT-JAM",
                "badge": "Top Results",
                "duration": "10-12 Months",
                "format": "Classroom + Online",
                "language": "Bilingual (English / Hindi)",
                "fee_status": "Admissions Open",
                "price": 28000.00,
                "original_price": 36000.00,
                "is_paid": True,
                "short_description": "Intensive foundational and advanced problem solving for IIT-JAM across Mathematics, Physics, Chemistry, and Mathematical Statistics.",
                "long_description": "SIMS Raipur has a proven heritage in IIT-JAM with multiple top-100 rankers. Our program covers 450+ lecture hours, weekly chapterwise tests, complete NAT (Numerical Answer Type) drill sessions, and exhaustive MSQ practice.",
                "eligibility": "Undergraduate degree (B.Sc., B.Math, B.Stat, B.E./B.Tech) with minimum 55% marks (50% for reserved categories).",
                "exam_overview": "Computer-based test of 3 hours, 60 questions, total 100 marks divided into Section A (30 MCQs), Section B (10 MSQs), and Section C (20 NAT questions).",
                "tracks": [
                    {
                        "name": "Mathematics",
                        "code": "MA",
                        "slug": "mathematics",
                        "description": "Real Analysis, Linear Algebra, Multivariable Calculus, Differential Equations, Abstract Algebra.",
                        "subjects": [
                            "Real Analysis & Sequences and Series",
                            "Functions of One Real Variable",
                            "Multivariable Calculus",
                            "Differential Equations",
                            "Linear Algebra",
                            "Group Theory"
                        ]
                    },
                    {
                        "name": "Mathematical Statistics",
                        "code": "MS",
                        "slug": "mathematical-statistics",
                        "description": "Probability, Random Variables, Distributions, Sampling, Testing of Hypotheses.",
                        "subjects": [
                            "Differential and Integral Calculus",
                            "Matrices and Linear Algebra",
                            "Probability & Conditional Probability",
                            "Random Variables & Probability Distributions",
                            "Limit Theorems & Sampling Theory",
                            "Estimation Theory & Testing of Hypotheses"
                        ]
                    },
                    {
                        "name": "Physics",
                        "code": "PH",
                        "slug": "physics",
                        "description": "Mechanics, Oscillations, Optics, Electromagnetism, Modern Physics, Solid State.",
                        "subjects": [
                            "Mathematical Methods of Physics",
                            "Mechanics and General Properties of Matter",
                            "Oscillations, Waves and Optics",
                            "Electricity and Magnetism",
                            "Kinetic Theory, Thermodynamics",
                            "Modern Physics, Quantum Mechanics & Solid State"
                        ]
                    },
                    {
                        "name": "Chemistry",
                        "code": "CY",
                        "slug": "chemistry",
                        "description": "Physical, Organic, and Inorganic Chemistry core syllabus.",
                        "subjects": [
                            "Physical Chemistry (Thermodynamics, Kinetics, Quantum)",
                            "Inorganic Chemistry (Periodic Properties, Coordination, Organometallics)",
                            "Organic Chemistry (Reaction Mechanisms, Stereochemistry, Spectroscopy)"
                        ]
                    }
                ]
            },
            {
                "category_slug": "post-graduate-entrance",
                "slug": "nimcet",
                "title": "NIMCET (NIT MCA Common Entrance Test)",
                "subtitle": "National benchmark entrance for Master of Computer Applications (MCA) at NITs",
                "category_label": "Post Graduate Entrance",
                "target_exam": "NIMCET",
                "badge": "Flagship Program",
                "duration": "10-12 Months",
                "format": "Classroom + Live Online",
                "language": "Bilingual (English / Hindi)",
                "fee_status": "Admissions Open",
                "price": 26000.00,
                "original_price": 34000.00,
                "is_paid": True,
                "short_description": "Definitive MCA preparation focused on Higher Mathematics, Analytical Reasoning, Computer Awareness, and English Comprehension.",
                "long_description": "Our NIMCET program is Raipur's undisputed leader in NIT MCA selections. The curriculum delivers 500+ hours of rigorous classroom lectures, daily speed-drill sheets, and 60+ full-length computer-based mock tests mirroring the official NIMCET test platform.",
                "eligibility": "B.Sc. / B.Sc. (Hons) / BCA / BIT / B.Tech with Mathematics / Statistics as one of the subjects, with at least 60% marks or 6.5 CGPA.",
                "exam_overview": "120 questions for 1000 total weighted marks in 2 hours: Mathematics (50 Qs x 12 marks = 600), Analytical & Logical Reasoning (40 Qs x 6 marks = 240), Computer Awareness (20 Qs x 6 marks = 120), General English (10 Qs x 4 marks = 40). Negative marking applies.",
                "tracks": [
                    {
                        "name": "Standard NIMCET Comprehensive Track",
                        "code": "NIMCET-FULL",
                        "slug": "nimcet-full",
                        "description": "All 4 sections of the official NIMCET test syllabus.",
                        "subjects": [
                            "Mathematics: Coordinate Geometry & Vectors",
                            "Mathematics: Calculus & Trigonometry",
                            "Mathematics: Algebra & Probability/Statistics",
                            "Analytical Ability and Logical Reasoning",
                            "Computer Awareness (Data Representation & Architecture)",
                            "General English & Verbal Comprehension"
                        ]
                    }
                ]
            },
            {
                "category_slug": "post-graduate-entrance",
                "slug": "cat",
                "title": "CAT & Management Entrances",
                "subtitle": "Premier preparation for IIMs, XLRI, FMS, and top MBA institutions across India",
                "category_label": "Post Graduate Entrance",
                "target_exam": "CAT / XAT / CMAT",
                "badge": "Executive Mentorship",
                "duration": "9-11 Months",
                "format": "Classroom + Hybrid",
                "language": "English",
                "fee_status": "Admissions Open",
                "price": 35000.00,
                "original_price": 45000.00,
                "is_paid": True,
                "short_description": "Holistic coaching for VARC, DILR, and QA with AI-driven percentile analytics and personalized sectional diagnostic tests.",
                "long_description": "Led by IIM alumni and aptitude masters. Covers mental math mastery, critical reading comprehension under strict time constraints, complex matrix puzzles, and exhaustive sectional mock exams.",
                "eligibility": "Bachelor's Degree in any discipline with at least 50% marks or equivalent CGPA.",
                "exam_overview": "3 sections (66 questions total, 2 hours, 40 minutes per section): Verbal Ability & Reading Comprehension (VARC), Data Interpretation & Logical Reasoning (DILR), Quantitative Ability (QA).",
                "tracks": [
                    {
                        "name": "CAT & National MBA Track",
                        "code": "CAT-CORE",
                        "slug": "cat-core",
                        "description": "Complete VARC, DILR, and Quantitative Ability mastery.",
                        "subjects": [
                            "Verbal Ability & Reading Comprehension (VARC)",
                            "Data Interpretation & Logical Reasoning (DILR)",
                            "Quantitative Aptitude (QA)",
                            "GD-PI-WAT Mentorship & Profile Building"
                        ]
                    }
                ]
            },
            {
                "category_slug": "post-graduate-entrance",
                "slug": "banking",
                "title": "Banking & Insurance Exams (IBPS / SBI / RBI)",
                "subtitle": "Probationary Officer (PO) & Clerical exams across SBI, IBPS, and Regional Rural Banks",
                "category_label": "Post Graduate Entrance",
                "target_exam": "SBI PO / IBPS PO / Clerk",
                "badge": "Speed & Accuracy",
                "duration": "6 Months",
                "format": "Classroom / Online",
                "language": "Bilingual (Hindi & English)",
                "fee_status": "Admissions Open",
                "price": 16000.00,
                "original_price": 22000.00,
                "is_paid": True,
                "short_description": "High-speed mental math, seating arrangement puzzles, banking awareness, and descriptive test writing.",
                "long_description": "Comprehensive preparation for Prelims and Mains. Focuses on rapid question selection, Vedic mathematics tricks, high-level puzzles, current economic affairs, and personal interview coaching.",
                "eligibility": "Graduation degree in any discipline from a recognized University. Age between 20-30 years.",
                "exam_overview": "Two-tier examination (Prelims: English, Quant, Reasoning; Mains: Reasoning & Computer Aptitude, Data Analysis & Interpretation, General/Economy/Banking Awareness, English Language + Descriptive).",
                "tracks": [
                    {
                        "name": "Banking Officer & Clerical Track",
                        "code": "BANK-ALL",
                        "slug": "bank-all",
                        "description": "Prelims and Mains integrated course.",
                        "subjects": [
                            "Quantitative Aptitude & Data Interpretation",
                            "Logical Reasoning & Complex Seating Puzzles",
                            "English Language & Comprehension",
                            "Banking, Financial & Economic Awareness",
                            "Computer Aptitude & Descriptive Writing"
                        ]
                    }
                ]
            },

            # ================= CATEGORY 3: CAREER & FOUNDATION =================
            {
                "category_slug": "career-foundation",
                "slug": "ca-foundation",
                "title": "CA Foundation (ICAI)",
                "subtitle": "First level professional examination of the Institute of Chartered Accountants of India",
                "category_label": "Career & Foundation",
                "target_exam": "CA Foundation",
                "badge": "Chartered Track",
                "duration": "5-6 Months",
                "format": "Classroom / Hybrid",
                "language": "English & Hindi",
                "fee_status": "Admissions Open",
                "price": 22000.00,
                "original_price": 28000.00,
                "is_paid": True,
                "short_description": "Complete syllabus coverage of all 4 ICAI papers under the New Scheme of Education and Training.",
                "long_description": "Conducted by experienced Chartered Accountants and legal experts. Includes chapter-by-chapter handwritten note summaries, ICAI module question walkthroughs, RTP/MTP solutions, and speed tests.",
                "eligibility": "Candidates who have appeared/passed Class XII examination and registered with ICAI.",
                "exam_overview": "4 papers of 100 marks each: Paper 1 Accounting, Paper 2 Business Laws, Paper 3 Quantitative Aptitude, Paper 4 Business Economics. Minimum 40% in each paper and 50% aggregate required.",
                "tracks": [
                    {
                        "name": "CA Foundation New Scheme (4 Papers)",
                        "code": "ICAI-NEW",
                        "slug": "ca-foundation-new",
                        "description": "All 4 papers under the latest ICAI curriculum.",
                        "subjects": [
                            "Paper 1: Accounting",
                            "Paper 2: Business Laws",
                            "Paper 3: Quantitative Aptitude (Maths, Stats, LR)",
                            "Paper 4: Business Economics"
                        ]
                    }
                ]
            },
            {
                "category_slug": "career-foundation",
                "slug": "jee",
                "title": "JEE (Main & Advanced)",
                "subtitle": "Engineering entrance coaching for IITs, NITs, and premier technological institutes",
                "category_label": "Career & Foundation",
                "target_exam": "JEE Main / Advanced",
                "badge": "Pre-Engineering",
                "duration": "1-2 Years",
                "format": "Classroom + Online",
                "language": "Bilingual",
                "fee_status": "Admissions Open",
                "price": 45000.00,
                "original_price": 58000.00,
                "is_paid": True,
                "short_description": "Rigorous concept building in Physics, Chemistry, and Mathematics with continuous problem-solving drills.",
                "long_description": "Comprehensive program covering NCERT fundamentals all the way to JEE Advanced multi-concept problem sets. Includes weekly DPPs, doubt-clearing sessions, and national test series simulation.",
                "eligibility": "Students studying in or passed Class XII with Physics, Chemistry, and Mathematics.",
                "exam_overview": "JEE Main has 90 questions (30 per subject) totaling 300 marks. JEE Advanced consists of two compulsory 3-hour papers testing deep analytical acumen.",
                "tracks": [
                    {
                        "name": "PCM Engineering Track",
                        "code": "JEE-PCM",
                        "slug": "jee-pcm",
                        "description": "Physics, Chemistry, and Mathematics mastery.",
                        "subjects": [
                            "Physics for JEE Main & Advanced",
                            "Chemistry (Physical, Organic & Inorganic)",
                            "Mathematics (Calculus, Coordinate Geometry, Vectors, Algebra)"
                        ]
                    }
                ]
            },
            {
                "category_slug": "career-foundation",
                "slug": "neet",
                "title": "NEET (UG Medical)",
                "subtitle": "National benchmark medical entrance for MBBS, BDS, and AYUSH admissions",
                "category_label": "Career & Foundation",
                "target_exam": "NEET (UG)",
                "badge": "Pre-Medical",
                "duration": "1-2 Years",
                "format": "Classroom + Online",
                "language": "Bilingual",
                "fee_status": "Admissions Open",
                "price": 45000.00,
                "original_price": 58000.00,
                "is_paid": True,
                "short_description": "NCERT-centric mastery of Biology (Botany & Zoology), Physics, and Chemistry with regular OMR mock tests.",
                "long_description": "Dedicated pre-medical mentorship program emphasizing 100% NCERT line-by-line grasp in Biology alongside numerical speed shortcuts in Physics and Physical Chemistry.",
                "eligibility": "Passed Class 12 with Physics, Chemistry, Biology/Biotechnology, and English with minimum 50% marks.",
                "exam_overview": "Pen and paper test comprising 200 questions (180 to attempt) across Physics (45), Chemistry (45), Botany (45), Zoology (45). Total 720 marks.",
                "tracks": [
                    {
                        "name": "PCB Medical Track",
                        "code": "NEET-PCB",
                        "slug": "neet-pcb",
                        "description": "Biology, Physics, and Chemistry integrated preparation.",
                        "subjects": [
                            "Biology: Botany (Plant Physiology & Ecology)",
                            "Biology: Zoology (Human Physiology & Genetics)",
                            "Physics for NEET Medical",
                            "Chemistry (Physical, Organic, Inorganic)"
                        ]
                    }
                ]
            },
            {
                "category_slug": "career-foundation",
                "slug": "aiims-nursing",
                "title": "AIIMS B.Sc. Nursing Entrance",
                "subtitle": "National entrance examination for B.Sc. (Hons) Nursing across all AIIMS institutes",
                "category_label": "Career & Foundation",
                "target_exam": "AIIMS B.Sc. Nursing",
                "badge": "Nursing Excellence",
                "duration": "6 Months",
                "format": "Classroom / Online",
                "language": "Bilingual",
                "fee_status": "Admissions Open",
                "price": 18000.00,
                "original_price": 24000.00,
                "is_paid": True,
                "short_description": "Targeted coaching for AIIMS B.Sc. Nursing covering Physics, Chemistry, Biology, and General Knowledge.",
                "long_description": "Specialized curriculum designed strictly according to AIIMS Nursing syllabus. Covers rapid biology recall, formula memorization in physics/chemistry, and current general knowledge.",
                "eligibility": "Passed 10+2 with English, Physics, Chemistry, and Biology with aggregate 55% for Gen/EWS/OBC.",
                "exam_overview": "Computer-based test of 2 hours, 100 MCQs: Physics (30), Chemistry (30), Biology (30), and General Knowledge (10).",
                "tracks": [
                    {
                        "name": "Nursing Entrance Track",
                        "code": "AIIMS-NUR",
                        "slug": "aiims-nursing-track",
                        "description": "Physics, Chemistry, Biology, and General Knowledge.",
                        "subjects": [
                            "Biology (Botany & Zoology Essentials)",
                            "Physics Concepts & Formulas",
                            "Chemistry Essentials",
                            "General Knowledge & Current Affairs"
                        ]
                    }
                ]
            },
            {
                "category_slug": "career-foundation",
                "slug": "foundation-x-xii",
                "title": "Classes X–XII Foundation & Boards",
                "subtitle": "Academic excellence for CBSE & State Boards with integrated competitive orientation",
                "category_label": "Career & Foundation",
                "target_exam": "Board Exams & Olympiads",
                "badge": "School Foundation",
                "duration": "Academic Year",
                "format": "Classroom",
                "language": "English & Hindi",
                "fee_status": "Admissions Open",
                "price": 20000.00,
                "original_price": 26000.00,
                "is_paid": True,
                "short_description": "Strong foundational grounding for High School students ensuring 95%+ in Board examinations while building analytical foundations.",
                "long_description": "Special batch structures for Class X and Classes XI-XII (Science PCM/PCB and Commerce). Emphasizes conceptual depth, regular subjective testing, answer writing presentation, and Olympiad/KVPY orientation.",
                "eligibility": "Students enrolled in Class 10th, 11th, or 12th in recognized boards.",
                "exam_overview": "Aligned with CBSE and State Board examinations plus NTSE, PRMO, and school science Olympiads.",
                "tracks": [
                    {
                        "name": "Class 10th Board & Foundation",
                        "code": "CLASS-10",
                        "slug": "class-10-foundation",
                        "description": "Mathematics, Science, and Social Studies foundation.",
                        "subjects": [
                            "Mathematics Class 10 Foundation",
                            "Science (Physics, Chemistry, Biology)",
                            "Mental Ability & Olympiad Aptitude"
                        ]
                    },
                    {
                        "name": "Classes 11th & 12th Science Foundation",
                        "code": "CLASS-11-12-SCI",
                        "slug": "class-11-12-science",
                        "description": "PCM / PCB core board & competitive foundation.",
                        "subjects": [
                            "Physics: Mechanics & Electromagnetism",
                            "Chemistry: Organic & Physical Foundation",
                            "Mathematics: Calculus & Algebra Foundation",
                            "Biology: Physiology & Cell Biology"
                        ]
                    }
                ]
            }
        ]

        # 3. UPSERT COURSES, TRACKS, AND SUBJECTS (PRESERVES ADMIN EDITS)
        for cdata in catalogue:
            cat = cat_objs.get(cdata["category_slug"])
            course = Course.objects.filter(slug=cdata["slug"]).first()
            if not course:
                course = Course.objects.create(
                    slug=cdata["slug"],
                    title=cdata["title"],
                    subtitle=cdata["subtitle"],
                    category=cdata["category_slug"],
                    category_ref=cat,
                    category_label=cdata["category_label"],
                    target_exam=cdata["target_exam"],
                    badge=cdata["badge"],
                    duration=cdata["duration"],
                    format=cdata["format"],
                    language=cdata["language"],
                    fee_status=cdata["fee_status"],
                    price=cdata["price"],
                    original_price=cdata["original_price"],
                    is_paid=cdata["is_paid"],
                    short_description=cdata["short_description"],
                    long_description=cdata["long_description"],
                    eligibility=cdata["eligibility"],
                    exam_overview=cdata["exam_overview"],
                    is_published=True,
                    review_status='approved',
                    created_by=admin_user,
                    reviewed_by=admin_user,
                    reviewed_at=timezone.now(),
                )
                c_status = "Created"
            else:
                # Existing course: do NOT touch price, original_price, is_published, or descriptions
                # Only set admin review workflow / category_ref if missing
                save_fields = []
                if not course.category_ref and cat:
                    course.category_ref = cat
                    save_fields.append('category_ref')
                if not course.created_by and admin_user:
                    course.created_by = admin_user
                    save_fields.append('created_by')
                if course.review_status == 'draft' and course.is_published:
                    course.review_status = 'approved'
                    course.reviewed_by = admin_user
                    course.reviewed_at = timezone.now()
                    save_fields.extend(['review_status', 'reviewed_by', 'reviewed_at'])
                if save_fields:
                    course.save(update_fields=save_fields)
                c_status = "Existing (preserved admin edits)"

            self.stdout.write(f"  Course: {course.title} [{c_status}]")

            # Seed Tracks & Subjects
            for t_idx, track_data in enumerate(cdata.get("tracks", []), start=1):
                track, t_created = CourseTrack.objects.get_or_create(
                    course=course,
                    slug=track_data["slug"],
                    defaults={
                        "name": track_data["name"],
                        "code": track_data.get("code", ""),
                        "description": track_data.get("description", ""),
                        "order": t_idx,
                        "is_active": True,
                    }
                )
                t_status = "Created" if t_created else "Existing"
                self.stdout.write(f"    Track: {track.name} [{t_status}]")

                for s_idx, subject_name in enumerate(track_data.get("subjects", []), start=1):
                    sub_slug = f"{track.slug}-{s_idx}"
                    subject, s_created = Subject.objects.get_or_create(
                        course=course,
                        track=track,
                        slug=sub_slug,
                        defaults={
                            "name": subject_name,
                            "description": f"Syllabus coverage and study modules for {subject_name} under {track.name}.",
                            "order": s_idx,
                            "is_active": True,
                        }
                    )
                    
                    # Create a default introductory module for this subject if none exists
                    mod, m_created = Module.objects.get_or_create(
                        course=course,
                        subject=subject,
                        title=f"{subject_name} — Core Module 1",
                        defaults={
                            "description": f"Foundations and high-yield problem solving in {subject_name}.",
                            "order": 1,
                        }
                    )

        self.stdout.write(self.style.SUCCESS("Successfully populated dynamic course catalogue & hierarchy!"))
