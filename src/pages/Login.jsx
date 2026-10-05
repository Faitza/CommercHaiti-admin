import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// /login — connexion réservée aux comptes users.role = 'admin'.
export default function Login() {
  const { admin, connexion } = useAuth()
  const naviguer = useNavigate()
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState(null)
  const [envoi, setEnvoi] = useState(false)

  if (admin) return <Navigate to="/dashboard" replace />

  async function soumettre(e) {
    e.preventDefault()
    setEnvoi(true)
    setErreur(null)
    const msg = await connexion(email.trim(), motDePasse)
    setEnvoi(false)
    if (msg) setErreur(msg)
    else naviguer('/dashboard')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-navy to-navy-dark px-4">
      <img src="/logo.png" alt="CommercHaiti" className="mb-6 h-36" />
      <form onSubmit={soumettre} className="w-full max-w-sm rounded-xl bg-white p-8 shadow-2xl">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-navy">Espace administrateur</h1>
          <p className="mt-1 text-sm text-slate-500">Connectez-vous pour gérer la plateforme.</p>
        </div>

        {erreur && <div className="mb-4 rounded-lg bg-rouge/10 px-3 py-2 text-sm text-rouge">{erreur}</div>}

        <label className="block text-sm font-semibold text-slate-700">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 mb-4 w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-navy"
        />
        <label className="block text-sm font-semibold text-slate-700">Mot de passe</label>
        <input
          type="password"
          required
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          className="mt-1 mb-6 w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-navy"
        />
        <button
          disabled={envoi}
          className="w-full rounded-lg bg-navy py-2.5 font-semibold text-white hover:bg-navy-dark disabled:opacity-60"
        >
          {envoi ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
      <p className="mt-6 text-xs text-white/40">© {new Date().getFullYear()} CommercHaiti · Accès réservé</p>
    </div>
  )
}
