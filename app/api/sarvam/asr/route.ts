import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { recordOpsMetric } from '@/lib/server/opsTelemetry';
import { requireAuthenticated } from '@/lib/auth/requireAuthenticated';

const BASE_URL = 'https://api.sarvam.ai';
const ASR_TIMEOUT_MS = 22000;

function safeError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function withCorrelation<T extends NextResponse>(response: T, correlationId: string): T {
  response.headers.set('x-correlation-id', correlationId);
  return response;
}

export async function POST(request: Request) {
  const correlationId = request.headers.get('x-correlation-id')?.trim() || randomUUID();

  try {
    const auth = await requireAuthenticated(request);
    if (!auth.ok) {
      return withCorrelation(auth.response, correlationId);
    }

    const formData = await request.formData();
    const apiKey = process.env.SARVAM_API_KEY;
    
    if (!apiKey) {
      return withCorrelation(safeError('Speech-to-text service is currently unavailable.', 503), correlationId);
    }

    // Get the file from formData
    const file = formData.get('file');
    const preferredLanguage = formData.get('language_code');
    if (!file) {
      return withCorrelation(safeError('No audio file provided.', 400), correlationId);
    }

    // Create a new FormData for Sarvam API
    const sarvamFormData = new FormData();
    const incomingFile = file as File;
    const incomingType = incomingFile.type || 'application/octet-stream';
    const normalizedType = incomingType.includes('webm') ? 'audio/webm' : incomingType;
    const normalizedName = incomingFile.name || 'audio_input.webm';

    // Some providers reject codec-suffixed mime values like audio/webm;codecs=opus.
    const normalizedFile =
      normalizedType === incomingType
        ? incomingFile
        : new File([incomingFile], normalizedName, { type: normalizedType });

    sarvamFormData.append('file', normalizedFile);
    
    // Set model to saaras:v3 for auto-detect
    sarvamFormData.append('model', 'saaras:v3');
    sarvamFormData.append('mode', 'transcribe');
    if (typeof preferredLanguage === 'string' && /^(hi-IN|en-IN)$/.test(preferredLanguage)) {
      sarvamFormData.append('language_code', preferredLanguage);
    } else {
      sarvamFormData.append('language_code', 'unknown'); // auto-detect
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ASR_TIMEOUT_MS);

    const response = await fetch(`${BASE_URL}/speech-to-text`, {
      method: 'POST',
      headers: {
        'API-Subscription-Key': apiKey,
      },
      body: sarvamFormData,
      signal: controller.signal,
    }).finally(() => {
      clearTimeout(timeoutId);
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const safeMessage =
        response.status >= 500
          ? 'Speech-to-text provider is temporarily unavailable.'
          : (typeof errData?.message === 'string' ? errData.message : 'Speech-to-text request failed.');
      return withCorrelation(safeError(safeMessage, response.status), correlationId);
    }

    const data = await response.json();
    
    // Normalize response to always have a transcript field.
    if (!data.transcript && data.text) {
      data.transcript = data.text;
    }
    if (typeof data.transcript !== 'string') {
      data.transcript = '';
    }

    // Empty transcript is not a server error; caller can fallback gracefully.
    if (!data.transcript.trim()) {
      return withCorrelation(NextResponse.json({
        ...data,
        transcript: '',
        emptyTranscript: true,
      }), correlationId);
    }

    return withCorrelation(NextResponse.json(data), correlationId);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      recordOpsMetric('sarvam_asr_timeout');
      return withCorrelation(safeError('Speech-to-text request timed out. Please retry.', 504), correlationId);
    }

    recordOpsMetric('sarvam_asr_error');
    return withCorrelation(safeError('Speech-to-text service failed.', 500), correlationId);
  }
}
