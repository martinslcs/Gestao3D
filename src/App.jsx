import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { isConfigured, supabase } from './lib/supabase'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Quotes from './pages/Quotes'
import QuoteEditor from './pages/QuoteEditor'
import PublicQuote from './pages/PublicQuote'
import Calculator from './pages/Calculator'
import Clients from './pages/Clients'
import Printers from './pages/Printers'
import Materials from './pages/Materials'
import Settings from './pages/Settings'

function NotConfigured() {
  return (
    <div className="empty" style={{ paddingTop: 80 }}>
      <h3>Conecte o Supabase</h3>
      <p>Defina <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> no arquivo <code>.env</code> (local)
        ou em Site settings → Environment variables (Netlify) e publique novamente.</p>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    if (!isConfigured) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!isConfigured) return <NotConfigured />

  return (
    <Routes>
      <Route path="/o/:token" element={<PublicQuote />} />
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
      <Route
        element={
          session === undefined ? <div className="empty">Carregando…</div>
            : session ? <Layout session={session} />
            : <Navigate to="/login" replace />
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="orcamentos" element={<Quotes />} />
        <Route path="orcamentos/:id" element={<QuoteEditor />} />
        <Route path="calculadora" element={<Calculator />} />
        <Route path="clientes" element={<Clients />} />
        <Route path="impressoras" element={<Printers />} />
        <Route path="materiais" element={<Materials />} />
        <Route path="configuracoes" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
