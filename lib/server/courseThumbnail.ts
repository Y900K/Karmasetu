import type { CourseThumbnailMeta } from '@/lib/courseUtils';
import { savePublicFile } from '@/lib/server/storage';

const MANAGED_THUMBNAIL_PREFIX = '/uploads/course-thumbnails/';

type ImportThumbnailOptions = {
  title: string;
  provider: CourseThumbnailMeta['provider'];
  keywords?: string[];
};

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function extensionFromContentType(contentType: string | null) {
  switch (contentType) {
    case 'image/svg+xml':
      return 'svg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return 'jpg';
  }
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function isDataUri(value: string) {
  return /^data:image\/[a-z0-9.+-]+;base64,/i.test(value);
}

function isManagedThumbnailUrl(value: string) {
  if (value.startsWith(MANAGED_THUMBNAIL_PREFIX)) {
    return true;
  }

  if (value.includes('/karmasetu/course-thumbnails/')) {
    return true;
  }

  return false;
}

export function buildFallbackThumbnailDataUri(title: string, keywords: string[] = []) {
  const normalizedTitle = title.trim() || 'Course Thumbnail';
  const mainKeyword = keywords[0]?.toLowerCase() || '';
  
  // Sector-specific colors and icons
  let accentPrimary = '#0f172a'; // Deep Navy
  let iconHtml = '';

  if (mainKeyword.includes('safety') || mainKeyword.includes('fire')) {
    accentPrimary = '#7c2d12'; // Safety Orange/Red
    iconHtml = '<circle cx="1030" cy="120" r="80" fill="rgba(255,255,255,0.1)" /><path d="M1030 80 L1060 110 L1030 140 L1000 110 Z" fill="white" opacity="0.4" />';
  } else if (mainKeyword.includes('electrical') || mainKeyword.includes('power')) {
    accentPrimary = '#1e1b4b'; // Deep Indigo
    iconHtml = '<path d="M1050 60 L1010 120 L1040 120 L1010 180" stroke="white" stroke-width="8" fill="none" opacity="0.4" />';
  } else {
    // Technical/Mechanical gear icon
    iconHtml = '<circle cx="1030" cy="120" r="60" fill="none" stroke="white" stroke-width="15" stroke-dasharray="25 15" opacity="0.3" />';
  }

  const keywordLabel = keywords
    .filter((keyword) => keyword.trim().length > 0)
    .slice(0, 3)
    .join(' • ')
    .toUpperCase();
  
  const wrappedTitle = normalizedTitle.length > 40 ? `${normalizedTitle.slice(0, 37)}...` : normalizedTitle;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
      <rect width="1200" height="675" fill="${accentPrimary}" />
      <rect width="1200" height="675" fill="url(#grad)" opacity="0.7" />
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.1" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0.4" />
        </linearGradient>
        <filter id="blur">
          <feGaussianBlur in="SourceGraphic" stdDeviation="15" />
        </filter>
      </defs>
      
      <!-- Decorative background elements -->
      <circle cx="1100" cy="100" r="300" fill="white" opacity="0.03" />
      <rect x="-100" y="400" width="400" height="400" rotate="45" fill="white" opacity="0.02" />
      
      <g>
        ${iconHtml}
      </g>

      <!-- Glass card for text -->
      <rect x="60" y="240" width="1080" height="240" rx="24" fill="rgba(0,0,0,0.3)" stroke="rgba(255,255,255,0.1)" stroke-width="2" />
      
      <text x="100" y="110" fill="white" font-size="20" font-family="sans-serif" font-weight="900" letter-spacing="8" opacity="0.5">
        KARMASETU INDUSTRIAL
      </text>
      
      <text x="100" y="340" fill="white" font-size="72" font-family="sans-serif" font-weight="900">
        ${escapeSvgText(wrappedTitle.toUpperCase())}
      </text>
      
      <text x="100" y="410" fill="#38bdf8" font-size="28" font-family="sans-serif" font-weight="700" letter-spacing="2">
        ${escapeSvgText(keywordLabel || 'INDUSTRIAL CERTIFICATION')}
      </text>
      
      <line x1="100" y1="140" x2="250" y2="140" stroke="#38bdf8" stroke-width="6" />
    </svg>
  `.trim();

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function parseDataUri(value: string) {
  const match = value.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (!match) {
    throw new Error('Invalid image data URL.');
  }

  return {
    contentType: match[1].toLowerCase(),
    buffer: Buffer.from(match[2], 'base64'),
  };
}

async function writeManagedThumbnailFile(buffer: Buffer, contentType: string | null, title: string) {
  const extension = extensionFromContentType(contentType);
  const stored = await savePublicFile({
    folder: 'course-thumbnails',
    filenameStem: title,
    extension,
    contentType: contentType || `image/${extension}`,
    buffer,
  });

  return stored.url;
}

export async function importThumbnailAsset(sourceUrl: string, options: ImportThumbnailOptions) {
  const trimmedSource = sourceUrl.trim();

  if (!trimmedSource) {
    return {
      url: '',
      thumbnailMeta: undefined as CourseThumbnailMeta | undefined,
    };
  }

  if (isManagedThumbnailUrl(trimmedSource)) {
    return {
      url: trimmedSource,
      thumbnailMeta: undefined as CourseThumbnailMeta | undefined,
    };
  }

  let buffer: Buffer;
  let contentType: string | null = null;

  if (isDataUri(trimmedSource)) {
    const parsed = parseDataUri(trimmedSource);
    buffer = parsed.buffer;
    contentType = parsed.contentType;
  } else if (isHttpUrl(trimmedSource)) {
    const response = await fetch(trimmedSource, {
      cache: 'no-store',
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`Thumbnail download failed with status ${response.status}.`);
    }

    contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error('Thumbnail source is not a valid image.');
    }

    buffer = Buffer.from(await response.arrayBuffer());
  } else {
    throw new Error('Thumbnail source must be a managed path, data URL, or http(s) URL.');
  }

  const managedUrl = await writeManagedThumbnailFile(buffer, contentType, options.title);
  const nowIso = new Date().toISOString();

  return {
    url: managedUrl,
    thumbnailMeta: {
      sourceUrl: trimmedSource,
      provider: options.provider,
      keywords: Array.isArray(options.keywords) ? options.keywords : undefined,
      importedAt: nowIso,
      generatedAt:
        options.provider === 'ai_generated' || options.provider === 'sarvam_unsplash' || options.provider === 'generated_fallback'
          ? nowIso
          : undefined,
    } satisfies CourseThumbnailMeta,
  };
}

export async function resolveThumbnailPersistence(
  rawThumbnail: unknown,
  rawThumbnailMeta: unknown,
  title: string
) {
  const thumbnail = typeof rawThumbnail === 'string' ? rawThumbnail.trim() : '';
  const thumbnailMeta =
    rawThumbnailMeta && typeof rawThumbnailMeta === 'object'
      ? (rawThumbnailMeta as CourseThumbnailMeta)
      : undefined;

  if (!thumbnail) {
    return {
      thumbnail: '',
      thumbnailMeta: undefined as CourseThumbnailMeta | undefined,
    };
  }

  if (thumbnail.startsWith('/uploads/course-thumbnails/')) {
    return {
      thumbnail,
      thumbnailMeta,
    };
  }

  const imported = await importThumbnailAsset(thumbnail, {
    title,
    provider: thumbnailMeta?.provider || 'manual_import',
    keywords: thumbnailMeta?.keywords,
  });

  return {
    thumbnail: imported.url,
    thumbnailMeta: imported.thumbnailMeta,
  };
}
