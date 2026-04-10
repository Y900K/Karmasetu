type WriteOriginOptions = {
  requireOrigin?: boolean;
};

export function isAllowedWriteOrigin(request: Request, options?: WriteOriginOptions): boolean {
  const requireOrigin = options?.requireOrigin === true;
  const origin = request.headers.get('origin');
  if (!origin) {
    // Some non-browser clients may not send Origin.
    return !requireOrigin;
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
