import type { CourseQuizQuestion } from '@/lib/courseUtils';
import { callAI, repairTruncatedJson } from '@/lib/server/aiGateway';

const BASE_URL = 'https://api.sarvam.ai';
const FALLBACK_KEYWORDS = ['industrial', 'safety', 'training'];

export async function callSarvamChat(payload: object, apiKey: string) {
  return fetch(`${BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'API-Subscription-Key': apiKey,
    },
    body: JSON.stringify(payload),
  });
}

export function stripReasoningBlocks(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, ' ')
    .replace(/<analysis>[\s\S]*?<\/analysis>/gi, ' ')
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, ' ')
    .replace(/<\/?(think|analysis|thinking)>/gi, ' ')
    .trim();
}

function extractJsonArray(text: string) {
  const cleaned = stripReasoningBlocks(text).replace(/```[A-Za-z]*/g, '').replace(/```/g, '').trim();
  const startIndex = cleaned.indexOf('[');

  if (startIndex !== -1) {
    const endIndex = cleaned.lastIndexOf(']');
    if (endIndex !== -1 && endIndex > startIndex) {
      return cleaned.slice(startIndex, endIndex + 1);
    }
    return cleaned.slice(startIndex);
  }

  return cleaned;
}

export function sanitizeKeywordList(rawText: string): string[] {
  const withoutReasoning = stripReasoningBlocks(rawText)
    .replace(/[<>{}\[\]"]/g, ' ')
    .replace(/\b(course|title|keywords?)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const keywordSet = new Set<string>();
  for (const fragment of withoutReasoning.split(/[,\n/|]+/)) {
    const safeWord = fragment
      .trim()
      .replace(/[^a-z0-9 -]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!safeWord) {
      continue;
    }

    const compact = safeWord.split(' ').slice(0, 2).join(' ');
    if (compact.length >= 3 && compact.length <= 32) {
      keywordSet.add(compact);
    }
  }

  const sanitized = Array.from(keywordSet).slice(0, 4);
  return sanitized.length > 0 ? sanitized : FALLBACK_KEYWORDS;
}

export async function generateThumbnailKeywords(title: string, apiKey?: string) {
  if (apiKey) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await callSarvamChat(
          {
            model: 'sarvam-m',
            messages: [
              {
                role: 'system',
                content:
                  'You are a visual design assistant. Given a course title, return exactly 3 or 4 professional English keywords. Return only comma-separated keywords with no reasoning.',
              },
              {
                role: 'user',
                content: `Course Title: ${title}`,
              },
            ],
            temperature: 0.2,
            max_tokens: 40,
          },
          apiKey
        );

        if (!response.ok) {
          continue;
        }

        const data = await response.json().catch(() => ({}));
        const rawContent = typeof data?.choices?.[0]?.message?.content === 'string' ? data.choices[0].message.content : '';
        const keywords = sanitizeKeywordList(rawContent);

        if (keywords.length >= 3) {
          return keywords.slice(0, 4);
        }
      } catch {
        // Try again or fallback to OpenRouter
      }
    }
  }

  // ── OpenRouter Fallback for keywords ─────────────────────────────────────
  try {
    const gatewayResult = await callAI({
      task: 'thumbnail_keywords',
      messages: [
        {
          role: 'system',
          content: 'You are a visual design assistant. Given a course title, return exactly 3 or 4 professional English keywords. Return only comma-separated keywords with no reasoning.',
        },
        { role: 'user', content: `Course Title: ${title}` },
      ],
      temperature: 0.2,
      max_tokens: 40,
    });

    if (gatewayResult.provider !== 'static_fallback') {
      const keywords = sanitizeKeywordList(gatewayResult.content);
      if (keywords.length >= 3) {
        return keywords.slice(0, 4);
      }
    }
  } catch {
    // fall through to static fallback
  }

  return FALLBACK_KEYWORDS;
}

function normalizeQuizPayload(rawQuiz: unknown, count: number): CourseQuizQuestion[] {
  if (!Array.isArray(rawQuiz)) {
    return [];
  }

  return rawQuiz
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const questionObject = item as {
        q?: unknown;
        question?: unknown;
        options?: unknown;
        correct?: unknown;
        answer?: unknown;
      };

      const text =
        typeof questionObject.question === 'string' && questionObject.question.trim().length > 0
          ? questionObject.question.trim()
          : typeof questionObject.q === 'string' && questionObject.q.trim().length > 0
          ? questionObject.q.trim()
          : '';

      const options = Array.isArray(questionObject.options)
        ? questionObject.options
            .filter((option): option is string => typeof option === 'string' && option.trim().length > 0)
            .map((option) => option.trim())
            .slice(0, 4)
        : [];

      let correctIndex = typeof questionObject.correct === 'number' ? questionObject.correct : -1;
      if (correctIndex < 0 && typeof questionObject.answer === 'string') {
        correctIndex = options.findIndex((option) => option === questionObject.answer);
      }

      if (!text || options.length < 2 || correctIndex < 0 || correctIndex >= options.length) {
        return null;
      }

      return {
        text,
        options,
        correct: correctIndex,
      } satisfies CourseQuizQuestion;
    })
    .filter((question): question is CourseQuizQuestion => Boolean(question))
    .slice(0, count);
}

function hasDevanagariContent(questions: CourseQuizQuestion[]) {
  return questions.some((question) => {
    if (/[\u0900-\u097F]/.test(question.text)) {
      return true;
    }

    return question.options.some((option) => /[\u0900-\u097F]/.test(option));
  });
}

export async function generateAdminCourseQuiz(
  topic: string,
  apiKey: string | undefined,
  count = 10,
  languageMode: 'english' | 'hinglish' = 'english'
) {
  const languageInstruction =
    languageMode === 'hinglish'
      ? `Language rules: Use Hinglish (Devanagari script for Hindi, English script for technical words). DO NOT transliterate Hindi into English letters.
Example: {"q": "Machine start करने से पहले क्या check करना चाहिए?", "options": ["Power supply", "Water level", "Tooling", "Oil pressure"], "correct": 0}`
      : `Language rules: Use clear professional English only.`;

  if (apiKey) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await callSarvamChat(
          {
            model: 'sarvam-m',
            messages: [
              {
                role: 'system',
                content: `You are a strict industrial training assessment generator. Return ONLY a JSON array with exactly ${count} objects.
Each object must match:
{
  "q": "Question text",
  "options": ["A", "B", "C", "D"],
  "correct": 0
}
Requirements:
- Questions must be specific, professional, and distinct.
- Use 4 options when possible.
- "correct" must be the zero-based index of the correct option.
- ${languageInstruction}
- No markdown, no prose, no explanations outside JSON.`,
              },
              {
                role: 'user',
                content: `Generate a ${count}-question competency quiz for this course topic: ${topic}`,
              },
            ],
            temperature: 0.1,
            max_tokens: 2048,
          },
          apiKey
        );

        if (!response.ok) {
          console.warn(`[Admin AI] Sarvam HTTP status ${response.status} on attempt ${attempt + 1}`);
          continue;
        }

        const data = await response.json().catch(() => ({}));
        const rawContent = typeof data?.choices?.[0]?.message?.content === 'string' ? data.choices[0].message.content : '[]';
        const parsedJson = JSON.parse(repairTruncatedJson(extractJsonArray(rawContent)));
        const questions = normalizeQuizPayload(parsedJson, count);

        if (questions.length === count) {
          if (languageMode === 'hinglish' && !hasDevanagariContent(questions)) {
            console.warn(`[Admin AI] Sarvam quiz lacked Devanagari content on attempt ${attempt + 1}`);
            continue;
          }

          return questions;
        }
      } catch (e) {
        console.warn(`[Admin AI] Sarvam exception on attempt ${attempt + 1}:`, e instanceof Error ? e.message : 'Unknown');
      }
    }
  } else {
    console.warn('[Admin AI] SARVAM_API_KEY missing; skipping Sarvam primary generation path.');
  }

  // ── OpenRouter Fallback for quiz ─────────────────────────────────────────
  const langPrompt = languageMode === 'hinglish'
    ? `Language: Use Hinglish (Hindi in Devanagari + English terms).`
    : `Language: Use clear, professional English only.`;

  try {
    const gatewayResult = await callAI({
      task: 'admin_quiz',
      messages: [
        {
          role: 'system',
          content: `You are a strict industrial training assessment generator. Return ONLY a JSON array with exactly ${count} objects.
Each object: { "q": "Question", "options": ["A","B","C","D"], "correct": 0 }
${langPrompt}
No markdown, no prose, no explanations outside JSON.`,
        },
        { role: 'user', content: `Generate a ${count}-question competency quiz for: ${topic}` },
      ],
      temperature: 0.1,
      max_tokens: 2048,
    });

    if (gatewayResult.provider !== 'static_fallback') {
      const rawContent = gatewayResult.content;
      const parsedJson = JSON.parse(repairTruncatedJson(extractJsonArray(rawContent)));
      const questions = normalizeQuizPayload(parsedJson, count);

      if (questions.length === count) {
        if (languageMode === 'hinglish' && !hasDevanagariContent(questions)) {
          // OpenRouter may not handle Hinglish well — throw to trigger error
          throw new Error('OpenRouter quiz did not contain Devanagari content for Hinglish mode.');
        }
        return questions;
      }
    }
  } catch (orError) {
    console.warn('[Admin AI] OpenRouter quiz fallback also failed:', orError instanceof Error ? orError.message : 'Unknown');
  }

  throw new Error('AI quiz generation did not return a valid set. Both Sarvam and OpenRouter failed.');
}
