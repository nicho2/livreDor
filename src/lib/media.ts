import type { MediaKind } from "@/types/database";

export const MEDIA_LIMITS: Record<MediaKind, number> = {
  image: 15 * 1024 * 1024,
  video: 200 * 1024 * 1024,
  audio: 50 * 1024 * 1024,
  document: 25 * 1024 * 1024,
};

const MIME_GROUPS: Record<MediaKind, string[]> = {
  image: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
  video: ["video/mp4", "video/webm", "video/quicktime"],
  audio: ["audio/mpeg", "audio/mp4", "audio/wav", "audio/webm", "audio/ogg"],
  document: ["application/pdf"],
};

const MIME_EXTENSIONS: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/heic": ["heic"],
  "image/heif": ["heif"],
  "video/mp4": ["mp4"],
  "video/webm": ["webm"],
  "video/quicktime": ["mov"],
  "audio/mpeg": ["mp3"],
  "audio/mp4": ["m4a", "mp4"],
  "audio/wav": ["wav"],
  "audio/webm": ["webm"],
  "audio/ogg": ["ogg", "oga"],
  "application/pdf": ["pdf"],
};

export function inferMediaKind(mimeType: string): MediaKind | null {
  for (const [kind, mimes] of Object.entries(MIME_GROUPS)) {
    if (mimes.includes(mimeType)) return kind as MediaKind;
  }
  return null;
}

export function validateMedia(mimeType: string, sizeBytes: number) {
  const kind = inferMediaKind(mimeType);
  if (!kind) return { ok: false as const, error: "Type de fichier non autorisé." };
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > MEDIA_LIMITS[kind]) {
    return { ok: false as const, error: "Taille de fichier non autorisée." };
  }
  return { ok: true as const, kind };
}

export function validateMediaFile(filename: string, mimeType: string, sizeBytes: number) {
  const media = validateMedia(mimeType, sizeBytes);
  if (!media.ok) return media;

  const extension = filename.trim().toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  if (!extension || !MIME_EXTENSIONS[mimeType]?.includes(extension)) {
    return { ok: false as const, error: "L'extension ne correspond pas au type de fichier." };
  }

  return media;
}

export function safeFilename(filename: string) {
  return filename
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 120) || "media";
}
