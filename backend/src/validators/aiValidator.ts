import { z } from "zod";

const insightsDateSchema = z.iso.date({ error: "Invalid date" });

export const aiInsightsBodySchema = z
  .object({
    from: z.string({ error: "from is required" }).pipe(insightsDateSchema),
    to: z.string({ error: "to is required" }).pipe(insightsDateSchema),
  })
  .refine((data) => data.from <= data.to, {
    error: "from cannot be later than to",
  });

export function parseAIInsightsBody(body: unknown) {
  return aiInsightsBodySchema.parse(body);
}
