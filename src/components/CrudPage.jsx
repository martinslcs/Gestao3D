import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from './AppData'
import { Field, Modal, NumberInput } from './ui'

/**
 * Tela genérica de cadastro (lista + modal de edição).
 * fields: [{ key, label, type: 'text'|'number'|'textarea'|'select'|'checkbox', prefix, suffix, help, options, wide }]
 * columns: [{ label, render(row), num }]
 */
export default function CrudPage({ table, title, subtitle, singular, fields, columns, defaults, orderBy = 'name', emptyText, afterChange }) {
  const { toast } = useApp()
  const [rows, setRows] = useState(null)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const load = async () => {
    const { data, error } = await supabase.from(table).select('*').order(orderBy)
    if (error) setError(error.message)
    setRows(data || [])
  }
  useEffect(() => { load() }, [table])

  const save = async () => {
    setSaving(true)
    setError('')
    const payload = { ...editing }
    delete payload.created_at
    const { error } = payload.id
      ? await supabase.from(table).update(payload).eq('id', payload.id)
      : await supabase.from(table).insert(payload)
    setSaving(false)
    if (error) return setError(error.message)
    setEditing(null)
    toast(`${singular} salvo`)
    load()
    afterChange?.()
  }

  const remove = async () => {
    if (!confirm(`Excluir ${singular.toLowerCase()} "${editing.name}"?`)) return
    const { error } = await supabase.from(table).delete().eq('id', editing.id)
    if (error) return setError(error.message)
    setEditing(null)
    toast(`${singular} excluído`)
    load()
    afterChange?.()
  }

  const set = (k, v) => setEditing((e) => ({ ...e, [k]: v }))
  const filtered = (rows || []).filter((r) =>
    !search || JSON.stringify(r).toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button className="btn primary" onClick={() => { setError(''); setEditing({ ...defaults }) }}>
          Adicionar {singular.toLowerCase()}
        </button>
      </div>

      <div className="panel">
        {rows && rows.length > 6 && (
          <input className="input" placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginBottom: 12, maxWidth: 320 }} />
        )}
        {rows === null ? <div className="empty">Carregando…</div>
          : rows.length === 0 ? (
            <div className="empty">
              <h3>Nenhum cadastro ainda</h3>
              <p>{emptyText}</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr>{columns.map((c) => <th key={c.label} className={c.num ? 'num' : ''}>{c.label}</th>)}</tr></thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="click" onClick={() => { setError(''); setEditing(r) }}>
                      {columns.map((c) => <td key={c.label} className={c.num ? 'num' : ''}>{c.render(r)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {editing && (
        <Modal
          title={editing.id ? `Editar ${singular.toLowerCase()}` : `Novo ${singular.toLowerCase()}`}
          onClose={() => setEditing(null)}
          footer={<>
            {editing.id && <button className="btn danger" style={{ marginRight: 'auto' }} onClick={remove}>Excluir</button>}
            <button className="btn" onClick={() => setEditing(null)}>Cancelar</button>
            <button className="btn primary" disabled={saving || !editing.name} onClick={save}>{saving ? 'Salvando…' : 'Salvar'}</button>
          </>}
        >
          {error && <div className="alert">{error}</div>}
          <div className="grid cols-2">
            {fields.map((f) => (
              <Field key={f.key} label={f.label} help={f.help} className={f.wide ? 'span-all' : ''}>
                {f.type === 'number' ? (
                  <NumberInput value={editing[f.key]} prefix={f.prefix} suffix={f.suffix} onChange={(v) => set(f.key, v)} />
                ) : f.type === 'textarea' ? (
                  <textarea className="input" value={editing[f.key] || ''} onChange={(e) => set(f.key, e.target.value)} />
                ) : f.type === 'select' ? (
                  <select className="input" value={editing[f.key] || ''} onChange={(e) => set(f.key, e.target.value)}>
                    {f.options.map((o) => <option key={o}>{o}</option>)}
                  </select>
                ) : f.type === 'checkbox' ? (
                  <input type="checkbox" checked={!!editing[f.key]} onChange={(e) => set(f.key, e.target.checked)} style={{ width: 20, height: 20 }} />
                ) : (
                  <input className="input" value={editing[f.key] || ''} onChange={(e) => set(f.key, e.target.value)} />
                )}
              </Field>
            ))}
          </div>
        </Modal>
      )}
    </>
  )
}
