import { z } from "zod";

export const projectDetailsSchema = z.object({
  title: z.string().trim().min(1, "Indiquez un titre.").max(160),
  subjectName: z.string().trim().min(1, "Indiquez le nom de la personne ou de l'événement.").max(120),
  description: z.string().trim().max(3000, "La présentation est limitée à 3 000 caractères."),
  eventDate: z.union([z.iso.date({ error: "La date de l'événement est invalide." }), z.literal("")]),
}).strict();

export const organizerEmailSchema = z.string().trim().toLowerCase().pipe(z.email({ error: "Indiquez une adresse email valide." }).max(254));
export const createProjectSchema = projectDetailsSchema.extend({
  slug: z.string().trim().min(3).max(80).regex(/^[a-z0-9][a-z0-9-]{2,79}$/, "Le lien doit contenir 3 à 80 lettres minuscules, chiffres ou tirets."),
  organizerEmail: z.union([organizerEmailSchema, z.literal("")]).optional(),
});
export type ProjectDetails = z.infer<typeof projectDetailsSchema>;

// Read native controls at submission (not a potentially stale React event snapshot).
export function projectDetailsFromForm(form: FormData): ProjectDetails {
  const text = (key: string) => { const value = form.get(key); return typeof value === "string" ? value : ""; };
  return { title: text("title"), subjectName: text("subjectName"), description: text("description"), eventDate: text("eventDate") };
}

export function projectDetailsRow(details: ProjectDetails) {
  return { title: details.title, subject_name: details.subjectName, description: details.description || null, event_date: details.eventDate || null };
}
