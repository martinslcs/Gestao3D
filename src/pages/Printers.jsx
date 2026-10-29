import CrudPage from '../components/CrudPage'
import { useApp } from '../components/AppData'
import { money } from '../lib/format'

export default function Printers() {
  const { reload } = useApp()
  return (
    <CrudPage
      table="printers"
      title="Impressoras"
      subtitle="O custo por hora de cada máquina entra automaticamente no orçamento."
      singular="Impressora"
      emptyText="Adicione sua primeira impressora com o valor pago e o consumo."
      afterChange={reload}
      defaults={{ name: '', purchase_price: 0, lifespan_hours: 5000, power_watts: 150, maintenance_cost_hour: 0.5, active: true }}
      fields={[
        { key: 'name', label: 'Nome / modelo', wide: true },
        { key: 'purchase_price', label: 'Valor pago', type: 'number', prefix: 'R$' },
        { key: 'lifespan_hours', label: 'Vida útil estimada', type: 'number', suffix: 'h', help: 'FDM caseira: 3.000–8.000 h' },
        { key: 'power_watts', label: 'Consumo médio', type: 'number', suffix: 'W', help: 'Média durante a impressão, não o pico' },
        { key: 'maintenance_cost_hour', label: 'Manutenção', type: 'number', prefix: 'R$', suffix: '/h', help: 'Bicos, correias, mesa, lubrificação' },
        { key: 'active', label: 'Em uso', type: 'checkbox' },
      ]}
      columns={[
        { label: 'Impressora', render: (r) => <><b>{r.name}</b>{!r.active && <span className="muted"> (inativa)</span>}</> },
        { label: 'Valor', num: true, render: (r) => money(r.purchase_price) },
        { label: 'Consumo', num: true, render: (r) => `${r.power_watts} W` },
        { label: 'Depreciação/h', num: true, render: (r) => money(r.lifespan_hours ? r.purchase_price / r.lifespan_hours : 0) },
        { label: 'Manutenção/h', num: true, render: (r) => money(r.maintenance_cost_hour) },
      ]}
    />
  )
}
