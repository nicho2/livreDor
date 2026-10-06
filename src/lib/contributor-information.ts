import { z } from "zod";

export const organizerMessageSchema = z.object({
  displayName: z.string().trim().min(1, "Indiquez votre nom affiché.").max(120),
  category: z.enum(["help", "media", "rights"]),
  body: z.string().trim().min(1, "Écrivez votre message.").max(5000),
}).strict();

// Three calendar months, clamped to the last day of the target month (UTC).
export function retentionDeadline(eventDate: string | null): string | null {
  if (!eventDate || !z.iso.date().safeParse(eventDate).success) return null;
  const [year, month, day] = eventDate.split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1 + 3, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(day, lastDay));
  return first.toISOString().slice(0, 10);
}
