import { createHash } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { put } from '@vercel/blob';

type SavePublicFileInput = {
  folder: string;
  filenameStem: string;
  extension: string;
  contentType: string;
  buffer: Buffer;
};

type SavePublicFileResult = {
  url: string;
  storage: 'vercel-blob' | 'local';
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'asset';
}

function normalizeFolder(folder: string) {
  return folder
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .join('/');
}

function ensureExtension(extension: string) {
  const normalized = extension.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return normalized || 'bin';
}

function buildFilename(stem: string, extension: string, buffer: Buffer) {
  const hash = createHash('sha1').update(buffer).digest('hex').slice(0, 16);
  return `${slugify(stem)}-${hash}.${ensureExtension(extension)}`;
}

async function saveWithLocalDisk(folder: string, filename: string, buffer: Buffer): Promise<SavePublicFileResult> {
  const diskDir = join(process.cwd(), 'public', 'uploads', folder);
  const diskPath = join(diskDir, filename);

  await mkdir(diskDir, { recursive: true });
  await writeFile(diskPath, buffer);

  return {
    url: `/uploads/${folder}/${filename}`,
    storage: 'local',
  };
}

async function saveWithBlob(folder: string, filename: string, contentType: string, buffer: Buffer): Promise<SavePublicFileResult> {
  const blobPath = `karmasetu/${folder}/${filename}`;
  const uploaded = await put(blobPath, buffer, {
    access: 'public',
    contentType,
    addRandomSuffix: false,
  });

  return {
    url: uploaded.url,
    storage: 'vercel-blob',
  };
}

export async function savePublicFile(input: SavePublicFileInput): Promise<SavePublicFileResult> {
  const folder = normalizeFolder(input.folder);
  const filename = buildFilename(input.filenameStem, input.extension, input.buffer);

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      return await saveWithBlob(folder, filename, input.contentType, input.buffer);
    } catch (error) {
      console.warn('[storage] Blob upload failed, using local fallback:', error instanceof Error ? error.message : error);
    }
  }

  return saveWithLocalDisk(folder, filename, input.buffer);
}
