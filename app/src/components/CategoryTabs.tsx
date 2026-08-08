interface CategoryTabsProps {
  categories: readonly string[]
  active: string
  onSelect: (category: string) => void
}

export function CategoryTabs({ categories, active, onSelect }: CategoryTabsProps) {
  const options = ['All', ...categories]

  return (
    <div className="category-tabs" role="tablist" aria-label="Menu categories">
      {options.map((category) => (
        <button
          key={category}
          type="button"
          role="tab"
          aria-selected={active === category}
          className={`category-tab${active === category ? ' active' : ''}`}
          onClick={() => onSelect(category)}
        >
          {category}
        </button>
      ))}
    </div>
  )
}
