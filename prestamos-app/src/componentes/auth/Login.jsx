import React, { useState } from 'react'
import { User, Mail, Lock, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    try {
      // 1. Autenticar con Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      // 2. Obtener perfil de usuario para determinar su rol
      const user = authData.user
      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      const perfilCompleto = {
        ...user,
        rol: usuarioData?.rol || (email.includes('admin') ? 'admin' : 'inversionista'),
        nombre: usuarioData?.nombre_completo || usuarioData?.nombre || user.email
      }

      onLoginSuccess(perfilCompleto)
    } catch (err) {
      console.error('Error al iniciar sesión:', err)
      setErrorMsg('Credenciales inválidas. Verificá tu correo y contraseña.')
    } finally {
      setLoading(false)
    }
  }

  return (
    /* FONDO DEGRADADO INSTITUCIONAL */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-[#14837a] via-[#0d6b63] to-[#0f172a] p-4 select-none">
      
      {/* TARJETA CENTRADA CON DISEÑO MINIMALISTA */}
      <div className="w-full max-w-sm flex flex-col items-center space-y-8 px-4">
        
        {/* ÍCONO CIRCULAR SUPERIOR */}
        <div className="flex flex-col items-center space-y-4">
          <div className="w-24 h-24 rounded-full bg-[#084842] border border-white/20 flex items-center justify-center shadow-2xl">
            <User className="w-12 h-12 text-white stroke-[1.5]" />
          </div>

          <h1 className="text-xl tracking-[0.25em] font-light text-white uppercase text-center">
            INICIAR SESIÓN
          </h1>
        </div>

        {/* FORMULARIO CON INPUTS DE LÍNEA INFERIOR */}
        <form onSubmit={handleLogin} className="w-full space-y-6">
          
          {/* Campo Email */}
          <div className="relative border-b border-white/80 pb-2 focus-within:border-white transition-colors">
            <div className="flex items-center gap-3 text-white">
              <Mail className="w-5 h-5 opacity-90 shrink-0" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Correo Electrónico"
                className="w-full bg-transparent text-sm text-white placeholder-white/80 focus:outline-none font-light tracking-wide"
              />
            </div>
          </div>

          {/* Campo Password */}
          <div className="relative border-b border-white/80 pb-2 focus-within:border-white transition-colors">
            <div className="flex items-center gap-3 text-white">
              <Lock className="w-5 h-5 opacity-90 shrink-0" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                className="w-full bg-transparent text-sm text-white placeholder-white/80 focus:outline-none font-light tracking-wide"
              />
            </div>
          </div>

          {/* CHECKBOX "RECORDARME" Y "OLVIDÉ CONTRASEÑA" */}
          <div className="flex items-center justify-between text-xs text-white/90 pt-1 font-light">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 accent-[#084842] rounded border-white/40 cursor-pointer"
              />
              <span>Recordarme</span>
            </label>

            <button
              type="button"
              onClick={() => alert('Por favor contactá al administrador para restablecer tu clave.')}
              className="italic hover:underline opacity-90 hover:opacity-100 transition-opacity cursor-pointer"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          {/* MENSAJE DE ERROR */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-900/60 border border-red-400/40 flex items-center gap-2 text-xs font-medium text-white shadow-lg">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-300" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* BOTÓN LOGIN VERDE OSCURO */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#084842] hover:bg-[#05312d] active:scale-[0.99] text-white font-semibold tracking-[0.25em] text-xs uppercase shadow-xl transition-all cursor-pointer border border-white/10 disabled:opacity-50 mt-4"
          >
            {loading ? 'INGRESANDO...' : 'ENTRAR'}
          </button>

        </form>

      </div>
    </div>
  )
}