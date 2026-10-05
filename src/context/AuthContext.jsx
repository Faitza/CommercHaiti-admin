import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const AuthContext = createContext(null)

/**
 * Session admin. Un compte n'est accepté que si sa ligne dans `users` a
 * role = 'admin' et n'est pas bloquée ; sinon il est déconnecté.
 */
export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null) // ligne users de l'admin connecté
  const [chargement, setChargement] = useState(true)

  // Lit le profil et vérifie le rôle. Retourne un message d'erreur ou null.
  async function verifierAdmin(user) {
    if (!user) {
      setAdmin(null)
      return null
    }
    const { data, error } = await supabase
      .from('users')
      .select('id, nom, email, role, is_blocked')
      .eq('id', user.id)
      .maybeSingle()
    if (error || !data || data.role !== 'admin' || data.is_blocked) {
      await supabase.auth.signOut()
      setAdmin(null)
      return 'Accès réservé aux administrateurs.'
    }
    setAdmin(data)
    return null
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      await verifierAdmin(data.session?.user)
      setChargement(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((evt) => {
      if (evt === 'SIGNED_OUT') setAdmin(null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function connexion(email, motDePasse) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: motDePasse })
    if (error) {
      // Supabase injoignable (variables Vercel absentes ou URL fausse) :
      // ne pas le confondre avec un mauvais mot de passe.
      if (!url || !anonKey || error.name === 'AuthRetryableFetchError' || error.status === 0) {
        return `Impossible de joindre Supabase (${url || 'VITE_SUPABASE_URL manquant'}). Vérifier les variables Vercel puis Redeploy.`
      }
      if (error.code === 'email_not_confirmed') return 'Email pas encore confirmé.'
      return 'Email ou mot de passe incorrect.'
    }
    return verifierAdmin(data.user)
  }

  async function deconnexion() {
    await supabase.auth.signOut()
    setAdmin(null)
  }

  return (
    <AuthContext.Provider value={{ admin, chargement, connexion, deconnexion }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
