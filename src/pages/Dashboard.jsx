import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useApp } from '../components/AppData'
import { StatusBadge } from '../components/ui'
import { dateBR, money, pct, quoteNumber } from '../lib/format'

export default function Dashboard() {
  const { printers, materials } = useApp()
  const [quotes, setQuotes] = useState(null)
  const nav = useNavigate()

  useEffect(() => {
    supabase.from('quotes')
      .select('id, number, title, status, total_price, total_cost, created_at, approved_at, clients(name)')
      .order('created_at', { ascending: false })
      .then(({ data }) => setQuotes(data || []))
  }, [])

  if (!quotes) return <div className="empty">Carregando…</div>

  const now = new Date()
  const thisMonth = (d) => d && new Date(d).getMonth() === now.getMonth() && new Date(d).getFullYear() === now.getFullYear()
  const won = ['aprovado', 'em_producao', 'concluido']
  const monthQuotes = quotes.filter((q) => thisMonth(q.created_at))
  const monthWon = quotes.filter((q) => won.includes(q.status) && thisMonth(q.approved_at || q.created_at))
  const sent = quotes.filter((q) => q.status !== 'rascunho')
  const conversion = sent.length ? quotes.filter((q) => won.includes(q.status)).length / sent.length : 0
  const producing = quotes.filter((q) => q.status === 'em_producao' || q.status === 'aprovado')
  const pending = quotes.filter((q) => q.status === 'enviado')

  const setupMissing = !printers.length || !materials.length

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Painel</h1>
          <p>{now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
        </div>
        <Link className="btn primary" to="/orcamentos/novo">Novo orçamento</Link>
      </div>

      {setupMissing && (
        <div className="panel" style={{ marginBottom: 18, borderColor: 'var(--accent)' }}>
          <h3>Antes do primeiro orçamento</h3>
          <p className="muted" style={{ margin: '6px 0 12px' }}>
            Cadastre seus custos para a calculadora funcionar: o preço da energia e da sua hora em Configurações,
            pelo menos uma impressora e um material.
          </p>
          <div className="btn-row">
            <Link className="btn small" to="/configuracoes">Configurações</Link>
            <Link className="btn small" to="/impressoras">Impressoras</Link>
            <Link className="btn small" to="/materiais">Materiais</Link>
          </div>
        </div>
      )}

      <div className="stats">
        <div className="stat"><span>Vendido no mês</span><b>{money(monthWon.reduce((a, q) => a + Number(q.total_price), 0))}</b></div>
        <div className="stat"><span>Lucro bruto estimado no mês</span><b>{money(monthWon.reduce((a, q) => a + Number(q.total_price) - Number(q.total_cost), 0))}</b></div>
        <div className="stat"><span>Orçamentos no mês</span><b>{monthQuotes.length}</b></div>
        <div className="stat"><span>Taxa de aprovação</span><b>{pct(conversion)}</b></div>
      </div>

      <div className="grid cols-2" style={{ alignItems: 'start' }}>
        <QuoteList title="Para produzir" rows={producing} empty="Nada aprovado aguardando produção." nav={nav} />
        <QuoteList title="Aguardando resposta do cliente" rows={pending} empty="Nenhum orçamento enviado em aberto." nav={nav} />
      </div>
    </>
  )
}

function QuoteList({ title, rows, empty, nav }) {
  return (
    <div className="panel">
      <div className="panel-head"><h2>{title}</h2><span className="muted">{rows.length}</span></div>
      {rows.length === 0 ? <p className="muted">{empty}</p> : (
        <div className="table-wrap">
          <table>
            <tbody>
              {rows.slice(0, 8).map((q) => (
                <tr key={q.id} className="click" onClick={() => nav(`/orcamentos/${q.id}`)}>
                  <td><b>{quoteNumber(q.number)}</b> <span className="muted">{q.clients?.name || q.title || ''}</span><br /><small className="muted">{dateBR(q.created_at)}</small></td>
                  <td><StatusBadge status={q.status} /></td>
                  <td className="num">{money(q.total_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
