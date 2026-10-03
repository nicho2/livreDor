import { z } from "zod";
const limitSchema = z.string().trim().regex(/^(0|[1-9][0-9]{0,4})$/)
  .transform(Number).refine((value) => value <= 10000);
// Instance-wide, including closed/archived: retained media still occupy storage.
export function projectLimit(value: string | undefined): number {
  return limitSchema.parse(value === undefined ? "3" : value);
}
