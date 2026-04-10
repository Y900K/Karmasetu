import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { isAllowedWriteOrigin } from '@/lib/security/originGuard';
import { logSystemEvent } from '@/lib/utils/logger';

export async function POST(request: Request) {
  try {
    if (!isAllowedWriteOrigin(request)) {
      await logSystemEvent('WARN', 'admin_upload', 'Blocked upload request due to invalid origin.');
      return NextResponse.json({ ok: false, message: 'Invalid request origin.' }, { status: 403 });
    }

    const admin = await requireAdmin(request);
    if (!admin.ok) {
      return admin.response;
    }

    const { session } = admin;

    const data = await request.formData();
    const file = data.get('file') as File | null;

    if (!file) {
      await logSystemEvent(
        'WARN',
        'admin_upload',
        'Rejected upload due to missing file.',
        { actorAdminId: session.user._id.toString() },
        session.user._id.toString()
      );
      return NextResponse.json({ ok: false, message: 'No file uploaded. Please attach a PDF.' }, { status: 400 });
    }

    if (file.size > 1024 * 1024) { // 1MB constraint
      await logSystemEvent(
        'WARN',
        'admin_upload',
        'Rejected upload due to size limit.',
        { actorAdminId: session.user._id.toString(), size: file.size },
        session.user._id.toString()
      );
      return NextResponse.json({ ok: false, message: 'File is too large. Max size is 1MB.' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      await logSystemEvent(
        'WARN',
        'admin_upload',
        'Rejected upload due to unsupported mime type.',
        { actorAdminId: session.user._id.toString(), fileType: file.type || 'unknown' },
        session.user._id.toString()
      );
      return NextResponse.json({ ok: false, message: 'Only PDF files are allowed for course readings.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Sanitize filename and append timestamp against cache conflicts
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${Date.now()}-${safeName}`;
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'courses');
    
    // Safety check: ensure dir exists
    await mkdir(uploadDir, { recursive: true }).catch(() => {});
    
    const filepath = join(uploadDir, filename);
    await writeFile(filepath, buffer);

    await logSystemEvent(
      'INFO',
      'admin_upload',
      'Course PDF uploaded by admin.',
      { actorAdminId: session.user._id.toString(), filename, size: file.size },
      session.user._id.toString()
    );

    return NextResponse.json({ 
      ok: true, 
      url: `/uploads/courses/${filename}`,
      message: 'File embedded successfully.'
    });
  } catch (error) {
    await logSystemEvent(
      'ERROR',
      'admin_upload',
      'Upload route failed.',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );

    console.error('[Upload PDF API Error]', error);
    return NextResponse.json({ ok: false, message: 'Internal server error while uploading file.' }, { status: 500 });
  }
}
