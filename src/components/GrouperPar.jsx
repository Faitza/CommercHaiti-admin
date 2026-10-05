import { GROUPEMENTS } from '../lib/grouperCommandes'

// Liste déroulante « Grouper par ». `sans` retire des choix (ex. 'boutique'
// dans la fiche d'une boutique).
export default function GrouperPar({ valeur, onChange, sans = [] }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      Grouper par
      <select value={valeur} onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none focus:border-navy">
        {GROUPEMENTS.filter(([v]) => !sans.includes(v)).map(([v, libelle]) => (
          <option key={v} value={v}>{libelle}</option>
        ))}
      </select>
    </label>
  )
}
