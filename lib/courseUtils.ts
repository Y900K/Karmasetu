export type CourseQuizQuestion = {
  text: string;
  options: string[];
  correct: number;
  explanation?: string;
};

type RawQuizQuestion = {
  text?: unknown;
  q?: unknown;
  options?: unknown;
  correct?: unknown;
  explanation?: unknown;
  reason?: unknown;
};

export type CourseThumbnailMeta = {
  sourceUrl?: string;
  provider?: 'ai_generated' | 'sarvam_unsplash' | 'manual_import' | 'legacy_seed' | 'generated_fallback';
  keywords?: string[];
  importedAt?: string;
  generatedAt?: string;
};

export type CourseModuleType = 'video' | 'document';

export type CourseModule = {
  id: string;
  type: CourseModuleType;
  title: string;
  url: string;
  order: number;
  duration?: string;
  description?: string;
  required?: boolean;
};

export const DEFAULT_VIDEO_DURATION = '10:00';

export function normalizeUrlArray(listValue: unknown, singleValue: unknown): string[] {
  if (Array.isArray(listValue)) {
    return listValue
      .filter((url): url is string => typeof url === 'string')
      .map((url) => url.trim())
      .filter((url) => url.length > 0);
  }

  if (typeof singleValue === 'string' && singleValue.trim().length > 0) {
    return [singleValue.trim()];
  }

  return [];
}

export function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function normalizeOptionalText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeIcon(value: unknown, category?: string): string {
  const icon = typeof value === 'string' ? value.trim() : '';
  if (icon && icon !== 'ðŸ“˜' && icon !== '📘') {
    return icon;
  }

  // Category-based defaults
  const lowerCat = (category || '').toLowerCase();
  if (lowerCat.includes('safety') || lowerCat.includes('ehs')) return '⛑️';
  if (lowerCat.includes('fire')) return '🔥';
  if (lowerCat.includes('electrical')) return '⚡';
  if (lowerCat.includes('chemical')) return '🧪';
  if (lowerCat.includes('first aid') || lowerCat.includes('health')) return '🩺';
  if (lowerCat.includes('quality')) return '🛡️';
  if (lowerCat.includes('compliance')) return '📋';
  if (lowerCat.includes('environment')) return '🌱';
  if (lowerCat.includes('technical') || lowerCat.includes('skill')) return '⚙️';

  return '📘';
}

export function normalizeObjectives(value: unknown): string[] {
  return normalizeStringArray(value);
}

export function normalizeVideoTitles(
  titlesValue: unknown,
  videoUrls: string[],
  courseTitle?: string
): string[] {
  const normalizedTitles = Array.isArray(titlesValue)
    ? titlesValue.map((title) => (typeof title === 'string' ? title.trim() : ''))
    : [];

  return videoUrls.map((_, index) => {
    const current = normalizedTitles[index];
    if (current) {
      return current;
    }

    if (videoUrls.length === 1 && courseTitle && courseTitle.trim().length > 0) {
      return courseTitle.trim();
    }

    return `Lesson ${index + 1}`;
  });
}

export function normalizeVideoDurations(durationsValue: unknown, videoUrls: string[]): string[] {
  const normalizedDurations = Array.isArray(durationsValue)
    ? durationsValue.map((duration) => (typeof duration === 'string' ? duration.trim() : ''))
    : [];

  return videoUrls.map((_, index) => normalizedDurations[index] || DEFAULT_VIDEO_DURATION);
}

export function normalizeCourseModules(value: unknown, courseTitle = 'Course'): CourseModule[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = value
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const raw = entry as Record<string, unknown>;
      const moduleType: CourseModuleType | null =
        raw.type === 'video' || raw.type === 'document' ? raw.type : null;
      const url = typeof raw.url === 'string' ? raw.url.trim() : '';

      if (!moduleType || !url) {
        return null;
      }

      const order = typeof raw.order === 'number' && raw.order > 0 ? Math.round(raw.order) : index + 1;
      const title =
        typeof raw.title === 'string' && raw.title.trim().length > 0
          ? raw.title.trim()
          : moduleType === 'video'
          ? `${courseTitle} - Lesson ${order}`
          : `${courseTitle} Material ${order}`;

      return {
        id:
          typeof raw.id === 'string' && raw.id.trim().length > 0
            ? raw.id.trim()
            : `${moduleType}_${order}`,
          type: moduleType,
        title,
        url,
        order,
        duration: typeof raw.duration === 'string' && raw.duration.trim().length > 0 ? raw.duration.trim() : undefined,
        description:
          typeof raw.description === 'string' && raw.description.trim().length > 0
            ? raw.description.trim()
            : undefined,
        required: raw.required === false ? false : true,
      };
    })
    .filter((module) => module !== null);

  return (normalized as CourseModule[]).sort((a, b) => a.order - b.order);
}

export function buildCourseModules(
  videoUrls: string[],
  pdfUrls: string[],
  videoTitles: string[],
  videoDurations: string[],
  courseTitle: string
): CourseModule[] {
  const videoModules: CourseModule[] = videoUrls.map((url, index) => ({
    id: `video_${index + 1}`,
    type: 'video',
    title: videoTitles[index] || (videoUrls.length === 1 ? courseTitle : `Lesson ${index + 1}`),
    url,
    order: index + 1,
    duration: videoDurations[index] || DEFAULT_VIDEO_DURATION,
    required: true,
  }));

  const documentModules: CourseModule[] = pdfUrls.map((url, index) => ({
    id: `document_${index + 1}`,
    type: 'document',
    title: pdfUrls.length === 1 ? `${courseTitle} Material` : `Course Material ${index + 1}`,
    url,
    order: videoModules.length + index + 1,
    required: true,
  }));

  return [...videoModules, ...documentModules];
}

