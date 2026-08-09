import { useState, type FormEvent } from 'react'
import { ALL_ALLERGENS, CATEGORIES, DIETARY_TAGS, type DietaryTag, type MenuItem, type SpiceLevel } from '../../data/menu'

const SPICE_OPTIONS: { value: SpiceLevel; label: string }[] = [
  { value: 0, label: 'None' },
  { value: 1, label: 'Mild' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'Hot' },
]

export type MenuItemFormValues = Omit<MenuItem, 'modelUrl'> & { modelUrl: string }

interface MenuItemFormProps {
  initial?: MenuItem
  submitLabel: string
  onSubmit: (values: MenuItemFormValues) => Promise<void>
  onCancel?: () => void
}

function emptyValues(): MenuItemFormValues {
  return {
    id: '',
    name: '',
    category: CATEGORIES[0],
    description: '',
    price: 0,
    prepTimeMinutes: 5,
    dietaryTags: [],
    allergens: [],
    spiceLevel: 0,
    photoUrl: '',
    modelUrl: '',
    available: true,
  }
}

export function MenuItemForm({ initial, submitLabel, onSubmit, onCancel }: MenuItemFormProps) {
  const [values, setValues] = useState<MenuItemFormValues>(
    initial ? { ...initial, modelUrl: initial.modelUrl ?? '' } : emptyValues(),
  )
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const isEdit = Boolean(initial)

  function toggleDietary(tag: DietaryTag) {
    setValues((v) => ({
      ...v,
      dietaryTags: v.dietaryTags.includes(tag) ? v.dietaryTags.filter((t) => t !== tag) : [...v.dietaryTags, tag],
    }))
  }

  function toggleAllergen(allergen: string) {
    setValues((v) => ({
      ...v,
      allergens: v.allergens.includes(allergen) ? v.allergens.filter((a) => a !== allergen) : [...v.allergens, allergen],
    }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit(values)
    } catch {
      setError('Could not save this item. Check the fields and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="admin-form">
      <label>
        Dish ID (slug)
        <input
          required
          disabled={isEdit}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          title="lowercase letters, numbers, and hyphens only"
          value={values.id}
          onChange={(e) => setValues((v) => ({ ...v, id: e.target.value }))}
          placeholder="e.g. mango-sorbet"
        />
      </label>

      <label>
        Name
        <input
          required
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
        />
      </label>

      <label>
        Category
        <select value={values.category} onChange={(e) => setValues((v) => ({ ...v, category: e.target.value }))}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label>
        Description
        <textarea
          required
          rows={2}
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
        />
      </label>

      <div className="admin-form-row">
        <label>
          Price ($)
          <input
            type="number"
            required
            min={0}
            step="0.01"
            value={values.price}
            onChange={(e) => setValues((v) => ({ ...v, price: Number(e.target.value) }))}
          />
        </label>
        <label>
          Prep time (min)
          <input
            type="number"
            required
            min={1}
            step="1"
            value={values.prepTimeMinutes}
            onChange={(e) => setValues((v) => ({ ...v, prepTimeMinutes: Number(e.target.value) }))}
          />
        </label>
        <label>
          Spice level
          <select
            value={values.spiceLevel}
            onChange={(e) => setValues((v) => ({ ...v, spiceLevel: Number(e.target.value) as SpiceLevel }))}
          >
            {SPICE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="admin-fieldset">
        <legend>Dietary tags</legend>
        {DIETARY_TAGS.map((tag) => (
          <label key={tag} className="admin-checkbox">
            <input type="checkbox" checked={values.dietaryTags.includes(tag)} onChange={() => toggleDietary(tag)} />
            {tag}
          </label>
        ))}
      </fieldset>

      <fieldset className="admin-fieldset">
        <legend>Allergens</legend>
        {ALL_ALLERGENS.map((allergen) => (
          <label key={allergen} className="admin-checkbox">
            <input
              type="checkbox"
              checked={values.allergens.includes(allergen)}
              onChange={() => toggleAllergen(allergen)}
            />
            {allergen}
          </label>
        ))}
      </fieldset>

      <label>
        Photo URL
        <input
          type="url"
          required
          value={values.photoUrl}
          onChange={(e) => setValues((v) => ({ ...v, photoUrl: e.target.value }))}
          placeholder="https://…"
        />
      </label>

      <label>
        3D model URL (.glb) — optional
        <input
          type="url"
          value={values.modelUrl}
          onChange={(e) => setValues((v) => ({ ...v, modelUrl: e.target.value }))}
          placeholder="https://…/dish.glb"
        />
        <span className="admin-hint">Leave blank to show the photo instead of an AR/3D preview.</span>
      </label>

      {isEdit && (
        <label className="admin-checkbox">
          <input
            type="checkbox"
            checked={values.available}
            onChange={(e) => setValues((v) => ({ ...v, available: e.target.checked }))}
          />
          Available on the menu (uncheck to 86 this item)
        </label>
      )}

      {error && <p className="admin-error">{error}</p>}

      <div className="admin-form-actions">
        <button type="submit" className="admin-button" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="admin-button admin-button-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
