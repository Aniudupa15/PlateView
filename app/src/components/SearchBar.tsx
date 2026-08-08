interface SearchBarProps {
  value: string
  onChange: (value: string) => void
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="search-bar">
      <svg viewBox="0 0 24 24" aria-hidden="true" className="search-icon">
        <path
          fill="currentColor"
          d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5Zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14Z"
        />
      </svg>
      <input
        type="search"
        inputMode="search"
        placeholder="Search the menu..."
        aria-label="Search the menu"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
