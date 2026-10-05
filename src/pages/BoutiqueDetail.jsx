import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { logAction } from '../lib/adminLog'
import { date, dateHeure, htg, STATUTS_COMMANDE } from '../lib/format'
import { JOURS, aUnHoraire, heure, statutOuverture } from '../lib/horaire'
import { Badge, Bouton, Carte, Erreur, Chargement, Tableau } from '../components/ui'
import Icone from '../components/Icone'

const STATUTS_BOUTIQUE = {
  en_attente: ['ambre', 'En attente'],
  approuvee: ['vert', 'Approuvée'],
  suspendue: ['rouge', 'Suspendue'],
}

const TONS_COMMANDE = {
  nouvelle: 'navy', acceptee: 'navy', preparation: 'ambre', livraison: 'ambre', livree: 'vert', annulee: 'gris',
}

const NON_RENSEIGNE = <span className="text-slate-400">Non renseigné</span>

function Section({ titre, children, droite }) {
  return (
    <Carte className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{titre}</h2>
        {droite}
      </div>
      {children}
    </Carte>
  )
}

function Ligne({ libelle, children }) {
  return (
    <div className="grid grid-cols-3 gap-3 py-2 text-sm border-b border-slate-100 last:border-0">
      <dt className="text-slate-500">{libelle}</dt>
      <dd className="col-span-2 text-slate-800">{children}</dd>
    </div>
  )
}

function Indicateur({ titre, valeur, detail }) {
  return (
    <Carte className="p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{titre}</div>
      <div className="mt-1 text-2xl font-bold text-navy">{valeur}</div>
      {detail && <div className="mt-0.5 text-xs text-slate-400">{detail}</div>}
    </Carte>
  )
}

const LIBELLES_ACTION = {
  approuver_boutique: 'Boutique approuvée',
  suspendre_boutique: 'Boutique suspendue',
  reactiver_boutique: 'Boutique réactivée',
  bloquer_vendeur: 'Compte du vendeur bloqué',
  debloquer_vendeur: 'Compte du vendeur débloqué',
  masquer_produit: 'Produit masqué',
  reafficher_produit: 'Produit réaffiché',
  supprimer_produit: 'Produit supprimé',
  ouvrir_litige: 'Litige ouvert',
  resoudre_litige: 'Litige résolu',
}

