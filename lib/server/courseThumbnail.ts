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
  const accentSeed = normalizedTitle
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const accentPairs = [
    ['#0f766e', '#0f172a'],
    ['#1d4ed8', '#172554'],
    ['#b45309', '#1f2937'],
    ['#be123c', '#111827'],
  ] as const;
  const [accentPrimary, accentSecondary] = accentPairs[accentSeed % accentPairs.length];
  const keywordLabel = keywords
    .filter((keyword) => keyword.trim().length > 0)
    .slice(0, 3)
    .join(' • ')
    .toUpperCase();
  const wrappedTitle = normalizedTitle.length > 42 ? `${normalizedTitle.slice(0, 39)}...` : normalizedTitle;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${accentPrimary}" />
          <stop offset="100%" stop-color="${accentSecondary}" />
        </linearGradient>
      </defs>
      <rect width="1200" height="675" fill="url(#bg)" rx="36" />
      <circle cx="1030" cy="108" r="170" fill="rgba(255,255,255,0.08)" />
      <circle cx="170" cy="565" r="220" fill="rgba(255,255,255,0.06)" />
      <rect x="72" y="78" width="340" height="42" rx="21" fill="rgba(255,255,255,0.12)" />
      <text x="96" y="105" fill="#e2e8f0" font-size="24" font-family="Arial, sans-serif" font-weight="700" letter-spacing="3">
        KARMASETU COURSE
      </text>
      <text x="72" y="300" fill="#ffffff" font-size="66" font-family="Arial, sans-serif" font-weight="700">
        ${escapeSvgText(wrappedTitle)}
      </text>
      <text x="72" y="368" fill="#cbd5e1" font-size="30" font-family="Arial, sans-serif" font-weight="500">
        ${escapeSvgText(keywordLabel || 'INDUSTRIAL TRAINING')}
      </text>
      <text x="72" y="540" fill="#bfdbfe" font-size="26" font-family="Arial, sans-serif" font-weight="600">
        Auto-generated fallback thumbnail
      </text>
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
        options.provider === 'sarvam_unsplash' || options.provider === 'generated_fallback'
          ? nowIso
          : undefined,
    } satisfies CourseThumbnailMeta,
  };
}
