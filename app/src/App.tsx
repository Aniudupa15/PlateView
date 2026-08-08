import { Route, Routes } from 'react-router-dom'
import { MenuPage } from './pages/MenuPage'
import { ItemPage } from './pages/ItemPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<MenuPage />} />
      <Route path="/item/:itemId" element={<ItemPage />} />
    </Routes>
  )
}

export default App
