import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useApp } from '../components/AppData'
import ItemCard from '../components/ItemCard'
import { Field, Modal, NumberInput, StatusBadge } from '../components/ui'
import { calcQuote } from '../lib/calc'
import { STATUS, addDays, hoursLabel, money, pct, quoteNumber, whatsappLink } from '../lib/format'

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)
const ITEM_FIELDS = ['name', 'description', 'photo_url', 'printer_id', 'material_id', 'quantity', 'weight_g',
  'print_hours', 'setup_hours', 'post_hours', 'extra_cost']

export default function QuoteEditor() {
  const { id } = useParams()
  const isNew = id === 'novo'
  const location = useLocation()
  const nav = useNavigate()
  const { printers, materials, settings, toast } = useApp()

  const [quote, setQuote] = useState(null)
  const [items, setItems] = useState([])
  const [clients, setClients] = useState([])
  const [clientModal, setClientModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')

  const newItem = () => ({
    _key: crypto.randomUUID(), name: '', description: '', quantity: 1, weight_g: 0, print_hours: 0,
    setup_hours: 0.25, post_hours: 0, extra_cost: 0,
    printer_id: printers.find((p) => p.active)?.id || null,
    material_id: materials.find((m) => m.active)?.id || null,
  })

  useEffect(() => {
    supabase.from('clients').select('id, name, phone').order('name').then(({ data }) => setClients(data || []))

    if (isNew) {
      const st = location.state || {}
      const dup = st.duplicate
      setQuote({
        status: 'rascunho', title: '', client_id: null,
        delivery_days: 5, valid_until: addDays(settings.quote_validity_days || 7),
        shipping_cost: 0, discount: 0,
        margin: settings.default_margin, tax_rate: settings.tax_rate, card_fee: settings.card_fee,
        payment_terms: settings.payment_terms, notes: '', internal_notes: '',
        ...st.params,
        ...(dup ? { ...dup.quote, status: 'rascunho', valid_until: addDays(settings.quote_validity_days || 7) } : {}),
      })
      if (dup) setItems(dup.items.map((i) => ({ ...i, _key: crypto.randomUUID() })))
      else if (st.item) setItems([{ ...newItem(), ...st.item, _key: crypto.randomUUID() }])
      else setItems([newItem()])
      setDirty(Boolean(dup || st.item))
      return
    }

    ;(async () => {
      const [{ data: q, error: e1 }, { data: its }] = await Promise.all([
        supabase.from('quotes').select('*').eq('id', id).single(),
        supabase.from('quote_items').select('*').eq('quote_id', id).order('position'),
      ])
      if (e1) return setError('Orçamento não encontrado.')
      setQuote(q)
      setItems((its || []).map((i) => ({ ...i, _key: i.id })))
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const result = useMemo(
    () => quote && calcQuote(items, quote, { printers, materials, settings }),
    [items, quote, printers, materials, settings])

  if (error) return <div className="empty"><h3>{error}</h3></div>
  if (!quote) return <div className="empty">Carregando…</div>

  const setQ = (k) => (v) => { setQuote((q) => ({ ...q, [k]: v?.target ? v.target.value : v })); setDirty(true) }
  const patchItem = (key, patch) => { setItems((arr) => arr.map((i) => (i._key === key ? { ...i, ...patch } : i))); setDirty(true) }
  const removeItem = (key) => { setItems((arr) => arr.filter((i) => i._key !== key)); setDirty(true) }
  const client = clients.find((c) => c.id === quote.client_id)
  const shareUrl = quote.share_token ? `${window.location.origin}/o/${quote.share_token}` : null

  // ---------------------------------------------------------------- salvar
  const save = async (overrides = {}) => {
    setSaving(true)
    const q = { ...quote, ...overrides }
    const r = calcQuote(items, q, { printers, materials, settings })
    if (q.status === 'aprovado' && !q.approved_at) q.approved_at = new Date().toISOString()

    const payload = {
      client_id: q.client_id || null, title: q.title || null, status: q.status,
      delivery_days: Math.round(num(q.delivery_days)), valid_until: q.valid_until || null,
      shipping_cost: num(q.shipping_cost), discount: num(q.discount),
      margin: num(q.margin), tax_rate: num(q.tax_rate), card_fee: num(q.card_fee),
      payment_terms: q.payment_terms, notes: q.notes, internal_notes: q.internal_notes,
      total_cost: r.itemsCost, total_price: r.total, approved_at: q.approved_at || null,
      updated_at: new Date().toISOString(),
    }

    const res = isNew
      ? await supabase.from('quotes').insert(payload).select().single()
      : await supabase.from('quotes').update(payload).eq('id', id).select().single()
    if (res.error) { setSaving(false); toast('Erro ao salvar: ' + res.error.message); return null }
    const saved = res.data

    // Regrava as peças com os valores calculados (guarda o preço da época)
    await supabase.from('quote_items').delete().eq('quote_id', saved.id)
    if (items.length) {
      const rows = items.map((it, idx) => {
        const row = Object.fromEntries(ITEM_FIELDS.map((f) => [f, it[f] ?? null]))
        ;['quantity', 'weight_g', 'print_hours', 'setup_hours', 'post_hours', 'extra_cost'].forEach((f) => { row[f] = num(row[f]) })
        row.quantity = Math.max(1, Math.round(row.quantity))
        row.name = row.name || `Peça ${idx + 1}`
        const l = r.lines[idx]
        return { ...row, quote_id: saved.id, position: idx, unit_cost: l.unitCost, unit_price: l.unitPrice, total_price: l.totalPrice, breakdown: l.breakdown }
      })
      const ins = await supabase.from('quote_items').insert(rows)
      if (ins.error) { setSaving(false); toast('Erro nas peças: ' + ins.error.message); return null }
    }

    setSaving(false)
    setDirty(false)
    setQuote(saved)
    toast('Orçamento salvo')
    if (isNew) nav(`/orcamentos/${saved.id}`, { replace: true })
    return saved
  }

  // --------------------------------------------------------- compartilhar
  const ensureShared = async () => {
    const needsStatus = quote.status === 'rascunho'
    if (dirty || isNew || needsStatus) return await save(needsStatus ? { status: 'enviado' } : {})
    return quote
  }

  const copyLink = async () => {
    const q = await ensureShared()
    if (!q) return
    await navigator.clipboard.writeText(`${window.location.origin}/o/${q.share_token}`)
    toast('Link copiado')
  }

  const sendWhatsapp = async () => {
    const win = window.open('', '_blank')
    const q = await ensureShared()
    if (!q) return win?.close()
    const link = `${window.location.origin}/o/${q.share_token}`
    const lines = items.map((it, i) => `• ${result.lines[i].qty}x ${it.name || `Peça ${i + 1}`}`).join('\n')
    const msg = [
      `Olá${client ? `, ${client.name.split(' ')[0]}` : ''}! Segue o orçamento ${quoteNumber(q.number)} da ${settings.company_name}:`,
      '', lines, '',
      `*Total: ${money(result.total)}*`,
      `Prazo: ${q.delivery_days} dias úteis após a aprovação`,
      '', `Fotos, detalhes e aprovação: ${link}`,
    ].join('\n')
    const url = whatsappLink(client?.phone, msg)
    if (win) win.location.href = url
    else window.location.href = url
  }

  const duplicate = () => {
    const { id: _i, number, share_token, created_at, updated_at, approved_at, approved_by, user_id, ...rest } = quote
    nav('/orcamentos/novo', {
      state: { duplicate: { quote: { ...rest, title: rest.title ? `${rest.title} (cópia)` : '' }, items: items.map(({ id: _x, quote_id, ...i }) => i) } },
    })
  }

  const remove = async () => {
    if (!confirm('Excluir este orçamento? Essa ação não pode ser desfeita.')) return
    await supabase.from('quotes').delete().eq('id', id)
    toast('Orçamento excluído')
    nav('/orcamentos')
  }

  const createClient = async () => {
    const { data, error } = await supabase.from('clients').insert({ name: clientModal.name, phone: clientModal.phone }).select('id, name, phone').single()
    if (error) return toast('Erro: ' + error.message)
    setClients((c) => [...c, data].sort((a, b) => a.name.localeCompare(b.name)))
    setQ('client_id')(data.id)
    setClientModal(null)
  }

  const missingSetup = !printers.length || !materials.length

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{isNew ? 'Novo orçamento' : `Orçamento ${quoteNumber(quote.number)}`}</h1>
          <p style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <StatusBadge status={quote.status} />
            {quote.approved_by && <span>Aprovado por {quote.approved_by}</span>}
            {dirty && <span>Alterações não salvas</span>}
          </p>
        </div>
        <div className="btn-row">
          {!isNew && <button className="btn ghost danger" onClick={remove}>Excluir</button>}
          {!isNew && <button className="btn" onClick={duplicate}>Duplicar</button>}
          <button className="btn primary" onClick={() => save()} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </div>

      {missingSetup && <div className="alert">Cadastre ao menos uma impressora e um material para o cálculo de custos funcionar.</div>}

      <div className="editor">
        <div>
          <div className="panel" style={{ marginBottom: 16 }}>
            <div className="grid cols-4">
              <Field label="Cliente" className="span-2">
                <div className="affix">
                  <select className="input" value={quote.client_id || ''} onChange={(e) => setQ('client_id')(e.target.value || null)}>
                    <option value="">Selecione…</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button className="btn" style={{ borderRadius: '0 6px 6px 0', borderLeft: 0 }} onClick={() => setClientModal({ name: '', phone: '' })}>Novo</button>
                </div>
              </Field>
              <Field label="Título do projeto" className="span-2">
                <input className="input" placeholder="Ex.: Kit de miniaturas RPG" value={quote.title || ''} onChange={setQ('title')} />
              </Field>
              <Field label="Prazo de entrega" help="Dias úteis após aprovação">
                <NumberInput value={quote.delivery_days} step="1" suffix="dias" onChange={setQ('delivery_days')} />
              </Field>
              <Field label="Válido até">
                <input className="input" type="date" value={quote.valid_until || ''} onChange={setQ('valid_until')} />
              </Field>
              <Field label="Status" className="span-2">
                <select className="input" value={quote.status} onChange={setQ('status')}>
                  {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </Field>
            </div>
          </div>

          <div className="panel-head"><h2>Peças</h2><span className="muted">{items.length} {items.length === 1 ? 'item' : 'itens'}</span></div>
          {items.map((it, i) => (
            <ItemCard
              key={it._key} item={it} index={i} line={result.lines[i]}
              onChange={(p) => patchItem(it._key, p)}
              onRemove={items.length > 1 ? () => removeItem(it._key) : null}
            />
          ))}
          <button className="btn" style={{ width: '100%', borderStyle: 'dashed', padding: 14 }} onClick={() => { setItems((a) => [...a, newItem()]); setDirty(true) }}>
            Adicionar peça
          </button>

          <div className="panel" style={{ marginTop: 16 }}>
            <div className="grid cols-2">
              <Field label="Condições de pagamento" className="span-all">
                <input className="input" value={quote.payment_terms || ''} onChange={setQ('payment_terms')} />
              </Field>
              <Field label="Observações para o cliente" help="Aparece no orçamento">
                <textarea className="input" value={quote.notes || ''} onChange={setQ('notes')} />
              </Field>
              <Field label="Anotações internas" help="Só você vê">
                <textarea className="input" value={quote.internal_notes || ''} onChange={setQ('internal_notes')} />
              </Field>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------ resumo */}
        <div className="summary">
          <div className="total-block layers">
            <span>Total para o cliente</span>
            <b>{money(result.total)}</b>
            <small>{hoursLabel(result.totalHours)} de máquina, {Math.round(result.totalGrams).toLocaleString('pt-BR')} g de material</small>
          </div>

          <div className="panel">
            <div className="grid cols-2" style={{ marginBottom: 14 }}>
              <Field label="Lucro sobre custo" className="span-all"><NumberInput value={quote.margin} suffix="%" onChange={setQ('margin')} /></Field>
              <Field label="Impostos"><NumberInput value={quote.tax_rate} suffix="%" onChange={setQ('tax_rate')} /></Field>
              <Field label="Taxa cartão"><NumberInput value={quote.card_fee} suffix="%" onChange={setQ('card_fee')} /></Field>
              <Field label="Frete"><NumberInput value={quote.shipping_cost} prefix="R$" onChange={setQ('shipping_cost')} /></Field>
              <Field label="Desconto"><NumberInput value={quote.discount} prefix="R$" onChange={setQ('discount')} /></Field>
            </div>

            <table className="sum-rows"><tbody>
              <tr><td>Peças</td><td>{money(result.itemsPrice)}</td></tr>
              {result.discount > 0 && <tr><td>Desconto</td><td>− {money(result.discount)}</td></tr>}
              {result.shipping > 0 && <tr><td>Frete</td><td>{money(result.shipping)}</td></tr>}
              <tr><td>Custo de produção</td><td>− {money(result.itemsCost)}</td></tr>
              <tr><td>Impostos e taxas</td><td>− {money(result.deductions)}</td></tr>
              {result.shipping > 0 && <tr><td>Repasse do frete</td><td>− {money(result.shipping)}</td></tr>}
              <tr className={result.profit >= 0 ? 'profit' : 'loss'}>
                <td>Lucro líquido ({pct(result.realMargin)})</td><td>{money(result.profit)}</td>
              </tr>
            </tbody></table>
          </div>

          <div className="panel">
            <h3 style={{ marginBottom: 10 }}>Enviar para o cliente</h3>
            <div className="grid">
              <button className="btn primary" onClick={sendWhatsapp} disabled={saving}>Enviar pelo WhatsApp</button>
              <button className="btn" onClick={copyLink} disabled={saving}>Copiar link</button>
              {shareUrl && !dirty && <a className="btn ghost" href={shareUrl} target="_blank" rel="noreferrer">Ver como o cliente</a>}
            </div>
            <p className="muted" style={{ fontSize: '.82rem', margin: '10px 0 0' }}>
              Enviar salva o orçamento e muda o status para “Enviado”. O cliente vê fotos, prazo e total — nunca seus custos.
            </p>
          </div>
        </div>
      </div>

      {clientModal && (
        <Modal title="Novo cliente" onClose={() => setClientModal(null)} footer={<>
          <button className="btn" onClick={() => setClientModal(null)}>Cancelar</button>
          <button className="btn primary" disabled={!clientModal.name} onClick={createClient}>Adicionar cliente</button>
        </>}>
          <div className="grid">
            <Field label="Nome"><input className="input" autoFocus value={clientModal.name} onChange={(e) => setClientModal((c) => ({ ...c, name: e.target.value }))} /></Field>
            <Field label="WhatsApp" help="Com DDD"><input className="input" value={clientModal.phone} onChange={(e) => setClientModal((c) => ({ ...c, phone: e.target.value }))} /></Field>
          </div>
        </Modal>
      )}
    </>
  )
}
