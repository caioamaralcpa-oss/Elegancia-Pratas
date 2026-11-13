import { z } from 'zod';
export const ideaFormats = ['post','carrossel','stories','reels','promocao'] as const;
export const ideaSchema = z.object({
 campaignName:z.string().min(2).max(120),
 summary:z.string().min(2).max(700),
 ideas:z.array(z.object({
   format:z.enum(ideaFormats), title:z.string().min(2).max(120), copy:z.string().min(2).max(1200),
   visual:z.string().max(700), script:z.string().max(1000), cta:z.string().min(2).max(240)
 }).strict()).min(1).max(8)
}).strict();
export type CampaignInspiration=z.infer<typeof ideaSchema>;
export const briefSchema=z.object({
 collectionId:z.string().uuid(), planId:z.string().uuid().nullable(), eventKey:z.string().max(120),
 goal:z.string().trim().min(2).max(700), audience:z.string().trim().max(300)
}).strict();
export type CampaignBrief=z.infer<typeof briefSchema>;
