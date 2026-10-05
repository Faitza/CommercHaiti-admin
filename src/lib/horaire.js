// Horaire d'une boutique, même règle que ShopModel.estOuverteA dans l'app
// mobile (colonnes ajoutées par migration_shop_hours.sql). Heure de Haïti.

export const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

const minutes = (hhmm) => {
  const [h, m] = String(hhmm ?? '').split(':').map(Number)
  return Number.isInteger(h) && Number.isInteger(m) ? h * 60 + m : null
}

export const heure = (hhmm) => (hhmm ? String(hhmm).slice(0, 5) : null)

export function aUnHoraire(b) {
  return Boolean(b.horaire_ouverture && b.horaire_fermeture && b.jours_ouverture?.length)
}

// Jour (1 = lundi … 7 = dimanche) et minutes depuis minuit à Port-au-Prince.
function maintenantHaiti(t = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Port-au-Prince', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(t).map((p) => [p.type, p.value]),
  )
  const jour = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(parts.weekday) + 1
  return { jour, min: Number(parts.hour) * 60 + Number(parts.minute) }
}

// Renvoie { ouverte, raison } : raison explique d'où vient le statut.
export function statutOuverture(b, t = new Date()) {
  if (b.is_open_manuel === true || b.is_open_manuel === false) {
    return { ouverte: b.is_open_manuel, raison: 'forcé par le vendeur' }
  }
  if (!aUnHoraire(b)) return { ouverte: b.is_open !== false, raison: 'sans horaire' }

  const ouv = minutes(b.horaire_ouverture)
  const ferm = minutes(b.horaire_fermeture)
  if (ouv == null || ferm == null) return { ouverte: b.is_open !== false, raison: 'sans horaire' }
  const { jour, min } = maintenantHaiti(t)
  const travaille = (j) => j >= 1 && j <= JOURS.length && b.jours_ouverture.includes(JOURS[j - 1])

  const ouverte = ouv < ferm
    ? travaille(jour) && min >= ouv && min < ferm
    : (travaille(jour) && min >= ouv) || (travaille(jour === 1 ? 7 : jour - 1) && min < ferm)
  return { ouverte, raison: 'selon l\'horaire' }
}
