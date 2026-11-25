import { z } from "zod";

export const staffPassword = z
  .string()
  .min(10, "Password must be at least 10 characters.")
  .max(128)
  .regex(/[a-z]/, "Password needs a lowercase letter.")
  .regex(/[A-Z]/, "Password needs an uppercase letter.")
  .regex(/[0-9]/, "Password needs a number.")
  .regex(/[^A-Za-z0-9]/, "Password needs a symbol.");
