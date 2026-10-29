const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const money = (v) => brl.format(Number(v) || 0)
export const pct = (v) => `${((Number(v) || 0) * 100).toFixed(1).replace('.', ',')}%`

export const hoursLabel = (h) => {
  const total = Math.round((Number(h) || 0) * 60)
  const hh = Math.floor(total / 60)
  const mm = total % 60
  if (!hh) return `${mm}min`
  return mm ? `${hh}h ${mm}min` : `${hh}h`
}

export const dateBR = (d) => {
  if (!d) return '—'
  const date = typeof d === 'string' && d.length === 10 ? new Date(d + 'T12:00:00') : new Date(d)
  return date.toLocaleDateString('pt-BR')
}

export const quoteNumber = (n) => `#${String(n ?? '').padStart(4, '0')}`

export const addDays = (days) => {
  const d = new Date()
  d.setDate(d.getDate() + (Number(days) || 0))
  return d.toISOString().slice(0, 10)
}

export const onlyDigits = (s) => (s || '').replace(/\D/g, '')

export const whatsappLink = (phone, text) => {
  let digits = onlyDigits(phone)
  if (digits && digits.length <= 11) digits = '55' + digits
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

export const STATUS = {
  rascunho: { label: 'Rascunho', tone: 'neutral' },
  enviado: { label: 'Enviado', tone: 'info' },
  aprovado: { label: 'Aprovado', tone: 'ok' },
  em_producao: { label: 'Em produção', tone: 'warn' },
  concluido: { label: 'Concluído', tone: 'done' },
  recusado: { label: 'Recusado', tone: 'bad' },
}
