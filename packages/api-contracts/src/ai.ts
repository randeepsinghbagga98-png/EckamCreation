import { z } from "zod";

export const aiCreateConversationSchema = z.object({
  channel: z.string().default("web"),
  title: z.string().max(200).optional(),
});

export const aiMessageCreateSchema = z.object({
  content: z.string().min(1).max(8000),
});

export const aiMessageDtoSchema = z.object({
  id: z.string(),
  role: z.enum(["USER", "ASSISTANT", "SYSTEM", "TOOL"]),
  content: z.string(),
  createdAt: z.string().datetime(),
});

export const aiConversationDtoSchema = z.object({
  id: z.string(),
  channel: z.string(),
  title: z.string().nullable(),
  messages: z.array(aiMessageDtoSchema).optional(),
});

export type AiConversationDto = z.infer<typeof aiConversationDtoSchema>;
