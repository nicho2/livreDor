const projectPath = /^\/p\/[a-z0-9][a-z0-9-]{2,79}(?:\/(?:contribute|guestbook|wall|timeline|information|admin|memories\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}))?$(?![\s\S])/;

// Only known local project routes may be used as post-login destinations.
// Never pass arbitrary query parameters to router.replace (open redirect/XSS).
export function getAuthReturnPath(candidate: unknown, fallback = "/"): string {
  // Preserve only the exact shared invitation credential through OTP.
  if (typeof candidate === "string") {
    const match = candidate.match(/^(\/p\/[a-z0-9][a-z0-9-]{2,79})\?invitation=([a-f0-9]{64})$/);
    if (match) return candidate;
  }
  if (typeof candidate === "string" && (candidate === "/all" || candidate === "/nouveau" || projectPath.test(candidate))) return candidate;
  return fallback === "/all" || fallback === "/nouveau" || projectPath.test(fallback) ? fallback : "/";
}

export function getAuthHref(returnTo: string): string {
  const destination = getAuthReturnPath(returnTo);
  return destination === "/" ? "/auth" : `/auth?next=${encodeURIComponent(destination)}`;
}
