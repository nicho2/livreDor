import { z } from "zod";

export const guestbookEntrySchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  message: z.string().trim().min(1).max(5000),
  formatting: z.object({
    font: z.enum(["sans", "serif", "hand", "mono"]),
    size: z.enum(["sm", "md", "lg"]),
    align: z.enum(["left", "center", "right"]),
    color: z.enum(["ink", "blue", "green", "burgundy", "gold"]),
    bold: z.boolean(),
    italic: z.boolean(),
  }),
});

export const memorySchema = z
  .object({
    displayName: z.string().trim().min(1).max(80),
    title: z.string().trim().max(120).optional().or(z.literal("")),
    body: z.string().trim().min(1).max(8000),
    occurredOn: z.iso.date({ error: "La date est invalide." }).optional().or(z.literal("")),
    yearFrom: z.number().int().min(1900).max(2200).nullable(),
    yearTo: z.number().int().min(1900).max(2200).nullable(),
  })
  .refine((value) => !value.occurredOn || (value.yearFrom === null && value.yearTo === null), {
    message: "Choisissez une date exacte ou une période, pas les deux.",
    path: ["occurredOn"],
  })
  .refine((value) => !value.yearFrom || !value.yearTo || value.yearFrom <= value.yearTo, {
    message: "La période est incohérente.",
    path: ["yearTo"],
  });

export const presignSchema = z.object({
  projectId: z.string().uuid(),
  memoryId: z.string().uuid(),
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(150),
  sizeBytes: z.number().int().positive(),
});
