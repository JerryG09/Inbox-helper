import { z } from "zod";

// Six initial candidate-message intents. Labels match the approved Hi-fi V1.1 prototype's `intents` list verbatim.
export const INTENTS = [
  { id: "application_status", label: "Application status", definition: "Asks where their application stands, whether a decision was made, or when they will hear back." },
  { id: "interview_scheduling", label: "Interview scheduling", definition: "Asks to book, confirm, move or cancel an interview, or reports a conflict with an interview time." },
  { id: "job_information", label: "Job information", definition: "Asks about the role itself: duties, location/remote policy, salary, benefits, team, start date." },
  { id: "documentation_technical", label: "Documentation / technical", definition: "Reports a problem with documents, uploads, portals or meeting links, or asks which documents are required." },
  { id: "withdrawal", label: "Withdrawal", definition: "States they want to withdraw or stop being considered." },
  { id: "other_unclear", label: "Other / unclear", definition: "None of the above, too vague to act on, or not a candidate enquiry." },
] as const;

export const INTENT_IDS = INTENTS.map((i) => i.id) as [IntentId, ...IntentId[]];
export type IntentId = (typeof INTENTS)[number]["id"];

export const IntentIdSchema = z.enum(INTENT_IDS);

// Typed contract for one model classification. Anything that fails this is recorded as a schema failure, never coerced.
export const ClassificationSchema = z
  .object({
    primary_intent: IntentIdSchema,
    secondary_intents: z.array(IntentIdSchema).max(5),
    needs_attention: z.boolean(),
    attention_reasons: z.array(z.string().min(1).max(200)).max(5),
    summary: z.string().min(1).max(300),
  })
  .strict()
  .refine((c) => !c.secondary_intents.includes(c.primary_intent), { message: "secondary_intents must not repeat primary_intent" })
  .refine((c) => new Set(c.secondary_intents).size === c.secondary_intents.length, { message: "secondary_intents must be unique" });

export type Classification = z.infer<typeof ClassificationSchema>;
