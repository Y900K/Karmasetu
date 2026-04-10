# KarmaSetu Deep Platform Audit and Readiness

Audit date: 2026-04-10

Scope: evidence-based review across 11 platform areas with weighted readiness and a final blocker register.

## Scoring Method

- Scale: 0-100 per area
- Interpretation:
  - 90-100 = production-strong
  - 80-89 = production-capable with limited risk
  - 70-79 = functional but notable risk remains
  - 60-69 = major gaps still present
  - below 60 = not release ready
- Weighted overall score prioritizes auth/security, learning completion integrity, and certificate/verification reliability.

## 11-Area Readiness Scorecard

| # | Area | Score | Status |
|---|------|-------|--------|
| 1 | Auth and Identity Security | 84 | Good with targeted gaps |
| 2 | Admin Mutation Security and Governance | 85 | Good after recent hardening |
| 3 | Trainee Learning and Completion Integrity | 78 | Functional with remaining model gaps |
| 4 | Course and Media Authoring Pipeline | 76 | Functional, still maturing |
| 5 | Quiz System (Admin + Trainee) | 69 | Core works, architecture split persists |
| 6 | Certificate Issuance and Public Verification | 87 | Strong and hardened |
| 7 | Buddy AI Reliability and Safety | 84 | Stable with fallback controls |
| 8 | Dataflow Consistency and Side Effects | 77 | Improved, still partially fragmented |
| 9 | Dashboard and Chart Data Trust | 80 | Improved with live aggregation |
| 10 | Error Recovery and Observability | 79 | Good baseline, not yet end-to-end |
| 11 | Production Readiness and Ops Gate | 74 | Build-ready, runbook/testing depth needed |

Weighted overall readiness: 79/100

## Evidence Snapshot By Area

### 1) Auth and Identity Security (84)

Strengths:
- Same-origin guard is enforced on auth write routes in [app/api/auth/login/route.ts](app/api/auth/login/route.ts), [app/api/auth/register/route.ts](app/api/auth/register/route.ts), [app/api/auth/forgot-password/route.ts](app/api/auth/forgot-password/route.ts), [app/api/auth/reset-password/route.ts](app/api/auth/reset-password/route.ts), and [app/api/auth/change-password/route.ts](app/api/auth/change-password/route.ts).
- Login has rate-limiting and audit trails in [app/api/auth/login/route.ts](app/api/auth/login/route.ts).

Gaps:
- Origin guard currently allows missing Origin headers in [lib/security/originGuard.ts](lib/security/originGuard.ts), which is practical for server clients but less strict than a pure browser-CSRF policy.

### 2) Admin Mutation Security and Governance (85)

Strengths:
- Admin write routes now consistently apply origin enforcement and audit logs in:
  - [app/api/admin/users/route.ts](app/api/admin/users/route.ts)
  - [app/api/admin/users/[userId]/route.ts](app/api/admin/users/[userId]/route.ts)
  - [app/api/admin/users/[userId]/reset-password/route.ts](app/api/admin/users/[userId]/reset-password/route.ts)
  - [app/api/admin/assignments/route.ts](app/api/admin/assignments/route.ts)
  - [app/api/admin/assignments/bulk/route.ts](app/api/admin/assignments/bulk/route.ts)
  - [app/api/admin/courses/route.ts](app/api/admin/courses/route.ts)
  - [app/api/admin/courses/[courseId]/route.ts](app/api/admin/courses/[courseId]/route.ts)
  - [app/api/admin/certificates/[certNo]/revoke/route.ts](app/api/admin/certificates/[certNo]/revoke/route.ts)
  - [app/api/admin/announcements/route.ts](app/api/admin/announcements/route.ts)
  - [app/api/admin/announcements/[announcementId]/route.ts](app/api/admin/announcements/[announcementId]/route.ts)
  - [app/api/admin/alerts/[alertId]/route.ts](app/api/admin/alerts/[alertId]/route.ts)
  - [app/api/admin/feedback/[feedbackId]/route.ts](app/api/admin/feedback/[feedbackId]/route.ts)
  - [app/api/admin/upload/route.ts](app/api/admin/upload/route.ts)
  - [app/api/admin/courses/generate-quiz/route.ts](app/api/admin/courses/generate-quiz/route.ts)
  - [app/api/admin/courses/generate-thumbnail/route.ts](app/api/admin/courses/generate-thumbnail/route.ts)

