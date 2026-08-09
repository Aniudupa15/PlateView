import { Fragment, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { MenuItem } from '../../data/menu'
import {
  ApiError,
  createMenuItem,
  deleteMenuItem,
  fetchAdminMenu,
  generateModel,
  updateMenuItem,
  type MenuItemPatchFields,
  type NewMenuItemFields,
} from '../../api'
import { clearAdminToken, getAdminToken } from '../../adminAuth'
import { MenuItemForm } from './MenuItemForm'

export function AdminDashboardPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [generateError, setGenerateError] = useState<{ id: string; message: string } | null>(null)

  const load = useCallback(async () => {
    const token = getAdminToken()
    if (!token) {
      navigate('/admin/login', { replace: true })
      return
    }
    setLoading(true)
    setError(null)
    try {
      setItems(await fetchAdminMenu(token))
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearAdminToken()
        navigate('/admin/login', { replace: true })
        return
      }
      setError('Could not load the menu.')
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    load()
  }, [load])

  function handleLogout() {
    clearAdminToken()
    navigate('/admin/login', { replace: true })
  }

  async function handleCreate(fields: NewMenuItemFields | MenuItemPatchFields, photo: File | null) {
    const token = getAdminToken()
    if (!token || !photo) return
    await createMenuItem(token, fields as NewMenuItemFields, photo)
    setShowAddForm(false)
    await load()
  }

  async function handleUpdate(id: string, fields: NewMenuItemFields | MenuItemPatchFields, photo: File | null) {
    const token = getAdminToken()
    if (!token) return
    await updateMenuItem(token, id, fields as MenuItemPatchFields, photo)
    setEditingId(null)
    await load()
  }

  async function handleGenerateModel(id: string) {
    const token = getAdminToken()
    if (!token) return
    setGeneratingId(id)
    setGenerateError(null)
    try {
      await generateModel(token, id)
      await load()
    } catch {
      setGenerateError({ id, message: 'Could not generate a 3D preview. Try again in a moment.' })
    } finally {
      setGeneratingId(null)
    }
  }

  async function handleToggleAvailable(item: MenuItem) {
    const token = getAdminToken()
    if (!token) return
    await updateMenuItem(token, item.id, { available: !item.available })
    await load()
  }

  async function handleDelete(item: MenuItem) {
    const token = getAdminToken()
    if (!token) return
    if (!window.confirm(`Delete "${item.name}" permanently? This can't be undone.`)) return
    await deleteMenuItem(token, item.id)
    await load()
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>PlateView Admin</h1>
        <button type="button" className="admin-button admin-button-secondary" onClick={handleLogout}>
          Sign out
        </button>
      </header>

      {error && <p className="admin-error">{error}</p>}

      <div className="admin-toolbar">
        <button
          type="button"
          className="admin-button"
          onClick={() => {
            setEditingId(null)
            setShowAddForm((v) => !v)
          }}
        >
          {showAddForm ? 'Close' : '+ Add dish'}
        </button>
      </div>

      {showAddForm && (
        <div className="admin-panel">
          <h2>New dish</h2>
          <MenuItemForm submitLabel="Add dish" onSubmit={handleCreate} onCancel={() => setShowAddForm(false)} />
        </div>
      )}

      {loading ? (
        <p>Loading&hellip;</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Dish</th>
              <th>Category</th>
              <th>Price</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <Fragment key={item.id}>
                <tr className={item.available === false ? 'admin-row-unavailable' : ''}>
                  <td>{item.name}</td>
                  <td>{item.category}</td>
                  <td>${item.price.toFixed(2)}</td>
                  <td>{item.available === false ? '86ed' : 'Live'}</td>
                  <td className="admin-row-actions">
                    <button
                      type="button"
                      className="admin-link-button"
                      onClick={() => {
                        setShowAddForm(false)
                        setGenerateError(null)
                        setEditingId(editingId === item.id ? null : item.id)
                      }}
                    >
                      {editingId === item.id ? 'Close' : 'Edit'}
                    </button>
                    <button type="button" className="admin-link-button" onClick={() => handleToggleAvailable(item)}>
                      {item.available === false ? 'Restore' : '86 it'}
                    </button>
                    <button
                      type="button"
                      className="admin-link-button admin-link-button-danger"
                      onClick={() => handleDelete(item)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
                {editingId === item.id && (
                  <tr>
                    <td colSpan={5}>
                      <div className="admin-panel">
                        <MenuItemForm
                          initial={item}
                          submitLabel="Save changes"
                          onSubmit={(fields, photo) => handleUpdate(item.id, fields, photo)}
                          onGenerateModel={() => handleGenerateModel(item.id)}
                          generating={generatingId === item.id}
                          generateError={generateError?.id === item.id ? generateError.message : null}
                          onCancel={() => setEditingId(null)}
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
