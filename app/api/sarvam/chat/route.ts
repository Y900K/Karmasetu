import { checkCircuitBreaker, recordCircuitBreakerSuccess, recordCircuitBreakerFailure } from '@/lib/utils/circuitBreaker';
import { NextResponse } from 'next/server';
import { cleanResponse } from '@/utils/cleanResponse';
import { buildBuddyFallbackResponse } from '@/utils/buddyFallback';
import { recordOpsMetric } from '@/lib/server/opsTelemetry';
import { requireAuthenticated } from '@/lib/auth/requireAuthenticated';
import { checkRequestRateLimit } from '@/lib/security/requestRateLimit';

const BASE_URL = 'https://api.sarvam.ai';

function needsDetailedResponse(text: string): boolean {
  const q = text.toLowerCase();
  return [
    'explain',
    'detailed',
    'detail',
    'step',
    'steps',
    'procedure',
    'why',
    'how',
    'compare',
    'difference',
    'protocol',
    'root cause',
    'checklist',
    'incident',
    'kaise',
    'kyon',
    'samjhao',
    'samjhaiye',
    'prakriya',
  ].some((k) => q.includes(k));
}

function enforceWordCap(text: string, cap: number): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return normalized;
  const words = normalized.split(' ');
  if (words.length <= cap) return normalized;
  return `${words.slice(0, cap).join(' ')}...\n\nAsk me for more details on any specific step.`;
}

function normalizeConversation(messages: Array<{ role?: string; content?: string }>): Array<{ role: 'user' | 'assistant'; content: string }> {
  const normalized = (messages || [])
    .map((m) => ({
      role: m?.role === 'assistant' || m?.role === 'bot' ? 'assistant' : m?.role === 'user' ? 'user' : null,
      content: typeof m?.content === 'string' ? m.content.trim() : '',
    }))
    .filter((m): m is { role: 'user' | 'assistant'; content: string } => !!m.role && !!m.content);

  // Sarvam requires strictly alternating roles, starting with user.
  while (normalized.length > 0 && normalized[0].role !== 'user') {
    normalized.shift();
  }

  // Merge consecutive messages of the same role
  const alternating: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  for (const msg of normalized) {
    if (alternating.length > 0 && alternating[alternating.length - 1].role === msg.role) {
      alternating[alternating.length - 1].content += `\n\n${msg.content}`;
    } else {
      alternating.push(msg);
    }
  }

  return alternating;
}

function hasReasoningLeak(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return (
    normalized.startsWith('<think>') ||
    normalized.startsWith('<analysis>') ||
    normalized.startsWith('thinking:') ||
    normalized.startsWith('reasoning:')
  );
}

function stripReasoningBlocks(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, ' ')
    .replace(/<analysis>[\s\S]*?<\/analysis>/gi, ' ')
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, ' ')
    .replace(/<\/?(think|analysis|thinking)>/gi, ' ')
    .trim();
}

function isLikelyInternalMonologue(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return /^(okay|alright|let me|i need to|the user is asking|first,? i need|i should)/.test(normalized);
}

function hasDevanagari(text: string): boolean {
  return /[\u0900-\u097F]/.test(text);
}

function buildSystemPrompt(isHinglish: boolean, isVoiceInitiated: boolean, isQuizActive: boolean = false): string {
  const basePrompt = `You are Buddy AI, a specialized assistant for:
- Chemical manufacturing industry protocols and practices
- Apprenticeship training and vocational education
- Health and safety compliance (HSE standards)
- General plant safety and chemical manufacturing processes
- GUIDANCE ONLY during active assessments (assessments are currently ${isQuizActive ? 'ACTIVE' : 'INACTIVE'})

IDENTITY & TONE:
- You are a practical, friendly safety mentor. Be direct and professional. Do not apologize excessively.
- If asked something outside these topics (e.g., cricket, movies, cooking, general trivia), respond with:
  "I'm Buddy, your assistant for chemical manufacturing, health & safety, and plant training. I'm not able to help with that topic."`;

  const languageRules = isHinglish
    ? `LANGUAGE MODE: HINGLISH (Hindi-English mix for Indian conversation)
- Always respond in Hinglish when user prefers it
- Prefer Hindi words in Devanagari script and keep technical or product terms in English
- Use natural mixed-script Hinglish such as "PPE पहनें" or "alarm तुरंत raise करें"
- Do not transliterate English technical terms into Devanagari unless the user explicitly asks for pure Hindi
- Pick ONE form per word, never duplicate
- Keep it conversational and easy to understand for Indian learners`
    : `LANGUAGE MODE: ENGLISH
- Respond entirely in clear English
- Use simple terms where possible
- Explain technical terms when needed`;

  const voiceNotes = isVoiceInitiated
    ? `VOICE INPUT NOTES:
- User spoke this question, so transcript may have:
  - Minor speech recognition errors
  - Incomplete words or abbreviations
  - Ambient noise artifacts
- Intelligently infer the user's actual intent, correct obvious errors
- Answer what they most likely meant to ask`
    : '';

  const proctoringRules = isQuizActive 
    ? `PROCTORING MODE ENABLED:
- The trainee is currently taking an assessment/quiz.
- DO NOT provide direct answers to clear multiple-choice or factual questions about safety protocols if they look like quiz questions.
- If the user asks "What is the correct answer?" or "is A correct?", politely refuse.
- Instead, give high-level reminders such as "Please focus on your assessment" or "Think about the safety principles we covered in the module."
- Do not provide explanations for specific question options while the quiz is active.`
    : '';

  return `${basePrompt}

${languageRules}

${voiceNotes}

${proctoringRules}

WORD LIMIT:
- Default: maximum 100 words. Be concise.
- EXCEPTION: For critical safety info, emergency procedures, chemical hazards, or step-by-step compliance, extend up to 200 words max.
- Never exceed 200 words under any circumstance.
- Keep responses clear, practical, and actionable.`;
}

