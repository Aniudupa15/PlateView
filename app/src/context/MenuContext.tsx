import { useEffect, useState, type ReactNode } from 'react'
import { fetchMenu } from '../api'
import { MenuContext, type MenuContextValue } from './menuContextObject'
import type { MenuItem } from '../data/menu'

export function MenuProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetchMenu()
      .then((data) => {
        if (!cancelled) setItems(data)
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load the menu. Check your connection and try again.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const value: MenuContextValue = { items, loading, error }

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>
}
