import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useApp } from '../components/AppData'
import { Field, NumberInput } from '../components/ui'
import { uploadImage } from '../lib/upload'

export default function Settings() {
  const { settings, reload, toast, user } = useApp()
  const [form, setForm] = useState(settings)
  const [saving, setSaving] = useState(false)
  useEffect(() => setForm(settings), [settings])
  if (!form) return null
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v?.target ? v.target.value : v }))

  const save = async () => {
    setSaving(true)
    const { user_id, ...payload } = form
    const { error } = await supabase.from('company_settings').update({ ...payload, updated_at: new Date().toISOString() }).eq('user_id', user_id)
    setSaving(false)
    if (error) return toast('Erro: ' + error.message)
    toast('Configurações salvas')
    reload()
  }

  const onLogo = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try { setForm((f) => ({ ...f, logo_url: null })); const url = await uploadImage(file, user.id); setForm((f) => ({ ...f, logo_url: url })) }
    catch (err) { toast('Falha no envio: ' + err.message) }
  }

  return (
    <>
      <div className="page-head">
        <div><h1>Configurações</h1><p>Esses valores alimentam todos os cálculos e aparecem no orçamento do cliente.</p></div>
        <button className="btn primary" onClick={save} disabled={saving}>{saving ? 'Salvando…' : 'Salvar alterações'}</button>
      </div>

      <div className="panel">
        <h2 style={{ marginBottom: 14 }}>Custos de operação</h2>
        <div className="grid cols-3">
          <Field label="Energia elétrica" help="Veja na conta de luz: total ÷ kWh, com impostos">
            <NumberInput value={form.energy_cost_kwh} prefix="R$" suffix="/kWh" onChange={set('energy_cost_kwh')} />
          </Field>
          <Field label="Valor da sua hora de trabalho" help="Cobra preparo, fatiamento e acabamento">
            <NumberInput value={form.labor_cost_hour} prefix="R$" suffix="/h" onChange={set('labor_cost_hour')} />
          </Field>
          <Field label="Taxa de falhas" help="Reserva para impressões perdidas">
            <NumberInput value={form.failure_rate} suffix="%" onChange={set('failure_rate')} />
          </Field>
          <Field label="Perda de material" help="Purga, brim, suportes descartados">
            <NumberInput value={form.material_waste} suffix="%" onChange={set('material_waste')} />
          </Field>
        </div>
      </div>

      <div className="panel">
        <h2 style={{ marginBottom: 14 }}>Preço e impostos (padrão de novos orçamentos)</h2>
        <div className="grid cols-3">
          <Field label="Lucro sobre o custo" help="Markup — 100% = preço com o dobro do custo">
            <NumberInput value={form.default_margin} suffix="%" onChange={set('default_margin')} />
          </Field>
          <Field label="Impostos sobre a venda" help="MEI: 0%; Simples Nacional: geralmente 4–6%">
            <NumberInput value={form.tax_rate} suffix="%" onChange={set('tax_rate')} />
          </Field>
          <Field label="Taxa de cartão / plataforma" help="Maquininha, Mercado Livre, Shopee…">
            <NumberInput value={form.card_fee} suffix="%" onChange={set('card_fee')} />
          </Field>
          <Field label="Validade do orçamento">
            <NumberInput value={form.quote_validity_days} step="1" suffix="dias" onChange={set('quote_validity_days')} />
          </Field>
          <Field label="Condições de pagamento" className="span-2">
            <input className="input" value={form.payment_terms || ''} onChange={set('payment_terms')} />
          </Field>
        </div>
      </div>

      <div className="panel">
        <h2 style={{ marginBottom: 14 }}>Dados da empresa</h2>
        <div className="grid cols-3">
          <Field label="Nome da empresa"><input className="input" value={form.company_name || ''} onChange={set('company_name')} /></Field>
          <Field label="CNPJ / CPF"><input className="input" value={form.document || ''} onChange={set('document')} /></Field>
          <Field label="WhatsApp" help="O cliente usa para falar com você"><input className="input" value={form.phone || ''} onChange={set('phone')} /></Field>
          <Field label="E-mail"><input className="input" value={form.email || ''} onChange={set('email')} /></Field>
          <Field label="Instagram"><input className="input" placeholder="@suaempresa" value={form.instagram || ''} onChange={set('instagram')} /></Field>
          <Field label="Cidade / endereço"><input className="input" value={form.address || ''} onChange={set('address')} /></Field>
          <Field label="Rodapé do orçamento" className="span-all" help="Ex.: garantia, política de alterações, prazo para retirada">
            <textarea className="input" value={form.quote_footer || ''} onChange={set('quote_footer')} />
          </Field>
          <Field label="Logo">
            <div className="btn-row" style={{ alignItems: 'center' }}>
              {form.logo_url && <img src={form.logo_url} alt="Logo" style={{ height: 44, borderRadius: 6 }} />}
              <label className="btn small">Enviar logo<input type="file" accept="image/*" hidden onChange={onLogo} /></label>
              {form.logo_url && <button className="btn small ghost" onClick={() => setForm((f) => ({ ...f, logo_url: null }))}>Remover</button>}
            </div>
          </Field>
        </div>
      </div>
    </>
  )
}
