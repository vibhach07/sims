from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from users.models import UserProfile
from courses.models import Course, Module, Lecture, UserEnrollment
from assessments.models import TestSeries, TestQuestion
from resources.models import StudyResource
from decimal import Decimal

class Command(BaseCommand):
    help = 'Seeds initial SIMS Raipur catalog data'

    def handle(self, *args, **options):
        self.stdout.write("Seeding SIMS Raipur data...")

        # 1. Demo Student
        demo_user, created = User.objects.get_or_create(
            username='student@example.com',
            defaults={
                'email': 'student@example.com',
                'first_name': 'Aarav Sharma'
            }
        )
        if created:
            demo_user.set_password('sims1234')
            demo_user.save()
            UserProfile.objects.create(
                user=demo_user,
                phone='9876543210',
                target_exam='GATE 2027 Aspirant'
            )

        # 2. Courses
        courses_data = [
            {
                'slug': 'gate',
                'title': 'GATE — Graduate Aptitude Test in Engineering',
                'subtitle': 'Comprehensive coaching for PSU recruitment & M.Tech admissions in IISc / IITs',
                'category': 'after-msc-btech',
                'category_label': 'After MSc / B.Tech',
                'target_exam': 'GATE (Engineering & Sciences)',
                'badge': 'Flagship Program',
                'duration': '10 to 12 Months',
                'format': 'Classroom / Live Interactive / Recorded Backups',
                'language': 'English & Hindi (Bilingual)',
                'fee_status': '₹24,999 (Limited Seats)',
                'price': Decimal('24999.00'),
                'original_price': Decimal('32000.00'),
                'is_paid': True,
                'short_description': 'Master foundational engineering mathematics, general aptitude, and core subject disciplines with national benchmark mock tests.',
                'long_description': 'The SIMS Raipur GATE coaching program provides graduate engineers and MSc science students with the exact conceptual rigor, formula application speed, and multi-concept question solving skills needed to rank within top percentiles.',
                'modules': [
                    {
                        'title': 'Module 1: Engineering Mathematics & Numerical Methods',
                        'description': 'Linear algebra, calculus, differential equations, complex variables and probability distributions.',
                        'lessons': [
                            {
                                'title': 'Linear Algebra: Eigenvalues & Vector Spaces',
                                'duration': '48 mins',
                                'video_url': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                                'summary': 'Detailed derivation of eigenvalues, Cayley-Hamilton theorem, and orthogonal decomposition techniques.',
                                'is_free_preview': True
                            },
                            {
                                'title': 'Calculus: Multiple Integrals & Vector Fields',
                                'duration': '54 mins',
                                'video_url': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
                                'summary': "Stokes' and Gauss divergence theorems with solved engineering application scenarios.",
                                'is_free_preview': False
                            },
                            {
                                'title': 'Probability Distributions & Bayes Formulation',
                                'duration': '42 mins',
                                'video_url': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                                'summary': 'Binomial, Poisson, and Normal distributions with previous 10-year question patterns.',
                                'is_free_preview': False
                            }
                        ]
                    },
                    {
                        'title': 'Module 2: General Aptitude & Verbal Reasoning',
                        'description': 'Numerical reasoning, spatial aptitude, data interpretation, and deductive logic.',
                        'lessons': [
                            {
                                'title': 'Speed Calculations & Percentages in Aptitude',
                                'duration': '38 mins',
                                'video_url': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
                                'summary': 'Mental math frameworks for rapid numerical problem solving.',
                                'is_free_preview': True
                            },
                            {
                                'title': 'Spatial Visualization & Reasoning Puzzles',
                                'duration': '45 mins',
                                'video_url': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
                                'summary': 'Mastering modern 2D and 3D folding and rotation questions.',
                                'is_free_preview': False
                            }
                        ]
                    }
                ]
            },
            {
                'slug': 'iit-jam',
                'title': 'IIT-JAM — Joint Admission test for Masters',
                'subtitle': 'Premier training for M.Sc. & Integrated Ph.D. admissions at IITs and IISc',
                'category': 'post-graduate-entrance',
                'category_label': 'Post Graduate Entrance',
                'target_exam': 'IIT-JAM (Maths, Chemistry, Physics)',
                'badge': 'Highest Selections',
                'duration': '8 to 10 Months',
                'format': 'Classroom + Digital Online Suite',
                'language': 'English & Hindi',
                'fee_status': '₹19,999 (Admissions Open)',
                'price': Decimal('19999.00'),
                'original_price': Decimal('26000.00'),
                'is_paid': True,
                'short_description': 'Rigorous curriculum designed specifically for BSc undergraduates aspiring to clear IIT-JAM with top AIR ranks.',
                'long_description': 'Direct guidance from IIT alumni and seasoned faculty with topic-wise problem sets and weekly mock analysis.',
                'modules': [
                    {
                        'title': 'Module 1: Real Analysis & Sequences of Real Numbers',
                        'description': 'Limits, continuity, uniform continuity, sequence convergence, and series tests.',
                        'lessons': [
                            {
                                'title': 'Convergence of Infinite Series: Ratio & Root Tests',
                                'duration': '52 mins',
                                'video_url': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
                                'summary': 'Rigorous proofs and shortcuts for Cauchy root tests and Leibniz alternating series.',
                                'is_free_preview': True
                            },
                            {
                                'title': 'Riemann Integration & Fundamental Theorem',
                                'duration': '47 mins',
                                'video_url': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
                                'summary': 'Upper and lower Darboux sums and integrability criteria.',
                                'is_free_preview': False
                            }
                        ]
                    }
                ]
            },
            {
                'slug': 'nimcet',
                'title': 'NIMCET — NIT MCA Common Entrance Test',
                'subtitle': 'Specialized coaching for premier MCA programs at National Institutes of Technology',
                'category': 'post-graduate-entrance',
                'category_label': 'Post Graduate Entrance',
                'target_exam': 'NIMCET (MCA Entrance)',
                'badge': 'Top Rated',
                'duration': '6 to 9 Months',
                'format': 'Hybrid Classroom & Online',
                'language': 'English & Hindi',
                'fee_status': '₹18,499 (Enrollment Open)',
                'price': Decimal('18499.00'),
                'original_price': Decimal('24000.00'),
                'is_paid': True,
                'short_description': 'Intensive coverage of Higher Mathematics, Computer Awareness, Analytical Ability, and General English.',
                'long_description': 'Comprehensive question banks with speed calculation strategies tailored for the NIMCET test pattern.',
                'modules': [
                    {
                        'title': 'Module 1: Coordinate Geometry & Vectors',
                        'description': 'Straight lines, circles, parabola, ellipse, hyperbola, and 3D vector geometry.',
                        'lessons': [
                            {
                                'title': 'Circles & Conic Sections Quick Elimination Methods',
                                'duration': '40 mins',
                                'video_url': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
                                'summary': 'Parametric equations and standard tangent shortcuts for NIMCET.',
                                'is_free_preview': True
                            }
                        ]
                    }
                ]
            }
        ]

        for cdata in courses_data:
            mods = cdata.pop('modules')
            course, _ = Course.objects.update_or_create(
                slug=cdata['slug'],
                defaults=cdata
            )
            for mIdx, mdata in enumerate(mods, 1):
                lessons = mdata.pop('lessons')
                module, _ = Module.objects.update_or_create(
                    course=course,
                    title=mdata['title'],
                    defaults={'description': mdata['description'], 'order': mIdx}
                )
                for lIdx, ldata in enumerate(lessons, 1):
                    Lecture.objects.update_or_create(
                        module=module,
                        title=ldata['title'],
                        defaults={
                            'duration': ldata['duration'],
                            'video_url': ldata['video_url'],
                            'summary': ldata['summary'],
                            'is_free_preview': ldata['is_free_preview'],
                            'order': lIdx
                        }
                    )

        # 3. Test Series
        tests_data = [
            {
                'slug': 'gate-benchmark-01',
                'title': 'GATE All India Benchmark Test 01',
                'exam': 'GATE (Engineering Sciences & Maths)',
                'category': 'after-msc-btech',
                'duration_minutes': 15,
                'total_marks': 15,
                'questions_count': 5,
                'price': Decimal('499.00'),
                'original_price': Decimal('999.00'),
                'is_paid': False, # Free demo benchmark test
                'description': 'Comprehensive sample mock test evaluating Engineering Mathematics, Calculus, and General Aptitude with CBT interface.',
                'questions': [
                    {
                        'subject': 'Engineering Mathematics',
                        'question': 'If A is a 3x3 real symmetric matrix with eigenvalues 1, 2, and 3, then what is the determinant of matrix (A^2 + 2A)?',
                        'options_json': ['36', '120', '240', '360'],
                        'correct_answer': 3,
                        'explanation': 'Eigenvalues of A are 1, 2, 3. The eigenvalues of f(A) = A^2 + 2A are f(1)=3, f(2)=8, and f(3)=15. Det = 3 * 8 * 15 = 360.'
                    },
                    {
                        'subject': 'General Aptitude',
                        'question': 'A train 180 meters long passes a pole in 9 seconds. How long (in seconds) will it take to pass a platform 360 meters long?',
                        'options_json': ['18 seconds', '24 seconds', '27 seconds', '30 seconds'],
                        'correct_answer': 2,
                        'explanation': 'Speed = 180m / 9s = 20 m/s. Total distance = 180 + 360 = 540m. Time = 540 / 20 = 27 seconds.'
                    }
                ]
            },
            {
                'slug': 'iit-jam-grand-mock-pack',
                'title': 'IIT-JAM All India Grand Mock Test Pack (15 CBT Tests)',
                'exam': 'IIT-JAM Mathematics',
                'category': 'post-graduate-entrance',
                'duration_minutes': 180,
                'total_marks': 100,
                'questions_count': 60,
                'price': Decimal('1499.00'),
                'original_price': Decimal('2499.00'),
                'is_paid': True,
                'description': '15 Full-length national level CBT mock tests with percentile analysis, AIR ranking, and stepwise video solutions.',
                'questions': [
                    {
                        'subject': 'Real Analysis',
                        'question': 'Let a_n = (1 + 1/n)^n. The limit of a_n as n approaches infinity is:',
                        'options_json': ['1', 'e', 'infinity', '0'],
                        'correct_answer': 1,
                        'explanation': 'By definition of Euler number, limit (1 + 1/n)^n = e.'
                    }
                ]
            }
        ]

        for tdata in tests_data:
            qlist = tdata.pop('questions')
            test_obj, _ = TestSeries.objects.update_or_create(
                slug=tdata['slug'],
                defaults=tdata
            )
            for qIdx, qdata in enumerate(qlist, 1):
                TestQuestion.objects.update_or_create(
                    test_series=test_obj,
                    order=qIdx,
                    defaults={
                        'subject': qdata['subject'],
                        'question': qdata['question'],
                        'options_json': qdata['options_json'],
                        'correct_answer': qdata['correct_answer'],
                        'explanation': qdata['explanation'],
                    }
                )

        # 4. Study Resources
        resources_data = [
            {
                'slug': 'gate-formula-bible',
                'title': 'SIMS Comprehensive Engineering Mathematics Formula Sheet (GATE 2026)',
                'exam': 'GATE',
                'category': 'after-msc-btech',
                'resource_type': 'formula-sheet',
                'file_format': 'PDF',
                'pages': 42,
                'downloads_count': 3840,
                'price': Decimal('0.00'),
                'original_price': Decimal('199.00'),
                'is_paid': False,
                'description': 'Comprehensive formula summary covering calculus, differential equations, linear algebra, and complex numbers.'
            },
            {
                'slug': 'net-pyq-solved-compendium',
                'title': 'CSIR UGC-NET Chemical Sciences 10-Year Solved Master Compendium',
                'exam': 'NET',
                'category': 'after-msc-btech',
                'resource_type': 'pyq',
                'file_format': 'PDF',
                'pages': 180,
                'downloads_count': 2950,
                'price': Decimal('499.00'),
                'original_price': Decimal('999.00'),
                'is_paid': True,
                'description': 'Detailed stepwise solutions for physical, organic, and inorganic chemistry with conceptual rationales.'
            },
            {
                'slug': 'nimcet-higher-maths-speed-guide',
                'title': 'NIMCET Higher Mathematics Rapid Revision Guide & Shortcut Workbook',
                'exam': 'NIMCET',
                'category': 'post-graduate-entrance',
                'resource_type': 'notes',
                'file_format': 'PDF',
                'pages': 95,
                'downloads_count': 1890,
                'price': Decimal('349.00'),
                'original_price': Decimal('699.00'),
                'is_paid': True,
                'description': 'Fast shortcut methods for coordinate geometry, vectors, probability, and trigonometry for NIT aspirants.'
            }
        ]

        for rdata in resources_data:
            StudyResource.objects.update_or_create(
                slug=rdata['slug'],
                defaults=rdata
            )

        self.stdout.write(self.style.SUCCESS("SIMS Raipur database seeded successfully!"))
