import { useState } from 'react'
import { useApp } from './AppData'
import { Field, HoursInput, NumberInput } from './ui'
import { uploadImage } from '../lib/upload'
import { COST_LABELS } from '../lib/calc'
import { money } from '../lib/format'

export const materialLabel = (m) => [m.type, m.color, m.name && `(${m.name})`].filter(Boolean).join(' ')

export default function ItemCard({ item, index, line, onChange, onRemove, showPhoto = true, showPrice = true }) {
  const { printers, materials, user, toast } = useApp()
  const [uploading, setUploading] = useState(false)
  const [open, setOpen] = useState(false)
  const set = (k) => (v) => onChange({ [k]: v })

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadImage(file, user.id)
      onChange({ photo_url: url })
    } catch (err) {
      toast('Falha no envio da foto: ' + err.message)
    }
    setUploading(false)
    e.target.value = ''
  }

  const activePrinters = printers.filter((p) => p.active || p.id === item.printer_id)
  const activeMaterials = materials.filter((m) => m.active || m.id === item.material_id)

  return (
    <div className="item">
      <div className="item-head">
        <div className="item-index">{index + 1}</div>
        <input className="input" placeholder="Nome da peça (ex.: Suporte de headset)" value={item.name || ''} onChange={(e) => onChange({ name: e.target.value })} aria-label="Nome da peça" />
        {onRemove && <button className="btn small ghost danger" onClick={onRemove}>Remover</button>}
      </div>

      <div className="item-body" style={showPhoto ? undefined : { gridTemplateColumns: '1fr' }}>
        {showPhoto && (
          <div>
            <label className="photo">
              {item.photo_url ? <img src={item.photo_url} alt={item.name} /> : uploading ? 'Enviando…' : 'Adicionar foto da peça'}
              <input type="file" accept="image/*" onChange={onFile} />
            </label>
            {item.photo_url && <button className="btn small ghost photo-remove" onClick={() => onChange({ photo_url: null })}>Remover foto</button>}
          </div>
        )}

        <div className="grid cols-4">
          <Field label="Impressora" className="span-2">
            <select className="input" value={item.printer_id || ''} onChange={(e) => onChange({ printer_id: e.target.value || null })}>
              <option value="">Selecione…</option>
              {activePrinters.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Material" className="span-2">
            <select className="input" value={item.material_id || ''} onChange={(e) => onChange({ material_id: e.target.value || null })}>
              <option value="">Selecione…</option>
              {activeMaterials.map((m) => <option key={m.id} value={m.id}>{materialLabel(m)}</option>)}
            </select>
          </Field>
          <Field label="Peso por unidade" help="Do fatiador, com suportes">
            <NumberInput value={item.weight_g} suffix="g" onChange={set('weight_g')} />
          </Field>
          <Field label="Tempo de impressão" className="span-2" help="Por unidade">
            <HoursInput value={item.print_hours} onChange={set('print_hours')} />
          </Field>
          <Field label="Quantidade">
            <NumberInput value={item.quantity} step="1" min="1" onChange={set('quantity')} />
          </Field>
          <Field label="Preparo / fatiamento" className="span-2">
            <HoursInput value={item.setup_hours} onChange={set('setup_hours')} />
          </Field>
          <Field label="Acabamento / pós" className="span-2" help="Remover suporte, lixar, pintar">
            <HoursInput value={item.post_hours} onChange={set('post_hours')} />
          </Field>
          <Field label="Insumos extras por unidade" className="span-2" help="Tinta, ímãs, parafusos, embalagem">
            <NumberInput value={item.extra_cost} prefix="R$" onChange={set('extra_cost')} />
          </Field>
          {showPhoto && (
            <Field label="Descrição para o cliente" className="span-2">
              <input className="input" placeholder="Ex.: acabamento lixado, cor preta fosca" value={item.description || ''} onChange={(e) => onChange({ description: e.target.value })} />
            </Field>
          )}
        </div>
      </div>

      {open && (
        <div style={{ padding: '0 16px 14px' }}>
          <table className="breakdown">
            <tbody>
              {Object.entries(COST_LABELS).map(([k, label]) => (
                <tr key={k}><td>{label}</td><td>{money(line.breakdown[k])}</td></tr>
              ))}
              <tr><td>Custo por unidade</td><td>{money(line.breakdown.unitCost)}</td></tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="item-foot">
        <button className="btn small ghost" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? 'Ocultar custos' : 'Ver custos'}
        </button>
        <span>Custo un. <b>{money(line.unitCost)}</b></span>
        {showPrice && <span>Preço un. <b>{money(line.unitPrice)}</b></span>}
        {showPrice && <span className="price">Total <b>{money(line.totalPrice)}</b></span>}
      </div>
    </div>
  )
}
