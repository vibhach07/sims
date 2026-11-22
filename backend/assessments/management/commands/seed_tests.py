from django.core.management.base import BaseCommand
from assessments.models import TestSeries, TestQuestion

class Command(BaseCommand):
    help = 'Seed tests data'

    def handle(self, *args, **options):
        tests_data = [
            {
                'slug': 'gate-benchmark-01',
                'title': 'GATE All India Benchmark Test 01',
                'exam': 'GATE (Engineering Sciences & Maths)',
                'category': 'after-msc-btech',
                'duration_minutes': 15,
                'total_marks': 15,
                'questions_count': 3,
                'description': 'Comprehensive sample mock test evaluating Engineering Mathematics, Calculus, and General Aptitude with CBT interface.',
                'price': 499.00,
                'original_price': 999.00,
                'is_paid': False,
                'questions': [
                    {
                        'subject': 'Engineering Mathematics',
                        'question': 'If A is a 3x3 real symmetric matrix with eigenvalues 1, 2, and 3, then what is the determinant of matrix (A^2 + 2A)?',
                        'options_json': ['36', '120', '240', '360'],
                        'correct_answer': 2,
                        'explanation': 'Eigenvalues of A^2 + 2A are λ_i^2 + 2λ_i. For λ=1: 1+2=3. For λ=2: 4+4=8. For λ=3: 9+6=15. Determinant is product = 3 * 8 * 15 = 360.',
                        'order': 1
                    },
                    {
                        'subject': 'General Aptitude',
                        'question': 'A train 180 meters long passes a pole in 9 seconds. How long (in seconds) will it take to pass a platform 360 meters long?',
                        'options_json': ['18 seconds', '24 seconds', '27 seconds', '30 seconds'],
                        'correct_answer': 2,
                        'explanation': 'Speed = 180 / 9 = 20 m/s. Total distance = 180 + 360 = 540 m. Time = 540 / 20 = 27 seconds.',
                        'order': 2
                    },
                    {
                        'subject': 'Calculus',
                        'question': 'The value of the limit lim (x->0) (sin(3x) / (2x)) is:',
                        'options_json': ['0', '1', '3/2', 'Infinity'],
                        'correct_answer': 2,
                        'explanation': 'lim (x->0) (sin(3x)/(3x)) * (3/2) = 1 * (3/2) = 3/2.',
                        'order': 3
                    }
                ]
            },
            {
                'slug': 'csir-net-chemical-mock',
                'title': 'CSIR NET Chemical Sciences Diagnostic',
                'exam': 'CSIR NET JRF',
                'category': 'after-msc-btech',
                'duration_minutes': 20,
                'total_marks': 20,
                'questions_count': 3,
                'description': 'Targeted assessment for chemical kinetics, thermodynamics, and organic mechanisms.',
                'price': 699.00,
                'original_price': 1299.00,
                'is_paid': True,
                'questions': [
                    {
                        'subject': 'Physical Chemistry',
                        'question': 'For a first-order reaction, the time required for 99.9% completion is approximately how many half-lives?',
                        'options_json': ['5', '7', '10', '14'],
                        'correct_answer': 2,
                        'explanation': 't_99.9% = 10 * t_1/2.',
                        'order': 1
                    },
                    {
                        'subject': 'Organic Chemistry',
                        'question': 'Which of the following compounds exhibits aromaticity according to Huckels rule (4n+2)?',
                        'options_json': ['Cyclobutadiene', 'Benzene', 'Cyclooctatetraene', 'Cyclopentadienyl cation'],
                        'correct_answer': 1,
                        'explanation': 'Benzene has 6 pi electrons (n=1), obeying Huckels rule.',
                        'order': 2
                    },
                    {
                        'subject': 'Inorganic Chemistry',
                        'question': 'The crystal field stabilization energy (CFSE) for high-spin d6 octahedral complex is:',
                        'options_json': ['-0.4 Δo', '-0.6 Δo', '-1.2 Δo', '-2.4 Δo'],
                        'correct_answer': 0,
                        'explanation': 'High-spin d6: t2g^4 eg^2. CFSE = (4 * -0.4 + 2 * 0.6) Δo = -0.4 Δo.',
                        'order': 3
                    }
                ]
            }
        ]

        for t in tests_data:
            q_list = t.pop('questions')
            test, created = TestSeries.objects.update_or_create(
                slug=t['slug'],
                defaults=t
            )
            TestQuestion.objects.filter(test_series=test).delete()
            for q in q_list:
                TestQuestion.objects.create(test_series=test, **q)
            self.stdout.write(self.style.SUCCESS(f'Seeded test: {test.title} with {len(q_list)} questions'))
