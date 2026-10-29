import CrudPage from '../components/CrudPage'

export default function Clients() {
  return (
    <CrudPage
      table="clients"
      title="Clientes"
      singular="Cliente"
      emptyText="Cadastre clientes aqui ou direto ao criar um orçamento."
      defaults={{ name: '' }}
      fields={[
        { key: 'name', label: 'Nome', wide: true },
        { key: 'phone', label: 'WhatsApp', help: 'Com DDD — usado para enviar o orçamento' },
        { key: 'email', label: 'E-mail' },
        { key: 'document', label: 'CPF / CNPJ' },
        { key: 'address', label: 'Endereço' },
        { key: 'notes', label: 'Observações', type: 'textarea', wide: true },
      ]}
      columns={[
        { label: 'Nome', render: (r) => <b>{r.name}</b> },
        { label: 'WhatsApp', render: (r) => r.phone || '—' },
        { label: 'E-mail', render: (r) => r.email || '—' },
      ]}
    />
  )
}
