# SIMS Raipur — Full Stack Educational & CBT Examination Platform

> **SIMS Raipur (Sims Institute of Mathematical Sciences)**  
> Production-grade web portal, learning management system (LMS), and Computer-Based Testing (CBT) engine designed for higher education competitive exams (CSIR-NET, GATE, IIT-JAM, NIMCET, Ret/PET, JEE, NEET).

---

## 🏛️ System Architecture

```
sims-raipur/
├── backend/                  # Django 6 + Django REST Framework + Django Unfold
│   ├── assessments/          # CBT test engine, question papers, OCR bulk import wizard
│   ├── courses/              # Course catalog, video lessons, timetable matrix, live classes
│   ├── orders/               # Razorpay payment verification & student course entitlements
│   ├── resources/            # Downloadable study notes, formula sheets, PDFs
│   ├── sales/                # Offline sales & invoice PDF generators
│   ├── site_config/          # Dynamic institute settings (socials, centres, WhatsApp)
│   ├── users/                # Auth, Google OAuth (GIS), RBAC (Student/Educator/Admin)
│   ├── manage.py
│   └── requirements.txt
├── frontend/                 # React 18 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/       # Reusable UI, MathText (KaTeX), layouts, player
│   │   ├── contexts/         # Auth, Course, Purchase, Site, Theme contexts
│   │   ├── features/         # Bulk test paper import wizard with image crop & LaTeX
│   │   ├── pages/            # Public, Student portal, Educator studio, Admin dashboard
│   │   └── services/         # Typed API clients & Razorpay checkout
│   ├── package.json
│   └── vite.config.ts
├── .gitignore
└── README.md
```

---

## ⚡ Tech Stack

| Domain | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, KaTeX (`react-katex`) |
| **Backend** | Python 3.12+, Django 6.1, Django REST Framework, Django Unfold Admin |
| **Database** | SQLite (development) / PostgreSQL (production-ready) |
| **Auth** | DRF Token Auth, Session Cookie, Google Identity Services (OAuth2 ID token) |
| **Payments** | Razorpay Standard Checkout SDK + Server-side HMAC SHA256 Signature Verification |
| **CBT / OCR** | PDF parsing, Tesseract OCR, Auto image crop, KaTeX LaTeX math typesetting |

---

## 🌟 Core Features

### 1. Public Learning & Discovery Portal
- **Course Catalog**: Filter by examination (GATE, NET, IIT-JAM, NIMCET, JEE, NEET).
- **Curriculum & Previews**: Multi-module syllabus, free preview lectures with video player.
- **Dynamic Site Config**: Editable contact info, campus branches, and social media links (Instagram, Facebook, YouTube, WhatsApp).
- **Dark / Light Mode**: Elegant charcoal-and-gold design system.

### 2. Student Portal & CBT Examination System
- **Computer-Based Testing (CBT)**: Real exam simulator matching NTA/GATE interfaces.
- **Mathematical Rendering**: Complete LaTeX math equations and auto-cropped question diagrams.
- **Instant Result Analytics**: Score breakdown, negative marks, topic-wise review, and explanations.
- **Student Dashboard**: Real progress tracking without assumed mock data, resume video playback, bookmarked lessons.
- **Profile Customization**: Google account sync, custom photo upload, and optional target exam setup.

### 3. Educator Studio & Test Series Import Wizard
- **Bulk Import Wizard**: 5-step automated workflow to import question papers from DOCX/PDF.
- **LaTeX Normalizer & Math Editor**: Real-time formula rendering and verification.
- **Image Cropping**: Automatic diagram detection with manual bounding box crop tool.
- **Scheduling Engine**: Time-gated test releases (`starts_at` / `ends_at`) and duration limits.
- **Curriculum Management**: Organize courses into modules, lectures, and resources.

### 4. Admin Management (Django Unfold)
- **Role-Based Access Control (RBAC)**: Strict permission boundaries for Students, Educators, Staff, and Superadmins.
- **Order & Entitlements**: Automatic course enrollment upon verified payment.
- **Auditing & Approvals**: Review educator applications and test series before publishing.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (tested on Node 20 / 22 / 24)
- Python 3.11+
- Git

---

### Backend Setup (Django)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate    # Linux / macOS
   # or: .\venv\Scripts\activate  # Windows
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables (`backend/.env`):
   ```env
   DEBUG=True
   SECRET_KEY=your-django-secret-key-here
   ALLOWED_HOSTS=localhost,127.0.0.1
   CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

   # Razorpay (Optional - Sandbox / Live)
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret

   # Google OAuth (Optional)
   GOOGLE_OAUTH_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
   GOOGLE_OAUTH_CLIENT_SECRET=your_google_client_secret
   ```

5. Run database migrations:
   ```bash
   python manage.py migrate
   ```

6. Seed initial test data (optional):
   ```bash
   python manage.py populate_catalogue
   ```

7. Start the backend development server:
   ```bash
   python manage.py runserver 8000
   ```
   API running at: `http://localhost:8000/api/`  
   Admin panel at: `http://localhost:8000/admin/`

---

### Frontend Setup (React + Vite)

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install npm dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables (`frontend/.env`):
   ```env
   VITE_API_URL=http://localhost:8000
   VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
   ```

4. Start Vite development server:
   ```bash
   npm run dev
   ```
   Website accessible at: `http://localhost:5173`

---

## 🧪 Testing

### Backend Unit & Integration Tests (290+ tests)
```bash
cd backend
python manage.py test
```

### Frontend Typecheck & Build
```bash
cd frontend
npm run build
```

---

## 🔐 Security & Access Control

- **Zero Assumed Data**: Fresh accounts require explicit profile details without hardcoded fallbacks.
- **Student Privacy**: Students cannot view educator studios or administrative panels.
- **Entitlement Checks**: Video access and CBT test questions are verified server-side via `UserEnrollment`.
- **Payment Verification**: Razorpay order payments require SHA256 HMAC verification before activating enrollments.

---

## 📄 License

Proprietary — All rights reserved © 2026 **SIMS Raipur**.
