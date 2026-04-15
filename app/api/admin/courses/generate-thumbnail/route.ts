import { NextResponse } from 'next/server';
import { generateThumbnailKeywords } from '@/lib/server/adminCourseAI';
import { buildFallbackThumbnailDataUri, importThumbnailAsset } from '@/lib/server/courseThumbnail';
import { requireSecureAdminMutation } from '@/lib/security/requireSecureAdminMutation';
import { logSystemEvent } from '@/lib/utils/logger';

const INDUSTRIAL_MAPPING: Record<string, string> = {
  safety: '1581091226825-a6a2a5aee158',
  chemical: '1532187863486-3f9e2354653e',
  forklift: '1586528116311-ad8dd3c8310d',
  fire: '1516641396056-0ce60a85d49f',
  electrical: '1505798577917-a65157d3320a',
  warehouse: '1586528116311-ad8dd3c8310d',
  lab: '1532187863486-3f9e2354653e',
  robot: '1518770660439-4636190af475',
  boiler: '1581092918056-0c4c3acd3789',
  loto: '1517048676732-d65bc937f952',
  maintenance: '1517048676732-d65bc937f952',
};

const POLLINATIONS_TIMEOUT_MS = 30000;

/**
 * Generate a unique AI thumbnail using Pollinations.ai (free, no API key required).
 * Returns the downloaded image URL or null if generation fails.
 */
async function generateAIThumbnail(title: string, keywords: string[]): Promise<string | null> {
  const prompt = encodeURIComponent(
    `professional industrial training course thumbnail, ${title}, ${keywords.join(', ')}, modern clean design, dark blue and teal color scheme, high quality, photorealistic`
  );

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const imageUrl = `https://image.pollinations.ai/prompt/${prompt}?width=1200&height=675&nologo=true&seed=${Date.now() + attempt}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), POLLINATIONS_TIMEOUT_MS);

      const response = await fetch(imageUrl, {
        signal: controller.signal,
        headers: { Accept: 'image/*' },
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`[Thumbnail] Pollinations returned HTTP ${response.status} on attempt ${attempt + 1}`);
        continue;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType?.startsWith('image/')) {
        console.warn(`[Thumbnail] Pollinations returned non-image content-type: ${contentType}`);
        continue;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length < 5000) {
        console.warn(`[Thumbnail] Pollinations image too small (${buffer.length} bytes) — likely error`);
        continue;
      }

      // Return the URL — importThumbnailAsset will download and store it
      return imageUrl;
    } catch (error) {
      console.warn(`[Thumbnail] Pollinations.ai failed on attempt ${attempt + 1}:`, error instanceof Error ? error.message : 'Unknown');
    }
  }
  return null;
}

function resolveSourceCandidates(keywords: string[]) {
  const primaryKeyword = keywords.find((keyword) => INDUSTRIAL_MAPPING[keyword]) || keywords[0] || 'safety';
  const photoId = INDUSTRIAL_MAPPING[primaryKeyword];
  const candidates = [
    photoId ? `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&q=80&w=1200` : '',
    `https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1200&keyword=${encodeURIComponent(
      keywords.join(',')
    )}`,
  ];

  return candidates.filter((candidate, index, all) => candidate && all.indexOf(candidate) === index);
}

async function importGeneratedThumbnail(title: string, keywords: string[]) {
  let lastError: Error | null = null;

  // Step 1: Try Pollinations.ai (AI-generated unique image)
  const aiUrl = await generateAIThumbnail(title, keywords);
  if (aiUrl) {
    try {
      return await importThumbnailAsset(aiUrl, {
        title,
        provider: 'ai_generated',
        keywords,
      });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('AI thumbnail import failed');
      console.warn('[Thumbnail] AI image download failed, falling back to Unsplash:', lastError.message);
    }
  }

  // Step 2: Try Unsplash (hardcoded industrial photo mapping)
  for (const sourceUrl of resolveSourceCandidates(keywords)) {
    try {
      return await importThumbnailAsset(sourceUrl, {
        title,
        provider: 'sarvam_unsplash',
        keywords,
      });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown thumbnail import failure.');
    }
  }

  // Step 3: SVG fallback (always works)
  if (lastError) {
    console.warn('[Generate Thumbnail] Falling back to generated SVG:', lastError.message);
  }

  return importThumbnailAsset(buildFallbackThumbnailDataUri(title, keywords), {
    title,
    provider: 'generated_fallback',
    keywords,
  });
}

export async function POST(request: Request) {
  try {
    const admin = await requireSecureAdminMutation(request, 'admin_generate_thumbnail');
    if (!admin.ok) {
      return admin.response;
    }

    const { session } = admin;

    const body = (await request.json().catch(() => ({}))) as { title?: string };
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const apiKey = process.env.SARVAM_API_KEY;

    if (!title) {
      await logSystemEvent(
        'WARN',
        'admin_generate_thumbnail',
        'Rejected thumbnail generation due to missing title.',
        { actorAdminId: session.user._id.toString() },
        session.user._id.toString()
      );
      return NextResponse.json({ ok: false, message: 'Title is required.' }, { status: 400 });
    }

    const keywords = await generateThumbnailKeywords(title, apiKey);
    const imported = await importGeneratedThumbnail(title, keywords);

    await logSystemEvent(
      'INFO',
      'admin_generate_thumbnail',
      'Thumbnail generated by admin.',
      { actorAdminId: session.user._id.toString(), title, provider: imported.thumbnailMeta?.provider || 'unknown' },
      session.user._id.toString()
    );

    return NextResponse.json({
      ok: true,
      url: imported.url,
      thumbnailMeta: imported.thumbnailMeta,
      keywords,
    });
  } catch (error) {
    await logSystemEvent(
      'ERROR',
      'admin_generate_thumbnail',
      'Thumbnail generation route failed.',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );

    const details = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Generate Thumbnail] Error:', details);
    return NextResponse.json(
      { ok: false, message: 'Thumbnail generation failed.', details: process.env.NODE_ENV === 'development' ? details : undefined },
      { status: 500 }
    );
  }
}
