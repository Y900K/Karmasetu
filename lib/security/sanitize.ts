/**
 * Simple and safe HTML escaping utility to protect against Cross-Site Scripting (XSS).
 * It replaces characters that have special meaning in HTML with their entity equivalents.
 */
export function sanitizeHTML(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}