Gaps:
- Logging coverage is now broad but still distributed route-by-route (no single mutation middleware layer).

### 3) Trainee Learning and Completion Integrity (78)

Strengths:
- Completion criteria hardened (finished blocks + passing score when quiz exists) in [app/api/trainee/enrollments/[courseId]/route.ts](app/api/trainee/enrollments/[courseId]/route.ts).
- Enrollment and completion actions write audit rows in [app/api/trainee/enrollments/[courseId]/route.ts](app/api/trainee/enrollments/[courseId]/route.ts).

Gaps:
- Rich per-module states (video watched, PDF viewed, quiz checkpoint granularity) are still not fully first-class in the domain model.

### 4) Course and Media Authoring Pipeline (76)

Strengths:
- Course create/update supports module and media arrays in [app/api/admin/courses/route.ts](app/api/admin/courses/route.ts) and [app/api/admin/courses/[courseId]/route.ts](app/api/admin/courses/[courseId]/route.ts).
- Thumbnail generation/import path exists in [app/api/admin/courses/generate-thumbnail/route.ts](app/api/admin/courses/generate-thumbnail/route.ts).

Gaps:
- File upload currently writes to local disk in [app/api/admin/upload/route.ts](app/api/admin/upload/route.ts), which is a deployment portability risk for horizontal scaling.

### 5) Quiz System (69)

Strengths:
- Admin quiz generation exists via [app/api/admin/courses/generate-quiz/route.ts](app/api/admin/courses/generate-quiz/route.ts).

Gaps:
- End-to-end quiz lifecycle remains split between admin and trainee route paths with partial duplication risk.
- Strong contract tests for strict question count/shape are not visible in repository-level verification scripts.

### 6) Certificate Issuance and Public Verification (87)

Strengths:
- Completion-to-certificate issuance logic and idempotent upsert pattern exist in [app/api/trainee/enrollments/[courseId]/route.ts](app/api/trainee/enrollments/[courseId]/route.ts).
- Public verify endpoint has rate limiting, ID validation, audit logs, and masked trainee name output in [app/api/certificates/verify/[certId]/route.ts](app/api/certificates/verify/[certId]/route.ts).

Gaps:
- Monitoring for unusual verification spikes is logged but not yet tied to an explicit alerting pipeline.

### 7) Buddy AI Reliability and Safety (84)

Strengths:
- Chat endpoint has auth gate, per-user/per-IP throttling, circuit breaker, fallback behavior, reasoning-strip retries, and language-mode enforcement in [app/api/sarvam/chat/route.ts](app/api/sarvam/chat/route.ts).

Gaps:
- Unified AI gateway architecture remains partial (multiple AI-adjacent routes still exist).

### 8) Dataflow Consistency and Side Effects (77)

Strengths:
- Registration now auto-assigns default courses with rollback on failure in [app/api/auth/register/route.ts](app/api/auth/register/route.ts).
- Admin overview uses aggregation over live enrollment/certificate/courses in [app/api/admin/overview/stats/route.ts](app/api/admin/overview/stats/route.ts).

Gaps:
- Some client surfaces still consume mock datasets, keeping parts of UX outside a single source of truth.

### 9) Dashboard and Chart Data Trust (80)

Strengths:
- Admin stats endpoint computes distribution, completion, and department compliance from Mongo data in [app/api/admin/overview/stats/route.ts](app/api/admin/overview/stats/route.ts).

Gaps:
- Trainee dashboard still imports static feed datasets in [app/trainee/dashboard/page.tsx](app/trainee/dashboard/page.tsx).

### 10) Error Recovery and Observability (79)

Strengths:
- System event logging utility in [lib/utils/logger.ts](lib/utils/logger.ts) is now applied across major mutation and verification routes.
- Cron safety/health checks and breaker cleanup exist in [app/api/admin/system/cron/route.ts](app/api/admin/system/cron/route.ts).

Gaps:
- Some route-level failures still rely on mixed console logging + system log patterns, not fully standardized.

### 11) Production Readiness and Ops Gate (74)

