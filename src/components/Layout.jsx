import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { AppDataProvider, useApp } from './AppData'

function Shell() {
  const { settings, loading } = useApp()
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  const close = () => setOpen(false)

  return (
    <div className="app">
      <aside className={`sidebar ${open ? 'open' : ''}`} onClick={(e) => e.target.tagName === 'A' && close()}>
        <div className="brand">
          {settings?.logo_url
            ? <img src={settings.logo_url} alt="" style={{ width: 34, height: 34, objectFit: 'contain', borderRadius: 8 }} />
            : <div className="brand-mark layers" />}
          <div className="brand-name">
            {settings?.company_name || 'Impressão 3D'}
            <small>Gestão e orçamentos</small>
          </div>
        </div>
        <nav className="nav">
          <NavLink to="/" end>Painel</NavLink>
          <NavLink to="/orcamentos">Orçamentos</NavLink>
          <NavLink to="/calculadora">Calculadora rápida</NavLink>
          <NavLink to="/clientes">Clientes</NavLink>
          <div className="nav-group">Custos</div>
          <NavLink to="/impressoras">Impressoras</NavLink>
          <NavLink to="/materiais">Materiais</NavLink>
          <NavLink to="/configuracoes">Configurações</NavLink>
        </nav>
        <div className="spacer" />
        <button className="btn ghost" onClick={() => supabase.auth.signOut()}>Sair</button>
      </aside>

      <div>
        <div className="mobile-bar">
          <button className="btn small" onClick={() => setOpen(true)} aria-label="Abrir menu">☰ Menu</button>
          <b>{settings?.company_name || 'Impressão 3D'}</b>
        </div>
        <main className="main" key={loc.pathname}>
          {loading ? <div className="empty">Carregando…</div> : <Outlet />}
        </main>
      </div>
    </div>
  )
}

export default function Layout({ session }) {
  return (
    <AppDataProvider session={session}>
      <Shell />
    </AppDataProvider>
  )
}
