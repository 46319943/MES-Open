import { z } from "zod/v4";

export const UsageSchema = z.object({
  // YYYY-MM, e.g. 2025-01
  month: z.string(),

  vocabQueryCount: z.number(),
  vocabQueryInputToken: z.number(),
  vocabQueryOutputToken: z.number(),
  vocabQueryCredit: z.number(),

  vocabAudioCount: z.number(),
  vocabAudioCharacters: z.number(),
  vocabAudioCredit: z.number(),

  vocabReviewCount: z.number(),
  vocabReviewInputToken: z.number(),
  vocabReviewOutputToken: z.number(),
  vocabReviewCredit: z.number(),

  conversationAudioCount: z.number(),
  conversationAudioCharacters: z.number(),
  conversationAudioCredit: z.number(),

  conversationReplyCount: z.number(),
  conversationReplyInputToken: z.number(),
  conversationReplyOutputToken: z.number(),
  conversationReplyCredit: z.number(),
});
export type Usage = z.infer<typeof UsageSchema>;

export const UserSchema = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string().min(1),
  provider: z.enum(["google", "microsoft"]),
  providerId: z.string(),
  avatar: z.string().optional(),
  role: z.enum(["visitor", "admin"]).prefault("visitor"),
  credit: z.number(),
  usages: z.array(UsageSchema),
});

export type User = z.infer<typeof UserSchema>;