Strengths:
- Deployment runbook and verification gate exist in [docs/DEPLOYMENT_VERCEL_RENDER.md](docs/DEPLOYMENT_VERCEL_RENDER.md), [scripts/verify-gate.mjs](scripts/verify-gate.mjs), and [scripts/smoke-check.mjs](scripts/smoke-check.mjs).
- Environment validation script exists in [scripts/check-env.mjs](scripts/check-env.mjs).

Gaps:
- Root project documentation remains mostly template-level in [README.md](README.md), reducing operational clarity for contributors and on-call responders.

## Final Blocker Register (Prioritized)

### Critical Blockers

1. No centralized mutation-security middleware layer
- Impact: policy drift risk as new admin routes are added
- Evidence: repeated per-route implementation in [app/api/admin](app/api/admin)
- Recommendation: create shared guard wrapper enforcing origin + admin role + audit metadata by default

Status update (implemented in this sprint):
- Shared guard introduced in [lib/security/requireSecureAdminMutation.ts](lib/security/requireSecureAdminMutation.ts).
- Adopted in:
  - [app/api/admin/users/route.ts](app/api/admin/users/route.ts)
  - [app/api/admin/users/[userId]/route.ts](app/api/admin/users/[userId]/route.ts)
  - [app/api/admin/assignments/route.ts](app/api/admin/assignments/route.ts)
  - [app/api/admin/assignments/bulk/route.ts](app/api/admin/assignments/bulk/route.ts)
  - [app/api/admin/announcements/route.ts](app/api/admin/announcements/route.ts)
  - [app/api/admin/announcements/[announcementId]/route.ts](app/api/admin/announcements/[announcementId]/route.ts)
  - [app/api/admin/alerts/[alertId]/route.ts](app/api/admin/alerts/[alertId]/route.ts)
- Remaining action: migrate the remaining admin mutation routes to this helper for full coverage.

2. Local filesystem upload dependency in production path
- Impact: file loss or inconsistency on multi-instance/serverless deployments
- Evidence: [app/api/admin/upload/route.ts](app/api/admin/upload/route.ts)
- Recommendation: move uploads to object storage (S3/R2/Cloudinary) with signed URL flow

### High Blockers

3. Quiz architecture split and contract inconsistency risk
- Impact: divergent behavior between admin quiz authoring and trainee consumption
- Evidence: [app/api/admin/courses/generate-quiz/route.ts](app/api/admin/courses/generate-quiz/route.ts), [app/api/trainee/practice-quiz](app/api/trainee/practice-quiz)
- Recommendation: unify question schema contract and add schema-level validation tests

4. Partial mock-data dependency in trainee UI
- Impact: perceived metrics/recommendations can diverge from backend truth
- Evidence: [app/trainee/dashboard/page.tsx](app/trainee/dashboard/page.tsx), [data/mockTraineeData.ts](data/mockTraineeData.ts)
- Recommendation: move safety tips/events/achievements to API-driven content

5. Origin policy allows missing Origin header
- Impact: broader acceptance window than strict browser write policy
- Evidence: [lib/security/originGuard.ts](lib/security/originGuard.ts)
- Recommendation: add route-class strict mode for browser-only write endpoints

### Medium Blockers

6. Root ops documentation is weak
- Impact: slower onboarding and incident handling
- Evidence: [README.md](README.md)
- Recommendation: replace template README with architecture + runbook summary

7. Observability is broad but not normalized
- Impact: uneven incident triage quality across routes
- Evidence: mixed logging patterns in [app/api](app/api)
- Recommendation: standardize event naming, metadata keys, and severity mapping

8. No explicit alerting integration for high-value telemetry counters
- Impact: failures may be noticed late
- Evidence: metrics are recorded in [app/api/sarvam/chat/route.ts](app/api/sarvam/chat/route.ts) but alerting path not codified
- Recommendation: add threshold-based alert hook for error/timeout/fallback counters

## Go/No-Go Summary

- Current readiness: Conditional GO for controlled production rollout
- Conditions:
  - Close both critical blockers first
  - Close at least blockers 3 and 4 from high tier
  - Keep verification gate and smoke checks mandatory in CI

## Next Improvement Sprint (Recommended)

1. Build shared secure-mutation wrapper for admin routes
2. Migrate upload pipeline to external object storage
3. Unify quiz schema and add contract tests
4. Replace trainee mock feed surfaces with API-backed data
5. Upgrade README to production-grade operator documentation
