// Petits utilitaires d'affichage.

export const htg = (n) =>
  `${Number(n ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} HTG`

export const date = (iso) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export const dateHeure = (iso) =>
  iso
    ? new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '—'

export const STATUTS_COMMANDE = {
  nouvelle: 'Nouvelle',
  acceptee: 'Acceptée',
  preparation: 'En préparation',
  livraison: 'En livraison',
  livree: 'Livrée',
  annulee: 'Annulée',
}
