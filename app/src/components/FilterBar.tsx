import { ALL_ALLERGENS, type DietaryTag } from '../data/menu'

const DIETARY_OPTIONS: { value: DietaryTag; label: string }[] = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'gluten-free', label: 'Gluten-free' },
]

const SPICE_LABELS = ['Any spice', 'Mild', 'Medium', 'Hot']

export interface FilterState {
  dietary: DietaryTag[]
  excludeAllergens: string[]
  maxSpice: number | null
}

interface FilterBarProps {
  filters: FilterState
  onChange: (filters: FilterState) => void
}

export function FilterBar({ filters, onChange }: FilterBarProps) {
  function toggleDietary(tag: DietaryTag) {
    const has = filters.dietary.includes(tag)
    onChange({
      ...filters,
      dietary: has
        ? filters.dietary.filter((t) => t !== tag)
        : [...filters.dietary, tag],
    })
  }

  function toggleAllergen(allergen: string) {
    const has = filters.excludeAllergens.includes(allergen)
    onChange({
      ...filters,
      excludeAllergens: has
        ? filters.excludeAllergens.filter((a) => a !== allergen)
        : [...filters.excludeAllergens, allergen],
    })
  }

  function cycleSpice() {
    const next = filters.maxSpice === null ? 1 : filters.maxSpice >= 3 ? null : filters.maxSpice + 1
    onChange({ ...filters, maxSpice: next })
  }

  const hasActiveFilters =
    filters.dietary.length > 0 || filters.excludeAllergens.length > 0 || filters.maxSpice !== null

  return (
    <div className="filter-bar">
      <div className="filter-row">
        {DIETARY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`chip${filters.dietary.includes(opt.value) ? ' chip-active' : ''}`}
            aria-pressed={filters.dietary.includes(opt.value)}
            onClick={() => toggleDietary(opt.value)}
          >
            {opt.label}
          </button>
        ))}
        <button type="button" className="chip" onClick={cycleSpice} aria-pressed={filters.maxSpice !== null}>
          {SPICE_LABELS[filters.maxSpice ?? 0]}
        </button>
        {hasActiveFilters && (
          <button
            type="button"
            className="chip chip-clear"
            onClick={() => onChange({ dietary: [], excludeAllergens: [], maxSpice: null })}
          >
            Clear
          </button>
        )}
      </div>
      <div className="filter-row filter-row-allergens">
        <span className="filter-label">Exclude allergens:</span>
        {ALL_ALLERGENS.map((allergen) => (
          <button
            key={allergen}
            type="button"
            className={`chip chip-small${filters.excludeAllergens.includes(allergen) ? ' chip-active' : ''}`}
            aria-pressed={filters.excludeAllergens.includes(allergen)}
            onClick={() => toggleAllergen(allergen)}
          >
            {allergen}
          </button>
        ))}
      </div>
    </div>
  )
}
