// Regroupement des commandes (« Grouper par ») pour la page Commandes et
// la fiche boutique.
import { htg, STATUTS_COMMANDE } from './format'

export const GROUPEMENTS = [
  ['aucun', 'Aucun'],
  ['jour', 'Jour'],
  ['mois', 'Mois'],
  ['boutique', 'Boutique'],
  ['client', 'Client'],
  ['statut', 'Statut'],
  ['zone', 'Zone de livraison'],
]

// Dates calculées à l'heure d'Haïti, comme dans l'app.
const FUSEAU = 'America/Port-au-Prince'
const cleJour = (iso) => new Date(iso).toLocaleDateString('en-CA', { timeZone: FUSEAU }) // AAAA-MM-JJ

function libelleJour(iso) {
  const k = cleJour(iso)
  const texte = new Date(iso).toLocaleDateString('fr-FR', {
    timeZone: FUSEAU, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  if (k === cleJour(new Date())) return `Aujourd'hui, ${texte}`
  if (k === cleJour(Date.now() - 864e5)) return `Hier, ${texte}`
  return texte.charAt(0).toUpperCase() + texte.slice(1)
}

function libelleMois(iso) {
  const t = new Date(iso).toLocaleDateString('fr-FR', { timeZone: FUSEAU, month: 'long', year: 'numeric' })
  return t.charAt(0).toUpperCase() + t.slice(1)
}

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`

/**
 * Regroupe des commandes déjà triées du plus récent au plus ancien.
 * `noms` : { client: {id: nom}, boutique: {id: nom} }.
 * Renvoie null pour « aucun », sinon [{ cle, titre, resume, lignes }] pour <Tableau groupes>.
 */
export function grouperCommandes(commandes, mode, noms) {
  if (mode === 'aucun') return null
  const lire = {
    jour: (c) => [cleJour(c.created_at), () => libelleJour(c.created_at)],
    mois: (c) => [cleJour(c.created_at).slice(0, 7), () => libelleMois(c.created_at)],
    boutique: (c) => [c.shop_id, () => noms.boutique?.[c.shop_id] ?? 'Boutique inconnue'],
    client: (c) => [c.client_id, () => noms.client?.[c.client_id] ?? 'Client inconnu'],
    statut: (c) => [c.statut, () => STATUTS_COMMANDE[c.statut] ?? c.statut],
    zone: (c) => [c.zone || '', () => c.zone || 'Zone non renseignée'],
  }[mode]

  const groupes = new Map()
  for (const c of commandes) {
    const [k, titre] = lire(c)
    if (!groupes.has(k)) groupes.set(k, { k, titre: titre(), lignes: [] })
    groupes.get(k).lignes.push(c)
  }

  const liste = [...groupes.values()]
  const ordreStatut = Object.keys(STATUTS_COMMANDE)
  if (mode === 'jour' || mode === 'mois') liste.sort((a, b) => b.k.localeCompare(a.k))
  else if (mode === 'statut') liste.sort((a, b) => ordreStatut.indexOf(a.k) - ordreStatut.indexOf(b.k))
  else liste.sort((a, b) => a.titre.localeCompare(b.titre, 'fr'))

  return liste.map((g) => {
    const annulees = g.lignes.filter((c) => c.statut === 'annulee').length
    const litiges = g.lignes.filter((c) => c.litige_statut === 'ouvert').length
    const somme = (cmds) => cmds.reduce((s, c) => s + Number(c.total), 0)
    const toutesAnnulees = annulees === g.lignes.length
    const resume = [
      // Groupe fait seulement de commandes annulées (ex. statut « Annulée ») :
      // on montre le montant annulé plutôt que « 0 HTG hors annulées ».
      toutesAnnulees
        ? `${pluriel(annulees, 'commande')} annulée${annulees > 1 ? 's' : ''}`
        : pluriel(g.lignes.length, 'commande'),
      toutesAnnulees
        ? htg(somme(g.lignes))
        : `${htg(somme(g.lignes.filter((c) => c.statut !== 'annulee')))}${annulees ? ' hors annulées' : ''}`,
      annulees && !toutesAnnulees ? pluriel(annulees, 'annulée') : null,
      litiges ? `${pluriel(litiges, 'litige')} ouvert${litiges > 1 ? 's' : ''}` : null,
    ].filter(Boolean).join(' · ')
    return { cle: `${mode}:${g.k}`, titre: g.titre, resume, lignes: g.lignes }
  })
}

// Le choix est mémorisé dans ce navigateur ; sans stockage (navigation
// privée), il vaut seulement pour la visite en cours.
export function lireGroupement(cle) {
  try {
    const v = localStorage.getItem(cle)
    return GROUPEMENTS.some(([k]) => k === v) ? v : 'aucun'
  } catch {
    return 'aucun'
  }
}

export function sauverGroupement(cle, valeur) {
  try {
    localStorage.setItem(cle, valeur)
  } catch {
    // stockage indisponible
  }
}
