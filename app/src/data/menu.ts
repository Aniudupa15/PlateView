export type DietaryTag = 'vegetarian' | 'vegan' | 'gluten-free'

export type SpiceLevel = 0 | 1 | 2 | 3

export interface MenuItem {
  id: string
  name: string
  category: string
  description: string
  price: number
  prepTimeMinutes: number
  dietaryTags: DietaryTag[]
  allergens: string[]
  spiceLevel: SpiceLevel
  photoUrl: string
  /** Compressed .glb asset for the AR/3D preview. Omitted items fall back to photoUrl. */
  modelUrl?: string
  available?: boolean
}

export const CATEGORIES = ['Starters', 'Mains', 'Desserts', 'Drinks'] as const

export const DIETARY_TAGS: DietaryTag[] = ['vegetarian', 'vegan', 'gluten-free']

export const ALL_ALLERGENS = [
  'gluten',
  'dairy',
  'nuts',
  'shellfish',
  'egg',
  'soy',
] as const
