import { supabase } from './supabase'

/**
 * Enregistre une action admin dans la table admin_logs.
 * Appelée après chaque action de modération (approuver, bloquer, …).
 * Une erreur de journalisation n'annule pas l'action déjà faite : elle est
 * seulement signalée dans la console.
 */
export async function logAction(action, targetId, details = {}) {
  const { data } = await supabase.auth.getUser()
  const { error } = await supabase.from('admin_logs').insert({
    admin_id: data.user?.id,
    action,
    target_id: targetId,
    details,
  })
  if (error) console.error('admin_logs :', error.message)
}
