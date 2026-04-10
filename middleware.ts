import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE = 'ks_session';

/**
 * Edge Proxy — runs BEFORE any page renders (Next.js 16 convention).
 *
 * Purpose:
 *  Redirect unauthenticated users away from /admin/* and /trainee/* routes
 *  before the HTML is generated (prevents "content flash").
 *
 * Note: This only checks for cookie existence. Actual session validity
 * is verified server-side by resolveSessionUser().
 *
 * Important: We do NOT redirect authenticated users away from /login
 * because the logout flow clears the cookie asynchronously, and redirecting
 * from /login while the old cookie is still present causes a race condition
 * (user gets sent to dashboard instead of seeing login page).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;

  // Protected admin routes — redirect to login if no session
  if (pathname.startsWith('/admin') && !sessionToken) {
    return NextResponse.redirect(new URL('/login?role=admin', request.url));
  }

  // Protected trainee routes — redirect to login if no session
  if (pathname.startsWith('/trainee') && !sessionToken) {
    return NextResponse.redirect(new URL('/login?role=trainee', request.url));
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: ['/admin/:path*', '/trainee/:path*'],
};
