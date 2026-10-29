import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { StatusBadge } from '../components/ui'
import { STATUS, dateBR, money, quoteNumber } from '../lib/format'

export default function Quotes() {
  const [rows, setRows] = useState(null)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const nav = useNavigate()

  useEffect(() => {
    supabase.from('quotes')
      .select('id, number, title, status, total_price, total_cost, created_at, valid_until, clients(name)')
      .order('created_at', { ascending: false })
      .then(({ data }) => setRows(data || []))
  }, [])

  const filtered = (rows || []).filter((q) =>
    (!status || q.status === status) &&
    (!search || `${q.number} ${q.title} ${q.clients?.name}`.toLowerCase().includes(search.toLowerCase())))

  return (
    <>
      <div className="page-head">
        <div><h1>Orçamentos</h1><p>Cada orçamento gera um link para o cliente ver e aprovar.</p></div>
        <Link className="btn primary" to="/orcamentos/novo">Novo orçamento</Link>
      </div>
      <div className="panel">
        <div className="btn-row" style={{ marginBottom: 14 }}>
          <input className="input" placeholder="Buscar por número, cliente ou título" value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 320 }} />
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 200 }}>
            <option value="">Todos os status</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        {rows === null ? <div className="empty">Carregando…</div>
          : filtered.length === 0 ? (
            <div className="empty">
              <h3>{rows.length ? 'Nenhum orçamento com esse filtro' : 'Nenhum orçamento ainda'}</h3>
              {!rows.length && <p>Crie o primeiro: adicione as peças, a calculadora monta o preço.</p>}
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Nº</th><th>Cliente / título</th><th>Status</th><th>Criado</th><th>Validade</th><th className="num">Custo</th><th className="num">Total</th></tr></thead>
                <tbody>
                  {filtered.map((q) => (
                    <tr key={q.id} className="click" onClick={() => nav(`/orcamentos/${q.id}`)}>
                      <td><b>{quoteNumber(q.number)}</b></td>
                      <td>{q.clients?.name || <span className="muted">Sem cliente</span>}<br /><small className="muted">{q.title}</small></td>
                      <td><StatusBadge status={q.status} /></td>
                      <td>{dateBR(q.created_at)}</td>
                      <td>{dateBR(q.valid_until)}</td>
                      <td className="num muted">{money(q.total_cost)}</td>
                      <td className="num"><b>{money(q.total_price)}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </>
  )
}
