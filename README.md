# SIMS Raipur — Full Stack Web Application

Comprehensive educational portal and CBT examination platform for **SIMS Raipur (Sims Institute of Mathematical Sciences)**.

## Project Structure

```
sims-raipur/
├── backend/            # Django 6 + Django REST Framework API
│   ├── assessments/    # Test series, CBT test-taking engine, bulk import wizard
│   ├── courses/        # Course catalog, video lectures, weekly timetable
│   ├── orders/         # Razorpay payment gateway integration & order entitlements
│   ├── resources/      # Downloadable study resources
│   ├── site_config/    # Dynamic institute settings & social links
│   ├── users/          # Authentication, Google Auth, user roles (Student/Educator/Admin)
│   ├── manage.py
│   └── requirements.txt
├── frontend/           # React 18 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/ # Reusable UI components & layouts
│   │   ├── contexts/   # Auth, Course, Purchase, Site, Theme contexts
│   │   ├── features/   # Bulk test import wizard with math OCR & image crop
│   │   ├── pages/      # Public, Student portal, Educator studio, Admin dashboard
│   │   └── services/   # REST API client & Razorpay standard checkout
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## Quick Start

### 1. Backend Setup (Django)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```

### 2. Frontend Setup (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` in your browser.