async function callSarvamChat(payload: object, apiKey: string, timeoutMs = 18000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(`${BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'API-Subscription-Key': apiKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('SARVAM_UPSTREAM_TIMEOUT');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function POST(request: Request) {
  let latestUserMessage = '';
  let isHinglish = false;

  try {
    const auth = await requireAuthenticated(request);
    if (!auth.ok) {
      return auth.response;
    }

    const userId = auth.session.user._id.toString();
    const ip = (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim() || 'unknown';

    const limiter = checkRequestRateLimit(`sarvam_chat:${userId}:${ip}`, {
      maxAttempts: 30,
      windowMs: 60_000,
      blockMs: 5 * 60_000,
    });

    if (limiter.blocked) {
      return NextResponse.json(
        { error: 'Too many chat requests. Please wait a moment and try again.' },
        { status: 429 }
      );
    }


    const circuitStatus = await checkCircuitBreaker();
    if (circuitStatus.isBroken) {
      // Temporary fallback call
      return NextResponse.json({
        choices: [{
          message: {
            content: buildBuddyFallbackResponse(latestUserMessage, 'english')
          }
        }]
      });
    }

    const { messages, isQuizActive } = await request.json();
    const apiKey = process.env.SARVAM_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Chat service is currently unavailable.' },
        { status: 503 }
      );
    }

    // Extract language mode and voice intent from system message addendum
    let isVoiceInitiated = false;
    let filteredMessages = messages || [];

    if (filteredMessages.length > 0 && filteredMessages[0].role === 'system') {
      const sysMsg = filteredMessages[0].content || '';
      isHinglish = sysMsg.includes('[LANGUAGE_MODE: HINGLISH]');
      isVoiceInitiated = sysMsg.includes('[VOICE_INPUT]');
      // Remove client addendum since we'll include this info in proper system prompt
      filteredMessages = filteredMessages.slice(1);
    }

    filteredMessages = normalizeConversation(filteredMessages);

    latestUserMessage = [...filteredMessages]
      .reverse()
      .find((m: { role?: string; content?: string }) => m?.role === 'user')?.content ?? '';

    if (!latestUserMessage) {
      return NextResponse.json(
        {
          choices: [
            {
              message: {
                content: 'Please ask your question, and I will help with safety and training guidance.'
              }
            }
          ]
        },
        { status: 200 }
      );
    }
    const wordCap = needsDetailedResponse(latestUserMessage) ? 200 : 100;

    const sarvamStartTime = Date.now();

    // Build dynamic system prompt based on detected language, voice intent, and quiz state
    const systemPrompt = buildSystemPrompt(isHinglish, isVoiceInitiated, !!isQuizActive);

    const baseMessages = [
      { role: 'system', content: systemPrompt },
      ...filteredMessages,
    ];

    const response = await callSarvamChat(
      {
        model: 'sarvam-m',
        messages: baseMessages,
        temperature: 0.6,
        max_tokens: 500,
      },
      apiKey,
      18000
    );

    const elapsedMs = Date.now() - sarvamStartTime;

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const safeMessage =
        response.status >= 500
        ? 'Chat provider is temporarily unavailable.'
        : (typeof errData?.message === 'string' ? errData.message : 'Chat request failed.');
      return NextResponse.json({ error: safeMessage }, { status: response.status });
    }

    let data;
    try {
      data = await response.json();
    } catch {
      return NextResponse.json({ error: 'Invalid response from Sarvam API' }, { status: 500 });
    }
    
    let content = typeof data?.choices?.[0]?.message?.content === 'string'
      ? data.choices[0].message.content
      : '';
    content = stripReasoningBlocks(content);
    

    // Some responses can be empty or reasoning-only; retry once with strict final-answer instruction.
    if (!content.trim() || hasReasoningLeak(content) || isLikelyInternalMonologue(content)) {
      const retryPrompt = buildSystemPrompt(isHinglish, false, !!isQuizActive);
      const retryResponse = await callSarvamChat(
        {
          model: 'sarvam-m',
          messages: [
            {
              role: 'system',
              content: `${retryPrompt}\n\nReturn only the final answer text, no analysis, no reasoning. Maximum ${wordCap} words.`,
            },
            { role: 'user', content: latestUserMessage || 'Share a concise industrial safety tip.' },
          ],
          temperature: 0.3,
          max_tokens: 320,
        },
        apiKey,
        12000
      );

      if (retryResponse.ok) {
        const retryData = await retryResponse.json();
        if (typeof retryData?.choices?.[0]?.message?.content === 'string') {
          content = stripReasoningBlocks(retryData.choices[0].message.content);
          data.choices = retryData.choices;
          data.usage = retryData.usage ?? data.usage;
        }
      }
    }

    if (!content.trim() || hasReasoningLeak(content) || isLikelyInternalMonologue(content)) {
      const strictRetryResponse = await callSarvamChat(
        {
          model: 'sarvam-m',
          messages: [
            {
              role: 'system',
              content: `${buildSystemPrompt(isHinglish, isVoiceInitiated, !!isQuizActive)}\n\nReturn only direct answer text. Do not include <think>, analysis, or reasoning preface. Keep it practical and under ${wordCap} words.`,
            },
            { role: 'user', content: latestUserMessage || 'Share a concise industrial safety tip.' },
          ],
          temperature: 0.2,
          max_tokens: 280,
        },
        apiKey,
        12000
      );

      if (strictRetryResponse.ok) {
        const strictRetryData = await strictRetryResponse.json();
        if (typeof strictRetryData?.choices?.[0]?.message?.content === 'string') {
          content = stripReasoningBlocks(strictRetryData.choices[0].message.content);
          data.choices = strictRetryData.choices;
          data.usage = strictRetryData.usage ?? data.usage;
        }
      }
    }

    if (!content.trim() || hasReasoningLeak(content) || isLikelyInternalMonologue(content)) {
      content =
        'I am connected, but I could not generate a clean response this time. Please ask again in one line, and I will answer briefly.';
    }

    // Respect explicit language toggle: EN mode should not return Devanagari text.
    if (!isHinglish && hasDevanagari(content)) {
      const languageFixResponse = await callSarvamChat(
        {
          model: 'sarvam-m',
          messages: [
            {
              role: 'system',
              content: `${buildSystemPrompt(false, isVoiceInitiated, !!isQuizActive)}\n\nSTRICT LANGUAGE RULE: Return only English text in Roman script. Do not use Hindi/Devanagari script. Keep answer concise under ${wordCap} words.`,
            },
            { role: 'user', content: latestUserMessage || 'Share a concise industrial safety tip.' },
          ],
          temperature: 0.2,
          max_tokens: 320,
        },
        apiKey,
        10000
      );

      if (languageFixResponse.ok) {
        const languageFixData = await languageFixResponse.json();
        const forcedEnglishContent =
          typeof languageFixData?.choices?.[0]?.message?.content === 'string'
            ? stripReasoningBlocks(languageFixData.choices[0].message.content)
            : '';

        if (forcedEnglishContent.trim() && !hasDevanagari(forcedEnglishContent)) {
          content = forcedEnglishContent;
          data.choices = languageFixData.choices;
          data.usage = languageFixData.usage ?? data.usage;
        }
      }
    }

    // Apply word cap
    content = enforceWordCap(content, wordCap);
    
    // Apply markdown cleaning - CRITICAL: This is the final pass before response
    const cleanedContent = cleanResponse(content);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Sarvam Chat Proxy] Completed in ${elapsedMs}ms. Before clean: ${content.length}, after clean: ${cleanedContent.length}`);
    }
    
    data.choices[0].message.content = cleanedContent;
    if (data?.choices?.[0]?.message && 'reasoning_content' in data.choices[0].message) {
      delete data.choices[0].message.reasoning_content;
    }
    await recordCircuitBreakerSuccess();
      return NextResponse.json(data);
  } catch (error: unknown) {
      await recordCircuitBreakerFailure(error instanceof Error ? error.message : 'Unknown error');
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (process.env.NODE_ENV !== 'production') {
      console.error('[Sarvam Chat Proxy] Error:', message);
    }
    
    // More helpful error response
    if (
      message?.includes('SARVAM_UPSTREAM_TIMEOUT') ||
      message?.includes('fetch failed') ||
      message?.includes('ECONNREFUSED') ||
      message?.includes('ETIMEDOUT')
    ) {
      recordOpsMetric('sarvam_chat_timeout');
      recordOpsMetric('sarvam_chat_fallback');
      return NextResponse.json({
        choices: [
          {
            message: {
              content: cleanResponse(
                buildBuddyFallbackResponse(latestUserMessage, isHinglish ? 'hinglish' : 'english')
              ),
            },
          },
        ],
      });
    }

    recordOpsMetric('sarvam_chat_error');
    recordOpsMetric('sarvam_chat_fallback');
    return NextResponse.json({ error: 'Chat service failed.' }, { status: 500 });
  }
}
