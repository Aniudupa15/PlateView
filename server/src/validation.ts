import { z } from 'zod'

export const DIETARY_TAGS = ['vegetarian', 'vegan', 'gluten-free'] as const

const idPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/

const menuItemFields = {
  id: z.string().regex(idPattern, 'id must be lowercase, hyphen-separated (e.g. "mango-sorbet")'),
  name: z.string().trim().min(1),
  category: z.string().trim().min(1),
  description: z.string().trim().min(1),
  price: z.number().positive(),
  prepTimeMinutes: z.number().int().positive(),
  dietaryTags: z.array(z.enum(DIETARY_TAGS)),
  allergens: z.array(z.string().trim().min(1)),
  spiceLevel: z.number().int().min(0).max(3),
  photoUrl: z.url(),
  modelUrl: z.union([z.url(), z.literal('')]).optional(),
  available: z.boolean(),
}

// Defaults only apply to brand-new items. The update schema below stays
// default-free so an omitted field means "leave unchanged", not "reset".
export const menuItemInputSchema = z.object(menuItemFields).extend({
  dietaryTags: menuItemFields.dietaryTags.default([]),
  allergens: menuItemFields.allergens.default([]),
  available: menuItemFields.available.default(true),
})

export const menuItemUpdateSchema = z.object(menuItemFields).partial().omit({ id: true })

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})
