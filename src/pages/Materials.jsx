import CrudPage from '../components/CrudPage'
import { useApp } from '../components/AppData'
import { money } from '../lib/format'

const TYPES = ['PLA', 'PLA+', 'PETG', 'ABS', 'ASA', 'TPU', 'Nylon', 'PC', 'Fibra de carbono', 'Resina', 'Outro']

export default function Materials() {
  const { reload } = useApp()
  return (
    <CrudPage
      table="materials"
      title="Materiais"
      subtitle="Filamentos e resinas com o preço que você realmente pagou (inclua o frete)."
      singular="Material"
      orderBy="type"
      emptyText="Adicione o filamento que você mais usa."
      afterChange={reload}
      defaults={{ name: '', type: 'PLA', color: '', price_per_kg: 120, stock_g: 0, active: true }}
      fields={[
        { key: 'type', label: 'Tipo', type: 'select', options: TYPES },
        { key: 'name', label: 'Marca / linha' },
        { key: 'color', label: 'Cor' },
        { key: 'price_per_kg', label: 'Preço por kg', type: 'number', prefix: 'R$', help: 'Resina: preço por litro (use mL como g)' },
        { key: 'stock_g', label: 'Estoque', type: 'number', suffix: 'g' },
        { key: 'active', label: 'Disponível', type: 'checkbox' },
      ]}
      columns={[
        { label: 'Material', render: (r) => <><b>{r.type}</b> {r.color} <span className="muted">{r.name}</span></> },
        { label: 'R$/kg', num: true, render: (r) => money(r.price_per_kg) },
        { label: 'R$/g', num: true, render: (r) => money(r.price_per_kg / 1000) },
        { label: 'Estoque', num: true, render: (r) => `${Number(r.stock_g || 0).toLocaleString('pt-BR')} g` },
      ]}
    />
  )
}
