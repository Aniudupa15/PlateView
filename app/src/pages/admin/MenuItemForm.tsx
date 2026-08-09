import { useEffect, useState, type FormEvent } from 'react'
import { ALL_ALLERGENS, CATEGORIES, DIETARY_TAGS, type DietaryTag, type MenuItem, type SpiceLevel } from '../../data/menu'
import { ArViewer } from '../../components/ArViewer'
import type { MenuItemPatchFields, ModelEngine, NewMenuItemFields } from '../../api'

const SPICE_OPTIONS: { value: SpiceLevel; label: string }[] = [
  { value: 0, label: 'None' },
  { value: 1, label: 'Mild' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'Hot' },
]

type FieldValues = Omit<NewMenuItemFields, 'id'> & { id: string }

interface MenuItemFormProps {
  initial?: MenuItem
  submitLabel: string
  onSubmit: (fields: NewMenuItemFields | MenuItemPatchFields, photo: File | null) => Promise<void>
  onGenerateModel?: (engine: ModelEngine, video?: File) => Promise<void>
  generating?: boolean
  generateError?: string | null
  onCancel?: () => void
}

function emptyValues(): FieldValues {
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
    available: true,
  }
}

export function MenuItemForm({
  initial,
  submitLabel,
  onSubmit,
  onGenerateModel,
  generating,
  generateError,
  onCancel,
}: MenuItemFormProps) {
  const [values, setValues] = useState<FieldValues>(initial ?? emptyValues())
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  const [genVideo, setGenVideo] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const isEdit = Boolean(initial)

  useEffect(() => {
    if (!photo) return
    const url = URL.createObjectURL(photo)
    setPhotoPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

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

    if (!isEdit && !photo) {
      setError('A photo is required.')
      return
    }

    setSubmitting(true)
    try {
      const { id, ...rest } = values
      await onSubmit(isEdit ? rest : { id, ...rest }, photo)
    } catch {
      setError('Could not save this item. Check the fields and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const displayedPhoto = photoPreviewUrl ?? initial?.photoUrl ?? null

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
        Photo {!isEdit && '(required)'}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required={!isEdit}
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
        />
        <span className="admin-hint">JPEG, PNG, or WebP, up to 8MB.</span>
      </label>
      {displayedPhoto && <img src={displayedPhoto} alt="" className="admin-photo-preview" />}

      {isEdit && (
        <div className="admin-3d-section">
          <span className="admin-3d-label">AR / 3D preview</span>
          {initial?.modelUrl ? (
            <ArViewer modelUrl={initial.modelUrl} posterUrl={initial.photoUrl} alt={initial.name} />
          ) : (
            <p className="admin-hint">No 3D preview yet — generate one below.</p>
          )}
          {onGenerateModel && (
            <>
              <button
                type="button"
                className="admin-button admin-button-secondary"
                onClick={() => onGenerateModel('triposr')}
                disabled={generating}
              >
                {generating ? 'Generating…' : 'Generate 3D preview from photo'}
              </button>

              <div className="admin-3d-hq">
                <span className="admin-hint">
                  Higher quality, from a short walk-around video of the dish (optional — falls back to the current
                  photo if you skip this). Limited to ~1-2 free generations per day.
                </span>
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm"
                  onChange={(e) => setGenVideo(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  className="admin-button admin-button-secondary"
                  onClick={() => onGenerateModel('trellis', genVideo ?? undefined)}
                  disabled={generating}
                >
                  {generating ? 'Generating…' : 'Generate high-quality preview'}
                </button>
              </div>
            </>
          )}
          {generateError && <p className="admin-error">{generateError}</p>}
        </div>
      )}

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
