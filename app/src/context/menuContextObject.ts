import { createContext } from 'react'
import type { MenuItem } from '../data/menu'

export interface MenuContextValue {
  items: MenuItem[]
  loading: boolean
  error: string | null
}

export const MenuContext = createContext<MenuContextValue | null>(null)
