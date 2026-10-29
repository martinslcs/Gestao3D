import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Field } from '../components/ui'

export default function Login() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    const fn = mode === 'login' ? supabase.auth.signInWithPassword : supabase.auth.signUp
    const { data, error } = await fn.call(supabase.auth, { email, password })
    setBusy(false)
    if (error) return setMsg(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message)
    if (mode === 'signup' && !data.session) setMsg('Conta criada. Confirme o e-mail que enviamos e depois entre.')
  }

  return (
    <div className="auth">
      <div className="auth-art layers">
        <h1>Orçamentos de impressão 3D sem chute.</h1>
        <p>Material, energia, máquina, falhas, mão de obra e impostos calculados em cada peça — e um link bonito para o cliente aprovar.</p>
      </div>
      <div className="auth-form">
        <form onSubmit={submit}>
          <h2>{mode === 'login' ? 'Entrar' : 'Criar conta'}</h2>
          {msg && <div className="alert">{msg}</div>}
          <Field label="E-mail"><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></Field>
          <Field label="Senha"><input className="input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></Field>
          <button className="btn primary" disabled={busy}>{busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}</button>
          <button type="button" className="btn ghost" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMsg('') }}>
            {mode === 'login' ? 'Primeiro acesso? Criar conta' : 'Já tenho conta'}
          </button>
        </form>
      </div>
    </div>
  )
}
