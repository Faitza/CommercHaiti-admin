// Page publique d'un produit partagé sur WhatsApp — Faitza COLAS
// Path : api/produit.js (fonction Vercel), servie sur /p/<id> via vercel.json
//
// Le message WhatsApp de l'app mobile contient https://<ce site>/p/<id>.
//  - App installée et lien vérifié (public/.well-known/assetlinks.json) :
//    Android ouvre l'app directement, cette page n'est même pas affichée.
//  - Sinon le lien arrive ici : la page montre le produit (photo, prix,
//    boutique, rupture de stock) avec "Ouvrir dans l'app" (ouvre l'app sur
//    le produit si elle est installée, sinon envoie vers le téléchargement)
//    et "Télécharger l'app".
// Les balises og:* donnent l'aperçu (photo + nom) dans WhatsApp.

// Lien de téléchargement de l'app : même valeur que
// AppLinks.telechargementApp dans l'app mobile (lien PROVISOIRE).
const TELECHARGEMENT_APP = 'https://github.com/Faitza/CommercHaiti'
// Identifiant Android de l'app (applicationId dans android/app/build.gradle.kts).
const PACKAGE_ANDROID = 'com.example.commerchaiti'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function echapper(texte) {
  return String(texte ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function htg(montant) {
  return `${Math.round(Number(montant))} HTG`
}

async function lire(table, id, colonnes) {
  const url = process.env.VITE_SUPABASE_URL
  const cle = process.env.VITE_SUPABASE_ANON_KEY
  const rep = await fetch(
    `${url}/rest/v1/${table}?id=eq.${id}&select=${colonnes}&limit=1`,
    { headers: { apikey: cle, Authorization: `Bearer ${cle}` } },
  )
  if (!rep.ok) return null
  const lignes = await rep.json()
  return lignes[0] ?? null
}

function page({ titre, description, image, corps }) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${echapper(titre)}</title>
<meta property="og:title" content="${echapper(titre)}">
<meta property="og:description" content="${echapper(description)}">
${image ? `<meta property="og:image" content="${echapper(image)}">` : ''}
<meta property="og:site_name" content="CommercHaiti">
<link rel="icon" href="/favicon.png">
<style>
  body { margin: 0; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
         background: #F4F6FA; color: #0D2B5E; }
  .carte { max-width: 420px; margin: 0 auto; background: #fff; min-height: 100vh; }
  header { display: flex; align-items: center; gap: 8px; padding: 12px 16px; }
  header img { height: 32px; }
  .photo { width: 100%; aspect-ratio: 1; object-fit: cover; background: #E8ECF3; display: block; }
  .infos { padding: 16px; }
  h1 { font-size: 20px; margin: 0 0 8px; }
  .prix { font-size: 22px; font-weight: 700; color: #E63946; }
  .barre { color: #8A94A6; text-decoration: line-through; font-size: 15px; margin-left: 6px; font-weight: 400; }
  .boutique { color: #5A6478; margin-top: 6px; }
  .rupture { margin-top: 12px; padding: 10px 12px; border-radius: 8px;
             background: #FDECEE; color: #E63946; font-weight: 700; }
  .bouton { display: block; text-align: center; padding: 14px; border-radius: 10px;
            font-weight: 600; text-decoration: none; margin-top: 12px; }
  .principal { background: #0D2B5E; color: #fff; }
  .secondaire { border: 1px solid #0D2B5E; color: #0D2B5E; }
</style>
</head>
<body><div class="carte">
<header><img src="/logo.png" alt="CommercHaiti"></header>
${corps}
</div></body>
</html>`
}

export default async function handler(req, res) {
  const id = String(req.query.id ?? '')
  const android = /android/i.test(req.headers['user-agent'] ?? '')
  res.setHeader('Content-Type', 'text/html; charset=utf-8')

  // Android : lien intent:// → ouvre l'app sur /p/<id> si elle est
  // installée, sinon Chrome suit browser_fallback_url (téléchargement).
  const ouvrirApp = android && UUID.test(id)
    ? `intent://app/p/${id}#Intent;scheme=commerchaiti;package=${PACKAGE_ANDROID};` +
      `S.browser_fallback_url=${encodeURIComponent(TELECHARGEMENT_APP)};end`
    : null
  const boutons =
    (ouvrirApp ? `<a class="bouton principal" href="${echapper(ouvrirApp)}">Ouvrir dans l'app</a>` : '') +
    `<a class="bouton ${ouvrirApp ? 'secondaire' : 'principal'}" href="${TELECHARGEMENT_APP}">Télécharger l'app</a>`

  let produit = null
  let boutique = null
  if (UUID.test(id)) {
    try {
      produit = await lire('products', id, 'id,nom,prix,prix_promo,photos,stock,shop_id')
      if (produit) boutique = await lire('shops', produit.shop_id, 'nom')
    } catch {
      produit = null
    }
  }

  if (!produit) {
    res.status(404).send(page({
      titre: 'Produit introuvable | CommercHaiti',
      description: 'Ce produit n\'est plus disponible sur CommercHaiti.',
      corps: `<div class="infos"><h1>Produit introuvable</h1>
<p class="boutique">Il a peut-être été retiré par la boutique. Découvrez les autres produits dans l'app CommercHaiti.</p>
${boutons}</div>`,
    }))
    return
  }

  const promo = produit.prix_promo != null && Number(produit.prix_promo) < Number(produit.prix)
  const prix = promo
    ? `${htg(produit.prix_promo)}<span class="barre">${htg(produit.prix)}</span>`
    : htg(produit.prix)
  const epuise = Number(produit.stock) <= 0
  const photo = Array.isArray(produit.photos) && produit.photos.length ? produit.photos[0] : null
  const nomBoutique = boutique?.nom ?? 'CommercHaiti'

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
  res.status(200).send(page({
    titre: `${produit.nom} | CommercHaiti`,
    description: `${epuise ? 'RUPTURE DE STOCK. ' : ''}${htg(promo ? produit.prix_promo : produit.prix)} · ${nomBoutique}`,
    image: photo,
    corps: `${photo ? `<img class="photo" src="${echapper(photo)}" alt="${echapper(produit.nom)}">` : ''}
<div class="infos">
<h1>${echapper(produit.nom)}</h1>
<div class="prix">${prix}</div>
<div class="boutique">Boutique : ${echapper(nomBoutique)}</div>
${epuise ? '<div class="rupture">RUPTURE DE STOCK : ce produit est épuisé</div>' : ''}
${boutons}
</div>`,
  }))
}
