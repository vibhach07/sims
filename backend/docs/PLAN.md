# SIMS Raipur Implementation Plan

## Verification Summary
- **Backend:** `sims-raipur-backend/` (Django 6.1, DRF, PostgreSQL / SQLite).
- **Frontend:** `sims-raipur-frontend/` (Vite, React 18, TypeScript, TailwindCSS).
- **Reference:** `sims-nimcet-test-series-main/` (Feature specification reference only).

## Phased Execution Roadmap
1. **Part A: Backend Assessments Enhancements**
   - A1: Student-safe bilingual question payload (`TestQuestionStudentSerializer`, `InProgressAttemptSerializer` with questions + `serverNow`). Student access to `GET /<slug>/` returns empty questions list.
   - A2: Dashboard button state fields in `TestSeriesListSerializer` (`startsAt`, `endsAt`, `maxAttempts`, `usedAttempts`, `inProgressAttemptId`, `canStart`, `blockReason`). Prefetched/annotated queries without N+1. Scoped educator list.
   - A3: Result calculation: `rank`, `participants`, `subjectAnalysis`, bilingual review (`questionHi`, `optionAHi..DHi`, `explanationHi`), fix typo `negativeMarts` -> `negativeMarks`.
   - A4: Integrity endpoint `POST /api/assessments/attempts/<id>/integrity/` with strict/warn/off logic in `services.py`.
   - A5: Management command `auto_submit_expired_attempts.py` with grace period.
   - A6: Admin API: test manage serializer fields, question admin serializer, and CSV export endpoint `GET /api/assessments/manage/attempts/export/`.
   - A7: Bulk import updates: `mode=append|replace` (replace 409 check if attempts exist), skip duplicates with warnings instead of blocking whole batch, DOCX superscript/subscript and equation warnings.
2. **Part B: Frontend LaTeX / KaTeX Integration**
   - Install `katex`, `react-katex`, `@types/react-katex`.
   - Implement `mathParse.ts` and `<MathText />` component with currency safety rules.
   - Write `docs/LATEX_AND_IMPORT.md`.
3. **Part C: Frontend Student CBT Runner & Results**
   - Update `api.ts` with Phase 1B lifecycle endpoints.
   - Overhaul `StudentTestsPage`, `TestTakingPage` (CBT runner, autosave, server timer, palette, integrity), and `TestResultsPage` (rank, subject table, bilingual review).
4. **Part D: Frontend Admin / Educator CBT Management**
   - Create unified `TestsManager` for `/admin/tests` and `/educator/tests`.
   - Implement Question Bank drawer/editor with MathText live preview.
   - Build `ImportQuestions` component supporting preview, warnings, errors table, append/replace, template download.
5. **Part E: Video / Courses Platform Fixes**
   - New `VideoPlayer` component supporting YouTube, Vimeo, HLS (`hls.js`), and HTML5 `<video>`.
   - Remove `isFirstLesson` frontend bypass.
   - Fix progress cap in `LectureProgressView`.
   - Remove BigBuckBunny default in `Lecture.video_url` (migration required).
   - Educator curriculum editor (modules and lectures management).
   - Fix LectureSerializer N+1 queries.
6. **Part F: Security & Hygiene Cleanup**
   - Production settings hardening.
   - Delete stale files and update `.gitignore`.
7. **Verification & Tests**
   - Full test run on SQLite & PostgreSQL, `npm run build` verification.
