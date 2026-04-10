import { NextResponse } from 'next/server';
import { requireSecureAdminMutation } from '@/lib/security/requireSecureAdminMutation';
import { logSystemEvent } from '@/lib/utils/logger';
import { savePublicFile } from '@/lib/server/storage';

export async function POST(request: Request) {
  try {
    const admin = await requireSecureAdminMutation(request, 'admin_upload');
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

    const extension = (file.name.split('.').pop() || 'pdf').toLowerCase();
    const stored = await savePublicFile({
      folder: 'courses',
      filenameStem: file.name,
      extension,
      contentType: 'application/pdf',
      buffer,
    });

    await logSystemEvent(
      'INFO',
      'admin_upload',
      'Course PDF uploaded by admin.',
      { actorAdminId: session.user._id.toString(), storage: stored.storage, size: file.size },
      session.user._id.toString()
    );

    return NextResponse.json({ 
      ok: true, 
      url: stored.url,
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
