import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string({ error: "Email is required" })
    .trim()
    .toLowerCase()
    .email("Invalid email"),
  password: z.string({ error: "Password is required" }).min(1, "Password is required"),
});

export function parseLoginBody(body: unknown) {
  return loginSchema.parse(body);
}