export function extractModuleMedia(modules: CourseModule[]) {
  const sortedModules = [...modules].sort((a, b) => a.order - b.order);
  const videoModules = sortedModules.filter((module) => module.type === 'video');
  const documentModules = sortedModules.filter((module) => module.type === 'document');

  return {
    videoUrls: videoModules.map((module) => module.url),
    pdfUrls: documentModules.map((module) => module.url),
    videoTitles: videoModules.map((module) => module.title),
    videoDurations: videoModules.map((module) => module.duration || DEFAULT_VIDEO_DURATION),
  };
}

export function resolveModulesCount(
  requestedModules: unknown,
  videoUrls: string[],
  pdfUrls: string[],
  modules?: CourseModule[]
) {
  if (Array.isArray(modules) && modules.length > 0) {
    return modules.length;
  }

  if (videoUrls.length > 0) {
    return videoUrls.length;
  }

  if (pdfUrls.length > 0) {
    return pdfUrls.length;
  }

  if (typeof requestedModules === 'number' && requestedModules > 0) {
    return requestedModules;
  }

  return 1;
}

export function toDateOnly(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }

  return null;
}

export function validateQuizQuestions(
  questions?: Array<{ text: string; options: string[]; correct: number }>
) {
  if (!questions || !Array.isArray(questions)) {
    return {
      valid: true,
      questions: [] as Array<{ text: string; options: string[]; correct: number }>,
    };
  }

  if (questions.length === 0) {
    return {
      valid: true,
      questions: [] as Array<{ text: string; options: string[]; correct: number }>,
    };
  }

  for (const q of questions) {
    if (!q.text || typeof q.text !== 'string' || q.text.trim() === '' || q.text.trim() === 'Enter question') {
      return { valid: false, message: 'Quiz questions cannot be empty or contain placeholder text.' };
    }

    if (!Array.isArray(q.options) || q.options.length < 2) {
      return { valid: false, message: 'Each question must have at least 2 options.' };
    }

    const validOptions = q.options.filter(
      (option) => typeof option === 'string' && option.trim() !== '' && !option.startsWith('Option ')
    );
    if (validOptions.length < 2) {
      return { valid: false, message: 'Options cannot be empty or all placeholders (like "Option A").' };
    }

    if (typeof q.correct !== 'number' || q.correct < 0 || q.correct >= q.options.length) {
      return { valid: false, message: 'Correct answer index is invalid.' };
    }
  }

  return { valid: true, questions };
}

export function normalizeQuizQuestions(value: unknown, maxQuestions = 10): CourseQuizQuestion[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized: CourseQuizQuestion[] = [];

  for (const rawQuestion of value as RawQuizQuestion[]) {
    if (!rawQuestion || typeof rawQuestion !== 'object') {
      continue;
    }

    const textValue =
      typeof rawQuestion.text === 'string' && rawQuestion.text.trim().length > 0
        ? rawQuestion.text.trim()
        : typeof rawQuestion.q === 'string' && rawQuestion.q.trim().length > 0
        ? rawQuestion.q.trim()
        : '';

    const optionsValue = Array.isArray(rawQuestion.options)
      ? rawQuestion.options
          .filter((option): option is string => typeof option === 'string')
          .map((option) => option.trim())
          .filter((option) => option.length > 0)
      : [];

    if (!textValue || optionsValue.length < 2) {
      continue;
    }

    const correctIndex =
      typeof rawQuestion.correct === 'number' &&
      Number.isInteger(rawQuestion.correct) &&
      rawQuestion.correct >= 0 &&
      rawQuestion.correct < optionsValue.length
        ? rawQuestion.correct
        : 0;

    const explanationValue =
      typeof rawQuestion.explanation === 'string' && rawQuestion.explanation.trim().length > 0
        ? rawQuestion.explanation.trim()
        : typeof rawQuestion.reason === 'string' && rawQuestion.reason.trim().length > 0
        ? rawQuestion.reason.trim()
        : undefined;

    normalized.push({
      text: textValue,
      options: optionsValue,
      correct: correctIndex,
      explanation: explanationValue,
    });

    if (normalized.length >= Math.max(1, maxQuestions)) {
      break;
    }
  }

  return normalized;
}

export function isQuestionStructurallyValid(question: {
  text?: unknown;
  q?: unknown;
  options?: unknown;
  correct?: unknown;
}) {
  const text =
    typeof question.text === 'string' && question.text.trim().length > 0
      ? question.text.trim()
      : typeof question.q === 'string'
      ? question.q.trim()
      : '';
  const options = Array.isArray(question.options)
    ? question.options.filter((option): option is string => typeof option === 'string' && option.trim().length > 0)
    : [];

  return text.length > 0 && options.length >= 2 && typeof question.correct === 'number' && question.correct >= 0;
}

export function needsQuizReplacement(questions: unknown): boolean {
  if (!Array.isArray(questions) || questions.length < 10) {
    return true;
  }

  return questions.some((question) => !isQuestionStructurallyValid(question as Record<string, unknown>));
}

/**
 * Resolves a course identifier (ID, code, or slug) to a clean string courseId.
 * This ensures data consistency across different portals.
 */
export function resolveCourseIdInternal(course: { _id?: unknown; id?: unknown; code?: unknown; slug?: unknown }): string {
  if (course._id) return String(course._id);
  if (course.id) return String(course.id);
  if (course.code) return String(course.code);
  if (course.slug) return String(course.slug);
  return 'unknown';
}
