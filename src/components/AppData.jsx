import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

export function AppDataProvider({ session, children }) {
  const [state, setState] = useState({ settings: null, printers: [], materials: [], loading: true })
  const [toastMsg, setToastMsg] = useState(null)

  const toast = useCallback((msg) => {
    setToastMsg(msg)
    clearTimeout(window.__toastT)
    window.__toastT = setTimeout(() => setToastMsg(null), 2600)
  }, [])

  const reload = useCallback(async () => {
    const [s, p, m] = await Promise.all([
      supabase.from('company_settings').select('*').maybeSingle(),
      supabase.from('printers').select('*').order('name'),
      supabase.from('materials').select('*').order('type').order('name'),
    ])
    let settings = s.data
    if (!settings) {
      const ins = await supabase.from('company_settings').insert({}).select().single()
      settings = ins.data
    }
    setState({ settings, printers: p.data || [], materials: m.data || [], loading: false })
  }, [])

  useEffect(() => { reload() }, [reload])

  return (
    <Ctx.Provider value={{ ...state, reload, toast, user: session.user }}>
      {children}
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </Ctx.Provider>
  )
}
