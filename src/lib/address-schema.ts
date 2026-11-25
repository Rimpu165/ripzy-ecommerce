import { z } from "zod";

export const MAX_ADDRESSES = 10;

export const addressSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required.").max(80),
  phone: z.string().trim().regex(/^[+]?[0-9 -]{7,15}$/, "Enter a valid phone number."),
  addressLine1: z.string().trim().min(3, "Address line 1 is required.").max(150),
  addressLine2: z.string().trim().max(150).optional().nullable(),
  city: z.string().trim().min(2, "City is required.").max(60),
  state: z.string().trim().min(2, "State is required.").max(60),
  postalCode: z.string().trim().regex(/^\d{6}$/, "PIN code must be exactly 6 digits."),
  isDefault: z.boolean().optional(),
});
