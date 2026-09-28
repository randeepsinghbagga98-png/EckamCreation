import { z } from "zod";

export const registerBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(120).optional(),
});

export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

export const staffLoginBodySchema = loginBodySchema;

export const sessionDtoSchema = z.object({
  kind: z.literal("customer"),
  userId: z.string(),
  email: z.string().email().nullable(),
  name: z.string().nullable(),
});

export const staffSessionDtoSchema = z.object({
  kind: z.literal("staff"),
  staffUserId: z.string(),
  email: z.string().email(),
  name: z.string(),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
});

export const addressCreateSchema = z.object({
  type: z.enum(["SHIPPING", "BILLING", "BOTH"]).optional(),
  fullName: z.string().min(1),
  phone: z.string().optional(),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().optional(),
  postalCode: z.string().min(1),
  countryId: z.string().min(1),
  regionId: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export const consentCreateSchema = z.object({
  type: z.enum([
    "EMAIL_MARKETING",
    "EMAIL_TRANSACTIONAL",
    "WHATSAPP_MARKETING",
    "WHATSAPP_TRANSACTIONAL",
    "SMS",
    "ANALYTICS",
  ]),
  status: z.enum(["GRANTED", "REVOKED", "PENDING"]),
  source: z.string().min(1).max(120),
});

export type SessionDto = z.infer<typeof sessionDtoSchema>;
export type StaffSessionDto = z.infer<typeof staffSessionDtoSchema>;
