# KarmaSetu Progressive Authentication Flow

## Objective
Enable new trainees to access learning content immediately while account verification remains in progress.

## Registration Flow
1. User submits registration with full name, email, password, role, department, and company.
2. API validates:
   - Full name and email
   - Password policy
   - Mandatory department selection
3. User document is created with:
   - `approvalStatus: "pending"`
   - `accessLevel: "basic"`
   - `isActive: true`
4. Session is created immediately.
5. Default course catalog is auto-assigned to the new trainee.
6. API returns:
   - `assignedDefaultCourseCount`
   - `auth.status = "pending_approval"`
   - `auth.access = "basic"`
   - User-facing message for immediate learning access

## Login Flow
1. Email/password authentication runs with rate limiting and audit logging.
2. On success, session is created.
3. API returns auth context:
   - `auth.status` from user `approvalStatus` (defaults to `approved`)
   - `auth.access` (`basic` for pending users, `full` for approved users)
   - Message clarifying current access level

## Session / Profile Flow
- `/api/auth/me` now exposes:
  - `user.approvalStatus`
  - `user.accessLevel`
  - `auth` object
- `/api/trainee/profile` now exposes:
  - `profile.approvalStatus`
  - `profile.accessLevel`
  - `profile.authMessage`

## Frontend User Communication
- Trainee dashboard reads `approvalStatus` and `authMessage`.
- Pending users see a visible status card:
  - Account under review
  - Basic access active
  - Default courses available immediately

## Default Course Assignment Rules
Course auto-assignment priority:
1. Published courses marked `isDefaultForNewTrainees: true`
2. Published courses matching:
   - `departments` includes `All Departments` or trainee department, or
   - category matches `safety|compliance|induction`
3. Fallback: first published courses (up to 3)

Assignments are written to:
- `enrollments` with `status: "assigned"` and `department`
- `enrollment_audit` with `source: "system"` and `assignmentType: "default_course_catalog"`
