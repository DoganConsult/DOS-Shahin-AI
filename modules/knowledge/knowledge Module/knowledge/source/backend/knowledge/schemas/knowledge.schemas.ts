/**
 * Knowledge Module Zod Schemas
 * @owner knowledge
 */
import { z } from 'zod';

export const CreateArticleSchema = z.object({
  title: z.string().min(3).max(255),
  contentRaw: z.string().min(1),
  contentHtml: z.string().min(1),
  categoryId: z.string().uuid().optional(),
});

export const UpdateArticleSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  contentRaw: z.string().min(1).optional(),
  contentHtml: z.string().min(1).optional(),
  categoryId: z.string().uuid().optional(),
});

export const TransitionArticleSchema = z.object({
  toStatus: z.enum(['draft', 'in_review', 'published', 'archived', 'retired']),
});

export const CreateCategorySchema = z.object({
  name: z.string().min(2).max(255),
  parentId: z.string().uuid().optional(),
  description: z.string().optional(),
});

export const CreateLinkSchema = z.object({
  entityType: z.string(),
  entityId: z.string().uuid(),
});
