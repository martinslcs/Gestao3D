import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../components/AppData'
import ItemCard from '../components/ItemCard'
import { Field, NumberInput } from '../components/ui'
import { calcQuote } from '../lib/calc'
import { money, pct } from '../lib/format'

export default function Calculator() {
  const { printers, materials, settings } = useApp()
  const nav = useNavigate()
  const [item, setItem] = useState({
    name: '', quantity: 1, weight_g: 50, print_hours: 3, setup_hours: 0.25, post_hours: 0.25, extra_cost: 0,
    printer_id: printers.find((p) => p.active)?.id, material_id: materials.find((m) => m.active)?.id,
  })
  const [params, setParams] = useState({
    margin: settings.default_margin, tax_rate: settings.tax_rate, card_fee: settings.card_fee,
  })
  const r = calcQuote([item], params, { printers, materials, settings })
  const line = r.lines[0]

  return (
    <>
      <div className="page-head">
        <div><h1>Calculadora rápida</h1><p>Responda um preço na hora. Se o cliente topar, vire orçamento com um clique.</p></div>
        <button className="btn primary" onClick={() => nav('/orcamentos/novo', { state: { item, params } })}>Criar orçamento com esta peça</button>
      </div>
      <div className="editor">
        <ItemCard item={item} index={0} line={line} showPhoto={false} onChange={(p) => setItem((i) => ({ ...i, ...p }))} />
        <div className="summary">
          <div className="total-block layers">
            <span>Preço sugerido{line.qty > 1 ? ` (${line.qty} un.)` : ''}</span>
            <b>{money(r.total)}</b>
            {line.qty > 1 && <small>{money(line.unitPrice)} por unidade</small>}
          </div>
          <div className="panel">
            <div className="grid" style={{ marginBottom: 14 }}>
              <Field label="Lucro sobre o custo"><NumberInput value={params.margin} suffix="%" onChange={(v) => setParams((p) => ({ ...p, margin: v }))} /></Field>
              <div className="grid cols-2">
                <Field label="Impostos"><NumberInput value={params.tax_rate} suffix="%" onChange={(v) => setParams((p) => ({ ...p, tax_rate: v }))} /></Field>
                <Field label="Taxa cartão"><NumberInput value={params.card_fee} suffix="%" onChange={(v) => setParams((p) => ({ ...p, card_fee: v }))} /></Field>
              </div>
            </div>
            <table className="sum-rows"><tbody>
              <tr><td>Custo total</td><td>{money(r.itemsCost)}</td></tr>
              <tr><td>Impostos e taxas</td><td>{money(r.deductions)}</td></tr>
              <tr className={r.profit >= 0 ? 'profit' : 'loss'}><td>Lucro líquido ({pct(r.realMargin)})</td><td>{money(r.profit)}</td></tr>
            </tbody></table>
          </div>
        </div>
      </div>
    </>
  )
}