// /boutiques/:id — toutes les informations d'une boutique et son historique.
export default function BoutiqueDetail() {
  const { id } = useParams()
  const [d, setD] = useState(null)
  const [erreur, setErreur] = useState(null)
  const [enCours, setEnCours] = useState(false)
  const [toutAfficher, setToutAfficher] = useState(false)

  useEffect(() => {
    ;(async () => {
      const shop = await supabase.from('shops').select('*').eq('id', id).maybeSingle()
      if (shop.error) return setErreur(shop.error.message)
      if (!shop.data) return setErreur('Boutique introuvable.')
      const b = shop.data

      const [proprio, produits, commandes, avis] = await Promise.all([
        supabase.from('users').select('*').eq('id', b.proprietaire_id).maybeSingle(),
        supabase.from('products').select('*').eq('shop_id', id).order('created_at', { ascending: false }),
        supabase.from('orders').select('*').eq('shop_id', id).order('created_at', { ascending: false }),
        supabase.from('reviews').select('*').eq('shop_id', id).order('created_at', { ascending: false }).limit(50),
      ])
      const err = [proprio, produits, commandes, avis].find((r) => r.error)
      if (err) return setErreur(err.error.message)

      // Actions admin sur la boutique, son vendeur, ses produits et ses commandes.
      const cibles = [b.id, b.proprietaire_id, ...produits.data.map((p) => p.id), ...commandes.data.map((c) => c.id)]
        .slice(0, 200)
      const clients = [...new Set([...commandes.data.map((c) => c.client_id), ...avis.data.map((a) => a.client_id)])]
      const [logs, noms] = await Promise.all([
        supabase.from('admin_logs').select('*').in('target_id', cibles).order('created_at', { ascending: false }).limit(100),
        clients.length ? supabase.from('users').select('id, nom').in('id', clients) : { data: [] },
      ])

      setD({
        b,
        proprio: proprio.data,
        produits: produits.data,
        commandes: commandes.data,
        avis: avis.data,
        logs: logs.data ?? [],
        noms: Object.fromEntries((noms.data ?? []).map((u) => [u.id, u.nom])),
      })
    })()
  }, [id])

  async function changerStatut(statut, action) {
    const { b } = d
    if (statut === 'suspendue' && !confirm(`Suspendre la boutique « ${b.nom} » ?`)) return
    setEnCours(true)
    const { error } = await supabase.from('shops').update({ statut_validation: statut }).eq('id', b.id)
    if (error) setErreur(error.message)
    else {
      await logAction(action, b.id, { nom: b.nom, avant: b.statut_validation, apres: statut })
      setD((x) => ({
        ...x,
        b: { ...x.b, statut_validation: statut },
        logs: [{ id: `local-${Date.now()}`, action, target_id: b.id, created_at: new Date().toISOString(), details: {} }, ...x.logs],
      }))
    }
    setEnCours(false)
  }

  const calc = useMemo(() => {
    if (!d) return null
    const { produits, commandes } = d
    const livrees = commandes.filter((c) => c.statut === 'livree')
    const categories = {}
    for (const p of produits) {
      if (!p.categorie) continue
      categories[p.categorie] ??= new Set()
      if (p.sous_categorie) categories[p.categorie].add(p.sous_categorie)
    }
    return {
      enRupture: produits.filter((p) => p.stock === 0).length,
      masques: produits.filter((p) => p.masque_admin).length,
      enCours: commandes.filter((c) => !['livree', 'annulee'].includes(c.statut)).length,
      ca: livrees.reduce((s, c) => s + Number(c.total), 0),
      litiges: commandes.filter((c) => c.litige_statut === 'ouvert').length,
      categories: Object.entries(categories).sort(([a], [b]) => a.localeCompare(b)),
      activite: historique(d),
    }
  }, [d])

  if (erreur) {
    return (
      <>
        <Retour />
        <Erreur message={erreur} />
      </>
    )
  }
  if (!d) return <Chargement />

  const { b, proprio, produits, commandes, avis, noms } = d
  const [ton, libelle] = STATUTS_BOUTIQUE[b.statut_validation] ?? ['gris', b.statut_validation]
  const ouverture = statutOuverture(b)
  const horaireConnu = 'horaire_ouverture' in b
  const activite = toutAfficher ? calc.activite : calc.activite.slice(0, 12)

  return (
    <>
      <Retour />

      {/* En-tête */}
      <Carte className="mb-6 p-5">
        <div className="flex flex-wrap items-start gap-4">
          {b.logo_url ? (
            <img src={b.logo_url} alt="" className="h-16 w-16 rounded-xl object-cover border border-slate-200" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-navy/10 text-xl font-bold text-navy">
              {b.nom.split(/\s+/).slice(0, 2).map((m) => m[0]?.toUpperCase()).join('')}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-navy">{b.nom}</h1>
              <Badge ton={ton}>{libelle}</Badge>
              <Badge ton={ouverture.ouverte ? 'vert' : 'gris'}>{ouverture.ouverte ? 'Ouverte' : 'Fermée'}</Badge>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
              <span>Code {b.shop_code}</span>
              <span className="inline-flex items-center gap-1">
                <Icone nom="etoile" className="h-3.5 w-3.5 text-ambre" />
                {Number(b.rating).toFixed(1)} ({b.total_avis} avis)
              </span>
              <span>Créée le {date(b.created_at)}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {b.statut_validation !== 'approuvee' && (
              <Bouton variante="vert" disabled={enCours}
                onClick={() => changerStatut('approuvee', b.statut_validation === 'suspendue' ? 'reactiver_boutique' : 'approuver_boutique')}>
                {b.statut_validation === 'suspendue' ? 'Réactiver' : 'Approuver'}
              </Bouton>
            )}
            {b.statut_validation !== 'suspendue' && (
              <Bouton variante="rouge" disabled={enCours} onClick={() => changerStatut('suspendue', 'suspendre_boutique')}>
                Suspendre
              </Bouton>
            )}
          </div>
        </div>
      </Carte>

      {/* Indicateurs */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Indicateur titre="Produits" valeur={produits.length}
          detail={`${calc.enRupture} en rupture · ${calc.masques} masqué(s)`} />
        <Indicateur titre="Commandes" valeur={commandes.length} detail={`${calc.enCours} en cours`} />
        <Indicateur titre="Chiffre d'affaires" valeur={htg(calc.ca)} detail="commandes livrées" />
        <Indicateur titre="Litiges ouverts" valeur={calc.litiges} />
        <Indicateur titre="Avis" valeur={b.total_avis} detail={`note moyenne ${Number(b.rating).toFixed(1)} / 5`} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Section titre="Informations">
            <dl>
              <Ligne libelle="Description">{b.description?.trim() || NON_RENSEIGNE}</Ligne>
              <Ligne libelle="Catégories de la boutique">
                {b.categories?.length ? b.categories.join(', ') : NON_RENSEIGNE}
              </Ligne>
              <Ligne libelle="Produits vendus">
                {calc.categories.length ? (
                  <ul className="space-y-1">
                    {calc.categories.map(([cat, sous]) => (
                      <li key={cat}>
                        <span className="font-medium">{cat}</span>
                        {sous.size > 0 && <span className="text-slate-500"> : {[...sous].sort().join(', ')}</span>}
                      </li>
                    ))}
                  </ul>
                ) : NON_RENSEIGNE}
              </Ligne>
              <Ligne libelle="Code boutique">{b.shop_code}</Ligne>
              <Ligne libelle="Créée le">{dateHeure(b.created_at)}</Ligne>
            </dl>
          </Section>

          <Section titre="Horaires">
            {!horaireConnu || !aUnHoraire(b) ? (
              <p className="text-sm text-slate-500">
                Le vendeur n'a pas encore indiqué d'horaire. La boutique est affichée
                {b.is_open === false ? ' fermée' : ' ouverte'} par défaut.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {JOURS.concat('Dimanche').map((j) => {
                  const travaille = b.jours_ouverture.includes(j)
                  return (
                    <div key={j} className={`rounded-lg border px-3 py-2 text-sm ${travaille ? 'border-slate-200' : 'border-dashed border-slate-200 text-slate-400'}`}>
                      <div className="font-medium">{j}</div>
                      <div>{travaille ? `${heure(b.horaire_ouverture)} – ${heure(b.horaire_fermeture)}` : 'Fermé'}</div>
                    </div>
                  )
                })}
              </div>
            )}
            <p className="mt-3 text-xs text-slate-500">
              Statut actuel : <span className="font-medium text-slate-700">{ouverture.ouverte ? 'ouverte' : 'fermée'}</span>
              {' '}({ouverture.raison}, heure d'Haïti).
            </p>
          </Section>

          <Section titre="Localisation et livraison">
            <dl className="mb-4">
              <Ligne libelle="Adresse du vendeur">{proprio?.adresse?.trim() || NON_RENSEIGNE}</Ligne>
            </dl>
            {b.zones_livraison?.length ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 font-semibold">Zone desservie</th>
                    <th className="py-2 font-semibold">Délai</th>
                    <th className="py-2 font-semibold text-right">Frais</th>
                  </tr>
                </thead>
                <tbody>
                  {b.zones_livraison.map((z) => (
                    <tr key={z.zone} className="border-b border-slate-100 last:border-0">
                      <td className="py-2">{z.zone}</td>
                      <td className="py-2 text-slate-600">
                        {z.delai_min != null ? `${z.delai_min} à ${z.delai_max} min` : '—'}
                      </td>
                      <td className="py-2 text-right">{z.frais != null && z.frais !== '' ? htg(z.frais) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-slate-500">Aucune zone de livraison indiquée.</p>
            )}
          </Section>
        </div>

        <div className="space-y-6">
          <Section titre="Propriétaire">
            {proprio ? (
              <dl>
                <Ligne libelle="Nom">{proprio.nom}</Ligne>
                <Ligne libelle="Téléphone">{proprio.telephone || NON_RENSEIGNE}</Ligne>
                <Ligne libelle="Email">{proprio.email}</Ligne>
                <Ligne libelle="Compte">
                  {proprio.is_blocked ? <Badge ton="rouge">Bloqué</Badge> : <Badge ton="vert">Actif</Badge>}
                </Ligne>
                <Ligne libelle="Inscrit le">{date(proprio.created_at)}</Ligne>
              </dl>
            ) : (
              <p className="text-sm text-slate-500">Profil du vendeur introuvable.</p>
            )}
          </Section>

          <Section titre="Historique"
            droite={calc.activite.length > 12 && (
              <button onClick={() => setToutAfficher(!toutAfficher)} className="text-xs font-semibold text-navy hover:underline">
                {toutAfficher ? 'Réduire' : `Tout afficher (${calc.activite.length})`}
              </button>
            )}>
            {activite.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun événement.</p>
            ) : (
              <ol className="relative border-l border-slate-200 ml-1.5 space-y-4">
                {activite.map((e) => (
                  <li key={e.cle} className="ml-4">
                    <span className={`absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full ${e.couleur}`} />
                    <div className="text-sm text-slate-800">{e.titre}</div>
                    {e.detail && <div className="text-xs text-slate-500">{e.detail}</div>}
                    <div className="text-xs text-slate-400">{dateHeure(e.quand)}</div>
                  </li>
                ))}
              </ol>
            )}
          </Section>
        </div>
      </div>

      <h2 className="mt-8 mb-3 font-semibold text-navy">Produits ({produits.length})</h2>
      <Tableau
        lignes={produits}
        vide="Aucun produit"
        colonnes={[
          { titre: 'Produit', rendu: (p) => <span className="font-medium">{p.nom}</span> },
          { titre: 'Catégorie', rendu: (p) => [p.categorie, p.sous_categorie].filter(Boolean).join(' / ') || '—' },
          {
            titre: 'Prix',
            className: 'whitespace-nowrap',
            rendu: (p) => p.prix_promo != null
              ? <span>{htg(p.prix_promo)} <span className="text-xs text-slate-400 line-through">{htg(p.prix)}</span></span>
              : htg(p.prix),
          },
          { titre: 'Stock', rendu: (p) => (p.stock === 0 ? <Badge ton="rouge">Rupture</Badge> : p.stock) },
          { titre: 'Vendus', rendu: (p) => p.total_commandes ?? 0 },
          {
            titre: 'Statut',
            rendu: (p) => p.masque_admin ? <Badge ton="rouge">Masqué</Badge>
              : p.disponible === false ? <Badge ton="gris">Indisponible</Badge> : <Badge ton="vert">Visible</Badge>,
          },
          { titre: 'Ajouté le', rendu: (p) => date(p.created_at) },
        ]}
      />

      <h2 className="mt-8 mb-3 font-semibold text-navy">Commandes ({commandes.length})</h2>
      <Tableau
        lignes={commandes}
        vide="Aucune commande"
        colonnes={[
          { titre: 'Commande', rendu: (c) => <span className="font-mono text-xs">{c.id.slice(0, 8)}</span> },
          { titre: 'Client', rendu: (c) => noms[c.client_id] ?? '—' },
          { titre: 'Zone', rendu: (c) => c.zone || '—' },
          { titre: 'Total', className: 'whitespace-nowrap', rendu: (c) => htg(c.total) },
          {
            titre: 'Statut',
            rendu: (c) => (
              <div className="flex flex-wrap gap-1">
                <Badge ton={TONS_COMMANDE[c.statut] ?? 'gris'}>{STATUTS_COMMANDE[c.statut] ?? c.statut}</Badge>
                {c.litige_statut === 'ouvert' && <Badge ton="rouge">Litige ouvert</Badge>}
                {c.litige_statut === 'resolu' && <Badge ton="gris">Litige résolu</Badge>}
              </div>
            ),
          },
          { titre: 'Date', className: 'whitespace-nowrap', rendu: (c) => dateHeure(c.created_at) },
        ]}
      />

      <h2 className="mt-8 mb-3 font-semibold text-navy">Avis clients ({avis.length})</h2>
      <Tableau
        lignes={avis}
        vide="Aucun avis"
        colonnes={[
          { titre: 'Note', className: 'whitespace-nowrap', rendu: (a) => `${a.note} / 5` },
          { titre: 'Commentaire', rendu: (a) => a.commentaire?.trim() || <span className="text-slate-400">Sans commentaire</span> },
          { titre: 'Client', rendu: (a) => noms[a.client_id] ?? '—' },
          { titre: 'Date', className: 'whitespace-nowrap', rendu: (a) => date(a.created_at) },
        ]}
      />
    </>
  )
}

function Retour() {
  return (
    <Link to="/boutiques" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-navy">
      <Icone nom="retour" className="h-4 w-4" />
      Toutes les boutiques
    </Link>
  )
}

// Fil d'activité : tout ce qui est daté pour cette boutique, du plus récent
// au plus ancien. Les changements de statut d'une commande ne sont pas
// historisés en base : seul le statut actuel est connu.
function historique({ b, produits, commandes, avis, logs, noms }) {
  const produitsParId = Object.fromEntries(produits.map((p) => [p.id, p.nom]))
  const ev = [
    { cle: `b-${b.id}`, quand: b.created_at, titre: 'Boutique créée', couleur: 'bg-navy' },
    ...produits.map((p) => ({
      cle: `p-${p.id}`, quand: p.created_at, titre: `Produit ajouté : ${p.nom}`, detail: htg(p.prix_promo ?? p.prix), couleur: 'bg-slate-400',
    })),
    ...commandes.map((c) => ({
      cle: `c-${c.id}`,
      quand: c.created_at,
      titre: `Commande de ${htg(c.total)}${noms[c.client_id] ? ` par ${noms[c.client_id]}` : ''}`,
      detail: `Statut actuel : ${STATUTS_COMMANDE[c.statut] ?? c.statut}${c.litige_statut === 'ouvert' ? ' · litige ouvert' : ''}`,
      couleur: c.litige_statut === 'ouvert' ? 'bg-rouge' : 'bg-vert',
    })),
    ...avis.map((a) => ({
      cle: `a-${a.id}`, quand: a.created_at, titre: `Avis ${a.note} / 5${noms[a.client_id] ? ` de ${noms[a.client_id]}` : ''}`,
      detail: a.commentaire?.trim() || null, couleur: 'bg-ambre',
    })),
    ...logs.map((l) => ({
      cle: `l-${l.id}`,
      quand: l.created_at,
      titre: `Admin : ${LIBELLES_ACTION[l.action] ?? l.action.replaceAll('_', ' ')}`,
      detail: [l.details?.nom ?? produitsParId[l.target_id], l.details?.motif, l.details?.resolution].filter(Boolean).join(' · ') || null,
      couleur: 'bg-rouge',
    })),
  ]
  return ev.filter((e) => e.quand).sort((x, y) => new Date(y.quand) - new Date(x.quand))
}
