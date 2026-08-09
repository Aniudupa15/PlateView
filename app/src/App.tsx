import { Route, Routes } from 'react-router-dom'
import { MenuPage } from './pages/MenuPage'
import { ItemPage } from './pages/ItemPage'
import { AdminLoginPage } from './pages/admin/AdminLoginPage'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { MenuProvider } from './context/MenuContext'

function App() {
  return (
    <MenuProvider>
      <Routes>
        <Route path="/" element={<MenuPage />} />
        <Route path="/item/:itemId" element={<ItemPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
      </Routes>
    </MenuProvider>
  )
}

export default App
