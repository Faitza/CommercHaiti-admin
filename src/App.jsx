import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Boutiques from './pages/Boutiques'
import BoutiqueDetail from './pages/BoutiqueDetail'
import Comptes from './pages/Comptes'
import Commandes from './pages/Commandes'
import Produits from './pages/Produits'
import Rapports from './pages/Rapports'

// Toutes les pages sauf /login exigent un admin connecté.
function Protege({ children }) {
  const { admin, chargement } = useAuth()
  if (chargement) return <div className="p-10 text-center text-slate-500">Chargement…</div>
  if (!admin) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Protege><Dashboard /></Protege>} />
      <Route path="/boutiques" element={<Protege><Boutiques /></Protege>} />
      <Route path="/boutiques/:id" element={<Protege><BoutiqueDetail /></Protege>} />
      <Route path="/vendeurs" element={<Protege><Comptes role="seller" /></Protege>} />
      <Route path="/clients" element={<Protege><Comptes role="customer" /></Protege>} />
      <Route path="/commandes" element={<Protege><Commandes /></Protege>} />
      <Route path="/produits" element={<Protege><Produits /></Protege>} />
      <Route path="/rapports" element={<Protege><Rapports /></Protege>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
