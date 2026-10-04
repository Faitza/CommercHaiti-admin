/**
 * Exporte un tableau d'objets en fichier CSV téléchargé par le navigateur.
 * `colonnes` : [{ cle: 'total', titre: 'Total (HTG)' }, ...]
 * Séparateur ';' et BOM UTF-8 pour une ouverture correcte dans Excel (fr).
 */
export function exporterCsv(nomFichier, lignes, colonnes) {
  const echapper = (v) => {
    const s = v == null ? '' : String(v)
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const contenu = [
    colonnes.map((c) => echapper(c.titre)).join(';'),
    ...lignes.map((l) => colonnes.map((c) => echapper(l[c.cle])).join(';')),
  ].join('\r\n')

  const blob = new Blob(['﻿' + contenu], { type: 'text/csv;charset=utf-8' })
  const lien = document.createElement('a')
  lien.href = URL.createObjectURL(blob)
  lien.download = nomFichier
  lien.click()
  URL.revokeObjectURL(lien.href)
}
