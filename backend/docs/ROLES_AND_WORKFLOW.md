# SIMS Raipur: Roles and Workflow Matrix

## 1. Permission Matrix

| Resource / Endpoint | Student | Educator | Admin / Superadmin / Staff |
| :--- | :---: | :---: | :---: |
| **Authentication: /login (student portal)** | Allow | Allow | Allow |
| **Authentication: /educator/login (educator portal)** | 403 (`not_educator`) | Allow | Allow |
| **Educator Application: /api/auth/educator/apply/** | Allow (Public) | Allow (Public) | Allow (Public) |
| **Admin Educator Applications: /api/auth/admin/educator-applications/** | 403 | 403 | Full CRUD & Review |
| **Admin Educator Management: /api/auth/admin/educators/** | 403 | 403 | Full (Add, Suspend, Reactivate, Remove) |
| **Student Progress: /api/auth/educator/students/** | 403 | Own Students Only (No Phone) | All Students |
| **Courses: Catalog (Public / Published)** | Read | Read | Read |
| **Courses: Manage / Edit** | 403 | Own Courses Only | Full Access (Any Course) |
| **Courses: Pricing & Publishing** | None | Read-only | Full Control |
| **Assessments: Browse & Attempt** | Attempt Live Tests | Preview / Manage Own | Full Access |
| **Assessments: Questions & Bank** | 403 | Own Tests Only | Full Access |
| **Assessments: Results CSV & Attempts** | Own Attempts | Own Tests Only | Full Access |
| **Study Resources: Browse & Download** | Read (Published) | Read | Full Access |
| **Frontend Route Guards: /admin/\*** | Blocked -> /student/dashboard | Blocked -> /educator/dashboard | Allow |
| **Frontend Route Guards: /educator/\*** | Blocked -> /student/dashboard | Allow | Allow |
| **Frontend Route Guards: /student/\*** | Allow | Allow | Allow |

---

## 2. Educator Onboarding Workflow

```text
[ Prospective Educator ]
          |
          v
Submits Application (/educator/apply)
- Validates fields (name, email, phone, subjects, qualification, experience, bio)
- HTTPS-only demo & resume links
- 5 req/hour rate limit
          |
          v
[ EducatorApplication (Status: Pending) ]
          |
          +-------------------------------+
          |                               |
          v (Admin Rejects)               v (Admin Approves)
Requires admin_note             - Creates user (if new) with unusable password
Status -> Rejected              - Sets UserProfile.role = 'educator'
                                - Creates inactive FacultyProfile stub
                                - Sends password reset invite email
                                - Status -> Approved
                                          |
                                          v
                                Educator sets password
                                Signs in via /educator/login
                                Accesses /educator/dashboard
```

---

## 3. Content Review & Publishing Workflow (Runs 2-4)

```text
[ Educator ]
Creates Course / Test / Resource (Draft)
          |
          v
Submits for Review (/submit-review/)
- Courses: must have >= 1 lecture
- Tests: must have >= 1 question
- Status: Draft -> Pending
          |
          v
[ Admin Review Queue ]
          |
          +-------------------------------+
          |                               |
          v (Admin Rejects)               v (Admin Approves)
Requires review_note            - Status: Approved
Status -> Rejected              - is_published -> True
Educator notified               - Content live in catalog
Can revise and resubmit         - Admin sets pricing fields
```

---

## 4. Admin Educators Control Center (Run 4)

- **Control Center Path**: `/admin/educators`
- **Tabs**:
  1. **Educators Roster**: Active/Suspended status, Courses, Tests, Pending items, and Students count. Actions: View, Suspend/Reactivate, Demote to student, Re-send invite, Add educator directly modal.
  2. **Applications Queue**: Review applicant qualifications, demo/resume HTTPS links, Approve (creates account & sends invite) or Reject with note.
  3. **Pending Approvals**: Unified triage queue for courses, tests, and study resources with inline preview, one-click Approve, and Reject with feedback note.
  4. **Global Activity Feed**: System-wide audit log with filter by entity type, action, and diff review.
- **Educator Detail View**: `/admin/educators/:id`
  - Deep-dive tabs: Overview, Courses, Tests, Study Material, Students, Activity, Faculty Profile.
  - Ownership transfers: Single & bulk transfer of courses, tests, and resources to another educator or admin.
  - Faculty Profile: Direct editing and publishing of student-facing public directory profile.

