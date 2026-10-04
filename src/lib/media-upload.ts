import { authenticatedFetch } from "@/lib/api-client";
import { validateMediaFile } from "@/lib/media";

export const MEDIA_ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/mp4,audio/wav,audio/webm,audio/ogg,application/pdf";

function putFile(url: string, file: File, progress: (value: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.timeout = 15 * 60 * 1000;
    xhr.upload.onprogress = event => { if (event.lengthComputable) progress(Math.round(event.loaded / event.total * 100)); };
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Envoi refusé par le stockage. Réessayez."));
    xhr.onerror = () => reject(new Error("Envoi interrompu. Vérifiez votre connexion."));
    xhr.ontimeout = () => reject(new Error("L'envoi a pris trop longtemps. Réessayez."));
    xhr.send(file);
  });
}

export async function uploadMemoryMedia(projectId: string, memoryId: string, file: File, progress: (value: number) => void, request = authenticatedFetch) {
  const valid = validateMediaFile(file.name, file.type, file.size);
  if (!valid.ok) throw new Error(valid.error);
  let mediaId: string | undefined;
  try {
    const prepared = await request("/api/media/presign", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, memoryId, filename: file.name, mimeType: file.type, sizeBytes: file.size }),
    });
    const reservation = await prepared.json();
    mediaId = reservation.mediaId;
    await putFile(reservation.uploadUrl, file, progress);
    await request(`/api/media/${mediaId}`, { method: "POST" });
  } catch (error) {
    // Only clean up this failed reservation; successful files are retained for retries.
    if (mediaId) await request(`/api/media/${mediaId}`, { method: "DELETE" }).catch(() => {});
    throw error;
  }
}
