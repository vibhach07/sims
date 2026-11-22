# SIMS Raipur Seed Content Verification Audit

This document inventories all marketing claims, durations, prices, lecture hours, rank claims, and promotional phrases currently seeded in `populate_catalogue.py`. The institute owner and administrators should review and replace these placeholder values with actual operational data.

---

## 1. Unverified Marketing & Historical Claims

The following claims were generated as realistic placeholders during development and must be verified or replaced:

1. **GATE (`gate`)**:
   - Claim: *"Our GATE program is engineered by top IITians and former PSU executives."*
   - Claim: *"It includes 600+ hours of conceptual pedagogy, exhaustive multi-tier topic worksheets, previous 25-year question paper deconstruction..."*
2. **IIT-JAM (`iit-jam`)**:
   - Claim: *"SIMS Raipur has a proven heritage in IIT-JAM with multiple top-100 rankers."*
   - Claim: *"Our program covers 450+ lecture hours, weekly chapterwise tests, complete NAT drill sessions..."*
3. **NIMCET (`nimcet`)**:
   - Claim: *"Our NIMCET program is Raipur's undisputed leader in NIT MCA selections."*
   - Claim: *"500+ teaching hours, speed calculation mental math tricks, previous 15-year NIMCET paper dissection..."*
4. **CAT & Management (`cat`)**:
   - Claim: *"Led by IIM alumni and aptitude masters."*
5. **CA Foundation (`ca-foundation`)**:
   - Claim: *"Conducted by experienced Chartered Accountants and legal experts."*
6. **Classes X–XII Foundation (`foundation-x-xii`)**:
   - Claim: *"ensuring 95%+ in Board examinations..."*

---

## 2. Seeded Pricing and Durations to Verify

All fees and durations below are template values and should be aligned with SIMS Raipur's actual fee schedule:

| Course Slug | Course Title | Seed Price (INR) | Original Price (INR) | Seed Duration | Fee Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `gate` | GATE | ₹32,000 | ₹42,000 | 10-12 Months | Admissions Open |
| `net` | UGC-NET / CSIR-NET | ₹24,000 | ₹30,000 | 6-8 Months | Admissions Open |
| `set` | State Eligibility Test (SET) | ₹18,000 | ₹24,000 | 5-6 Months | Admissions Open |
| `appsc` | Assistant Professor / PSC Technical | ₹22,000 | ₹28,000 | 6 Months | Admissions Open |
| `phd-entrance` | Ph.D. Entrance Examination (RET/PET) | ₹16,000 | ₹20,000 | 4-5 Months | Admissions Open |
| `iit-jam` | IIT-JAM | ₹28,000 | ₹36,000 | 10-12 Months | Admissions Open |
| `nimcet` | NIMCET | ₹26,000 | ₹34,000 | 10-12 Months | Admissions Open |
| `cat` | CAT & Management Entrances | ₹35,000 | ₹45,000 | 9-11 Months | Admissions Open |
| `banking` | Banking & Insurance Exams | ₹16,000 | ₹22,000 | 6 Months | Admissions Open |
| `ca-foundation` | CA Foundation (ICAI) | ₹22,000 | ₹28,000 | 5-6 Months | Admissions Open |
| `jee` | JEE (Main & Advanced) | ₹45,000 | ₹58,000 | 1-2 Years | Admissions Open |
| `neet` | NEET (UG Medical) | ₹45,000 | ₹58,000 | 1-2 Years | Admissions Open |
| `aiims-nursing` | AIIMS B.Sc. Nursing Entrance | ₹18,000 | ₹24,000 | 6 Months | Admissions Open |
| `foundation-x-xii` | Classes X–XII Foundation & Boards | ₹20,000 | ₹26,000 | Academic Year | Admissions Open |

---

## 3. How to Update in Production

Once verified by SIMS administration:
1. Edit values directly in `courses/management/commands/populate_catalogue.py` (or through the Django Admin at `/admin/courses/course/`).
2. Rerunning `python manage.py populate_catalogue` will **not** overwrite any admin modifications made directly in Django Admin.

