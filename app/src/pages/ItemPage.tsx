import { Link, useParams } from 'react-router-dom'
import { useMenu } from '../context/useMenu'
import { ArViewer } from '../components/ArViewer'

export function ItemPage() {
  const { itemId } = useParams()
  const { items: menuItems, loading, error } = useMenu()
  const item = menuItems.find((i) => i.id === itemId)

  if (loading) {
    return (
      <div className="item-page">
        <Link to="/" className="back-link">
          &larr; Back to menu
        </Link>
        <p>Loading&hellip;</p>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="item-page">
        <Link to="/" className="back-link">
          &larr; Back to menu
        </Link>
        <p>{error ?? 'Item not found.'}</p>
      </div>
    )
  }

  return (
    <div className="item-page">
      <Link to="/" className="back-link">
        &larr; Back to menu
      </Link>
      {item.modelUrl ? (
        <ArViewer modelUrl={item.modelUrl} posterUrl={item.photoUrl} alt={item.name} />
      ) : (
        <img src={item.photoUrl} alt="" className="item-page-photo" />
      )}
      <h1>{item.name}</h1>
      <p className="item-page-price">${item.price.toFixed(2)}</p>
      <p>{item.description}</p>
      {!item.modelUrl && <p className="item-page-note">AR/3D preview coming soon for this dish.</p>}
    </div>
  )
}
