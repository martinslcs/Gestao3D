import { useEffect } from 'react'
import { STATUS } from '../lib/format'

export function Field({ label, help, children, className = '' }) {
  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      {children}
      {help && <small>{help}</small>}
    </label>
  )
}

/** Input numérico que aceita vírgula. */
export function NumberInput({ value, onChange, prefix, suffix, step = 'any', min = 0, ...rest }) {
  return (
    <div className="affix">
      {prefix && <em>{prefix}</em>}
      <input
        className="input num"
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        {...rest}
      />
      {suffix && <em>{suffix}</em>}
    </div>
  )
}

/** Tempo em horas decimais exibido como horas + minutos (igual ao fatiador). */
export function HoursInput({ value, onChange }) {
  const total = Math.round((Number(value) || 0) * 60)
  const h = Math.floor(total / 60)
  const m = total % 60
  const set = (nh, nm) => onChange((Number(nh) || 0) + (Number(nm) || 0) / 60)
  return (
    <div className="hours">
      <NumberInput value={h} step="1" suffix="h" onChange={(v) => set(v, m)} aria-label="Horas" />
      <NumberInput value={m} step="1" suffix="min" onChange={(v) => set(h, v)} aria-label="Minutos" />
    </div>
  )
}

export function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.rascunho
  return <span className={`badge ${s.tone}`}>{s.label}</span>
}

export function Modal({ title, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <h2 style={{ marginBottom: 16 }}>{title}</h2>
        {children}
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}
