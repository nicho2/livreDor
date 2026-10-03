const projectPath = /^\/p\/[a-z0-9][a-z0-9-]{2,79}(?:\/(?:contribute|wall|timeline|admin))?$(?![\s\S])/;

// Only known local project routes may be used as post-login destinations.
// Never pass arbitrary query parameters to router.replace (open redirect/XSS).
export function getAuthReturnPath(candidate: unknown, fallback = "/"): string {
  if (typeof candidate === "string" && projectPath.test(candidate)) return candidate;
  return projectPath.test(fallback) ? fallback : "/";
}

export function getAuthHref(returnTo: string): string {
  const destination = getAuthReturnPath(returnTo);
  return destination === "/" ? "/auth" : `/auth?next=${encodeURIComponent(destination)}`;
}
