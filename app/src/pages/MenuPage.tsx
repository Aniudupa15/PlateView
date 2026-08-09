import { useMemo, useState } from 'react'
import { SearchBar } from '../components/SearchBar'
import { CategoryTabs } from '../components/CategoryTabs'
import { FilterBar, type FilterState } from '../components/FilterBar'
import { MenuItemCard } from '../components/MenuItemCard'
import { CATEGORIES, type MenuItem } from '../data/menu'
import { useMenu } from '../context/useMenu'

const EMPTY_FILTERS: FilterState = { dietary: [], excludeAllergens: [], maxSpice: null }

export function MenuPage() {
  const { items: menuItems, loading, error } = useMenu()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('All')
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase()
    return menuItems.filter((item) => {
      if (category !== 'All' && item.category !== category) return false
      if (query && !item.name.toLowerCase().includes(query) && !item.description.toLowerCase().includes(query)) {
        return false
      }
      if (filters.dietary.some((tag) => !item.dietaryTags.includes(tag))) return false
      if (filters.excludeAllergens.some((allergen) => item.allergens.includes(allergen))) return false
      if (filters.maxSpice !== null && item.spiceLevel > filters.maxSpice) return false
      return true
    })
  }, [menuItems, search, category, filters])

  const itemsByCategory = useMemo(() => {
    const groups = new Map<string, MenuItem[]>()
    for (const cat of CATEGORIES) {
      const items = filteredItems.filter((item) => item.category === cat)
      if (items.length > 0) groups.set(cat, items)
    }
    return groups
  }, [filteredItems])

  return (
    <div className="menu-page">
      <header className="menu-header">
        <h1>PlateView</h1>
        <p className="menu-subtitle">Table 12 &middot; Scan, browse, and see it before you order</p>
      </header>

      <div className="menu-controls">
        <SearchBar value={search} onChange={setSearch} />
        <CategoryTabs categories={CATEGORIES} active={category} onSelect={setCategory} />
        <FilterBar filters={filters} onChange={setFilters} />
      </div>

      {loading ? (
        <p className="empty-state">Loading the menu&hellip;</p>
      ) : error ? (
        <p className="empty-state">{error}</p>
      ) : filteredItems.length === 0 ? (
        <p className="empty-state">No dishes match your filters. Try clearing a filter.</p>
      ) : (
        Array.from(itemsByCategory.entries()).map(([cat, items]) => (
          <section key={cat} className="menu-category" aria-label={cat}>
            <h2>{cat}</h2>
            <div className="item-grid">
              {items.map((item) => (
                <MenuItemCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
