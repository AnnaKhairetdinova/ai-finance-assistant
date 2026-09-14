import { z } from "zod";

export const registerSchema = z.object({
  email: z.string({ error: "Email is required" }).email("Invalid email"),
  password: z
    .string({ error: "Password is required" })
    .min(8, "Password must be at least 8 characters"),
});

export function parseRegisterBody(body: unknown) {
  return registerSchema.parse(body);
}
