/**
 * Contact form schema, shared by the browser form AND the back end (Vercel function api/contact.ts).
 * Keep this file server-safe: only `zod` and plain exports. No import.meta.env, no browser APIs,
 * no "@/..." path aliases (relative imports only), no React.
 */
import { z } from "zod";

export const PROJECT_TYPES = ["new_pool", "pool_spa", "renovation", "outdoor_living", "other"] as const;
export const BUDGETS = ["under_75k", "75k_125k", "125k_200k", "200k_plus"] as const;

export const PROJECT_TYPE_LABELS: Record<(typeof PROJECT_TYPES)[number], string> = {
  new_pool: "New pool",
  pool_spa: "Pool + spa",
  renovation: "Renovation",
  outdoor_living: "Outdoor living",
  other: "Other",
};
export const BUDGET_LABELS: Record<(typeof BUDGETS)[number], string> = {
  under_75k: "Under $75k",
  "75k_125k": "$75k–$125k",
  "125k_200k": "$125k–$200k",
  "200k_plus": "$200k+",
};

const phoneRe = /^[+()\-.\s\d]{7,20}$/;

/** Request body schema. Mirrored in docs/api-contract.md; the back end validates with this same schema. */
export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(100, "That name is too long."),
  email: z.string().trim().min(1, "Please enter your email.").email("Please enter a valid email address.").max(254),
  phone: z
    .string()
    .trim()
    .min(1, "Please enter your phone number.")
    .refine((v) => phoneRe.test(v) && v.replace(/\D/g, "").length >= 10 && v.replace(/\D/g, "").length <= 15, "Please enter a valid phone number."),
  projectType: z.enum(PROJECT_TYPES, { errorMap: () => ({ message: "Please choose a project type." }) }),
  budget: z.enum(BUDGETS, { errorMap: () => ({ message: "Please choose a budget range." }) }),
  message: z.string().trim().max(2000, "Please keep it under 2,000 characters.").optional(),
  /** Honeypot: hidden from humans, so it should be empty. The server silently drops submissions where it is filled. */
  company_website: z.string().max(200).optional(),
});

export type ContactPayload = z.infer<typeof contactSchema>;

export type ContactResponse =
  | { ok: true }
  | { ok: false; error: { code: string; message: string; fields?: Partial<Record<keyof ContactPayload, string>> } };
