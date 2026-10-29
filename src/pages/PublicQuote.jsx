import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { dateBR, money, quoteNumber, whatsappLink } from '../lib/format'

export default function PublicQuote() {
  const { token } = useParams()
  const [data, setData] = useState(undefined)
  const [approving, setApproving] = useState(false)

  const load = () => supabase.rpc('get_public_quote', { p_token: token }).then(({ data }) => setData(data || null))
  useEffect(() => { load() }, [token])

  useEffect(() => {
    if (data?.company) document.title = `Orçamento ${quoteNumber(data.quote.number)} | ${data.company.company_name}`
  }, [data])

  if (data === undefined) return <div className="empty">Carregando orçamento…</div>
  if (!data) return <div className="empty" style={{ paddingTop: 80 }}><h3>Orçamento não encontrado</h3><p>Confira o link com quem enviou.</p></div>

  const { quote: q, company: c = {}, client, items } = data
  const itemsTotal = items.reduce((a, i) => a + Number(i.total_price), 0)
  const expired = q.valid_until && new Date(q.valid_until + 'T23:59:59') < new Date()
  const approved = ['aprovado', 'em_producao', 'concluido'].includes(q.status)
  const canApprove = ['rascunho', 'enviado'].includes(q.status) && !expired

  const approve = async () => {
    const name = prompt('Para aprovar, digite seu nome:', client?.name || '')
    if (!name) return
    setApproving(true)
    const { data: ok, error } = await supabase.rpc('approve_public_quote', { p_token: token, p_name: name })
    setApproving(false)
    if (error || !ok) return alert('Não foi possível aprovar. Fale com a empresa pelo WhatsApp.')
    load()
  }

  const contactText = approved
    ? `Olá! Aprovei o orçamento ${quoteNumber(q.number)}. Como seguimos com o pagamento?`
    : `Olá! Tenho uma dúvida sobre o orçamento ${quoteNumber(q.number)}.`

  return (
    <div className="proposal-page">
      <article className="proposal">
        <header className="proposal-top layers">
          <div>
            {c.logo_url && <img className="logo" src={c.logo_url} alt={c.company_name} />}
            <h1>{c.company_name}</h1>
            <div style={{ opacity: .9, fontSize: '.9rem' }}>
              {[c.document, c.phone, c.email, c.instagram].filter(Boolean).join('   |   ')}
            </div>
          </div>
          <div className="meta">
            Orçamento <b>{quoteNumber(q.number)}</b>
            Emitido em {dateBR(q.created_at)}
          </div>
        </header>

        <div className="proposal-body">
          {approved && <div className="approved-note">Orçamento aprovado{q.approved_by ? ` por ${q.approved_by}` : ''} em {dateBR(q.approved_at)}.</div>}
          {q.status === 'recusado' && <div className="alert">Este orçamento foi cancelado.</div>}

          <p className="muted" style={{ margin: 0 }}>Para</p>
          <h2>{client?.name || 'Cliente'}</h2>
          {q.title && <p style={{ margin: '4px 0 0' }}>{q.title}</p>}

          <div className="proposal-facts">
            <div><span>Prazo de produção</span><b>{q.delivery_days} dias úteis</b><br /><small className="muted">após a aprovação</small></div>
            <div><span>Validade</span><b>{dateBR(q.valid_until)}</b>{expired && <><br /><small style={{ color: '#b83a26' }}>Vencido — peça uma atualização</small></>}</div>
            <div><span>Total</span><b>{money(q.total_price)}</b></div>
          </div>

          <h3>Peças</h3>
          {items.map((it, i) => (
            <div className="p-item" key={i}>
              {it.photo_url
                ? <a href={it.photo_url} target="_blank" rel="noreferrer"><img src={it.photo_url} alt={it.name} /></a>
                : <div className="noimg">Sem foto</div>}
              <div>
                <h3>{it.name}</h3>
                {it.description && <p style={{ margin: '0 0 4px' }}>{it.description}</p>}
                {it.material && <small className="muted">Material: {it.material}</small>}
              </div>
              <div className="p-price">
                <b>{money(it.total_price)}</b>
                <small className="muted">{it.quantity} × {money(it.unit_price)}</small>
              </div>
            </div>
          ))}

          <table className="p-totals"><tbody>
            <tr><td>Peças</td><td>{money(itemsTotal)}</td></tr>
            {Number(q.discount) > 0 && <tr><td>Desconto</td><td>− {money(q.discount)}</td></tr>}
            {Number(q.shipping_cost) > 0 && <tr><td>Frete</td><td>{money(q.shipping_cost)}</td></tr>}
            <tr className="grand"><td>Total</td><td>{money(q.total_price)}</td></tr>
          </tbody></table>

          {q.payment_terms && <section className="p-section"><h3>Pagamento</h3><p>{q.payment_terms}</p></section>}
          {q.notes && <section className="p-section"><h3>Observações</h3><p>{q.notes}</p></section>}
        </div>

        {(c.quote_footer || c.address) && (
          <footer className="proposal-foot">
            {c.quote_footer && <p style={{ margin: '0 0 6px', whiteSpace: 'pre-wrap' }}>{c.quote_footer}</p>}
            {c.address && <p style={{ margin: 0 }}>{c.address}</p>}
          </footer>
        )}
      </article>

      <div className="proposal-actions no-print">
        {canApprove && <button className="btn primary" onClick={approve} disabled={approving}>{approving ? 'Aprovando…' : 'Aprovar orçamento'}</button>}
        {c.phone && <a className="btn" href={whatsappLink(c.phone, contactText)} target="_blank" rel="noreferrer">Falar no WhatsApp</a>}
        <button className="btn" onClick={() => window.print()}>Salvar em PDF</button>
      </div>
    </div>
  )
}
