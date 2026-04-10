export function isAllowedWriteOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) {
    // Some non-browser clients may not send Origin.
    return true;
  }

  let originHost = '';
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }

  const requestHost =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    '';

  if (!requestHost) {
    return true;
  }

  if (originHost === requestHost) {
    return true;
  }

  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (configuredAppUrl) {
    try {
      const configuredHost = new URL(configuredAppUrl).host;
      if (originHost === configuredHost) {
        return true;
      }
    } catch {
      // Ignore malformed configured URL.
    }
  }

  return false;
}
