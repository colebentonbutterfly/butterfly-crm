import { z } from "zod";
import { CATEGORIES, LOCATIONS, CONDITIONS } from "./categories";

export const createItemSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(5000).optional().nullable(),
  category: z.enum(CATEGORIES as unknown as [string, ...string[]]).default("Miscellaneous"),
  location: z.enum(LOCATIONS as unknown as [string, ...string[]]).default("Pod 1"),
  condition: z.enum(CONDITIONS as unknown as [string, ...string[]]).optional().nullable(),
  quantity: z.number().int().min(1).max(99999).default(1),
  barcode: z.string().max(100).optional(),
  photoUrl: z.string().max(500).optional().nullable(),
  photoUrls: z.array(z.string().max(500)).max(20).optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
  boxNumber: z.string().max(100).optional().nullable(),
  boxId: z.string().max(100).optional().nullable(),
  estimatedValue: z.number().min(0).max(99999999).optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional().nullable(),
});

export const updateItemSchema = createItemSchema.partial();

export const batchTransferSchema = z.object({
  ids: z.array(z.string()).min(1).max(500),
  location: z.enum(LOCATIONS as unknown as [string, ...string[]]),
});

export const searchSchema = z.object({
  search: z.string().max(200).optional(),
  category: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  boxNumber: z.string().max(100).optional(),
  sortBy: z.enum(["name", "category", "location", "updatedAt", "createdAt", "quantity", "estimatedValue"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).max(10000).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});
