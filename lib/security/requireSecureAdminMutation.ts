import { NextResponse } from 'next/server';
import { requireAdmin, type AdminGuardResult } from '@/lib/auth/requireAdmin';
import { isAllowedWriteOrigin } from '@/lib/security/originGuard';
import { logSystemEvent } from '@/lib/utils/logger';

export async function requireSecureAdminMutation(
  request: Request,
  source: string
): Promise<AdminGuardResult> {
  if (!isAllowedWriteOrigin(request)) {
    await logSystemEvent('WARN', source, 'Blocked write request due to invalid origin.');
    return {
      ok: false,
      response: NextResponse.json({ ok: false, message: 'Invalid request origin.' }, { status: 403 }),
    };
  }

  return requireAdmin(request);
}
