import { Link } from 'react-router-dom'
import type { MenuItem } from '../data/menu'

const SPICE_LABELS = ['', 'Mild', 'Medium', 'Hot']

export function MenuItemCard({ item }: { item: MenuItem }) {
  return (
    <Link to={`/item/${item.id}`} className="item-card">
      <img src={item.photoUrl} alt="" className="item-card-photo" loading="lazy" />
      <div className="item-card-body">
        <div className="item-card-heading">
          <h3>{item.name}</h3>
          <span className="item-card-price">${item.price.toFixed(2)}</span>
        </div>
        <p className="item-card-description">{item.description}</p>
        <div className="item-card-tags">
          {item.modelUrl && <span className="tag tag-ar">AR</span>}
          {item.dietaryTags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
          {item.spiceLevel > 0 && <span className="tag tag-spice">{SPICE_LABELS[item.spiceLevel]}</span>}
          <span className="tag tag-time">{item.prepTimeMinutes} min</span>
        </div>
      </div>
    </Link>
  )
}
