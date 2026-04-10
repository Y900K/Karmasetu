const LEARNER_ROLES = ['trainee', 'operator', 'contractor', 'hse', 'manager'] as const;

export type LearnerRole = (typeof LEARNER_ROLES)[number];

export const LEARNER_ROLE_SET: ReadonlySet<string> = new Set(LEARNER_ROLES);

export function isLearnerRole(role: unknown): role is LearnerRole {
  return typeof role === 'string' && LEARNER_ROLE_SET.has(role);
}
